const { runInTransaction } = require('../db/database');

const ENTRY_TYPES = new Set(['payable', 'receivable']);
const STATUSES = new Set(['draft', 'open', 'partial', 'settled', 'overdue', 'cancelled']);
const PLAN_TYPES = new Set(['single', 'fixed', 'installment']);

function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateText, months) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);

  if (date.getDate() !== day) {
    date.setDate(0);
  }

  return date.toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullable(value) {
  return value === undefined || value === '' ? null : value;
}

function money(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function validateEntry(input) {
  if (!ENTRY_TYPES.has(input.entry_type)) {
    throw new Error('Tipo de lancamento invalido.');
  }

  if (!String(input.description || '').trim()) {
    throw new Error('Informe uma descricao.');
  }

  if (!input.due_date) {
    throw new Error('Informe a data de vencimento.');
  }

  if (money(input.amount_total) <= 0) {
    throw new Error('Informe um valor maior que zero.');
  }
}

function calculateOpenAmount(entry) {
  return money(
    toNumber(entry.amount_total) +
      toNumber(entry.amount_interest) +
      toNumber(entry.amount_penalty) -
      toNumber(entry.amount_discount) -
      toNumber(entry.amount_settled)
  );
}

function deriveStatus(entry) {
  if (entry.status === 'cancelled' || entry.status === 'draft') {
    return entry.status;
  }

  const openAmount = calculateOpenAmount(entry);

  if (openAmount <= 0) {
    return 'settled';
  }

  if (toNumber(entry.amount_settled) > 0) {
    return entry.due_date < todayLocal() ? 'overdue' : 'partial';
  }

  return entry.due_date < todayLocal() ? 'overdue' : 'open';
}

function normalizeEntryInput(input, existing = {}) {
  const merged = {
    ...existing,
    ...input,
    description: String(input.description || existing.description || '').trim(),
    party_id: toNullable(input.party_id),
    category_id: toNullable(input.category_id),
    cost_center_id: toNullable(input.cost_center_id),
    account_id: toNullable(input.account_id),
    payment_method_id: toNullable(input.payment_method_id),
    competence_date: toNullable(input.competence_date),
    issue_date: toNullable(input.issue_date),
    due_date: input.due_date || existing.due_date,
    settlement_date: toNullable(input.settlement_date || existing.settlement_date),
    amount_total: money(input.amount_total ?? existing.amount_total),
    amount_discount: money(input.amount_discount ?? existing.amount_discount),
    amount_interest: money(input.amount_interest ?? existing.amount_interest),
    amount_penalty: money(input.amount_penalty ?? existing.amount_penalty),
    amount_settled: money(input.amount_settled ?? existing.amount_settled),
    status: STATUSES.has(input.status) ? input.status : existing.status || 'open',
    plan_type: PLAN_TYPES.has(input.plan_type) ? input.plan_type : existing.plan_type || 'single',
    installment_number: input.installment_number ?? existing.installment_number ?? null,
    installment_total: input.installment_total ?? existing.installment_total ?? null,
    fixed_until: toNullable(input.fixed_until || existing.fixed_until),
    recurrence_group: toNullable(input.recurrence_group || existing.recurrence_group),
    cancellation_reason: toNullable(input.cancellation_reason || existing.cancellation_reason),
    cancelled_at: toNullable(input.cancelled_at || existing.cancelled_at),
    notes: toNullable(input.notes)
  };

  merged.status = deriveStatus(merged);
  return merged;
}

function addAudit(database, entityName, entityId, action, previousData, newData) {
  database
    .prepare(
      `
      INSERT INTO audit_log (entity_name, entity_id, action, previous_data_json, new_data_json)
      VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(
      entityName,
      entityId,
      action,
      previousData ? JSON.stringify(previousData) : null,
      newData ? JSON.stringify(newData) : null
    );
}

function baseEntrySelect() {
  return `
    SELECT
      e.*,
      p.name AS party_name,
      c.name AS category_name,
      cc.name AS cost_center_name,
      a.name AS account_name,
      pm.name AS payment_method_name,
      ROUND(e.amount_total + e.amount_interest + e.amount_penalty - e.amount_discount - e.amount_settled, 2) AS amount_open
    FROM financial_entries e
    LEFT JOIN parties p ON p.id = e.party_id
    LEFT JOIN categories c ON c.id = e.category_id
    LEFT JOIN cost_centers cc ON cc.id = e.cost_center_id
    LEFT JOIN accounts a ON a.id = e.account_id
    LEFT JOIN payment_methods pm ON pm.id = e.payment_method_id
  `;
}

function listEntries(database, filters = {}) {
  const where = ['e.deleted_at IS NULL'];
  const params = [];

  if (filters.entry_type && ENTRY_TYPES.has(filters.entry_type)) {
    where.push('e.entry_type = ?');
    params.push(filters.entry_type);
  }

  if (filters.status && STATUSES.has(filters.status)) {
    where.push('e.status = ?');
    params.push(filters.status);
  }

  if (filters.plan_type && PLAN_TYPES.has(filters.plan_type)) {
    where.push('e.plan_type = ?');
    params.push(filters.plan_type);
  }

  if (filters.only_open) {
    where.push("e.status IN ('open', 'partial', 'overdue')");
  }

  if (filters.query) {
    where.push('(e.description LIKE ? OR p.name LIKE ? OR c.name LIKE ?)');
    const query = `%${filters.query}%`;
    params.push(query, query, query);
  }

  if (filters.due_from) {
    where.push('e.due_date >= ?');
    params.push(filters.due_from);
  }

  if (filters.due_to) {
    where.push('e.due_date <= ?');
    params.push(filters.due_to);
  }

  if (filters.party_id) {
    where.push('e.party_id = ?');
    params.push(filters.party_id);
  }

  if (filters.category_id) {
    where.push('e.category_id = ?');
    params.push(filters.category_id);
  }

  const sql = `
    ${baseEntrySelect()}
    WHERE ${where.join(' AND ')}
    ORDER BY e.due_date ASC, e.id DESC
  `;

  return database.prepare(sql).all(...params);
}

function getEntry(database, id) {
  const entry = database
    .prepare(
      `
      ${baseEntrySelect()}
      WHERE e.id = ? AND e.deleted_at IS NULL
      `
    )
    .get(id);

  if (!entry) {
    throw new Error('Lancamento nao encontrado.');
  }

  return entry;
}

function insertEntry(database, normalized) {
  const result = database
    .prepare(
      `
      INSERT INTO financial_entries (
        entry_type,
        description,
        party_id,
        category_id,
        cost_center_id,
        account_id,
        payment_method_id,
        competence_date,
        issue_date,
        due_date,
        settlement_date,
        amount_total,
        amount_discount,
        amount_interest,
        amount_penalty,
        amount_settled,
        status,
        plan_type,
        installment_number,
        installment_total,
        fixed_until,
        recurrence_group,
        cancellation_reason,
        cancelled_at,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      normalized.entry_type,
      normalized.description,
      normalized.party_id,
      normalized.category_id,
      normalized.cost_center_id,
      normalized.account_id,
      normalized.payment_method_id,
      normalized.competence_date,
      normalized.issue_date,
      normalized.due_date,
      normalized.settlement_date,
      normalized.amount_total,
      normalized.amount_discount,
      normalized.amount_interest,
      normalized.amount_penalty,
      normalized.amount_settled,
      normalized.status,
      normalized.plan_type,
      normalized.installment_number,
      normalized.installment_total,
      normalized.fixed_until,
      normalized.recurrence_group,
      normalized.cancellation_reason,
      normalized.cancelled_at,
      normalized.notes
    );

  const entry = getEntry(database, result.lastInsertRowid);
  addAudit(database, 'financial_entries', entry.id, 'create', null, entry);
  return entry;
}

function createEntry(database, input) {
  validateEntry(input);

  const planType = PLAN_TYPES.has(input.plan_type) ? input.plan_type : 'single';
  const installments = Math.max(1, Math.min(120, Number.parseInt(input.installments || '1', 10) || 1));
  const intervalMonths = Math.max(1, Math.min(24, Number.parseInt(input.installment_interval_months || '1', 10) || 1));
  const fixedMonths = Math.max(1, Math.min(120, Number.parseInt(input.fixed_months || '24', 10) || 24));

  return runInTransaction(database, () => {
    if (planType === 'fixed') {
      const group = `FIXO-${Date.now()}`;
      const fixedUntil = addMonths(input.due_date, fixedMonths - 1);
      const normalized = normalizeEntryInput({
        ...input,
        plan_type: 'fixed',
        recurrence_group: group,
        fixed_until: fixedUntil
      });

      database
        .prepare(
          `
          INSERT INTO recurring_templates (
            entry_type,
            description,
            party_id,
            category_id,
            cost_center_id,
            account_id,
            payment_method_id,
            default_amount,
            plan_type,
            frequency,
            interval_value,
            next_run_date,
            end_date,
            notes
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'fixed', 'monthly', 1, ?, ?, ?)
          `
        )
        .run(
          normalized.entry_type,
          normalized.description,
          normalized.party_id,
          normalized.category_id,
          normalized.cost_center_id,
          normalized.account_id,
          normalized.payment_method_id,
          normalized.amount_total,
          addMonths(input.due_date, fixedMonths),
          fixedUntil,
          normalized.notes
        );

      const entries = [];

      for (let index = 0; index < fixedMonths; index += 1) {
        entries.push(
          insertEntry(
            database,
            normalizeEntryInput({
              ...input,
              plan_type: 'fixed',
              due_date: addMonths(input.due_date, index),
              fixed_until: fixedUntil,
              recurrence_group: group
            })
          )
        );
      }

      return entries;
    }

    if (installments === 1 && planType !== 'installment') {
      return insertEntry(database, normalizeEntryInput({ ...input, plan_type: 'single' }));
    }

    const group = `PARC-${Date.now()}`;
    const total = money(input.amount_total);
    const baseAmount = money(Math.floor((total / installments) * 100) / 100);
    let distributed = 0;
    const entries = [];

    for (let index = 0; index < installments; index += 1) {
      const isLast = index === installments - 1;
      const amount = isLast ? money(total - distributed) : baseAmount;
      distributed = money(distributed + amount);

      entries.push(
        insertEntry(
          database,
          normalizeEntryInput({
            ...input,
            plan_type: 'installment',
            description: `${input.description} (${index + 1}/${installments})`,
            due_date: addMonths(input.due_date, index * intervalMonths),
            amount_total: amount,
            installment_number: index + 1,
            installment_total: installments,
            recurrence_group: group
          })
        )
      );
    }

    return entries;
  });
}

function updateEntry(database, id, input) {
  return runInTransaction(database, () => {
    const previous = getEntry(database, id);
    const normalized = normalizeEntryInput(input, previous);
    validateEntry(normalized);

    database
      .prepare(
        `
        UPDATE financial_entries
        SET
          entry_type = ?,
          description = ?,
          party_id = ?,
          category_id = ?,
          cost_center_id = ?,
          account_id = ?,
          payment_method_id = ?,
          competence_date = ?,
          issue_date = ?,
          due_date = ?,
          settlement_date = ?,
          amount_total = ?,
          amount_discount = ?,
          amount_interest = ?,
          amount_penalty = ?,
          amount_settled = ?,
          status = ?,
          plan_type = ?,
          installment_number = ?,
          installment_total = ?,
          fixed_until = ?,
          recurrence_group = ?,
          cancellation_reason = ?,
          cancelled_at = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
        `
      )
      .run(
        normalized.entry_type,
        normalized.description,
        normalized.party_id,
        normalized.category_id,
        normalized.cost_center_id,
        normalized.account_id,
        normalized.payment_method_id,
        normalized.competence_date,
        normalized.issue_date,
        normalized.due_date,
        normalized.settlement_date,
        normalized.amount_total,
        normalized.amount_discount,
        normalized.amount_interest,
        normalized.amount_penalty,
        normalized.amount_settled,
        normalized.status,
        normalized.plan_type,
        normalized.installment_number,
        normalized.installment_total,
        normalized.fixed_until,
        normalized.recurrence_group,
        normalized.cancellation_reason,
        normalized.cancelled_at,
        normalized.notes,
        id
      );

    const updated = getEntry(database, id);
    addAudit(database, 'financial_entries', id, 'update', previous, updated);
    return updated;
  });
}

function deleteEntry(database, id, input = {}) {
  return runInTransaction(database, () => {
    const previous = getEntry(database, id);
    const reason = String(input.cancellation_reason || input.reason || '').trim();

    if (!reason) {
      throw new Error('Informe o motivo do cancelamento.');
    }

    database
      .prepare(
        `
        UPDATE financial_entries
        SET status = 'cancelled',
            cancellation_reason = ?,
            cancelled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
        `
      )
      .run(reason, id);

    const updated = getEntry(database, id);
    addAudit(database, 'financial_entries', id, 'cancel', previous, updated);
    return { id, cancelled: true, reason };
  });
}

function updateAccountBalance(database, entry, amount) {
  if (!entry.account_id || amount <= 0) {
    return;
  }

  const signedAmount = entry.entry_type === 'receivable' ? amount : amount * -1;

  database
    .prepare(
      `
      UPDATE accounts
      SET current_balance = ROUND(current_balance + ?, 2),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `
    )
    .run(signedAmount, entry.account_id);
}

function settleEntry(database, id, input) {
  return runInTransaction(database, () => {
    const previous = getEntry(database, id);
    const settlementAmount = money(input.amount || previous.amount_open);

    if (settlementAmount <= 0) {
      throw new Error('Informe um valor de baixa maior que zero.');
    }

    const discount = money(input.discount || 0);
    const interest = money(input.interest || 0);
    const penalty = money(input.penalty || 0);
    const settlementDate = input.settlement_date || todayLocal();

    database
      .prepare(
        `
        INSERT INTO settlements (entry_id, settlement_date, amount, discount, interest, penalty, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(id, settlementDate, settlementAmount, discount, interest, penalty, toNullable(input.notes));

    const nextValues = {
      ...previous,
      amount_discount: money(previous.amount_discount + discount),
      amount_interest: money(previous.amount_interest + interest),
      amount_penalty: money(previous.amount_penalty + penalty),
      amount_settled: money(previous.amount_settled + settlementAmount),
      settlement_date: settlementDate,
      status: previous.status
    };

    nextValues.status = deriveStatus(nextValues);

    database
      .prepare(
        `
        UPDATE financial_entries
        SET amount_discount = ?,
            amount_interest = ?,
            amount_penalty = ?,
            amount_settled = ?,
            settlement_date = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
        `
      )
      .run(
        nextValues.amount_discount,
        nextValues.amount_interest,
        nextValues.amount_penalty,
        nextValues.amount_settled,
        nextValues.settlement_date,
        nextValues.status,
        id
      );

    updateAccountBalance(database, previous, settlementAmount);

    const updated = getEntry(database, id);
    addAudit(database, 'financial_entries', id, 'settle', previous, updated);
    return updated;
  });
}

function listSettlements(database, entryId) {
  return database
    .prepare(
      `
      SELECT *
      FROM settlements
      WHERE entry_id = ?
      ORDER BY settlement_date DESC, id DESC
      `
    )
    .all(entryId);
}

function getAuditLog(database, limit = 100) {
  return database
    .prepare(
      `
      SELECT *
      FROM audit_log
      ORDER BY id DESC
      LIMIT ?
      `
    )
    .all(limit);
}

module.exports = {
  addDays,
  calculateOpenAmount,
  createEntry,
  deleteEntry,
  getAuditLog,
  getEntry,
  listEntries,
  listSettlements,
  settleEntry,
  todayLocal,
  updateEntry
};
