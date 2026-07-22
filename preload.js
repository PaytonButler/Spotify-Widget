const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('spotifyAPI', {
  login: () => ipcRenderer.invoke('spotify:login'),
  getToken: () => ipcRenderer.invoke('spotify:getToken'),
  quit: () => ipcRenderer.invoke('spotify:quit'),
});