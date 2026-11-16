import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '@/src/audio/AudioEngine';
import {
  AUDIO_ACCEPT,
  coverToUrl,
  isAudioFile,
  NativeAnalysis,
  nativeApi,
  needsTranscode,
} from '@/src/audio/native';
import { AlbumDetailView } from '@/src/components/AlbumDetailView';
import { AlbumsView } from '@/src/components/AlbumsView';
import { ArtistsView } from '@/src/components/ArtistsView';
import { EqualizerModal } from '@/src/components/EqualizerModal';
import { FoldersView } from '@/src/components/FoldersView';
import { MiniPlayer } from '@/src/components/MiniPlayer';
import { NowPlayingView } from '@/src/components/NowPlayingView';
import { PlayerBar } from '@/src/components/PlayerBar';
import { PlaylistsView } from '@/src/components/PlaylistsView';
import { QueueView } from '@/src/components/QueueView';
import { Sidebar } from '@/src/components/Sidebar';
import { SongDetailsModal } from '@/src/components/SongDetailsModal';
import { SongsView } from '@/src/components/SongsView';
import { INITIAL_ALBUMS, INITIAL_ARTISTS, INITIAL_PLAYLISTS, INITIAL_TRACKS } from '@/src/data/library';
import {
  AccentTheme,
  ActiveSection,
  Album,
  AlbumSortOption,
  AlbumViewMode,
  Artist,
  ArtistViewMode,
  SongViewMode,
  EQ_PRESET_GAINS,
  EqPreset,
  Playlist,
  RepeatMode,
  ThemeMode,
  Track,
} from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { sanitizeTitleFromFilename } from '@/src/utils/format';
import type { SavedState } from '@/src/utils/persist';
import { loadSavedState, saveState } from '@/src/utils/persist';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const FORMAT_LABELS: Record<string, string> = {
  mp3: 'MPEG Audio (MP3)',
  mp2: 'MPEG Audio (MP2)',
  flac: 'FLAC Lossless',
  wav: 'WAV · PCM',
  wave: 'WAV · PCM',
  m4a: 'AAC / MPEG-4 Audio',
  m4b: 'AAC / MPEG-4 Audio',
  aac: 'AAC / MPEG-4 Audio',
  ogg: 'Ogg (OGG)',
  oga: 'Ogg (OGA)',
  opus: 'Ogg (OPUS)',
  wma: 'Windows Media Audio (WMA)',
  ape: "Monkey's Audio (APE)",
  alac: 'Apple Lossless (ALAC)',
  aif: 'AIFF · PCM',
  aiff: 'AIFF · PCM',
  aifc: 'AIFF · PCM',
  wv: 'WavPack',
  mka: 'Matroska Audio',
  webm: 'WebM Audio',
  mpc: 'Musepack',
  ac3: 'Dolby Digital (AC-3)',
  eac3: 'Dolby Digital Plus',
  dts: 'DTS',
  amr: 'AMR',
  dsf: 'DSD (DSF)',
  dff: 'DSD (DFF)',
  tta: 'True Audio (TTA)',
  caf: 'Core Audio Format',
};

function inferFormatLabel(file: File, codec?: string): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'm4a' && codec === 'alac') return FORMAT_LABELS.alac;
  return FORMAT_LABELS[ext] || file.type || (ext ? `${ext.toUpperCase()} audio` : 'Audio file');
}

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';

// Files opened from outside the page (Open with..., drag from Explorer) remember their disk path here.
const filePathHints = new WeakMap<File, string>();

