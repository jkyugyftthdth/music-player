// Bridge to the Electron main process (ffmpeg-powered tag/cover reading and format conversion).
// In a plain browser every helper degrades gracefully and the app behaves exactly as before.

export interface NativeAnalysis {
  ok: boolean;
  tags: Record<string, string>;
  info: {
    duration?: number;
    bitrateKbps?: number;
    sampleRateHz?: number;
    channels?: string;
    codec?: string;
  };
  cover: { mime: string; data: Uint8Array } | null;
}

interface ElectronAPI {
  isElectron: true;
  getPathForFile(file: File): string;
  analyze(path: string): Promise<NativeAnalysis>;
  transcode(path: string): Promise<string>;
  mediaUrl(path: string): Promise<string>;
  onOpenFiles(cb: (paths: string[]) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const nativeApi = (): ElectronAPI | undefined =>
  typeof window !== 'undefined' ? window.electronAPI : undefined;

/** Every extension the player will accept (ffmpeg decodes the ones Chromium cannot). */
export const AUDIO_EXTENSIONS = [
  'mp3', 'mp2', 'mp1', 'wav', 'wave', 'flac', 'ogg', 'oga', 'opus', 'spx', 'm4a', 'm4b', 'aac', 'mp4', 'wma', 'asf',
  'ape', 'alac', 'aif', 'aiff', 'aifc', 'wv', 'mka', 'webm', 'mpc', 'ac3', 'eac3', 'dts', 'amr', 'awb', 'au', 'snd',
  'caf', 'tta', 'dsf', 'dff', 'ra', 'tak', 'oma', 'w64', 'voc', '3gp', 'm4r',
];

export const AUDIO_ACCEPT = ['audio/*', ...AUDIO_EXTENSIONS.map((e) => `.${e}`)].join(',');

const AUDIO_EXT_RE = new RegExp(`\\.(${AUDIO_EXTENSIONS.join('|')})$`, 'i');

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || AUDIO_EXT_RE.test(file.name);
}

// Containers + codecs that Chromium can decode without conversion.
const NATIVE_EXT = new Set(['mp3', 'm4a', 'aac', 'flac', 'ogg', 'oga', 'opus', 'wav', 'webm']);
const NATIVE_CODECS = new Set(['mp3', 'aac', 'flac', 'vorbis', 'opus']);

export function needsTranscode(fileName: string, codec?: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!NATIVE_EXT.has(ext)) return true;
  if (!codec) return false;
  if (NATIVE_CODECS.has(codec)) return false;
  if (ext === 'wav' && codec.startsWith('pcm_')) return false;
  return true;
}

export function coverToUrl(cover: NativeAnalysis['cover']): string | undefined {
  if (!cover || !cover.data?.length) return undefined;
  return URL.createObjectURL(new Blob([cover.data as BlobPart], { type: cover.mime }));
}
