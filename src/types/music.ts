export type AlbumViewMode = 'small' | 'medium' | 'large' | 'list';
export type ArtistViewMode = 'grid' | 'list';
export type ActiveSection =
  | 'albums'
  | 'songs'
  | 'artists'
  | 'queue'
  | 'folders'
  | 'playlists'
  | 'now-playing';

export type AlbumSortOption = 'title-asc' | 'title-desc' | 'artist' | 'year-desc' | 'year-asc';
export type SongSortColumn = 'index' | 'title' | 'artist' | 'album' | 'genre' | 'duration';
export type SortDirection = 'asc' | 'desc';
export type RepeatMode = 'off' | 'all' | 'one';
export type ThemeMode = 'dark' | 'light';
export type AccentTheme = 'sky' | 'amber' | 'emerald' | 'rose';
export type EqPreset =
  | 'custom'
  | 'flat'
  | 'bass'
  | 'vocal'
  | 'acoustic'
  | 'electronic'
  | 'rock'
  | 'pop';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_FREQUENCY_LABELS = [
  '32 Hz',
  '64 Hz',
  '125 Hz',
  '250 Hz',
  '500 Hz',
  '1 kHz',
  '2 kHz',
  '4 kHz',
  '8 kHz',
  '16 kHz',
] as const;

export const EQ_PRESET_GAINS: Record<Exclude<EqPreset, 'custom'>, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [7, 6, 5, 3, 1, 0, 0, 0, 1, 1],
  vocal: [-2, -2, -1, 1, 4, 5, 5, 4, 2, 0],
  acoustic: [3, 2, 1, 1, 2, 2, 3, 4, 4, 3],
  electronic: [6, 5, 2, 0, -2, 1, 2, 4, 5, 6],
  rock: [5, 4, 2, 0, -1, -1, 2, 4, 5, 5],
  pop: [-1, 1, 3, 4, 3, 0, -1, -1, 2, 3],
};

export interface SynthRecipe {
  bpm: number;
  rootMidi: number;
  scaleIntervals: number[];
  progression: number[];
  waveform: 'sine' | 'triangle' | 'warm-pad' | 'epiano';
  hasPercussion: boolean;
  arpPattern: number[];
  brightness: number;
}

export interface Track {
  id: string;
  trackNumber: number;
  title: string;
  artistId: string;
  artist: string;
  albumId: string;
  album: string;
  genre: string;
  year: number;
  duration: number; // seconds
  coverUrl?: string;
  audioUrl?: string; // ObjectURL for local audio files
  isLocal?: boolean;
  folderPath?: string; // Directory path for folder view
  fileName?: string;
  sourcePath?: string; // absolute path on disk (desktop app)
  needsTranscode?: boolean; // format Chromium cannot decode; converted on demand
  bitrateKbps?: number;
  sampleRateHz?: number;
  format?: string;
  channels?: string;
  fileSizeBytes?: number;
  composer?: string;
  keySignature?: string;
  about?: string;
  synthRecipe?: SynthRecipe;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  year: number;
  genre: string;
  coverUrl?: string;
  accentHex: string;
  addedAt: number;
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  genre: string;
  coverUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}
