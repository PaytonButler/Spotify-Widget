const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const auth = require('./auth');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 300,
    height: 460,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('index.html');


  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' }; // deny = don't open it inside Electron, handled it via shell
  });

  shell.openExternal('https://open.spotify.com'); // opens Spotify Web Player as an active device
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