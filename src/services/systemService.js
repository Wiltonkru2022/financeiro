const fs = require('fs');
const path = require('path');
const {
  checkpointDatabase,
  getBackupDirectory,
  getDatabasePath,
  restoreDatabaseFromBackup
} = require('../db/database');
const { listEntries } = require('./financeService');

function getSetting(database, key, fallback) {
  const row = database.prepare('SELECT value_json FROM app_settings WHERE key = ?').get(key);

  if (!row) {
    return fallback;
  }

  try {
    return JSON.parse(row.value_json);
  } catch (_error) {
    return fallback;
  }
}

function updateSetting(database, key, value) {
  database
    .prepare(
      `
      INSERT INTO app_settings (key, value_json)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = CURRENT_TIMESTAMP
      `
    )
    .run(key, JSON.stringify(value));

  return getSetting(database, key, value);
}

function getSettings(database) {
  return {
    notifications: getSetting(database, 'notifications', {
      enabled: true,
      dueSoonDays: 3,
      dailySummaryOnStartup: true
    }),
    license: getSetting(database, 'license', {
      apiUrl: '',
      revalidateEveryDays: 7,
      offlineGraceDays: 14,
      requireActivation: true
    })
  };
}

function createBackup(database, targetPath) {
  checkpointDatabase();
  const backupPath =
    targetPath ||
    path.join(getBackupDirectory(), `contacerta-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

  fs.copyFileSync(getDatabasePath(), backupPath);

  return {
    backupPath,
    databasePath: getDatabasePath()
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (/[",\r\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function exportEntriesCsv(database, targetPath, filters = {}) {
  const entries = listEntries(database, filters);
  const columns = [
    'id',
    'tipo',
    'descricao',
    'pessoa',
    'categoria',
    'centro_custo',
    'conta',
    'forma_pagamento',
    'tipo_conta',
    'parcela',
    'vencimento',
    'liquidacao',
    'valor_total',
    'desconto',
    'juros',
    'multa',
    'valor_baixado',
    'valor_aberto',
    'status',
    'motivo_cancelamento',
    'observacoes'
  ];

  const lines = [
    columns.join(';'),
    ...entries.map((entry) =>
      [
        entry.id,
        entry.entry_type === 'payable' ? 'pagar' : 'receber',
        entry.description,
        entry.party_name,
        entry.category_name,
        entry.cost_center_name,
        entry.account_name,
        entry.payment_method_name,
        entry.plan_type,
        entry.installment_total ? `${entry.installment_number}/${entry.installment_total}` : '',
        entry.due_date,
        entry.settlement_date,
        entry.amount_total,
        entry.amount_discount,
        entry.amount_interest,
        entry.amount_penalty,
        entry.amount_settled,
        entry.amount_open,
        entry.status,
        entry.cancellation_reason,
        entry.notes
      ]
        .map(csvEscape)
        .join(';')
    )
  ];

  fs.writeFileSync(targetPath, lines.join('\r\n'), 'utf-8');

  return {
    exportPath: targetPath,
    rows: entries.length
  };
}

function restoreBackup(sourcePath) {
  return restoreDatabaseFromBackup(sourcePath);
}

module.exports = {
  createBackup,
  exportEntriesCsv,
  getSetting,
  getSettings,
  restoreBackup,
  updateSetting
};
