import {
  ArrowLeft,
  Check,
  Info,
  LayoutGrid,
  List,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Shuffle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AccentTheme,
  Album,
  Artist,
  ArtistViewMode,
  Track,
} from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

const ARTIST_VIEW_OPTIONS: { id: ArtistViewMode; label: string }[] = [
  { id: 'large', label: 'Large grid' },
  { id: 'medium', label: 'Medium grid' },
  { id: 'small', label: 'Small grid' },
  { id: 'list', label: 'Name list' },
];

const ARTIST_GRID: Record<'small' | 'medium' | 'large', { cols: string; avatar: string; pad: string; icon: number }> = {
  small: { cols: 'grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3', avatar: 'w-20 h-20', pad: 'p-3', icon: 24 },
  medium: { cols: 'grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-5', avatar: 'w-32 h-32', pad: 'p-4', icon: 34 },
  large: { cols: 'grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6', avatar: 'w-44 h-44', pad: 'p-5', icon: 44 },
};

interface ArtistsViewProps {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  selectedArtistId: string | null;
  viewMode: ArtistViewMode;
  onChangeViewMode: (mode: ArtistViewMode) => void;
  onSelectArtist: (artistId: string | null) => void;
  onSelectAlbum: (albumId: string) => void;
  onPlayTrack: (track: Track, contextTracks: Track[]) => void;
  onTogglePlayPause: () => void;
  onPlayArtist: (artistId: string, shuffle?: boolean) => void;
  onAddTrackToQueue: (track: Track) => void;
  onOpenDetails: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  accent: AccentTheme;
}

