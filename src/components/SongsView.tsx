import {
  ArrowDown,
  ArrowUp,
  Check,
  FolderPlus,
  Heart,
  Info,
  LayoutGrid,
  List,
  ListPlus,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Shuffle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccentTheme,
  Playlist,
  SongSortColumn,
  SongViewMode,
  SortDirection,
  Track,
} from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

const SONG_VIEW_OPTIONS: { id: SongViewMode; label: string }[] = [
  { id: 'list', label: 'Song list' },
  { id: 'large', label: 'Large grid' },
  { id: 'medium', label: 'Medium grid' },
  { id: 'small', label: 'Small grid' },
];

const SONG_GRID: Record<'small' | 'medium' | 'large', { cols: string; gap: string; icon: number }> = {
  small: { cols: 'grid-cols-[repeat(auto-fill,minmax(120px,1fr))]', gap: 'gap-3', icon: 28 },
  medium: { cols: 'grid-cols-[repeat(auto-fill,minmax(176px,1fr))]', gap: 'gap-4', icon: 40 },
  large: { cols: 'grid-cols-[repeat(auto-fill,minmax(248px,1fr))]', gap: 'gap-5', icon: 56 },
};

interface SongsViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Set<string>;
  playlists: Playlist[];
  accent: AccentTheme;
  onPlayTrack: (track: Track, contextTracks: Track[]) => void;
  onTogglePlayPause: () => void;
  onPlayAll: (tracks: Track[], shuffle?: boolean) => void;
  onAddTrackToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onOpenDetails: (track: Track) => void;
  onSelectAlbum: (albumId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onOpenFilePicker: () => void;
  viewMode: SongViewMode;
  onChangeViewMode: (mode: SongViewMode) => void;
}

