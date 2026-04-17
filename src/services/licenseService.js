const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, safeStorage } = require('electron');
const { getSetting, updateSetting } = require('./systemService');
const { writeLog } = require('./logService');

const LICENSE_FILE = 'license.secure';
const DEFAULT_LICENSE_API_URL = process.env.FINANCEPRO_LICENSE_API_URL || 'http://localhost:3877';
const LICENSE_SECRET = process.env.FINANCEPRO_LICENSE_SECRET || process.env.LICENSE_SECRET || 'troque-este-segredo-em-producao';

function nowIso() {
  return new Date().toISOString();
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function signLicenseBody(body) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(body).digest('base64url');
}

function verifyOfflineProductKey(productKey) {
  if (!productKey?.startsWith('CC-')) {
    return null;
  }

  const raw = productKey.slice(3);
  const [body, signature] = raw.split('.');
  const expected = signLicenseBody(body || '');

  if (
    !body ||
    !signature ||
    Buffer.byteLength(signature) !== Buffer.byteLength(expected) ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

function offlineActivationPayload(productKey, email) {
  const payload = verifyOfflineProductKey(productKey);

  if (!payload) {
    throw new Error('Chave invalida.');
  }

  if (email && String(payload.email || '').toLowerCase() !== String(email).toLowerCase()) {
    throw new Error('Email nao corresponde a licenca.');
  }

  const expiresAt = payload.validUntil || addDays(365);

  if (new Date(expiresAt).getTime() < Date.now()) {
    throw new Error('Licenca expirada.');
  }

  return {
    valid: true,
    status: 'active',
    activationToken: crypto.createHash('sha256').update(`${productKey}:${getDeviceId()}`).digest('hex'),
    customerName: payload.customerName || payload.email || 'Cliente FinancePro',
    customerEmail: payload.email || email,
    documentNumber: payload.documentNumber || '',
    plan: payload.plan || 'profissional',
    expiresAt,
    maxDevices: payload.maxDevices || 1,
    maxUsers: payload.maxUsers || 1,
    modules: payload.modules || ['finance', 'reports', 'backup', 'health'],
    activatedAt: nowIso()
  };
}

function getLicensePath() {
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

function getDeviceId() {
  const raw = [
    os.hostname(),
    os.userInfo().username,
    os.platform(),
    os.arch(),
    os.cpus()?.[0]?.model || 'cpu'
  ].join('|');

  return crypto.createHash('sha256').update(raw).digest('hex');
}

function getFallbackKey() {
  return crypto.createHash('sha256').update(`ContaCerta:${getDeviceId()}:local-license`).digest();
}

function encryptFallback(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getFallbackKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from('GCM1'), iv, tag, encrypted]).toString('base64');
}

function decryptFallback(payload) {
  const data = Buffer.from(payload, 'base64');
  const magic = data.subarray(0, 4).toString('utf8');

  if (magic !== 'GCM1') {
    throw new Error('Licenca local invalida.');
  }

  const iv = data.subarray(4, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getFallbackKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function encryptLicense(record) {
  const text = JSON.stringify(record);

  if (safeStorage.isEncryptionAvailable()) {
    return `SAFE:${safeStorage.encryptString(text).toString('base64')}`;
  }

  return `FALLBACK:${encryptFallback(text)}`;
}

function decryptLicense(raw) {
  if (raw.startsWith('SAFE:')) {
    return JSON.parse(safeStorage.decryptString(Buffer.from(raw.slice(5), 'base64')));
  }

  if (raw.startsWith('FALLBACK:')) {
    return JSON.parse(decryptFallback(raw.slice(9)));
  }

  throw new Error('Formato de licenca local desconhecido.');
}

function loadLicenseRecord() {
  const licensePath = getLicensePath();

  if (!fs.existsSync(licensePath)) {
    return null;
  }

  try {
    return decryptLicense(fs.readFileSync(licensePath, 'utf-8'));
  } catch (_error) {
    return null;
  }
}

function saveLicenseRecord(record) {
  fs.mkdirSync(path.dirname(getLicensePath()), { recursive: true });
  fs.writeFileSync(getLicensePath(), encryptLicense(record), 'utf-8');
  return record;
}

function normalizeStatus(record) {
  if (!record) {
    return {
      active: false,
      mode: 'not_activated',
      status: 'not_activated',
      label: 'Nao ativado',
      message: 'Ative com uma chave ou inicie uma avaliacao de 7 dias.',
      deviceId: getDeviceId()
    };
  }

  const expiresAt = record.expiresAt ? new Date(record.expiresAt) : null;
  const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;

  return {
    ...record,
    active: !expired && record.status !== 'revoked',
    expired,
    label: expired ? 'Licenca expirada' : record.mode === 'trial' ? 'Avaliacao ativa' : 'Licenca ativa',
    message: expired
      ? 'A licenca expirou. Reative para liberar o sistema.'
      : record.mode === 'trial'
        ? 'Avaliacao de 7 dias liberada neste computador.'
        : 'Produto ativado e pronto para uso.',
    deviceId: getDeviceId()
  };
}

function getLicenseStatus() {
  return normalizeStatus(loadLicenseRecord());
}

function startTrial(database) {
  const current = loadLicenseRecord();

  if (current?.mode === 'trial' && new Date(current.expiresAt).getTime() < Date.now()) {
    throw new Error('A avaliacao deste computador ja expirou.');
  }

  if (current?.mode === 'trial') {
    return normalizeStatus(current);
  }

  if (current?.active && current.mode !== 'trial') {
    return normalizeStatus(current);
  }

  const trial = {
    mode: 'trial',
    status: 'active',
    customerName: 'Avaliacao',
    customerEmail: '',
    plan: 'trial',
    modules: ['finance', 'reports', 'backup', 'health'],
    maxUsers: 1,
    maxDevices: 1,
    deviceId: getDeviceId(),
    activationToken: crypto.randomBytes(24).toString('hex'),
    activatedAt: nowIso(),
    expiresAt: addDays(7),
    lastValidatedAt: nowIso()
  };

  saveLicenseRecord(trial);
  writeLog(database, {
    log_type: 'license',
    level: 'info',
    message: 'Avaliacao de 7 dias iniciada.',
    metadata: { expiresAt: trial.expiresAt }
  });

  return normalizeStatus(trial);
}

async function activateLicense(database, input) {
  const settings = getSetting(database, 'license', {});
  const apiUrl = String(input.apiUrl || settings.apiUrl || DEFAULT_LICENSE_API_URL).trim().replace(/\/$/, '');
  const productKey = String(input.productKey || '').trim();
  const email = String(input.email || '').trim();

  if (!productKey) {
    throw new Error('Digite a chave do produto.');
  }

  let payload;

  try {
    const response = await fetch(`${apiUrl}/api/licenses/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productKey,
        email: email || undefined,
        deviceId: getDeviceId(),
        appVersion: app.getVersion()
      })
    });

    payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.valid === false) {
      throw new Error(payload.message || 'Licenca invalida, expirada ou ja usada em outro computador.');
    }
  } catch (error) {
    if (error.message && !/fetch|failed|ECONNREFUSED|ENOTFOUND|network/i.test(error.message)) {
      throw error;
    }

    payload = offlineActivationPayload(productKey, email);
  }

  const record = {
    mode: 'licensed',
    status: payload.status || 'active',
    customerName: payload.customerName || email,
    customerEmail: payload.customerEmail || email,
    documentNumber: payload.documentNumber || '',
    plan: payload.plan || 'standard',
    modules: payload.modules || ['finance', 'reports', 'backup', 'health'],
    maxUsers: payload.maxUsers || 1,
    maxDevices: payload.maxDevices || 1,
    deviceId: getDeviceId(),
    activationToken: payload.activationToken,
    activatedAt: payload.activatedAt || nowIso(),
    expiresAt: payload.expiresAt,
    lastValidatedAt: nowIso(),
    licenseApiUrl: apiUrl
  };

  saveLicenseRecord(record);
  updateSetting(database, 'license', { ...settings, apiUrl });
  writeLog(database, {
    log_type: 'license',
    level: 'info',
    message: 'Produto ativado com sucesso.',
    metadata: { email, plan: record.plan, expiresAt: record.expiresAt }
  });

  return normalizeStatus(record);
}

function clearLicense(database) {
  if (fs.existsSync(getLicensePath())) {
    fs.unlinkSync(getLicensePath());
  }

  writeLog(database, {
    log_type: 'license',
    level: 'warning',
    message: 'Licenca local removida.'
  });

  return getLicenseStatus();
}

module.exports = {
  activateLicense,
  clearLicense,
  getDeviceId,
  getLicenseStatus,
  startTrial
};