export function ArtistsView({
  artists,
  albums,
  tracks,
  selectedArtistId,
  viewMode,
  onChangeViewMode,
  onSelectArtist,
  onSelectAlbum,
  onPlayTrack,
  onTogglePlayPause,
  onPlayArtist,
  onAddTrackToQueue,
  onOpenDetails,
  currentTrack,
  isPlaying,
  accent,
}: ArtistsViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const palette = ACCENT_PALETTES[accent];

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const selectedArtist = selectedArtistId
    ? artists.find((a) => a.id === selectedArtistId) || null
    : null;

  if (selectedArtist) {
    const artistAlbums = albums.filter((al) => al.artistId === selectedArtist.id);
    const artistTracks = tracks.filter((t) => t.artistId === selectedArtist.id);
    const totalSec = artistTracks.reduce((sum, t) => sum + t.duration, 0);

    return (
      <div className="h-full overflow-y-auto">
        <div className="px-6 pt-5 pb-7 border-b border-black/[0.06] dark:border-white/[0.06] bg-gradient-to-b from-black/[0.03] dark:from-white/[0.03] to-transparent">
          <button
            type="button"
            onClick={() => onSelectArtist(null)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 -ml-2.5 mb-4 rounded-md text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Artists</span>
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-36 h-36 sm:w-44 sm:h-44 shrink-0 rounded-full overflow-hidden shadow-lg border border-black/10 dark:border-white/10">
              <CoverArt
                src={selectedArtist.coverUrl}
                alt={selectedArtist.name}
                className="w-full h-full"
                iconSize={44}
                roundedClass="rounded-full"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                {selectedArtist.name}
              </h1>
              <p className="text-[13.5px] text-neutral-600 dark:text-neutral-400 mt-1.5 max-w-2xl">
                {selectedArtist.bio}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                <span>{selectedArtist.genre}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {artistAlbums.length} {artistAlbums.length === 1 ? 'album' : 'albums'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {artistTracks.length} {artistTracks.length === 1 ? 'song' : 'songs'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatTotalDuration(totalSec)}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => onPlayArtist(selectedArtist.id, false)}
                  disabled={artistTracks.length === 0}
                  className={`h-9 px-5 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors ${palette.buttonBg} ${palette.buttonText}`}
                >
                  <Play size={14} className="fill-current" />
                  <span>Play all</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPlayArtist(selectedArtist.id, true)}
                  disabled={artistTracks.length === 0}
                  className="h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium bg-white dark:bg-[#2d2d2d] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-100 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
                >
                  <Shuffle size={14} />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Albums by Artist */}
        <div className="px-6 py-5">
          <h2 className="font-display text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 mb-3.5">
            Albums
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-4">
            {artistAlbums.map((album) => (
              <div
                key={album.id}
                onClick={() => onSelectAlbum(album.id)}
                className="group p-3 rounded-lg bg-white/60 dark:bg-[#272727]/80 hover:bg-white dark:hover:bg-[#2f2f2f] border border-black/[0.05] dark:border-white/[0.05] cursor-pointer transition-colors"
              >
                <div className="aspect-square w-full rounded-md overflow-hidden mb-2.5">
                  <CoverArt
                    src={album.coverUrl}
                    alt={album.title}
                    className="w-full h-full group-hover:scale-[1.03] transition-transform duration-300"
                    roundedClass="rounded-md"
                  />
                </div>
                <div className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {album.title}
                </div>
                <div className="text-[12px] text-neutral-500 dark:text-neutral-400 tabular-nums mt-0.5">
                  {album.year}
                </div>
              </div>
            ))}
          </div>

          {/* All Songs by Artist */}
          <h2 className="font-display text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 mt-8 mb-3">
            Songs
          </h2>
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {artistTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, artistTracks);
                    }
                  }}
                  className={`group grid grid-cols-[36px_1fr_minmax(120px,1fr)_72px_76px] items-center gap-3 px-3 h-11 rounded-md cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <span
                      className={`text-[12.5px] tabular-nums group-hover:hidden ${
                        isCurrent ? palette.activeText : 'text-neutral-500 dark:text-neutral-400'
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
                        isCurrent ? palette.activeText : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {track.title}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAlbum(track.albumId);
                    }}
                    className="text-left text-[13px] text-neutral-500 dark:text-neutral-400 hover:underline truncate"
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
                      className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                    >
                      <Info size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddTrackToQueue(track)}
                      title="Add to queue"
                      className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Artists
          </h1>
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {artists.length} {artists.length === 1 ? 'artist' : 'artists'}
          </span>
        </div>

        {/* Three-dot View Options Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Artist view options (${ARTIST_VIEW_OPTIONS.find((o) => o.id === viewMode)?.label})`}
            className="h-9 px-3 rounded-md inline-flex items-center gap-2 text-[12.5px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#343434] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
          >
            <span>{ARTIST_VIEW_OPTIONS.find((o) => o.id === viewMode)?.label}</span>
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Artist view options"
              className="absolute right-0 top-10 w-48 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2c] border border-black/10 dark:border-white/10 shadow-xl z-40"
            >
              <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                View as
              </div>
              {ARTIST_VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={viewMode === opt.id}
                  onClick={() => {
                    onChangeViewMode(opt.id);
                    setMenuOpen(false);
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
            </div>
          )}
        </div>
      </div>

      {/* Artists Grid or List */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {artists.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Mic2 size={36} className="text-neutral-400 dark:text-neutral-500 mb-3" />
            <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
              No artists found
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {artists.map((artist) => {
              const artistAlbums = albums.filter((al) => al.artistId === artist.id);
              const artistTracks = tracks.filter((t) => t.artistId === artist.id);
              const isCurrent = currentTrack?.artistId === artist.id;
              return (
                <div
                  key={artist.id}
                  onClick={() => onSelectArtist(artist.id)}
                  className="group grid grid-cols-[minmax(220px,1.8fr)_110px_110px_48px] items-center gap-3 px-3 h-13 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CoverArt
                      src={artist.coverUrl}
                      alt={artist.name}
                      className="w-9 h-9 shrink-0"
                      iconSize={16}
                      roundedClass="rounded-full"
                    />
                    <span
                      className={`text-[14px] font-medium truncate ${
                        isCurrent ? palette.activeText : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {artist.name}
                    </span>
                  </div>
                  <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 tabular-nums text-right">
                    {artistAlbums.length} {artistAlbums.length === 1 ? 'album' : 'albums'}
                  </span>
                  <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 tabular-nums text-right">
                    {artistTracks.length} {artistTracks.length === 1 ? 'song' : 'songs'}
                  </span>
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayArtist(artist.id);
                      }}
                      aria-label={`Play ${artist.name}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-black/[0.07] dark:bg-white/[0.12] text-neutral-900 dark:text-white"
                    >
                      <Play size={13} className="fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`grid ${ARTIST_GRID[viewMode].cols}`}>
            {artists.map((artist) => {
              const artistAlbums = albums.filter((al) => al.artistId === artist.id);
              const artistTracks = tracks.filter((t) => t.artistId === artist.id);
              const isCurrent = currentTrack?.artistId === artist.id;
              return (
                <div
                  key={artist.id}
                  onClick={() => onSelectArtist(artist.id)}
                  className={`group ${ARTIST_GRID[viewMode].pad} rounded-lg bg-white/60 dark:bg-[#272727]/80 hover:bg-white dark:hover:bg-[#2f2f2f] border border-black/[0.05] dark:border-white/[0.05] cursor-pointer transition-colors flex flex-col items-center text-center`}
                >
                  <div className={`relative ${ARTIST_GRID[viewMode].avatar} rounded-full overflow-hidden mb-3 shadow-sm`}>
                    <CoverArt
                      src={artist.coverUrl}
                      alt={artist.name}
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                      iconSize={ARTIST_GRID[viewMode].icon}
                      roundedClass="rounded-full"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayArtist(artist.id);
                      }}
                      aria-label={`Play ${artist.name}`}
                      className={`absolute bottom-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${palette.buttonBg} ${palette.buttonText}`}
                    >
                      <Play size={15} className="fill-current ml-0.5" />
                    </button>
                  </div>
                  <h2
                    className={`text-[14.5px] font-medium truncate w-full ${
                      isCurrent ? palette.activeText : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {artist.name}
                  </h2>
                  <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 tabular-nums">
                    {artistAlbums.length} {artistAlbums.length === 1 ? 'album' : 'albums'} ·{' '}
                    {artistTracks.length} {artistTracks.length === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
