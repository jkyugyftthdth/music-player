import { nativeApi } from '@/src/audio/native';
import {
  AccentTheme,
  Album,
  AlbumSortOption,
  AlbumViewMode,
  Artist,
  ArtistViewMode,
  EqPreset,
  Playlist,
  RepeatMode,
  SongViewMode,
  ThemeMode,
  Track,
} from '@/src/types/music';

export interface SavedSettings {
  theme: ThemeMode;
  accent: AccentTheme;
  albumViewMode: AlbumViewMode;
  albumSortBy: AlbumSortOption;
  artistViewMode: ArtistViewMode;
  songViewMode: SongViewMode;
  sidebarCollapsed: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  eqPreset: EqPreset;
  eqBands: number[];
  eqEnabled: boolean;
}

export interface SavedState {
  version: 1;
  settings: Partial<SavedSettings>;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  favorites: string[];
  queueIds: string[];
  currentTrackId: string | null;
}

const LS_KEY = 'mp-state-v1';

export async function loadSavedState(): Promise<SavedState | null> {
  try {
    const api = nativeApi();
    const raw = api ? await api.loadStore() : localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state: SavedState): void {
  try {
    const api = nativeApi();
    if (api) {
      api.saveStore(JSON.stringify(state));
    } else {
      // Browser build: songs are temporary blobs, so only keep settings, playlists names and favorites.
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ ...state, tracks: [], albums: [], artists: [], queueIds: [], currentTrackId: null, playlists: [] })
      );
    }
  } catch {
    // storage full or unavailable
  }
}
