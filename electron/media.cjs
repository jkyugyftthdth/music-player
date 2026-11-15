'use strict';
// Media helpers that run in the Electron main process, powered by a bundled ffmpeg.
// - probe():     tags + technical info for ANY audio format ffmpeg understands
// - cover():     embedded album art (any container ffmpeg can read)
// - transcode(): converts formats Chromium cannot decode (WMA, APE, ALAC, AIFF, AC3, DSD ...) to WAV for playback
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function ffmpegBinary() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  let p = require('ffmpeg-static');
  // When packaged, binaries live outside the asar archive.
  if (p && p.includes('app.asar')) p = p.replace('app.asar', 'app.asar.unpacked');
  return p;
}

function run(args, { collectStdout = true, maxBytes = 64 * 1024 * 1024 } = {}) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(ffmpegBinary(), args, { windowsHide: true });
    } catch (e) {
      resolve({ code: -1, stdout: Buffer.alloc(0), stderr: String(e) });
      return;
    }
    const out = [];
    let outLen = 0;
    const err = [];
    proc.stdout.on('data', (d) => {
      if (!collectStdout) return;
      outLen += d.length;
      if (outLen <= maxBytes) out.push(d);
    });
    proc.stderr.on('data', (d) => {
      if (err.reduce((n, b) => n + b.length, 0) < 1024 * 1024) err.push(d);
    });
    proc.on('error', (e) => resolve({ code: -1, stdout: Buffer.alloc(0), stderr: String(e) }));
    proc.on('close', (code) =>
      resolve({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString('utf8') })
    );
  });
}

function parseFfMetadata(text) {
  const tags = {};
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(';') || rawLine.startsWith('[')) continue;
    // keys never contain an unescaped '='
    const m = rawLine.match(/^((?:\\.|[^=\\])+)=(.*)$/);
    if (!m) continue;
    const unesc = (s) => s.replace(/\\(.)/g, '$1');
    tags[unesc(m[1]).toLowerCase()] = unesc(m[2]);
  }
  return tags;
}

function parseInfo(stderr) {
  const info = {};
  const dur = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (dur) info.duration = +dur[1] * 3600 + +dur[2] * 60 + parseFloat(dur[3]);
  const br = stderr.match(/Duration:.*?bitrate:\s*(\d+)\s*kb\/s/);
  if (br) info.bitrateKbps = +br[1];
  const st = stderr.match(/Stream #\d+:\d+[^:]*: Audio: ([^\r\n]+)/);
  if (st) {
    const line = st[1];
    info.codec = line.split(/[ ,(]/)[0];
    const hz = line.match(/(\d+) Hz/);
    if (hz) info.sampleRateHz = +hz[1];
    if (/\bmono\b/.test(line)) info.channels = '1 (Mono)';
    else if (/\bstereo\b/.test(line)) info.channels = '2 (Stereo)';
    else {
      const n = line.match(/(\d+) channels/);
      const ch = line.match(/\b(\d\.\d(?:\(\w+\))?)\b/);
      if (n) info.channels = n[1] === '1' ? '1 (Mono)' : n[1] === '2' ? '2 (Stereo)' : `${n[1]} channels`;
      else if (ch) info.channels = ch[1];
    }
    const sbr = line.match(/(\d+) kb\/s/);
    if (sbr && !info.bitrateKbps) info.bitrateKbps = +sbr[1];
  }
  return info;
}

async function probe(file) {
  const r = await run(['-hide_banner', '-nostdin', '-i', file, '-f', 'ffmetadata', '-'], {
    maxBytes: 4 * 1024 * 1024,
  });
  const tags = parseFfMetadata(r.stdout.toString('utf8'));
  const info = parseInfo(r.stderr);
  // Ogg/Opus keep tags on the stream, which ffmetadata's global section omits: merge them from the input dump.
  const inputDump = r.stderr.split(/\r?\n(?=Output #0)/)[0];
  for (const line of inputDump.split(/\r?\n/)) {
    const m = line.match(/^\s{4,}([A-Za-z_ ]+?)\s*:\s(.+)$/);
    if (!m) continue;
    const k = m[1].trim().toLowerCase();
    if (!(k in tags) && !/^(encoder|major_brand|minor_version|compatible_brands|comment|duration|handler_name|vendor_id|language)$/.test(k)) tags[k] = m[2];
  }
  // container-level tags can be missing from ffmetadata output for some formats; fall back to stderr dump
  return { tags, info, ok: Object.keys(info).length > 0 };
}

async function cover(file) {
  const r = await run(
    ['-v', 'error', '-nostdin', '-i', file, '-map', '0:v:0?', '-an', '-frames:v', '1', '-c:v', 'copy', '-f', 'image2pipe', '-'],
    { maxBytes: 16 * 1024 * 1024 }
  );
  const buf = r.stdout;
  if (!buf || buf.length < 16) return null;
  let mime = 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50) mime = 'image/png';
  else if (buf[0] === 0x42 && buf[1] === 0x4d) mime = 'image/bmp';
  else if (buf.slice(0, 4).toString() === 'RIFF') mime = 'image/webp';
  else if (buf.slice(0, 3).toString() === 'GIF') mime = 'image/gif';
  return { mime, data: buf };
}

const inflight = new Map();

function transcode(file, cacheDir) {
  const st = fs.statSync(file);
  const key = crypto
    .createHash('sha1')
    .update(`${file}|${st.size}|${st.mtimeMs}`)
    .digest('hex')
    .slice(0, 24);
  const out = path.join(cacheDir, `${key}.wav`);
  if (fs.existsSync(out)) return Promise.resolve(out);
  if (inflight.has(key)) return inflight.get(key);

  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = `${out}.part`;
  const p = run(
    ['-v', 'error', '-nostdin', '-y', '-i', file, '-map', '0:a:0', '-vn', '-c:a', 'pcm_s16le', '-f', 'wav', tmp],
    { collectStdout: false }
  )
    .then((r) => {
      if (r.code !== 0 || !fs.existsSync(tmp)) {
        try { fs.rmSync(tmp, { force: true }); } catch {}
        throw new Error(r.stderr.trim() || 'ffmpeg failed');
      }
      fs.renameSync(tmp, out);
      return out;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

function pruneCache(cacheDir, maxBytes = 2 * 1024 * 1024 * 1024) {
  try {
    const files = fs.readdirSync(cacheDir).map((f) => {
      const p = path.join(cacheDir, f);
      const s = fs.statSync(p);
      return { p, size: s.size, t: s.atimeMs };
    });
    let total = files.reduce((n, f) => n + f.size, 0);
    files.sort((a, b) => a.t - b.t);
    for (const f of files) {
      if (total <= maxBytes) break;
      fs.rmSync(f.p, { force: true });
      total -= f.size;
    }
  } catch {}
}

module.exports = { probe, cover, transcode, pruneCache, ffmpegBinary };
