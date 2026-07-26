const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bmDesktop', Object.freeze({
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke('bm-desktop:get-info'),
  openCustomerDisplay: () => ipcRenderer.invoke('bm-desktop:open-customer-display'),
  closeCustomerDisplay: () => ipcRenderer.invoke('bm-desktop:close-customer-display'),
  toggleFullscreen: () => ipcRenderer.invoke('bm-desktop:toggle-fullscreen')
}));
