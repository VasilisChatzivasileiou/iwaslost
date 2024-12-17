const { contextBridge, ipcRenderer } = require('electron');

// Expose the quitApp function to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('leave-app')
});
