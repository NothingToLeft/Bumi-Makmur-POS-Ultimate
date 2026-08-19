const { app, BrowserWindow, ipcMain, shell, screen, protocol, net, session } = require('electron');
const path = require('node:path');
const { existsSync } = require('node:fs');
const { pathToFileURL } = require('node:url');

const APP_SCHEME = 'bmpos';
const APP_HOST = 'app';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
let mainWindow = null;
let customerDisplayWindow = null;
let latestCustomerDisplaySnapshot = null;

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true
  }
}]);

function resolveDistFile(requestUrl) {
  const url = new URL(requestUrl);
  let pathname = decodeURIComponent(url.pathname || '/').replace(/^\/+/, '');
  if (!pathname) pathname = 'index.html';
  const candidate = path.resolve(DIST_DIR, pathname);
  if (!candidate.startsWith(`${DIST_DIR}${path.sep}`) && candidate !== DIST_DIR) return null;
  if (existsSync(candidate)) return candidate;
  // SPA fallback is limited to navigation paths; missing assets still return index only
  // inside this trusted local origin, which prevents filesystem access outside dist.
  return path.join(DIST_DIR, 'index.html');
}

function secureWindowOptions(overrides = {}) {
  return {
    backgroundColor: '#052e2b',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    ...overrides
  };
}

function hardenWindow(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${APP_ORIGIN}/`)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
}

function loadLocalApp(win, query = '') {
  return win.loadURL(`${APP_ORIGIN}/index.html${query}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow(secureWindowOptions({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Bumi Makmur POS Desktop',
    icon: path.join(__dirname, '..', 'build', 'icon.ico')
  }));
  hardenWindow(mainWindow);
  void loadLocalApp(mainWindow);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function pickCustomerDisplay() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  return displays.find(item => item.id !== primary.id) || primary;
}

function openCustomerDisplay() {
  if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
    customerDisplayWindow.focus();
    return { opened: true, reused: true };
  }
  const target = pickCustomerDisplay();
  customerDisplayWindow = new BrowserWindow(secureWindowOptions({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    minWidth: 800,
    minHeight: 600,
    title: 'Layar Pelanggan',
    frame: true,
    fullscreen: target.id !== screen.getPrimaryDisplay().id,
    icon: path.join(__dirname, '..', 'build', 'icon.ico')
  }));
  hardenWindow(customerDisplayWindow);
  void loadLocalApp(customerDisplayWindow, '?desktopDisplay=1');
  customerDisplayWindow.webContents.once('did-finish-load', () => {
    if (latestCustomerDisplaySnapshot && customerDisplayWindow && !customerDisplayWindow.isDestroyed()) {
      customerDisplayWindow.webContents.send('bm-desktop:customer-display-update', latestCustomerDisplaySnapshot);
    }
  });
  customerDisplayWindow.once('ready-to-show', () => customerDisplayWindow.show());
  customerDisplayWindow.on('closed', () => { customerDisplayWindow = null; });
  return { opened: true, reused: false, externalMonitor: target.id !== screen.getPrimaryDisplay().id };
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('app.bumimakmur.pos.desktop');
    await protocol.handle(APP_SCHEME, request => {
      const file = resolveDistFile(request.url);
      if (!file) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const trustedOrigin = String(details.requestingUrl || '').startsWith(`${APP_ORIGIN}/`);
      callback(trustedOrigin && permission === 'media');
    });

    ipcMain.handle('bm-desktop:get-info', () => ({
      isDesktop: true,
      platform: process.platform,
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron
    }));
    ipcMain.handle('bm-desktop:open-customer-display', (_event, snapshot) => {
      if (snapshot && typeof snapshot === 'object') latestCustomerDisplaySnapshot = snapshot;
      const result = openCustomerDisplay();
      if (latestCustomerDisplaySnapshot && customerDisplayWindow && !customerDisplayWindow.isDestroyed() && !customerDisplayWindow.webContents.isDestroyed()) {
        customerDisplayWindow.webContents.send('bm-desktop:customer-display-update', latestCustomerDisplaySnapshot);
      }
      return result;
    });
    ipcMain.on('bm-desktop:customer-display-update', (_event, snapshot) => {
      if (!snapshot || typeof snapshot !== 'object') return;
      latestCustomerDisplaySnapshot = snapshot;
      if (customerDisplayWindow && !customerDisplayWindow.isDestroyed() && !customerDisplayWindow.webContents.isDestroyed()) {
        customerDisplayWindow.webContents.send('bm-desktop:customer-display-update', snapshot);
      }
    });
    ipcMain.handle('bm-desktop:close-customer-display', () => {
      if (customerDisplayWindow && !customerDisplayWindow.isDestroyed()) customerDisplayWindow.close();
      return { closed: true };
    });
    ipcMain.handle('bm-desktop:toggle-fullscreen', () => {
      if (!mainWindow) return { fullscreen: false };
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return { fullscreen: mainWindow.isFullScreen() };
    });
    createMainWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
