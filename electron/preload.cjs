'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch {
      return '';
    }
  },
  analyze: (filePath) => ipcRenderer.invoke('media:analyze', filePath),
  transcode: (filePath) => ipcRenderer.invoke('media:transcode', filePath),
  mediaUrl: (filePath) => ipcRenderer.invoke('media:url', filePath),
  onOpenFiles: (cb) => {
    const handler = (_e, files) => cb(files);
    ipcRenderer.on('open-files', handler);
    ipcRenderer.send('renderer-ready');
    return () => ipcRenderer.removeListener('open-files', handler);
  },
});
