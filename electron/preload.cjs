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
  loadStore: () => ipcRenderer.invoke('store:load'),
  saveStore: (json) => ipcRenderer.send('store:save', json),
  saveCover: (key, data, mime) => ipcRenderer.invoke('cover:save', key, data, mime),
  setMediaWatch: (on) => ipcRenderer.invoke('media-watch:set', on),
  onOtherMediaPlaying: (cb) => {
    const h = () => cb();
    ipcRenderer.on('other-media-playing', h);
    return () => ipcRenderer.removeListener('other-media-playing', h);
  },
  onOpenFiles: (cb) => {
    const handler = (_e, files) => cb(files);
    ipcRenderer.on('open-files', handler);
    ipcRenderer.send('renderer-ready');
    return () => ipcRenderer.removeListener('open-files', handler);
  },
});
