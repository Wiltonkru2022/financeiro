const fs = require('fs');
const path = require('path');
const {
  checkpointDatabase,
  getBackupDirectory,
  getDatabasePath,
  restoreDatabaseFromBackup
} = require('../db/database');
const { listEntries } = require('./financeService');

const DEFAULT_LICENSE_API_URL = 'https://sfinvquyuspingeqjamz.supabase.co/functions/v1/licenses';
const DEFAULT_SITE_URL = 'https://github.com/Wiltonkru2022/financeiro/releases/latest';
const DEFAULT_SUPABASE_URL = 'https://sfinvquyuspingeqjamz.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_R5z0B2_UHE0UrJ3TdTmAGg_3iaaeC0z';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function getSetting(database, key, fallback) {
  const row = database.prepare('SELECT value_json FROM app_settings WHERE key = ?').get(key);

  if (!row) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(row.value_json);

    if (
      isPlainObject(fallback) &&
      isPlainObject(parsed)
    ) {
      return { ...fallback, ...parsed };
    }

    return parsed;
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
  const defaultNotifications = {
    enabled: true,
    dueSoonDays: 3,
    dailySummaryOnStartup: true
  };
  const defaultLicense = {
    apiUrl: DEFAULT_LICENSE_API_URL,
    revalidateEveryDays: 7,
    offlineGraceDays: 14,
    requireActivation: true
  };
  const defaultOnline = {
    siteUrl: DEFAULT_SITE_URL,
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
    syncEnabled: false
  };
  const settings = {
    notifications: getSetting(database, 'notifications', {
      ...defaultNotifications
    }),
    license: getSetting(database, 'license', {
      ...defaultLicense
    }),
    online: getSetting(database, 'online', {
      ...defaultOnline
    })
  };

  settings.notifications = {
    ...defaultNotifications,
    ...(isPlainObject(settings.notifications) ? settings.notifications : {})
  };
  settings.license = {
    ...defaultLicense,
    ...(isPlainObject(settings.license) ? settings.license : {})
  };
  settings.online = {
    ...defaultOnline,
    ...(isPlainObject(settings.online) ? settings.online : {})
  };

  if (!settings.license.apiUrl || /localhost:3877/i.test(settings.license.apiUrl)) {
    settings.license.apiUrl = DEFAULT_LICENSE_API_URL;
  }

  if (!settings.online.siteUrl || /wiltonkru2022\.github\.io/i.test(settings.online.siteUrl)) {
    settings.online.siteUrl = DEFAULT_SITE_URL;
  }

  if (!settings.online.supabaseUrl) {
    settings.online.supabaseUrl = DEFAULT_SUPABASE_URL;
  }

  if (!settings.online.supabaseAnonKey) {
    settings.online.supabaseAnonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  return settings;
}

function createBackup(database, targetPath) {
  checkpointDatabase();
  const backupPath =
    targetPath ||
    path.join(getBackupDirectory(), `financepro-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);

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
