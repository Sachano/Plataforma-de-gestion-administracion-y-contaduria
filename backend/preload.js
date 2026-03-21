// preload.js - Puente seguro entre React (Renderer) y Electron (Main)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    printReceipt: (htmlContent) => ipcRenderer.send('print-receipt', htmlContent),
    onPrintSuccess: (callback) => ipcRenderer.on('print-success', callback),
    onPrintFailure: (callback) => ipcRenderer.on('print-failure', callback)
});
