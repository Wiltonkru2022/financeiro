const { app } = require('electron');
const { getRecentLogCounts, writeLog } = require('./logService');

function getDatabaseStatus(database) {
  try {
    database.prepare('SELECT 1 AS ok').get();
    return 'ok';
  } catch (_error) {
    return 'critical';
  }
}

function getHealthSnapshot(database, licenseStatus) {
  const logCounts = getRecentLogCounts(database);
  const databaseStatus = getDatabaseStatus(database);
  const licenseState = licenseStatus.active ? 'ok' : licenseStatus.expired ? 'critical' : 'warning';

  let status = 'ok';

  if (databaseStatus === 'critical' || licenseState === 'critical' || logCounts.errorsLast5min >= 5) {
    status = 'critical';
  } else if (licenseState === 'warning' || logCounts.warningsLast5min > 0 || logCounts.errorsLast5min > 0) {
    status = 'warning';
  }

  const snapshot = {
    status,
    database: databaseStatus,
    license: licenseState,
    errorsLast5min: logCounts.errorsLast5min,
    warningsLast5min: logCounts.warningsLast5min,
    appVersion: app.getVersion(),
    checkedAt: new Date().toISOString(),
    recommendations: []
  };

  if (!licenseStatus.active) {
    snapshot.recommendations.push('Ative a licenca ou inicie uma avaliacao.');
  }

  if (logCounts.errorsLast5min > 0) {
    snapshot.recommendations.push('Verifique os logs recentes para corrigir erros operacionais.');
  }

  database
    .prepare(
      `
      INSERT INTO health_checks (
        status,
        database_status,
        license_status,
        errors_last_5min,
        warnings_last_5min,
        details_json
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      snapshot.status,
      snapshot.database,
      snapshot.license,
      snapshot.errorsLast5min,
      snapshot.warningsLast5min,
      JSON.stringify(snapshot)
    );

  if (status !== 'ok') {
    writeLog(database, {
      log_type: 'health',
      level: status === 'critical' ? 'critical' : 'warning',
      message: `Health check em estado ${status}.`,
      metadata: snapshot
    });
  }

  return snapshot;
}

module.exports = {
  getHealthSnapshot
};

