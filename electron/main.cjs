'use strict';
const { app, BrowserWindow, ipcMain, protocol, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const media = require('./media.cjs');

const AUDIO_EXT = new Set([
  'mp3', 'mp2', 'mp1', 'wav', 'wave', 'flac', 'ogg', 'oga', 'opus', 'spx', 'm4a', 'm4b', 'aac', 'mp4', 'wma', 'asf',
  'ape', 'alac', 'aif', 'aiff', 'aifc', 'wv', 'mka', 'webm', 'mpc', 'mp+', 'ac3', 'eac3', 'dts', 'amr', 'awb', 'au',
  'snd', 'caf', 'tta', 'dsf', 'dff', 'mid', 'midi', 'ra', 'rm', 'tak', 'oma', 'w64', 'voc', '3gp', 'm4r',
]);
const IMAGE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const AUDIO_MIME = {
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  m4a: 'audio/mp4', aac: 'audio/aac', webm: 'audio/webm', mp4: 'audio/mp4',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'localmedia',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true, bypassCSP: true },
  },
]);

const isDev = !app.isPackaged && process.env.ELECTRON_DEV_URL;
let mainWindow = null;
let rendererReady = false;
const pendingOpen = [];
let transcodeDir = null;

function extOf(p) {
  return path.extname(p).slice(1).toLowerCase();
}

function audioArgs(argv) {
  return argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((a) => !a.startsWith('-') && AUDIO_EXT.has(extOf(a)) && fs.existsSync(a))
    .map((a) => path.resolve(a));
}

function deliverOpen(files) {
  if (!files.length) return;
  if (mainWindow && rendererReady) {
    mainWindow.webContents.send('open-files', files);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingOpen.push(...files);
  }
}

function toMediaUrl(p) {
  return 'localmedia://file/' + encodeURIComponent(p);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 200,
    show: false,
    title: 'Music Player',
    backgroundColor: '#202020',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:') && !(isDev && url.startsWith(process.env.ELECTRON_DEV_URL))) e.preventDefault();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererReady = false;
  });
  if (isDev) mainWindow.loadURL(process.env.ELECTRON_DEV_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function serveFile(request) {
  const url = new URL(request.url);
  const filePath = decodeURIComponent(url.pathname.slice(1));
  const ext = extOf(filePath);
  const inCache = transcodeDir && path.resolve(filePath).startsWith(transcodeDir);
  if (!inCache && !AUDIO_EXT.has(ext) && !IMAGE_MIME[ext]) return new Response('Forbidden', { status: 403 });

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const size = stat.size;
  const type = AUDIO_MIME[ext] || IMAGE_MIME[ext] || 'application/octet-stream';
  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  };
  const range = request.headers.get('range');
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      if (m[1] === '' && m[2] !== '') {
        start = Math.max(0, size - parseInt(m[2], 10));
      } else {
        if (m[1] !== '') start = parseInt(m[1], 10);
        if (m[2] !== '') end = Math.min(size - 1, parseInt(m[2], 10));
      }
      if (start > end || start >= size) {
        return new Response('Range Not Satisfiable', { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
  }
  headers['Content-Length'] = String(size === 0 ? 0 : end - start + 1);
  if (size === 0) return new Response(null, { status: 200, headers });
  const stream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
  return new Response(stream, { status, headers });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => deliverOpen(audioArgs(argv)));

  app.whenReady().then(() => {
    transcodeDir = path.join(app.getPath('userData'), 'transcode-cache');
    media.pruneCache(transcodeDir);
    protocol.handle('localmedia', serveFile);

    ipcMain.handle('media:analyze', async (_e, file) => {
      try {
        const [p, c] = await Promise.all([media.probe(file), media.cover(file)]);
        return { ok: p.ok, tags: p.tags, info: p.info, cover: c };
      } catch (err) {
        return { ok: false, tags: {}, info: {}, cover: null, error: String(err) };
      }
    });
    ipcMain.handle('media:transcode', async (_e, file) => {
      const out = await media.transcode(file, transcodeDir);
      return toMediaUrl(out);
    });
    ipcMain.handle('media:url', (_e, file) => toMediaUrl(file));
    ipcMain.on('renderer-ready', () => {
      rendererReady = true;
      if (pendingOpen.length) {
        mainWindow?.webContents.send('open-files', pendingOpen.splice(0));
      }
    });

    pendingOpen.push(...audioArgs(process.argv));
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
