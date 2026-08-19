const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bmDesktop', Object.freeze({
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke('bm-desktop:get-info'),
  openCustomerDisplay: snapshot => ipcRenderer.invoke('bm-desktop:open-customer-display', snapshot || null),
  closeCustomerDisplay: () => ipcRenderer.invoke('bm-desktop:close-customer-display'),
  toggleFullscreen: () => ipcRenderer.invoke('bm-desktop:toggle-fullscreen'),
  publishCustomerDisplay: snapshot => ipcRenderer.send('bm-desktop:customer-display-update', snapshot),
  onCustomerDisplayUpdate: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('bm-desktop:customer-display-update', listener);
    return () => ipcRenderer.removeListener('bm-desktop:customer-display-update', listener);
  }
}));
