const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.LICENSE_API_PORT || 3877);
const SECRET = process.env.LICENSE_SECRET || 'troque-este-segredo-em-producao';
const DATA_DIR =
  process.env.LICENSE_DATA_DIR ||
  path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'FinanceProLicenseApi');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.LICENSE_DB_PATH || path.join(DATA_DIR, 'licenses.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = DELETE;
  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_key TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    document_number TEXT,
    email TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'standard',
    valid_until TEXT NOT NULL,
    max_devices INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 1,
    modules_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER NOT NULL,
    device_id TEXT NOT NULL,
    activation_token TEXT NOT NULL UNIQUE,
    app_version TEXT,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id),
    UNIQUE (license_id, device_id)
  );
`);

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload muito grande.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_error) {
        reject(new Error('JSON invalido.'));
      }
    });
  });
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function createProductKey(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `CC-${body}.${sign(body)}`;
}

function verifyProductKey(productKey) {
  if (!productKey?.startsWith('CC-')) {
    return false;
  }

  const raw = productKey.slice(3);
  const [body, signature] = raw.split('.');
  const expected = sign(body || '');

  return Boolean(
    body &&
      signature &&
      Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

function createActivationToken(licenseId, deviceId) {
  const nonce = crypto.randomBytes(18).toString('base64url');
  const body = `${licenseId}.${deviceId}.${Date.now()}.${nonce}`;
  return `${Buffer.from(body).toString('base64url')}.${sign(body)}`;
}

function publicLicense(row, activationToken) {
  return {
    valid: true,
    status: row.status,
    activationToken,
    customerName: row.customer_name,
    customerEmail: row.email,
    documentNumber: row.document_number,
    plan: row.plan,
    expiresAt: row.valid_until,
    maxDevices: row.max_devices,
    maxUsers: row.max_users,
    modules: JSON.parse(row.modules_json || '[]'),
    activatedAt: new Date().toISOString()
  };
}

async function handleCreateLicense(req, res) {
  const input = await readBody(req);
  const required = ['customerName', 'email', 'validUntil'];

  for (const field of required) {
    if (!input[field]) {
      return jsonResponse(res, 400, { valid: false, message: `Campo obrigatorio: ${field}` });
    }
  }

  const keyPayload = {
    email: input.email,
    customerName: input.customerName,
    plan: input.plan || 'profissional',
    validUntil: input.validUntil,
    maxDevices: Number(input.maxDevices || 1),
    maxUsers: Number(input.maxUsers || 1),
    modules: input.modules || ['finance', 'reports', 'backup', 'health'],
    createdAt: new Date().toISOString(),
    nonce: crypto.randomBytes(12).toString('hex')
  };
  const productKey = createProductKey(keyPayload);

  db.prepare(
    `
    INSERT INTO licenses (
      product_key,
      customer_name,
      document_number,
      email,
      plan,
      valid_until,
      max_devices,
      max_users,
      modules_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    productKey,
    input.customerName,
    input.documentNumber || '',
    input.email,
    input.plan || 'profissional',
    input.validUntil,
    Number(input.maxDevices || 1),
    Number(input.maxUsers || 1),
    JSON.stringify(input.modules || ['finance', 'reports', 'backup', 'health'])
  );

  return jsonResponse(res, 201, { productKey });
}

async function handleActivate(req, res) {
  const input = await readBody(req);

  if (!verifyProductKey(input.productKey)) {
    return jsonResponse(res, 401, { valid: false, message: 'Chave invalida.' });
  }

  const license = db.prepare('SELECT * FROM licenses WHERE product_key = ?').get(input.productKey);

  if (!license || license.status !== 'active') {
    return jsonResponse(res, 403, { valid: false, message: 'Licenca inativa.' });
  }

  if (new Date(license.valid_until).getTime() < Date.now()) {
    return jsonResponse(res, 403, { valid: false, message: 'Licenca expirada.' });
  }

  const activationEmail = String(input.email || license.email || '').toLowerCase();

  if (String(license.email).toLowerCase() !== activationEmail) {
    return jsonResponse(res, 403, { valid: false, message: 'Email nao corresponde a licenca.' });
  }

  const activations = db.prepare('SELECT * FROM activations WHERE license_id = ?').all(license.id);
  const existing = activations.find((item) => item.device_id === input.deviceId);

  if (!existing && activations.length >= license.max_devices) {
    return jsonResponse(res, 403, { valid: false, message: 'Limite de computadores atingido.' });
  }

  const token = existing?.activation_token || createActivationToken(license.id, input.deviceId);

  db.prepare(
    `
    INSERT INTO activations (license_id, device_id, activation_token, app_version)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(license_id, device_id) DO UPDATE SET
      last_seen_at = CURRENT_TIMESTAMP,
      app_version = excluded.app_version
    `
  ).run(license.id, input.deviceId, token, input.appVersion || '');

  return jsonResponse(res, 200, publicLicense(license, token));
}

async function handleValidate(req, res) {
  const input = await readBody(req);
  const activation = db
    .prepare(
      `
      SELECT a.*, l.*
      FROM activations a
      JOIN licenses l ON l.id = a.license_id
      WHERE a.activation_token = ? AND a.device_id = ?
      `
    )
    .get(input.activationToken, input.deviceId);

  if (!activation || activation.status !== 'active') {
    return jsonResponse(res, 403, { valid: false, message: 'Ativacao invalida.' });
  }

  if (new Date(activation.valid_until).getTime() < Date.now()) {
    return jsonResponse(res, 403, { valid: false, message: 'Licenca expirada.' });
  }

  db.prepare('UPDATE activations SET last_seen_at = CURRENT_TIMESTAMP WHERE activation_token = ?').run(input.activationToken);
  return jsonResponse(res, 200, publicLicense(activation, input.activationToken));
}

async function router(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      return jsonResponse(res, 204, {});
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      return jsonResponse(res, 200, {
        status: 'ok',
        database: 'ok',
        service: 'financepro-license-api',
        checkedAt: new Date().toISOString()
      });
    }

    if (req.method === 'POST' && req.url === '/api/licenses/create') {
      return handleCreateLicense(req, res);
    }

    if (req.method === 'POST' && req.url === '/api/licenses/activate') {
      return handleActivate(req, res);
    }

    if (req.method === 'POST' && req.url === '/api/licenses/validate') {
      return handleValidate(req, res);
    }

    return jsonResponse(res, 404, { message: 'Rota nao encontrada.' });
  } catch (error) {
    return jsonResponse(res, 500, { valid: false, message: error.message });
  }
}

http.createServer(router).listen(PORT, () => {
  console.log(`FinancePro License API rodando em http://localhost:${PORT}`);
});
