const { Notification } = require('electron');
const { getDashboardSnapshot } = require('./dashboardService');

function getAlertMessages(snapshot) {
  const { counts } = snapshot;
  const messages = [];

  if (counts.overduePayables > 0) {
    messages.push(`${counts.overduePayables} conta(s) a pagar vencida(s)`);
  }

  if (counts.overdueReceivables > 0) {
    messages.push(`${counts.overdueReceivables} conta(s) a receber vencida(s)`);
  }

  if (counts.dueTodayPayables > 0) {
    messages.push(`${counts.dueTodayPayables} conta(s) a pagar vencem hoje`);
  }

  if (counts.dueTodayReceivables > 0) {
    messages.push(`${counts.dueTodayReceivables} conta(s) a receber vencem hoje`);
  }

  if (counts.dueSoonPayables > 0) {
    messages.push(`${counts.dueSoonPayables} conta(s) a pagar vencem em breve`);
  }

  if (counts.dueSoonReceivables > 0) {
    messages.push(`${counts.dueSoonReceivables} conta(s) a receber vencem em breve`);
  }

  return messages;
}

function runNotificationScan(database, options = {}) {
  const snapshot = getDashboardSnapshot(database);
  const messages = getAlertMessages(snapshot);
  const notificationsEnabled = snapshot.settings.notifications.enabled !== false;
  const shouldShow = notificationsEnabled && (options.force || snapshot.settings.notifications.dailySummaryOnStartup);

  if (messages.length > 0 && shouldShow && Notification.isSupported()) {
    const notification = new Notification({
      title: 'FinancePro - alerta financeiro',
      body: messages.slice(0, 4).join('\n'),
      silent: false,
      urgency: messages.some((message) => message.includes('vencida')) ? 'critical' : 'normal'
    });

    notification.show();
  }

  return {
    hasAlerts: messages.length > 0,
    messages,
    snapshot
  };
}

module.exports = {
  getAlertMessages,
  runNotificationScan
};
