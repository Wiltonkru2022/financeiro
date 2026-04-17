const { addDays, todayLocal } = require('./financeService');
const { getSettings } = require('./systemService');

function refreshDerivedStatuses(database, today) {
  database
    .prepare(
      `
      UPDATE financial_entries
      SET status = 'overdue',
          updated_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND due_date < ?
        AND status IN ('open', 'partial')
      `
    )
    .run(today);

  database
    .prepare(
      `
      UPDATE financial_entries
      SET status = CASE
            WHEN amount_settled <= 0 THEN 'open'
            ELSE 'partial'
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND due_date >= ?
        AND status = 'overdue'
        AND amount_settled < amount_total + amount_interest + amount_penalty - amount_discount
      `
    )
    .run(today);
}

function getTotals(database, today) {
  const monthStart = `${today.slice(0, 7)}-01`;

  return database
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE
          WHEN entry_type = 'payable' AND status IN ('open', 'partial', 'overdue')
          THEN amount_total + amount_interest + amount_penalty - amount_discount - amount_settled
          ELSE 0
        END), 0) AS totalPayableOpen,
        COALESCE(SUM(CASE
          WHEN entry_type = 'receivable' AND status IN ('open', 'partial', 'overdue')
          THEN amount_total + amount_interest + amount_penalty - amount_discount - amount_settled
          ELSE 0
        END), 0) AS totalReceivableOpen,
        COALESCE(SUM(CASE
          WHEN entry_type = 'payable' AND status = 'settled' AND settlement_date >= ?
          THEN amount_settled
          ELSE 0
        END), 0) AS paidThisMonth,
        COALESCE(SUM(CASE
          WHEN entry_type = 'receivable' AND status = 'settled' AND settlement_date >= ?
          THEN amount_settled
          ELSE 0
        END), 0) AS receivedThisMonth
      FROM financial_entries
      WHERE deleted_at IS NULL
      `
    )
    .get(monthStart, monthStart);
}

function getCounts(database, today, soonLimit) {
  return database
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'overdue' AND entry_type = 'payable' THEN 1 ELSE 0 END), 0) AS overduePayables,
        COALESCE(SUM(CASE WHEN status = 'overdue' AND entry_type = 'receivable' THEN 1 ELSE 0 END), 0) AS overdueReceivables,
        COALESCE(SUM(CASE WHEN due_date = ? AND status IN ('open', 'partial', 'overdue') AND entry_type = 'payable' THEN 1 ELSE 0 END), 0) AS dueTodayPayables,
        COALESCE(SUM(CASE WHEN due_date = ? AND status IN ('open', 'partial', 'overdue') AND entry_type = 'receivable' THEN 1 ELSE 0 END), 0) AS dueTodayReceivables,
        COALESCE(SUM(CASE WHEN due_date > ? AND due_date <= ? AND status IN ('open', 'partial') AND entry_type = 'payable' THEN 1 ELSE 0 END), 0) AS dueSoonPayables,
        COALESCE(SUM(CASE WHEN due_date > ? AND due_date <= ? AND status IN ('open', 'partial') AND entry_type = 'receivable' THEN 1 ELSE 0 END), 0) AS dueSoonReceivables
      FROM financial_entries
      WHERE deleted_at IS NULL
      `
    )
    .get(today, today, today, soonLimit, today, soonLimit);
}

function getNextEntries(database) {
  return database
    .prepare(
      `
      SELECT
        e.id,
        e.entry_type,
        e.description,
        e.due_date,
        e.amount_total,
        e.amount_settled,
        e.plan_type,
        e.installment_number,
        e.installment_total,
        ROUND(e.amount_total + e.amount_interest + e.amount_penalty - e.amount_discount - e.amount_settled, 2) AS amount_open,
        e.status,
        p.name AS party_name,
        c.name AS category_name
      FROM financial_entries e
      LEFT JOIN parties p ON p.id = e.party_id
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.deleted_at IS NULL
        AND e.status IN ('open', 'partial', 'overdue')
      ORDER BY e.due_date ASC, e.id ASC
      LIMIT 12
      `
    )
    .all();
}

function getCategorySummary(database) {
  return database
    .prepare(
      `
      SELECT
        e.entry_type,
        COALESCE(c.name, 'Sem categoria') AS category_name,
        COUNT(*) AS entry_count,
        ROUND(SUM(e.amount_total + e.amount_interest + e.amount_penalty - e.amount_discount - e.amount_settled), 2) AS amount_open
      FROM financial_entries e
      LEFT JOIN categories c ON c.id = e.category_id
      WHERE e.deleted_at IS NULL
        AND e.status IN ('open', 'partial', 'overdue')
      GROUP BY e.entry_type, COALESCE(c.name, 'Sem categoria')
      ORDER BY amount_open DESC
      LIMIT 12
      `
    )
    .all();
}

function getCashFlow(database, today) {
  const endDate = addDays(today, 45);

  return database
    .prepare(
      `
      SELECT
        due_date,
        ROUND(SUM(CASE
          WHEN entry_type = 'receivable'
          THEN amount_total + amount_interest + amount_penalty - amount_discount - amount_settled
          ELSE 0
        END), 2) AS receivable,
        ROUND(SUM(CASE
          WHEN entry_type = 'payable'
          THEN amount_total + amount_interest + amount_penalty - amount_discount - amount_settled
          ELSE 0
        END), 2) AS payable
      FROM financial_entries
      WHERE deleted_at IS NULL
        AND status IN ('open', 'partial', 'overdue')
        AND due_date BETWEEN ? AND ?
      GROUP BY due_date
      ORDER BY due_date ASC
      `
    )
    .all(today, endDate)
    .map((row) => ({
      ...row,
      balance: Number(row.receivable || 0) - Number(row.payable || 0)
    }));
}

function getAccounts(database) {
  return database
    .prepare(
      `
      SELECT id, name, account_type, institution, current_balance, is_active
      FROM accounts
      WHERE is_active = 1
      ORDER BY name ASC
      `
    )
    .all();
}

function getPlanSummary(database) {
  return database
    .prepare(
      `
      SELECT
        plan_type,
        COUNT(*) AS entry_count,
        ROUND(SUM(amount_total + amount_interest + amount_penalty - amount_discount - amount_settled), 2) AS amount_open
      FROM financial_entries
      WHERE deleted_at IS NULL
        AND status IN ('open', 'partial', 'overdue')
      GROUP BY plan_type
      `
    )
    .all();
}

function getDashboardSnapshot(database) {
  const today = todayLocal();
  const settings = getSettings(database);
  const soonDays = Number(settings.notifications.dueSoonDays || 3);
  const soonLimit = addDays(today, soonDays);

  refreshDerivedStatuses(database, today);

  const totals = getTotals(database, today);
  totals.projectedBalance = Number(totals.totalReceivableOpen || 0) - Number(totals.totalPayableOpen || 0);

  return {
    today,
    soonLimit,
    settings,
    totals,
    counts: getCounts(database, today, soonLimit),
    nextEntries: getNextEntries(database),
    categorySummary: getCategorySummary(database),
    cashFlow: getCashFlow(database, today),
    accounts: getAccounts(database),
    planSummary: getPlanSummary(database)
  };
}

module.exports = {
  getDashboardSnapshot,
  refreshDerivedStatuses
};
