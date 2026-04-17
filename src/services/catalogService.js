const { runInTransaction } = require('../db/database');

const CATALOGS = {
  parties: {
    table: 'parties',
    order: 'name ASC',
    required: ['name', 'party_type'],
    fields: ['party_type', 'name', 'document_number', 'phone', 'email', 'notes', 'is_active']
  },
  categories: {
    table: 'categories',
    order: 'kind ASC, name ASC',
    required: ['name', 'kind'],
    fields: ['name', 'kind', 'color', 'is_active']
  },
  accounts: {
    table: 'accounts',
    order: 'name ASC',
    required: ['name', 'account_type'],
    fields: ['name', 'account_type', 'institution', 'current_balance', 'notes', 'is_active']
  },
  cost_centers: {
    table: 'cost_centers',
    order: 'name ASC',
    required: ['name'],
    fields: ['name', 'code', 'is_active']
  },
  payment_methods: {
    table: 'payment_methods',
    order: 'name ASC',
    required: ['name'],
    fields: ['name', 'is_active']
  }
};

function getCatalogConfig(kind) {
  const config = CATALOGS[kind];

  if (!config) {
    throw new Error('Cadastro invalido.');
  }

  return config;
}

function normalizeValue(field, value) {
  if (field === 'is_active') {
    return value === false || value === 0 || value === '0' ? 0 : 1;
  }

  if (field === 'current_balance') {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
  }

  return value === undefined || value === '' ? null : value;
}

function normalizePayload(config, input) {
  const payload = {};

  config.fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      payload[field] = normalizeValue(field, input[field]);
    }
  });

  if (!Object.prototype.hasOwnProperty.call(payload, 'is_active') && config.fields.includes('is_active')) {
    payload.is_active = 1;
  }

  config.required.forEach((field) => {
    if (!payload[field]) {
      throw new Error(`Campo obrigatorio: ${field}.`);
    }
  });

  return payload;
}

function listCatalog(database, kind, includeInactive = true) {
  const config = getCatalogConfig(kind);
  const where = includeInactive ? '' : 'WHERE is_active = 1';

  return database
    .prepare(
      `
      SELECT *
      FROM ${config.table}
      ${where}
      ORDER BY ${config.order}
      `
    )
    .all();
}

function listLookups(database) {
  return {
    parties: listCatalog(database, 'parties', false),
    categories: listCatalog(database, 'categories', false),
    accounts: listCatalog(database, 'accounts', false),
    cost_centers: listCatalog(database, 'cost_centers', false),
    payment_methods: listCatalog(database, 'payment_methods', false)
  };
}

function createCatalog(database, kind, input) {
  const config = getCatalogConfig(kind);
  const payload = normalizePayload(config, input);
  const fields = Object.keys(payload);
  const placeholders = fields.map(() => '?').join(', ');

  return runInTransaction(database, () => {
    const result = database
      .prepare(
        `
        INSERT INTO ${config.table} (${fields.join(', ')})
        VALUES (${placeholders})
        `
      )
      .run(...fields.map((field) => payload[field]));

    return database.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(result.lastInsertRowid);
  });
}

function updateCatalog(database, kind, id, input) {
  const config = getCatalogConfig(kind);
  const payload = normalizePayload(config, input);
  const fields = Object.keys(payload);

  return runInTransaction(database, () => {
    database
      .prepare(
        `
        UPDATE ${config.table}
        SET ${fields.map((field) => `${field} = ?`).join(', ')},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .run(...fields.map((field) => payload[field]), id);

    return database.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).get(id);
  });
}

function deleteCatalog(database, kind, id) {
  const config = getCatalogConfig(kind);

  return runInTransaction(database, () => {
    database
      .prepare(
        `
        UPDATE ${config.table}
        SET is_active = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .run(id);

    return { id, inactive: true };
  });
}

module.exports = {
  CATALOGS,
  createCatalog,
  deleteCatalog,
  listCatalog,
  listLookups,
  updateCatalog
};

