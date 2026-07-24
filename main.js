const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const auth = require('./auth');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 420,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('spotify:login', async () => {
  if (!auth.isLoggedIn()) await auth.login();
  return true;
});

ipcMain.handle('spotify:getToken', async () => auth.getValidAccessToken());
ipcMain.handle('spotify:quit', () => app.quit());
ipcMain.handle('spotify:minimize', () => win.minimize());

app.on('window-all-closed', () => app.quit());