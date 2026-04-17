function writeLog(database, input) {
  const payload = {
    log_type: input.log_type || 'action',
    level: input.level || 'info',
    message: String(input.message || '').slice(0, 1000),
    entity_name: input.entity_name || null,
    entity_id: input.entity_id || null,
    user_id: input.user_id || 1,
    metadata_json: input.metadata ? JSON.stringify(input.metadata) : null
  };

  if (!payload.message) {
    payload.message = 'Evento sem mensagem.';
  }

  const result = database
    .prepare(
      `
      INSERT INTO app_logs (
        log_type,
        level,
        message,
        entity_name,
        entity_id,
        user_id,
        metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      payload.log_type,
      payload.level,
      payload.message,
      payload.entity_name,
      payload.entity_id,
      payload.user_id,
      payload.metadata_json
    );

  return database.prepare('SELECT * FROM app_logs WHERE id = ?').get(result.lastInsertRowid);
}

function listLogs(database, filters = {}) {
  const where = [];
  const params = [];

  if (filters.level) {
    where.push('level = ?');
    params.push(filters.level);
  }

  if (filters.log_type) {
    where.push('log_type = ?');
    params.push(filters.log_type);
  }

  const sql = `
    SELECT *
    FROM app_logs
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY id DESC
    LIMIT ?
  `;

  return database.prepare(sql).all(...params, Math.max(1, Math.min(500, Number(filters.limit || 120))));
}

function getRecentLogCounts(database) {
  return database
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN level IN ('error', 'critical') THEN 1 ELSE 0 END), 0) AS errorsLast5min,
        COALESCE(SUM(CASE WHEN level = 'warning' THEN 1 ELSE 0 END), 0) AS warningsLast5min
      FROM app_logs
      WHERE created_at >= datetime('now', '-5 minutes')
      `
    )
    .get();
}

module.exports = {
  getRecentLogCounts,
  listLogs,
  writeLog
};