export function SongsView({
  tracks,
  currentTrack,
  isPlaying,
  favorites,
  playlists,
  accent,
  onPlayTrack,
  onTogglePlayPause,
  onPlayAll,
  onAddTrackToQueue,
  onToggleFavorite,
  onAddTrackToPlaylist,
  onOpenDetails,
  onSelectAlbum,
  onSelectArtist,
  onOpenFilePicker,
  viewMode,
  onChangeViewMode,
}: SongsViewProps) {
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [sortCol, setSortCol] = useState<SongSortColumn>('title');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) setViewMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [viewMenuOpen]);

  const palette = ACCENT_PALETTES[accent];

  const genres = useMemo(() => {
    const unique = Array.from(new Set(tracks.map((t) => t.genre))).sort();
    return unique;
  }, [tracks]);

  const filteredAndSorted = useMemo(() => {
    let list = tracks;
    if (genreFilter !== 'all') {
      list = list.filter((t) => t.genre === genreFilter);
    }
    if (favoritesOnly) {
      list = list.filter((t) => favorites.has(t.id));
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'artist':
          cmp = a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
          break;
        case 'album':
          cmp = a.album.localeCompare(b.album) || a.trackNumber - b.trackNumber;
          break;
        case 'genre':
          cmp = a.genre.localeCompare(b.genre) || a.title.localeCompare(b.title);
          break;
        case 'duration':
          cmp = a.duration - b.duration;
          break;
        default:
          cmp = a.trackNumber - b.trackNumber;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [tracks, genreFilter, favoritesOnly, favorites, sortCol, sortDir]);

  const totalSec = filteredAndSorted.reduce((s, t) => s + t.duration, 0);

  const toggleSort = (col: SongSortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const renderSortIcon = (col: SongSortColumn) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header & Toolbar */}
      <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Songs
          </h1>
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'song' : 'songs'} ·{' '}
            {formatTotalDuration(totalSec)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Favorites Filter Toggle */}
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-pressed={favoritesOnly}
            className={`h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-medium border transition-colors whitespace-nowrap ${
              favoritesOnly
                ? `bg-black/[0.07] dark:bg-white/[0.12] border-black/15 dark:border-white/20 ${palette.activeText}`
                : 'bg-white dark:bg-[#2b2b2b] border-black/[0.08] dark:border-white/[0.08] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#333]'
            }`}
          >
            <Heart size={13} className={favoritesOnly ? 'fill-current' : ''} />
            <span>Favorites</span>
          </button>

          {/* View options: list or grid sizes */}
          <div className="relative" ref={viewMenuRef}>
            <button
              type="button"
              onClick={() => setViewMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
              aria-label="More options: view, genre, add music"
              title="More options"
              className="h-9 w-9 rounded-md inline-flex items-center justify-center bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#343434] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {viewMenuOpen && (
              <div
                role="menu"
                aria-label="Song view options"
                className="absolute right-0 top-10 w-60 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2c] border border-black/10 dark:border-white/10 shadow-xl z-40"
              >
                <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  View as
                </div>
                {SONG_VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === opt.id}
                    onClick={() => {
                      onChangeViewMode(opt.id);
                      setViewMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-[13px] transition-colors ${
                      viewMode === opt.id
                        ? `bg-black/[0.06] dark:bg-white/[0.09] font-medium ${palette.activeText}`
                        : 'text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {opt.id === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                      <span>{opt.label}</span>
                    </span>
                    {viewMode === opt.id && <Check size={14} />}
                  </button>
                ))}

                <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
                <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Genre
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {['all', ...genres].map((g) => (
                    <button
                      key={g}
                      type="button"
                      role="menuitemradio"
                      aria-checked={genreFilter === g}
                      onClick={() => {
                        setGenreFilter(g);
                        setViewMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-[13px] transition-colors ${
                        genreFilter === g
                          ? `bg-black/[0.06] dark:bg-white/[0.09] font-medium ${palette.activeText}`
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="truncate">{g === 'all' ? 'All genres' : g}</span>
                      {genreFilter === g && <Check size={14} className="shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setViewMenuOpen(false);
                    onOpenFilePicker();
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-[13px] font-medium text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <FolderPlus size={14} />
                  <span>Add music</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPlayAll(filteredAndSorted, true)}
            disabled={filteredAndSorted.length === 0}
            className={`h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors whitespace-nowrap disabled:opacity-40 ${palette.buttonBg} ${palette.buttonText}`}
          >
            <Shuffle size={14} />
            <span>Shuffle & play</span>
          </button>
        </div>
      </div>

      {/* Songs Table (without inline bitrate column) */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {filteredAndSorted.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Music2 size={36} className="text-neutral-400 dark:text-neutral-500 mb-3" />
            <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
              No songs found
            </p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
              Adjust your filters or add local audio files from your device.
            </p>
          </div>
        ) : viewMode !== 'list' ? (
          <div className={`grid ${SONG_GRID[viewMode].cols} ${SONG_GRID[viewMode].gap} py-2`}>
            {filteredAndSorted.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isFav = favorites.has(track.id);
              return (
                <div
                  key={track.id}
                  onClick={() => (isCurrent ? onTogglePlayPause() : onPlayTrack(track, filteredAndSorted))}
                  className="group cursor-pointer rounded-lg p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  <div className="relative aspect-square rounded-md overflow-hidden shadow-sm">
                    <CoverArt
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      iconSize={SONG_GRID[viewMode].icon}
                      roundedClass="rounded-md"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) onTogglePlayPause();
                        else onPlayTrack(track, filteredAndSorted);
                      }}
                      aria-label={`${isCurrent && isPlaying ? 'Pause' : 'Play'} ${track.title}`}
                      className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-opacity ${palette.buttonBg} ${palette.buttonText} ${
                        isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={15} className="fill-current" />
                      ) : (
                        <Play size={15} className="fill-current ml-0.5" />
                      )}
                    </button>
                    <div
                      className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(track.id)}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        className={`w-7 h-7 rounded-md bg-black/55 backdrop-blur-xs flex items-center justify-center ${
                          isFav ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        <Heart size={13} className={isFav ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddTrackToQueue(track)}
                        aria-label={`Add ${track.title} to queue`}
                        className="w-7 h-7 rounded-md bg-black/55 backdrop-blur-xs text-white flex items-center justify-center"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`mt-2 text-[13px] font-medium truncate ${
                      isCurrent ? palette.activeText : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {track.title}
                  </div>
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate">
                    {track.artist} · {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full min-w-[680px]">
            {/* Sortable Header Row */}
            <div className="grid grid-cols-[40px_minmax(200px,2.2fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_76px_138px] items-center gap-3 px-3 py-2 text-[12px] font-medium text-neutral-500 dark:text-neutral-400 border-b border-black/[0.07] dark:border-white/[0.07] select-none">
              <span className="text-center">#</span>

              <button
                type="button"
                onClick={() => toggleSort('title')}
                className="flex items-center gap-1.5 text-left hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <span>Title</span>
                {renderSortIcon('title')}
              </button>

              <button
                type="button"
                onClick={() => toggleSort('artist')}
                className="flex items-center gap-1.5 text-left hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <span>Artist</span>
                {renderSortIcon('artist')}
              </button>

              <button
                type="button"
                onClick={() => toggleSort('album')}
                className="flex items-center gap-1.5 text-left hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <span>Album</span>
                {renderSortIcon('album')}
              </button>

              <button
                type="button"
                onClick={() => toggleSort('duration')}
                className="flex items-center justify-end gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                {renderSortIcon('duration')}
                <span>Length</span>
              </button>

              <span className="sr-only">Actions</span>
            </div>

            {/* Song Rows */}
            <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {filteredAndSorted.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isFav = favorites.has(track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      if (isCurrent) {
                        onTogglePlayPause();
                      } else {
                        onPlayTrack(track, filteredAndSorted);
                      }
                    }}
                    className={`group grid grid-cols-[40px_minmax(200px,2.2fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_76px_138px] items-center gap-3 px-3 h-11 rounded-md cursor-pointer transition-colors relative ${
                      isCurrent
                        ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span
                        className={`text-[12.5px] tabular-nums group-hover:hidden ${
                          isCurrent
                            ? palette.activeText
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {isCurrent && isPlaying ? '▶' : idx + 1}
                      </span>
                      <span className="hidden group-hover:flex items-center justify-center text-neutral-900 dark:text-white">
                        {isCurrent && isPlaying ? (
                          <Pause size={14} className="fill-current" />
                        ) : (
                          <Play size={14} className="fill-current ml-0.5" />
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-0">
                      <CoverArt
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-7 h-7 shrink-0"
                        iconSize={13}
                        roundedClass="rounded"
                      />
                      <span
                        className={`text-[13.5px] font-medium truncate ${
                          isCurrent
                            ? palette.activeText
                            : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {track.title}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectArtist(track.artistId);
                      }}
                      className="text-left text-[13px] text-neutral-600 dark:text-neutral-300 hover:underline truncate"
                    >
                      {track.artist}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAlbum(track.albumId);
                      }}
                      className="text-left text-[13px] text-neutral-600 dark:text-neutral-300 hover:underline truncate"
                    >
                      {track.album}
                    </button>

                    <span className="text-[12.5px] font-mono-tabular text-neutral-500 dark:text-neutral-400 text-right">
                      {formatDuration(track.duration)}
                    </span>

                    <div
                      className="flex items-center justify-end gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenDetails(track)}
                        title="Song details & bitrate"
                        aria-label={`View details for ${track.title}`}
                        className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <Info size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(track.id)}
                        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                          isFav
                            ? palette.activeText
                            : 'opacity-0 group-hover:opacity-100 text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <Heart size={14} className={isFav ? 'fill-current' : ''} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onAddTrackToQueue(track)}
                        title="Add to queue"
                        aria-label={`Add ${track.title} to queue`}
                        className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                      >
                        <Plus size={14} />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setPlaylistMenuTrackId(
                              playlistMenuTrackId === track.id ? null : track.id
                            )
                          }
                          title="Add to playlist"
                          aria-label={`Add ${track.title} to playlist`}
                          className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                        >
                          <ListPlus size={14} />
                        </button>

                        {playlistMenuTrackId === track.id && (
                          <div className="absolute right-0 top-9 w-48 py-1 rounded-md bg-white dark:bg-[#2c2c2c] border border-black/10 dark:border-white/10 shadow-xl z-30">
                            <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                              Add to playlist
                            </div>
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                type="button"
                                onClick={() => {
                                  onAddTrackToPlaylist(pl.id, track.id);
                                  setPlaylistMenuTrackId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-[12.5px] text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] truncate"
                              >
                                {pl.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
