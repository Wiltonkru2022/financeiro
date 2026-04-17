const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { getDatabase, getDatabasePath, initializeDatabase } = require('../db/database');
const { listLookups, listCatalog, createCatalog, updateCatalog, deleteCatalog } = require('../services/catalogService');
const { getDashboardSnapshot } = require('../services/dashboardService');
const {
  createEntry,
  deleteEntry,
  getAuditLog,
  getEntry,
  listEntries,
  listSettlements,
  settleEntry,
  updateEntry
} = require('../services/financeService');
const { getHealthSnapshot } = require('../services/healthService');
const { activateLicense, clearLicense, getLicenseStatus, startTrial } = require('../services/licenseService');
const { listLogs, writeLog } = require('../services/logService');
const { runNotificationScan } = require('../services/notificationService');
const { createBackup, exportEntriesCsv, getSettings, restoreBackup, updateSetting } = require('../services/systemService');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    frame: false,
    show: false,
    backgroundColor: '#07101d',
    title: 'FinancePro',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Criar backup',
          click: () => mainWindow?.webContents.send('menu:create-backup')
        },
        {
          label: 'Exportar CSV',
          click: () => mainWindow?.webContents.send('menu:export-csv')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Abrir pasta de dados',
          click: () => shell.showItemInFolder(getDatabasePath())
        }
      ]
    }
  ];

  Menu.setApplicationMenu(null);
}

function saveDialog(defaultPath, filters) {
  return dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters
  });
}

function openDialog(filters) {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-bootstrap', () => {
    const db = getDatabase();
    return {
      appName: 'FinancePro',
      databasePath: getDatabasePath(),
      version: app.getVersion(),
      modules: [
        { id: 'dashboard', label: 'Painel', icon: 'home' },
        { id: 'receivable', label: 'Contas a Receber', icon: 'in' },
        { id: 'payable', label: 'Contas a Pagar', icon: 'out' },
        { id: 'catalog_parties', label: 'Clientes e Fornecedores', icon: 'people' },
        { id: 'catalog_categories', label: 'Categorias', icon: 'tag' },
        { id: 'catalog_cost_centers', label: 'Centro de Custo', icon: 'grid' },
        { id: 'reports', label: 'Relatorios', icon: 'chart' },
        { id: 'backup', label: 'Configuracoes', icon: 'gear' }
      ],
      lookups: listLookups(db),
      settings: getSettings(db),
      license: getLicenseStatus(),
      health: getHealthSnapshot(db, getLicenseStatus()),
      snapshot: getDashboardSnapshot(db)
    };
  });

  ipcMain.handle('dashboard:get-snapshot', () => getDashboardSnapshot(getDatabase()));

  ipcMain.handle('entries:list', (_event, filters) => listEntries(getDatabase(), filters || {}));
  ipcMain.handle('entries:get', (_event, id) => ({
    entry: getEntry(getDatabase(), id),
    settlements: listSettlements(getDatabase(), id)
  }));
  ipcMain.handle('entries:create', (_event, input) => {
    const result = createEntry(getDatabase(), input || {});
    writeLog(getDatabase(), { log_type: 'action', message: 'Lancamento criado.', entity_name: 'financial_entries' });
    return result;
  });
  ipcMain.handle('entries:update', (_event, id, input) => {
    const result = updateEntry(getDatabase(), id, input || {});
    writeLog(getDatabase(), { log_type: 'action', message: 'Lancamento atualizado.', entity_name: 'financial_entries', entity_id: id });
    return result;
  });
  ipcMain.handle('entries:delete', (_event, id, input) => {
    const result = deleteEntry(getDatabase(), id, input || {});
    writeLog(getDatabase(), { log_type: 'action', level: 'warning', message: 'Lancamento cancelado.', entity_name: 'financial_entries', entity_id: id });
    return result;
  });
  ipcMain.handle('entries:settle', (_event, id, input) => {
    const result = settleEntry(getDatabase(), id, input || {});
    writeLog(getDatabase(), { log_type: 'action', message: 'Baixa financeira registrada.', entity_name: 'financial_entries', entity_id: id });
    return result;
  });

  ipcMain.handle('catalogs:list', (_event, kind) => listCatalog(getDatabase(), kind));
  ipcMain.handle('catalogs:create', (_event, kind, input) => createCatalog(getDatabase(), kind, input || {}));
  ipcMain.handle('catalogs:update', (_event, kind, id, input) => updateCatalog(getDatabase(), kind, id, input || {}));
  ipcMain.handle('catalogs:delete', (_event, kind, id) => deleteCatalog(getDatabase(), kind, id));

  ipcMain.handle('settings:get', () => getSettings(getDatabase()));
  ipcMain.handle('settings:update', (_event, key, value) => updateSetting(getDatabase(), key, value));

  ipcMain.handle('audit:list', (_event, limit) => getAuditLog(getDatabase(), limit || 100));
  ipcMain.handle('logs:list', (_event, filters) => listLogs(getDatabase(), filters || {}));
  ipcMain.handle('health:get', () => getHealthSnapshot(getDatabase(), getLicenseStatus()));

  ipcMain.handle('license:get-status', () => getLicenseStatus());
  ipcMain.handle('license:start-trial', () => startTrial(getDatabase()));
  ipcMain.handle('license:activate', (_event, input) => activateLicense(getDatabase(), input || {}));
  ipcMain.handle('license:clear', () => clearLicense(getDatabase()));
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:close', () => mainWindow?.close());

  ipcMain.handle('notifications:scan', (_event, options) => runNotificationScan(getDatabase(), options || {}));

  ipcMain.handle('system:create-backup', async () => {
    const result = await saveDialog(`financepro-backup-${new Date().toISOString().slice(0, 10)}.db`, [
      { name: 'Banco FinancePro', extensions: ['db'] }
    ]);

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    return createBackup(getDatabase(), result.filePath);
  });

  ipcMain.handle('system:export-csv', async (_event, filters) => {
    const result = await saveDialog(`financepro-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`, [
      { name: 'CSV', extensions: ['csv'] }
    ]);

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    return exportEntriesCsv(getDatabase(), result.filePath, filters || {});
  });

  ipcMain.handle('system:restore-backup', async () => {
    const result = await openDialog([{ name: 'Banco FinancePro', extensions: ['db'] }]);

    if (result.canceled || !result.filePaths?.[0]) {
      return { canceled: true };
    }

    const restored = restoreBackup(result.filePaths[0]);
    return {
      ...restored,
      restored: true,
      snapshot: getDashboardSnapshot(getDatabase()),
      lookups: listLookups(getDatabase())
    };
  });
}

app.whenReady().then(() => {
  initializeDatabase();
  registerIpcHandlers();
  createMenu();
  createWindow();
  runNotificationScan(getDatabase());

  const oneHour = 60 * 60 * 1000;
  setInterval(() => runNotificationScan(getDatabase()), oneHour);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
