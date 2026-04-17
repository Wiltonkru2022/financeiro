PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier', 'both')),
    name TEXT NOT NULL,
    document_number TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('payable', 'receivable', 'both')),
    color TEXT DEFAULT '#4E5B31',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
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

CREATE TABLE IF NOT EXISTS cost_centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('payable', 'receivable')),
    description TEXT NOT NULL,
    party_id INTEGER,
    category_id INTEGER,
    cost_center_id INTEGER,
    account_id INTEGER,
    payment_method_id INTEGER,
    competence_date TEXT,
    issue_date TEXT,
    due_date TEXT NOT NULL,
    settlement_date TEXT,
    amount_total REAL NOT NULL CHECK (amount_total >= 0),
    amount_discount REAL NOT NULL DEFAULT 0 CHECK (amount_discount >= 0),
    amount_interest REAL NOT NULL DEFAULT 0 CHECK (amount_interest >= 0),
    amount_penalty REAL NOT NULL DEFAULT 0 CHECK (amount_penalty >= 0),
    amount_settled REAL NOT NULL DEFAULT 0 CHECK (amount_settled >= 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partial', 'settled', 'overdue', 'cancelled')),
    plan_type TEXT NOT NULL DEFAULT 'single' CHECK (plan_type IN ('single', 'fixed', 'installment')),
    installment_number INTEGER,
    installment_total INTEGER,
    fixed_until TEXT,
    recurrence_group TEXT,
    cancellation_reason TEXT,
    cancelled_at TEXT,
    notes TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

CREATE TABLE IF NOT EXISTS recurring_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('payable', 'receivable')),
    description TEXT NOT NULL,
    party_id INTEGER,
    category_id INTEGER,
    cost_center_id INTEGER,
    account_id INTEGER,
    payment_method_id INTEGER,
    default_amount REAL NOT NULL DEFAULT 0 CHECK (default_amount >= 0),
    plan_type TEXT NOT NULL DEFAULT 'fixed' CHECK (plan_type IN ('fixed', 'installment')),
    frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'custom_days')),
    interval_value INTEGER NOT NULL DEFAULT 1,
    next_run_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    last_generated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    template_id INTEGER,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('new_entry', 'due_today', 'due_soon', 'overdue', 'receivable_overdue')),
    remind_at TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'desktop' CHECK (channel IN ('desktop')),
    is_read INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES financial_entries(id),
    FOREIGN KEY (template_id) REFERENCES recurring_templates(id)
);

CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    settlement_date TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    discount REAL NOT NULL DEFAULT 0 CHECK (discount >= 0),
    interest REAL NOT NULL DEFAULT 0 CHECK (interest >= 0),
    penalty REAL NOT NULL DEFAULT 0 CHECK (penalty >= 0),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES financial_entries(id)
);

CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_path TEXT,
    stored_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES financial_entries(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'cancel', 'settle', 'restore')),
    previous_data_json TEXT,
    new_data_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT NOT NULL CHECK (log_type IN ('action', 'error', 'license', 'health', 'security')),
    level TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    entity_name TEXT,
    entity_id INTEGER,
    user_id INTEGER,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL CHECK (status IN ('ok', 'warning', 'critical')),
    database_status TEXT NOT NULL DEFAULT 'unknown',
    license_status TEXT NOT NULL DEFAULT 'unknown',
    errors_last_5min INTEGER NOT NULL DEFAULT 0,
    warnings_last_5min INTEGER NOT NULL DEFAULT 0,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_entries_due_date ON financial_entries(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_entries_status ON financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_financial_entries_entry_type ON financial_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_settlements_entry_id ON settlements(entry_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at ON health_checks(created_at);
