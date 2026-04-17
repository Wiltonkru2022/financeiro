const { runInTransaction } = require('../db/database');

const ROLES = new Set(['admin', 'manager', 'operator', 'viewer']);

function normalizeUser(input = {}) {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const role = ROLES.has(input.role) ? input.role : 'operator';
  const isActive = input.is_active === false || input.is_active === 0 || input.is_active === '0' ? 0 : 1;

  if (!name) {
    throw new Error('Informe o nome do usuario.');
  }

  return {
    name,
    email: email || null,
    role,
    is_active: isActive
  };
}

function listUsers(database) {
  return database
    .prepare(
      `
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY is_active DESC, name ASC
      `
    )
    .all();
}

function createUser(database, input) {
  const user = normalizeUser(input);

  return runInTransaction(database, () => {
    const result = database
      .prepare(
        `
        INSERT INTO users (name, email, role, is_active)
        VALUES (?, ?, ?, ?)
        `
      )
      .run(user.name, user.email, user.role, user.is_active);

    return database.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  });
}

function updateUser(database, id, input) {
  const user = normalizeUser(input);

  return runInTransaction(database, () => {
    database
      .prepare(
        `
        UPDATE users
        SET name = ?,
            email = ?,
            role = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `
      )
      .run(user.name, user.email, user.role, user.is_active, id);

    return database.prepare('SELECT * FROM users WHERE id = ?').get(id);
  });
}

function deleteUser(database, id) {
  return runInTransaction(database, () => {
    database
      .prepare(
        `
        UPDATE users
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
  createUser,
  deleteUser,
  listUsers,
  updateUser
};
