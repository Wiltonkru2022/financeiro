const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { app } = require('electron');

let databaseInstance = null;

function ensureUserDataDirectory() {
  const userDataPath = app.getPath('userData');
  fs.mkdirSync(userDataPath, { recursive: true });
  return userDataPath;
}

function getDatabasePath() {
  const userDataPath = ensureUserDataDirectory();
  return path.join(userDataPath, 'contacerta.db');
}

function getBackupDirectory() {
  const backupPath = path.join(ensureUserDataDirectory(), 'backups');
  fs.mkdirSync(backupPath, { recursive: true });
  return backupPath;
}

function runSchema(database) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schemaSql);
}

function columnExists(database, tableName, columnName) {
  return database.prepare(`PRAGMA table_info(${tableName})`).all().some((column) => column.name === columnName);
}

function addColumnIfMissing(database, tableName, columnName, definition) {
  if (!columnExists(database, tableName, columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

function runMigrations(database) {
  const accountSql = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'accounts'").get()?.sql || '';

  if (accountSql && !accountSql.includes("'card'")) {
    database.exec('PRAGMA foreign_keys = OFF;');
    database.exec(`
      CREATE TABLE IF NOT EXISTS accounts_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'bank', 'wallet', 'card', 'loan', 'store', 'other')),
        institution TEXT,
        current_balance REAL NOT NULL DEFAULT 0,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO accounts_migrated (
        id, name, account_type, institution, current_balance, notes, is_active, created_at, updated_at
      )
      SELECT
        id,
        name,
        CASE
          WHEN account_type IN ('cash', 'bank', 'wallet', 'card', 'loan', 'store', 'other') THEN account_type
          ELSE 'other'
        END,
        institution,
        current_balance,
        notes,
        is_active,
        created_at,
        updated_at
      FROM accounts;
      DROP TABLE accounts;
      ALTER TABLE accounts_migrated RENAME TO accounts;
    `);
    database.exec('PRAGMA foreign_keys = ON;');
  }

  const auditSql = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'audit_log'").get()?.sql || '';

  if (auditSql && !auditSql.includes("'cancel'")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS audit_log_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'cancel', 'settle', 'restore')),
        previous_data_json TEXT,
        new_data_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR IGNORE INTO audit_log_migrated (
        id, entity_name, entity_id, action, previous_data_json, new_data_json, created_at
      )
      SELECT id, entity_name, entity_id, action, previous_data_json, new_data_json, created_at
      FROM audit_log;
      DROP TABLE audit_log;
      ALTER TABLE audit_log_migrated RENAME TO audit_log;
    `);
  }

  addColumnIfMissing(database, 'financial_entries', 'plan_type', "TEXT NOT NULL DEFAULT 'single'");
  addColumnIfMissing(database, 'financial_entries', 'installment_number', 'INTEGER');
  addColumnIfMissing(database, 'financial_entries', 'installment_total', 'INTEGER');
  addColumnIfMissing(database, 'financial_entries', 'fixed_until', 'TEXT');
  addColumnIfMissing(database, 'financial_entries', 'cancellation_reason', 'TEXT');
  addColumnIfMissing(database, 'financial_entries', 'cancelled_at', 'TEXT');
  addColumnIfMissing(database, 'recurring_templates', 'plan_type', "TEXT NOT NULL DEFAULT 'fixed'");
}

function seedDefaults(database) {
  const defaultCategories = [
    ['Aluguel', 'payable'],
    ['Plano e assinatura', 'payable'],
    ['Carro', 'payable'],
    ['Moto', 'payable'],
    ['Emprestimos', 'payable'],
    ['Luz', 'payable'],
    ['Agua', 'payable'],
    ['Internet e telefone', 'payable'],
    ['Cartoes de credito', 'payable'],
    ['Carne e crediario', 'payable'],
    ['Financiamento', 'payable'],
    ['Mercado', 'payable'],
    ['Saude', 'payable'],
    ['Educacao', 'payable'],
    ['Impostos e taxas', 'payable'],
    ['Fornecedores', 'payable'],
    ['Servicos', 'payable'],
    ['Manutencao', 'payable'],
    ['Moradia', 'payable'],
    ['Vendas', 'receivable'],
    ['Mensalidades', 'receivable'],
    ['Servicos prestados', 'receivable'],
    ['Comissoes', 'receivable'],
    ['Reembolsos', 'receivable'],
    ['Outros', 'both']
  ];

  const insertCategory = database.prepare(`
    INSERT OR IGNORE INTO categories (name, kind)
    VALUES (?, ?)
  `);

  const defaultAccounts = [
    ['Caixa principal', 'cash'],
    ['Banco principal', 'bank'],
    ['Carteira digital', 'wallet'],
    ['Nubank', 'card'],
    ['BrasilCard', 'card'],
    ['Sigacred', 'card'],
    ['Caixa', 'bank'],
    ['Santander', 'bank'],
    ['Avenida', 'card'],
    ['GazinBank', 'card'],
    ['Carne loja fisica', 'store'],
    ['Emprestimo pessoal', 'loan'],
    ['Financiamento veiculo', 'loan']
  ];

  const insertAccount = database.prepare(`
    INSERT OR IGNORE INTO accounts (name, account_type)
    VALUES (?, ?)
  `);

  const defaultMethods = [
    'Pix',
    'Dinheiro',
    'Transferencia',
    'Boleto',
    'Cartao de credito',
    'Cartao de debito',
    'Carne',
    'Debito automatico',
    'Cheque',
    'Deposito'
  ];
  const insertMethod = database.prepare(`
    INSERT OR IGNORE INTO payment_methods (name)
    VALUES (?)
  `);

  const defaultCostCenters = ['Operacional', 'Administrativo', 'Comercial'];
  const insertCostCenter = database.prepare(`
    INSERT OR IGNORE INTO cost_centers (name)
    VALUES (?)
  `);

  const insertSettingIfMissing = database.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value_json)
    VALUES (?, ?)
  `);

  const insertUser = database.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, role)
    VALUES (1, 'Administrador', 'admin@local', 'admin')
  `);

  runInTransaction(database, () => {
    defaultCategories.forEach(([name, kind]) => insertCategory.run(name, kind));
    defaultAccounts.forEach(([name, type]) => insertAccount.run(name, type));
    defaultMethods.forEach((name) => insertMethod.run(name));
    defaultCostCenters.forEach((name) => insertCostCenter.run(name));

    insertSettingIfMissing.run(
      'notifications',
      JSON.stringify({
        enabled: true,
        dueSoonDays: 5,
        dailySummaryOnStartup: true
      })
    );

    insertSettingIfMissing.run(
      'license',
      JSON.stringify({
        apiUrl: 'http://localhost:3877',
        revalidateEveryDays: 7,
        offlineGraceDays: 14,
        requireActivation: true
      })
    );

    insertUser.run();
  });
}

function runInTransaction(database, work) {
  database.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    const result = work();
    database.exec('COMMIT;');
    return result;
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

function initializeDatabase() {
  if (databaseInstance) {
    return databaseInstance;
  }

  const dbPath = getDatabasePath();
  databaseInstance = new DatabaseSync(dbPath);
  databaseInstance.exec('PRAGMA journal_mode = WAL;');
  databaseInstance.exec('PRAGMA foreign_keys = ON;');
  runSchema(databaseInstance);
  runMigrations(databaseInstance);
  seedDefaults(databaseInstance);

  return databaseInstance;
}

function getDatabase() {
  if (!databaseInstance) {
    return initializeDatabase();
  }

  return databaseInstance;
}

function closeDatabase() {
  if (databaseInstance) {
    databaseInstance.close();
    databaseInstance = null;
  }
}

function checkpointDatabase() {
  const database = getDatabase();
  database.exec('PRAGMA wal_checkpoint(FULL);');
}

function restoreDatabaseFromBackup(sourcePath) {
  const dbPath = getDatabasePath();
  const restoreSafetyPath = path.join(
    getBackupDirectory(),
    `antes-da-restauracao-${new Date().toISOString().replace(/[:.]/g, '-')}.db`
  );

  checkpointDatabase();
  closeDatabase();
  fs.copyFileSync(dbPath, restoreSafetyPath);
  fs.copyFileSync(sourcePath, dbPath);
  initializeDatabase();

  return {
    databasePath: dbPath,
    safetyBackupPath: restoreSafetyPath
  };
}

module.exports = {
  checkpointDatabase,
  closeDatabase,
  getBackupDirectory,
  getDatabase,
  getDatabasePath,
  initializeDatabase,
  restoreDatabaseFromBackup,
  runInTransaction
};