export default function App() {
  // Library state
  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [artists, setArtists] = useState<Artist[]>(INITIAL_ARTISTS);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  // Navigation & view state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('albums');
  const [previousSection, setPreviousSection] = useState<ActiveSection>('albums');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Mini Player, Song Details Modal & Custom 10-band Equalizer Modal
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [detailsTrack, setDetailsTrack] = useState<Track | null>(null);
  const [showEqualizer, setShowEqualizer] = useState(false);

  // Albums view options (Small, Medium, Large grid, Name list)
  const [albumViewMode, setAlbumViewMode] = useState<AlbumViewMode>('medium');
  const [albumSortBy, setAlbumSortBy] = useState<AlbumSortOption>('title-asc');
  const [artistViewMode, setArtistViewMode] = useState<ArtistViewMode>('medium');
  const [songViewMode, setSongViewMode] = useState<SongViewMode>('list');

  // Theme & Accent
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [accent, setAccent] = useState<AccentTheme>('sky');

  // Playback state
  const [queue, setQueue] = useState<Track[]>(() => INITIAL_TRACKS.slice(0, 8));
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INITIAL_TRACKS[0]?.duration || 0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [playbackRate, setPlaybackRate] = useState(1);

  // 10-band Custom Equalizer state
  const [eqPreset, setEqPreset] = useState<EqPreset>('flat');
  const [eqBands, setEqBands] = useState<number[]>(() => [...EQ_PRESET_GAINS.flat]);
  const [eqEnabled, setEqEnabled] = useState(true);

  // Toast feedback & File/Folder inputs
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const palette = ACCENT_PALETTES[accent];

  const currentTrack =
    currentTrackIndex >= 0 && currentTrackIndex < queue.length ? queue[currentTrackIndex] : null;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);


  // ---- Saved library & settings (like Windows Media Player, everything is still there next launch) ----
  const [hydrated, setHydrated] = useState(false);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSavedState();
      if (cancelled) return;
      if (saved) {
        const st = saved.settings ?? {};
        if (st.theme) setTheme(st.theme);
        if (st.accent) setAccent(st.accent);
        if (st.albumViewMode) setAlbumViewMode(st.albumViewMode);
        if (st.albumSortBy) setAlbumSortBy(st.albumSortBy);
        if (st.artistViewMode) {
          // older saves used 'grid'
          setArtistViewMode((st.artistViewMode as string) === 'grid' ? 'medium' : st.artistViewMode);
        }
        if (st.songViewMode) setSongViewMode(st.songViewMode);
        if (typeof st.sidebarCollapsed === 'boolean') setSidebarCollapsed(st.sidebarCollapsed);
        if (typeof st.volume === 'number') setVolume(st.volume);
        if (typeof st.muted === 'boolean') setMuted(st.muted);
        if (typeof st.shuffle === 'boolean') setShuffle(st.shuffle);
        if (st.repeatMode) setRepeatMode(st.repeatMode);
        if (typeof st.playbackRate === 'number') setPlaybackRate(st.playbackRate);
        if (st.eqPreset) setEqPreset(st.eqPreset);
        if (Array.isArray(st.eqBands) && st.eqBands.length === 10) setEqBands(st.eqBands);
        if (typeof st.eqEnabled === 'boolean') setEqEnabled(st.eqEnabled);

        setTracks(saved.tracks ?? []);
        setAlbums(saved.albums ?? []);
        setArtists(saved.artists ?? []);
        setPlaylists(saved.playlists ?? []);
        setFavorites(new Set(saved.favorites ?? []));

        const byId = new Map((saved.tracks ?? []).map((t) => [t.id, t]));
        const restoredQueue = (saved.queueIds ?? [])
          .map((id) => byId.get(id))
          .filter((t): t is Track => Boolean(t));
        if (restoredQueue.length) {
          setQueue(restoredQueue);
          const idx = Math.max(0, restoredQueue.findIndex((t) => t.id === saved.currentTrackId));
          setCurrentTrackIndex(idx);
          setDuration(restoredQueue[idx]?.duration ?? 0);
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const snapshotRef = useRef<SavedState | null>(null);
  snapshotRef.current = {
    version: 1,
    settings: {
      theme, accent, albumViewMode, albumSortBy, artistViewMode, songViewMode, sidebarCollapsed,
      volume, muted, shuffle, repeatMode, playbackRate, eqPreset, eqBands, eqEnabled,
    },
    tracks,
    albums,
    artists,
    playlists,
    favorites: Array.from(favorites),
    queueIds: queue.map((t) => t.id),
    currentTrackId: currentTrack?.id ?? null,
  };

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      if (snapshotRef.current) saveState(snapshotRef.current);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    hydrated, theme, accent, albumViewMode, albumSortBy, artistViewMode, songViewMode, sidebarCollapsed,
    volume, muted, shuffle, repeatMode, playbackRate, eqPreset, eqBands, eqEnabled,
    tracks, albums, artists, playlists, favorites, queue, currentTrack?.id,
  ]);

  // Flush right before the window closes so nothing added in the last half second is lost.
  useEffect(() => {
    const flush = () => {
      if (hydrated && snapshotRef.current) saveState(snapshotRef.current);
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [hydrated]);

  // Pause automatically when another app starts playing media (Windows).
  useEffect(() => {
    const api = nativeApi();
    if (!api) return;
    api.setMediaWatch(true);
    const off = api.onOtherMediaPlaying(() => {
      if (audioEngine.getOutputSettings().pauseOnOtherMedia && isPlayingRef.current) {
        audioEngine.pause();
      }
    });
    return () => {
      off();
    };
  }, []);

  // Sync theme class with <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Apply webkitdirectory attribute cleanly to folder input
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  // Play track helper
  const playTrackAtQueueIndex = useCallback(
    (idx: number, queueOverride?: Track[]) => {
      const targetQueue = queueOverride || queue;
      const track = targetQueue[idx];
      if (!track) return;

      setCurrentTrackIndex(idx);
      setCurrentTime(0);
      setDuration(track.duration);
      setIsPlaying(true);
      audioEngine.loadAndPlay(track, volume, muted, playbackRate, eqBands, eqEnabled);
    },
    [queue, volume, muted, playbackRate, eqBands, eqEnabled]
  );

  // Next / Prev handlers
  const handleNext = useCallback(() => {
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      audioEngine.seek(0);
      audioEngine.play();
      return;
    }

    if (shuffle && queue.length > 1) {
      let nextIdx = currentTrackIndex;
      while (nextIdx === currentTrackIndex) {
        nextIdx = Math.floor(Math.random() * queue.length);
      }
      playTrackAtQueueIndex(nextIdx);
      return;
    }

    const nextIdx = currentTrackIndex + 1;
    if (nextIdx < queue.length) {
      playTrackAtQueueIndex(nextIdx);
    } else if (repeatMode === 'all') {
      playTrackAtQueueIndex(0);
    } else {
      audioEngine.pause();
      setIsPlaying(false);
    }
  }, [queue.length, repeatMode, shuffle, currentTrackIndex, playTrackAtQueueIndex]);

  const handlePrev = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const prevIdx = currentTrackIndex - 1;
    if (prevIdx >= 0) {
      playTrackAtQueueIndex(prevIdx);
    } else if (repeatMode === 'all') {
      playTrackAtQueueIndex(queue.length - 1);
    } else {
      audioEngine.seek(0);
      setCurrentTime(0);
    }
  }, [queue.length, currentTime, currentTrackIndex, repeatMode, playTrackAtQueueIndex]);

  // Attach HTMLAudioElement listeners
  useEffect(() => {
    const audio = audioEngine.getElement();

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      handleNext();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [handleNext]);

  const handleTogglePlayPause = useCallback(() => {
    if (!currentTrack) return;
    const audio = audioEngine.getElement();
    if (!audio.src) {
      audioEngine.loadAndPlay(currentTrack, volume, muted, playbackRate, eqBands, eqEnabled);
      setIsPlaying(true);
      return;
    }
    if (isPlaying) {
      audioEngine.pause();
    } else {
      audioEngine.play();
    }
  }, [currentTrack, isPlaying, volume, muted, playbackRate, eqBands, eqEnabled]);

  // Windows media overlay / media keys: show title, artist and cover art, and react to hardware keys.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const art = currentTrack.coverUrl
      ? [{ src: new URL(currentTrack.coverUrl, document.baseURI).href }]
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album,
      artwork: art,
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(a, h);
      } catch {
        // action not supported
      }
    };
    set('play', () => handleTogglePlayPause());
    set('pause', () => handleTogglePlayPause());
    set('nexttrack', () => handleNext());
    set('previoustrack', () => handlePrev());
    set('seekto', (d) => {
      if (typeof d.seekTime === 'number') audioEngine.seek(d.seekTime);
    });
    return () => {
      (['play', 'pause', 'nexttrack', 'previoustrack', 'seekto'] as MediaSessionAction[]).forEach((a) =>
        set(a, null)
      );
    };
  }, [handleTogglePlayPause, handleNext, handlePrev]);

  // Keyboard shortcuts (Space = play/pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlayPause]);

  // Play track with context queue
  const handlePlayTrack = useCallback(
    (track: Track, contextTracks: Track[]) => {
      const list = contextTracks.length > 0 ? contextTracks : [track];
      const idx = list.findIndex((t) => t.id === track.id);
      const startIndex = idx >= 0 ? idx : 0;
      setQueue(list);
      playTrackAtQueueIndex(startIndex, list);
    },
    [playTrackAtQueueIndex]
  );

  const handlePlayAll = useCallback(
    (list: Track[], shouldShuffle = false) => {
      if (list.length === 0) return;
      const ordered = shouldShuffle ? shuffleArray(list) : [...list];
      setShuffle(shouldShuffle);
      setQueue(ordered);
      playTrackAtQueueIndex(0, ordered);
    },
    [playTrackAtQueueIndex]
  );

  const handlePlayAlbum = useCallback(
    (albumId: string, shouldShuffle = false) => {
      const albumTracks = tracks
        .filter((t) => t.albumId === albumId)
        .sort((a, b) => a.trackNumber - b.trackNumber);
      handlePlayAll(albumTracks, shouldShuffle);
    },
    [tracks, handlePlayAll]
  );

  const handlePlayArtist = useCallback(
    (artistId: string, shouldShuffle = false) => {
      const artistTracks = tracks.filter((t) => t.artistId === artistId);
      handlePlayAll(artistTracks, shouldShuffle);
    },
    [tracks, handlePlayAll]
  );

  const handleAddTrackToQueue = useCallback(
    (track: Track) => {
      setQueue((prev) => {
        const next = [...prev, track];
        if (prev.length === 0) {
          playTrackAtQueueIndex(0, next);
        }
        return next;
      });
      showToast(`Added "${track.title}" to queue`);
    },
    [playTrackAtQueueIndex, showToast]
  );

  const handleAddAlbumToQueue = useCallback(
    (albumId: string) => {
      const albumTracks = tracks
        .filter((t) => t.albumId === albumId)
        .sort((a, b) => a.trackNumber - b.trackNumber);
      if (albumTracks.length === 0) return;
      setQueue((prev) => [...prev, ...albumTracks]);
      showToast(`Added ${albumTracks.length} songs to queue`);
    },
    [tracks, showToast]
  );

  const handleToggleFavorite = useCallback((trackId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const handleCreatePlaylist = useCallback(
    (name: string) => {
      const newPl: Playlist = {
        id: `pl-${Date.now()}`,
        name,
        trackIds: [],
        createdAt: Date.now(),
      };
      setPlaylists((prev) => [...prev, newPl]);
      setActiveSection('playlists');
      setActivePlaylistId(newPl.id);
      setSelectedAlbumId(null);
      setSelectedArtistId(null);
      showToast(`Created playlist "${name}"`);
    },
    [showToast]
  );

  const handleAddTrackToPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      let playlistName = '';
      setPlaylists((prev) =>
        prev.map((pl) => {
          if (pl.id !== playlistId) return pl;
          playlistName = pl.name;
          if (pl.trackIds.includes(trackId)) return pl;
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        })
      );
      if (playlistName) {
        showToast(`Added to "${playlistName}"`);
      }
    },
    [showToast]
  );

  const handleRemoveTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) }
          : pl
      )
    );
  }, []);

  const handleRenamePlaylist = useCallback((playlistId: string, newName: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => (pl.id === playlistId ? { ...pl, name: newName } : pl))
    );
  }, []);

  const handleDeletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    setActivePlaylistId(null);
    setActiveSection('albums');
  }, []);

  // Import local audio files or folder directories
  const importAudioFiles = useCallback(
    async (fileList: FileList | File[], autoPlayImported = false) => {
      const audioFiles = Array.from(fileList).filter(isAudioFile);

      if (audioFiles.length === 0) {
        showToast('No supported audio files found');
        return;
      }

      const localAlbumId = 'album-local-files';
      const localArtistId = 'artist-local-files';
      const api = nativeApi();

      const readDuration = (url: string): Promise<number> =>
        new Promise((resolve) => {
          const tempAudio = new Audio();
          tempAudio.preload = 'metadata';
          tempAudio.onloadedmetadata = () => {
            const d = Number.isFinite(tempAudio.duration) ? Math.round(tempAudio.duration) : 180;
            resolve(d > 0 ? d : 180);
          };
          tempAudio.onerror = () => resolve(180);
          tempAudio.src = url;
        });

      // Embedded album art: identical pictures (same album) are stored once. In the desktop app the
      // picture is saved to disk so covers survive restarts.
      const coverCache = new Map<string, string>();
      const coverUrlFor = async (cover: NativeAnalysis['cover']): Promise<string | undefined> => {
        if (!cover || !cover.data?.length) return undefined;
        const d = cover.data;
        let h = 2166136261;
        const step = Math.max(1, Math.floor(d.length / 4096));
        for (let i = 0; i < d.length; i += step) h = Math.imul(h ^ d[i], 16777619);
        const key = `c${d.length}_${h >>> 0}`;
        let url = coverCache.get(key);
        if (!url) {
          try {
            url = api ? await api.saveCover(key, d, cover.mime) : coverToUrl(cover);
          } catch {
            url = coverToUrl(cover);
          }
          if (url) coverCache.set(key, url);
        }
        return url;
      };

      const sortedFiles = [...audioFiles].sort((a, b) => a.name.localeCompare(b.name));
      let baseTrackNum = tracks.filter((t) => t.albumId === localAlbumId).length + 1;
      const stamp = Date.now();

      const newArtists = new Map<string, Artist>();
      const newAlbums = new Map<string, Album>();
      const ensureArtist = (id: string, name: string, genre: string, coverUrl?: string) => {
        const existing = newArtists.get(id);
        if (existing) {
          if (!existing.coverUrl && coverUrl) existing.coverUrl = coverUrl;
          return;
        }
        newArtists.set(id, {
          id,
          name,
          genre,
          coverUrl,
          bio:
            id === localArtistId
              ? 'Audio files and folders imported directly from your computer.'
              : `Music by ${name} imported from your computer.`,
        });
      };

      const processFile = async (file: File, index: number): Promise<Track> => {
        const srcPath = filePathHints.get(file) || api?.getPathForFile(file) || '';
        let analysis: NativeAnalysis | null = null;
        if (api && srcPath) {
          try {
            analysis = await api.analyze(srcPath);
          } catch {
            analysis = null;
          }
        }
        const info = analysis?.info ?? {};
        const tags = analysis?.tags ?? {};
        const tag = (...keys: string[]) => {
          for (const k of keys) {
            const v = tags[k]?.trim();
            if (v) return v;
          }
          return '';
        };

        const convert = Boolean(api && srcPath && needsTranscode(file.name, info.codec));
        let objectUrl: string | undefined;
        let dur: number;
        const makeUrl = async () => (api && srcPath ? api.mediaUrl(srcPath) : URL.createObjectURL(file));
        if (info.duration && info.duration > 0) {
          dur = Math.max(1, Math.round(info.duration));
          if (!convert) objectUrl = await makeUrl();
        } else if (convert) {
          dur = 180;
        } else {
          objectUrl = await makeUrl();
          dur = await readDuration(objectUrl);
        }

        const rawName = sanitizeTitleFromFilename(file.name);
        const dashSplit = rawName.split(' - ');
        const nameArtist = dashSplit.length >= 2 ? dashSplit[0].trim() : '';
        const nameTitle = dashSplit.length >= 2 ? dashSplit.slice(1).join(' - ').trim() : rawName;

        const title = tag('title') || nameTitle;
        const tagArtist = tag('artist', 'author', 'performer');
        const albumArtistTag = tag('album_artist', 'albumartist', 'album artist');
        const tagAlbum = tag('album');
        const artistName = tagArtist || albumArtistTag || nameArtist || 'Local Library';
        const albumArtistName = albumArtistTag || tagArtist || nameArtist || 'Local Library';
        const hasRealArtist = Boolean(tagArtist || albumArtistTag);
        const artistId = hasRealArtist ? `artist-local-${slugify(artistName)}` : localArtistId;
        const albumArtistId = hasRealArtist
          ? `artist-local-${slugify(albumArtistName)}`
          : localArtistId;
        const genre = tag('genre') || 'Local Files';
        const yearMatch = tag('date', 'year', 'originaldate', 'originalyear').match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
        const trackTagNum = parseInt(tag('track', 'tracknumber'), 10);
        const coverUrl = await coverUrlFor(analysis?.cover ?? null);

        let albumId = localAlbumId;
        let albumTitle = 'Local Music';
        if (tagAlbum) {
          albumTitle = tagAlbum;
          albumId = `album-local-${slugify(albumArtistName)}-${slugify(tagAlbum)}`;
        }

        if (hasRealArtist) {
          ensureArtist(artistId, artistName, genre, coverUrl);
          if (albumArtistId !== artistId) ensureArtist(albumArtistId, albumArtistName, genre, coverUrl);
        } else {
          ensureArtist(localArtistId, 'Local Library', 'Local Files');
        }
        const albumRecord = newAlbums.get(albumId);
        if (albumRecord) {
          if (!albumRecord.coverUrl && coverUrl) albumRecord.coverUrl = coverUrl;
        } else {
          newAlbums.set(albumId, {
            id: albumId,
            title: albumTitle,
            artistId: albumId === localAlbumId ? localArtistId : albumArtistId,
            artist: albumId === localAlbumId ? 'Local Library' : albumArtistName,
            year,
            genre,
            coverUrl,
            accentHex: '#38bdf8',
            addedAt: stamp,
          });
        }

        // Extract directory path from webkitRelativePath when a folder is selected
        const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        let folderPath = 'Local Files';
        if (relPath && relPath.includes('/')) {
          const segments = relPath.split('/');
          segments.pop(); // remove filename
          folderPath = segments.join(' / ');
        } else if (srcPath) {
          const segments = srcPath.split(/[\\/]/).filter(Boolean);
          segments.pop();
          if (segments.length) folderPath = segments.join(' / ');
        }

        const estimatedBitrate =
          info.bitrateKbps ?? (dur > 0 ? Math.round((file.size * 8) / (dur * 1000)) : undefined);

        return {
          id: `local-${stamp}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          trackNumber: Number.isFinite(trackTagNum) && trackTagNum > 0 ? trackTagNum : baseTrackNum + index,
          title,
          artistId,
          artist: artistName,
          albumId,
          album: albumTitle,
          genre,
          year,
          duration: dur,
          coverUrl,
          audioUrl: objectUrl,
          isLocal: true,
          folderPath,
          fileName: file.name,
          sourcePath: srcPath || undefined,
          needsTranscode: convert || undefined,
          fileSizeBytes: file.size,
          bitrateKbps: estimatedBitrate,
          sampleRateHz: info.sampleRateHz ?? 44100,
          format: inferFormatLabel(file, info.codec),
          channels: info.channels ?? '2 (Stereo)',
          composer: tag('composer') || undefined,
          about: `Local audio file "${file.name}" imported from "${folderPath}" for direct playback in Music Player.`,
        };
      };

      // Read several files at once (tags + cover art come from native ffmpeg when available).
      const importedTracks: Track[] = new Array(sortedFiles.length);
      let cursor = 0;
      const worker = async () => {
        while (cursor < sortedFiles.length) {
          const i = cursor++;
          importedTracks[i] = await processFile(sortedFiles[i], i);
        }
      };
      await Promise.all(Array.from({ length: Math.min(api ? 4 : 1, sortedFiles.length) }, worker));

      setArtists((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        const additions: Artist[] = [];
        let changed = false;
        const result = prev.map((a) => {
          const n = newArtists.get(a.id);
          if (n && !a.coverUrl && n.coverUrl) {
            changed = true;
            return { ...a, coverUrl: n.coverUrl };
          }
          return a;
        });
        newArtists.forEach((n, id) => {
          if (!byId.has(id)) additions.push(n);
        });
        return additions.length || changed ? [...result, ...additions] : prev;
      });

      setAlbums((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        const additions: Album[] = [];
        let changed = false;
        const result = prev.map((a) => {
          const n = newAlbums.get(a.id);
          if (n && !a.coverUrl && n.coverUrl) {
            changed = true;
            return { ...a, coverUrl: n.coverUrl };
          }
          return a;
        });
        newAlbums.forEach((n, id) => {
          if (!byId.has(id)) additions.push(n);
        });
        return additions.length || changed ? [...result, ...additions] : prev;
      });

      setTracks((prev) => [...prev, ...importedTracks]);

      if (autoPlayImported && importedTracks.length > 0) {
        setActiveSection('folders');
        setSelectedAlbumId(null);
        setSelectedArtistId(null);
        handlePlayAll(importedTracks, false);
        showToast(`Playing folder (${importedTracks.length} songs)`);
      } else {
        showToast(
          `Added ${importedTracks.length} ${importedTracks.length === 1 ? 'song' : 'songs'} to library`
        );
      }
    },
    [tracks, handlePlayAll, showToast]
  );

  // Desktop app: "Open with Music Player" / double-clicked audio files arrive from the main process.
  const importAudioFilesRef = useRef(importAudioFiles);
  importAudioFilesRef.current = importAudioFiles;
  useEffect(() => {
    const api = nativeApi();
    if (!api) return;
    return api.onOpenFiles(async (paths) => {
      const files: File[] = [];
      for (const p of paths) {
        try {
          const res = await fetch(await api.mediaUrl(p));
          const blob = await res.blob();
          const f = new File([blob], p.split(/[\\/]/).pop() || 'track', { type: blob.type });
          filePathHints.set(f, p);
          files.push(f);
        } catch {
          // unreadable file: skip
        }
      }
      if (files.length) importAudioFilesRef.current(files, true);
    });
  }, []);

  // Filtered & sorted library slices
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredAlbums = useMemo(() => {
    const matching = normalizedQuery
      ? albums.filter(
          (al) =>
            al.title.toLowerCase().includes(normalizedQuery) ||
            al.artist.toLowerCase().includes(normalizedQuery) ||
            al.genre.toLowerCase().includes(normalizedQuery)
        )
      : albums;

    return [...matching].sort((a, b) => {
      switch (albumSortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'artist':
          return a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
        case 'year-desc':
          return b.year - a.year || a.title.localeCompare(b.title);
        case 'year-asc':
          return a.year - b.year || a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }, [albums, normalizedQuery, albumSortBy]);

  const filteredTracks = useMemo(() => {
    if (!normalizedQuery) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(normalizedQuery) ||
        t.artist.toLowerCase().includes(normalizedQuery) ||
        t.album.toLowerCase().includes(normalizedQuery) ||
        t.genre.toLowerCase().includes(normalizedQuery) ||
        (t.folderPath && t.folderPath.toLowerCase().includes(normalizedQuery))
    );
  }, [tracks, normalizedQuery]);

  const filteredArtists = useMemo(() => {
    if (!normalizedQuery) return artists;
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(normalizedQuery) ||
        a.genre.toLowerCase().includes(normalizedQuery)
    );
  }, [artists, normalizedQuery]);

  // Navigation helpers
  const navigateToSection = (section: ActiveSection, playlistId: string | null = null) => {
    if (section !== 'now-playing') {
      setPreviousSection(section);
    }
    setActiveSection(section);
    setActivePlaylistId(playlistId);
    setSelectedAlbumId(null);
    setSelectedArtistId(null);
  };

  const openAlbumDetail = (albumId: string) => {
    setIsMiniPlayer(false);
    setActiveSection('albums');
    setSelectedAlbumId(albumId);
    setSelectedArtistId(null);
  };

  const openArtistDetail = (artistId: string | null) => {
    setIsMiniPlayer(false);
    setActiveSection('artists');
    setSelectedArtistId(artistId);
    setSelectedAlbumId(null);
  };

  const toggleNowPlaying = () => {
    if (activeSection === 'now-playing') {
      setActiveSection(previousSection === 'now-playing' ? 'albums' : previousSection);
    } else {
      setPreviousSection(activeSection);
      setActiveSection('now-playing');
    }
  };

  // Equalizer handlers
  const handleSelectEqPreset = (preset: Exclude<EqPreset, 'custom'>) => {
    const gains = [...EQ_PRESET_GAINS[preset]];
    setEqPreset(preset);
    setEqBands(gains);
    setEqEnabled(true);
    audioEngine.setEqBands(gains, true);
  };

  const handleChangeEqBand = (bandIndex: number, gainDb: number) => {
    setEqPreset('custom');
    setEqEnabled(true);
    setEqBands((prev) => {
      const next = [...prev];
      next[bandIndex] = gainDb;
      audioEngine.setEqBands(next, true);
      return next;
    });
  };

  const handleToggleEqEnabled = () => {
    const nextEnabled = !eqEnabled;
    setEqEnabled(nextEnabled);
    audioEngine.setEqBands(eqBands, nextEnabled);
  };

  const handleResetEq = () => {
    const flat = [...EQ_PRESET_GAINS.flat];
    setEqPreset('flat');
    setEqBands(flat);
    setEqEnabled(true);
    audioEngine.setEqBands(flat, true);
  };

  const selectedAlbum = selectedAlbumId
    ? albums.find((al) => al.id === selectedAlbumId) || null
    : null;

  const activePlaylist = activePlaylistId
    ? playlists.find((pl) => pl.id === activePlaylistId) || null
    : null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFiles(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingFiles(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFiles(false);
        if (e.dataTransfer.files?.length) {
          importAudioFiles(e.dataTransfer.files, false);
        }
      }}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#f3f3f3] dark:bg-[#202020] text-[#1a1a1a] dark:text-[#f5f5f5]"
    >
      {/* Hidden local audio file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            importAudioFiles(e.target.files, false);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden local music folder directory picker */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            importAudioFiles(e.target.files, true);
            e.target.value = '';
          }
        }}
      />

      {isMiniPlayer ? (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          isFavorite={currentTrack ? favorites.has(currentTrack.id) : false}
          theme={theme}
          accent={accent}
          onTogglePlayPause={handleTogglePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={(sec) => {
            audioEngine.seek(sec);
            setCurrentTime(sec);
          }}
          onToggleFavorite={handleToggleFavorite}
          onOpenDetails={(track) => setDetailsTrack(track)}
          onExitMiniPlayer={() => setIsMiniPlayer(false)}
        />
      ) : (
        <>
          {/* Main Workspace: Sidebar + Content Viewport */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
              activeSection={activeSection}
              activePlaylistId={activePlaylistId}
              onSelectSection={navigateToSection}
              playlists={playlists}
              onCreatePlaylist={handleCreatePlaylist}
              onOpenFilePicker={() => fileInputRef.current?.click()}
              onOpenFolderPicker={() => folderInputRef.current?.click()}
              queueCount={queue.length}
              theme={theme}
              onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              accent={accent}
              onChangeAccent={setAccent}
            />

            <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#fafafa] dark:bg-[#1c1c1c] rounded-tl-lg border-t border-l border-black/[0.05] dark:border-white/[0.05]">
              {/* Top Utility Strip with Search Button on the Right Side */}
              {activeSection !== 'now-playing' && (
                <div className="px-6 pt-3 pb-1 flex items-center justify-end gap-2 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      searchInputRef.current?.focus();
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <div className="relative flex items-center">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search music, albums, artists..."
                        aria-label="Search music library"
                        className="w-60 sm:w-72 h-9 pl-3.5 pr-8 text-[13px] rounded-md bg-white dark:bg-[#2b2b2b] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400 border border-black/[0.08] dark:border-white/[0.08] border-b-black/20 dark:border-b-white/20 focus:outline-none focus:border-b-2 focus:border-b-[#0067c0] dark:focus:border-b-[#60cdff] transition-colors"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Clear search"
                          className="absolute right-2 p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      title="Search"
                      aria-label="Search"
                      className={`h-9 px-3.5 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors whitespace-nowrap shrink-0 ${palette.buttonBg} ${palette.buttonText}`}
                    >
                      <Search size={14} />
                      <span>Search</span>
                    </button>
                  </form>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-hidden">
                {activeSection === 'now-playing' && (
                  <NowPlayingView
                    track={currentTrack}
                    isPlaying={isPlaying}
                    theme={theme}
                    accent={accent}
                    onBack={() =>
                      setActiveSection(
                        previousSection === 'now-playing' ? 'albums' : previousSection
                      )
                    }
                    onSelectAlbum={openAlbumDetail}
                    onSelectArtist={openArtistDetail}
                    onOpenDetails={(track) => setDetailsTrack(track)}
                  />
                )}

                {activeSection === 'albums' && selectedAlbum && (
                  <AlbumDetailView
                    album={selectedAlbum}
                    tracks={tracks.filter((t) => t.albumId === selectedAlbum.id)}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    favorites={favorites}
                    playlists={playlists}
                    accent={accent}
                    onBack={() => setSelectedAlbumId(null)}
                    onSelectArtist={openArtistDetail}
                    onPlayTrack={handlePlayTrack}
                    onTogglePlayPause={handleTogglePlayPause}
                    onPlayAlbum={handlePlayAlbum}
                    onAddAlbumToQueue={handleAddAlbumToQueue}
                    onAddTrackToQueue={handleAddTrackToQueue}
                    onToggleFavorite={handleToggleFavorite}
                    onAddTrackToPlaylist={handleAddTrackToPlaylist}
                    onOpenDetails={(track) => setDetailsTrack(track)}
                  />
                )}

                {activeSection === 'albums' && !selectedAlbum && (
                  <AlbumsView
                    albums={filteredAlbums}
                    tracks={tracks}
                    viewMode={albumViewMode}
                    onChangeViewMode={setAlbumViewMode}
                    sortBy={albumSortBy}
                    onChangeSortBy={setAlbumSortBy}
                    onSelectAlbum={openAlbumDetail}
                    onPlayAlbum={handlePlayAlbum}
                    onAddAlbumToQueue={handleAddAlbumToQueue}
                    onShuffleAll={() => handlePlayAll(tracks, true)}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    accent={accent}
                  />
                )}

                {activeSection === 'songs' && (
                  <SongsView
                    viewMode={songViewMode}
                    onChangeViewMode={setSongViewMode}
                    tracks={filteredTracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    favorites={favorites}
                    playlists={playlists}
                    accent={accent}
                    onPlayTrack={handlePlayTrack}
                    onTogglePlayPause={handleTogglePlayPause}
                    onPlayAll={handlePlayAll}
                    onAddTrackToQueue={handleAddTrackToQueue}
                    onToggleFavorite={handleToggleFavorite}
                    onAddTrackToPlaylist={handleAddTrackToPlaylist}
                    onOpenDetails={(track) => setDetailsTrack(track)}
                    onSelectAlbum={openAlbumDetail}
                    onSelectArtist={openArtistDetail}
                    onOpenFilePicker={() => fileInputRef.current?.click()}
                  />
                )}

                {activeSection === 'artists' && (
                  <ArtistsView
                    artists={filteredArtists}
                    albums={albums}
                    tracks={tracks}
                    selectedArtistId={selectedArtistId}
                    viewMode={artistViewMode}
                    onChangeViewMode={setArtistViewMode}
                    onSelectArtist={openArtistDetail}
                    onSelectAlbum={openAlbumDetail}
                    onPlayTrack={handlePlayTrack}
                    onTogglePlayPause={handleTogglePlayPause}
                    onPlayArtist={handlePlayArtist}
                    onAddTrackToQueue={handleAddTrackToQueue}
                    onOpenDetails={(track) => setDetailsTrack(track)}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    accent={accent}
                  />
                )}

                {activeSection === 'folders' && (
                  <FoldersView
                    tracks={filteredTracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    accent={accent}
                    onOpenFolderPicker={() => folderInputRef.current?.click()}
                    onPlayTrack={handlePlayTrack}
                    onPlayFolderTracks={(folderTracks, shouldShuffle) =>
                      handlePlayAll(folderTracks, shouldShuffle)
                    }
                    onTogglePlayPause={handleTogglePlayPause}
                    onAddTrackToQueue={handleAddTrackToQueue}
                    onOpenDetails={(track) => setDetailsTrack(track)}
                  />
                )}

                {activeSection === 'queue' && (
                  <QueueView
                    queue={queue}
                    currentTrackIndex={currentTrackIndex}
                    isPlaying={isPlaying}
                    accent={accent}
                    onPlayAtIndex={(idx) => playTrackAtQueueIndex(idx)}
                    onTogglePlayPause={handleTogglePlayPause}
                    onRemoveAtIndex={(idx) => {
                      setQueue((prev) => {
                        const next = prev.filter((_, i) => i !== idx);
                        if (idx < currentTrackIndex) {
                          setCurrentTrackIndex((c) => Math.max(0, c - 1));
                        } else if (idx === currentTrackIndex) {
                          if (next.length === 0) {
                            audioEngine.pause();
                            setIsPlaying(false);
                            setCurrentTrackIndex(-1);
                          } else {
                            const nextIdx = Math.min(idx, next.length - 1);
                            playTrackAtQueueIndex(nextIdx, next);
                          }
                        }
                        return next;
                      });
                    }}
                    onClearQueue={() => {
                      audioEngine.pause();
                      setIsPlaying(false);
                      setQueue([]);
                      setCurrentTrackIndex(-1);
                      setCurrentTime(0);
                    }}
                    onShuffleQueue={() => {
                      if (queue.length < 2) return;
                      const current = currentTrack;
                      const rest = queue.filter((_, i) => i !== currentTrackIndex);
                      const shuffled = current
                        ? [current, ...shuffleArray(rest)]
                        : shuffleArray(queue);
                      setQueue(shuffled);
                      setCurrentTrackIndex(0);
                      setShuffle(true);
                    }}
                  />
                )}

                {activeSection === 'playlists' && (
                  <PlaylistsView
                    playlist={activePlaylist}
                    allTracks={tracks}
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    accent={accent}
                    onPlayTrack={handlePlayTrack}
                    onTogglePlayPause={handleTogglePlayPause}
                    onPlayAll={handlePlayAll}
                    onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                    onRenamePlaylist={handleRenamePlaylist}
                    onDeletePlaylist={handleDeletePlaylist}
                  />
                )}
              </div>
            </main>
          </div>

          {/* Bottom Persistent Windows 11 Transport Bar */}
          <PlayerBar
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={muted}
            shuffle={shuffle}
            repeatMode={repeatMode}
            playbackRate={playbackRate}
            eqPreset={eqPreset}
            eqEnabled={eqEnabled}
            isFavorite={currentTrack ? favorites.has(currentTrack.id) : false}
            isNowPlayingOpen={activeSection === 'now-playing'}
            isQueueOpen={activeSection === 'queue'}
            theme={theme}
            accent={accent}
            onTogglePlayPause={handleTogglePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            onSeek={(sec) => {
              audioEngine.seek(sec);
              setCurrentTime(sec);
            }}
            onChangeVolume={(vol) => {
              setVolume(vol);
              if (vol > 0 && muted) setMuted(false);
              audioEngine.setVolume(vol, false);
            }}
            onToggleMute={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              audioEngine.setVolume(volume, nextMuted);
            }}
            onToggleShuffle={() => setShuffle((s) => !s)}
            onCycleRepeat={() =>
              setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
            }
            onOpenEqualizer={() => setShowEqualizer(true)}
            onToggleFavorite={handleToggleFavorite}
            onToggleNowPlaying={toggleNowPlaying}
            onToggleMiniPlayer={() => setIsMiniPlayer(true)}
            onOpenDetails={(track) => setDetailsTrack(track)}
            onToggleQueue={() =>
              navigateToSection(activeSection === 'queue' ? 'albums' : 'queue', null)
            }
            onSelectAlbum={openAlbumDetail}
            onSelectArtist={openArtistDetail}
          />
        </>
      )}

      {/* Custom 10-Band Equalizer Modal */}
      <EqualizerModal
        open={showEqualizer}
        eqPreset={eqPreset}
        eqBands={eqBands}
        eqEnabled={eqEnabled}
        playbackRate={playbackRate}
        onClose={() => setShowEqualizer(false)}
        onSelectPreset={handleSelectEqPreset}
        onChangeBand={handleChangeEqBand}
        onToggleEnabled={handleToggleEqEnabled}
        onReset={handleResetEq}
        onChangePlaybackRate={(rate) => {
          setPlaybackRate(rate);
          audioEngine.setPlaybackRate(rate);
        }}
      />

      {/* Song Details & Bitrate Modal */}
      <SongDetailsModal
        track={detailsTrack}
        accent={accent}
        onClose={() => setDetailsTrack(null)}
        onPlayTrack={(track) => handlePlayTrack(track, tracks)}
        onAddToQueue={handleAddTrackToQueue}
        onSelectAlbum={openAlbumDetail}
        onSelectArtist={openArtistDetail}
      />

      {/* Drag & Drop Audio Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center pointer-events-none">
          <div className="px-8 py-6 rounded-xl bg-white dark:bg-[#2c2c2c] border border-black/15 dark:border-white/15 shadow-2xl text-center">
            <p className="font-display text-lg font-semibold text-neutral-900 dark:text-white">
              Drop audio files to add to your music library
            </p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
              Supports MP3, WAV, FLAC, OGG, and M4A
            </p>
          </div>
        </div>
      )}

      {/* Subtle Action Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-28 right-6 px-4 py-2.5 rounded-md bg-neutral-900 dark:bg-[#323232] text-white text-[13px] font-medium shadow-lg border border-white/10 z-50"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
