import {
  ArrowLeft,
  Heart,
  Info,
  ListPlus,
  Pause,
  Play,
  Plus,
  Shuffle,
} from 'lucide-react';
import { useState } from 'react';
import { AccentTheme, Album, Playlist, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface AlbumDetailViewProps {
  album: Album;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  favorites: Set<string>;
  playlists: Playlist[];
  accent: AccentTheme;
  onBack: () => void;
  onSelectArtist: (artistId: string) => void;
  onPlayTrack: (track: Track, contextTracks: Track[]) => void;
  onTogglePlayPause: () => void;
  onPlayAlbum: (albumId: string, shuffle?: boolean) => void;
  onAddAlbumToQueue: (albumId: string) => void;
  onAddTrackToQueue: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddTrackToPlaylist: (playlistId: string, trackId: string) => void;
  onOpenDetails: (track: Track) => void;
}

export function AlbumDetailView({
  album,
  tracks,
  currentTrack,
  isPlaying,
  favorites,
  playlists,
  accent,
  onBack,
  onSelectArtist,
  onPlayTrack,
  onTogglePlayPause,
  onPlayAlbum,
  onAddAlbumToQueue,
  onAddTrackToQueue,
  onToggleFavorite,
  onAddTrackToPlaylist,
  onOpenDetails,
}: AlbumDetailViewProps) {
  const [playlistMenuTrackId, setPlaylistMenuTrackId] = useState<string | null>(null);
  const palette = ACCENT_PALETTES[accent];
  const sortedTracks = [...tracks].sort((a, b) => a.trackNumber - b.trackNumber);
  const totalSec = sortedTracks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="h-full overflow-y-auto">
      {/* Subtle Windows 11 Ambient Header Wash */}
      <div
        className="px-6 pt-5 pb-7 border-b border-black/[0.06] dark:border-white/[0.06]"
        style={{
          background: `linear-gradient(180deg, ${album.accentHex}1c 0%, transparent 100%)`,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 -ml-2.5 mb-4 rounded-md text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Albums</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="w-40 h-40 sm:w-48 sm:h-48 shrink-0 rounded-lg overflow-hidden shadow-lg border border-black/10 dark:border-white/10">
            <CoverArt
              src={album.coverUrl}
              alt={album.title}
              className="w-full h-full"
              iconSize={48}
              roundedClass="rounded-lg"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 dark:text-white text-balance">
              {album.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[14px] text-neutral-700 dark:text-neutral-300">
              <button
                type="button"
                onClick={() => onSelectArtist(album.artistId)}
                className={`font-medium hover:underline ${palette.activeText}`}
              >
                {album.artist}
              </button>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{album.year}</span>
              <span aria-hidden="true">·</span>
              <span>{album.genre}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {sortedTracks.length} {sortedTracks.length === 1 ? 'song' : 'songs'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatTotalDuration(totalSec)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => onPlayAlbum(album.id, false)}
                disabled={sortedTracks.length === 0}
                className={`h-9 px-5 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors whitespace-nowrap ${palette.buttonBg} ${palette.buttonText}`}
              >
                <Play size={14} className="fill-current" />
                <span>Play all</span>
              </button>

              <button
                type="button"
                onClick={() => onPlayAlbum(album.id, true)}
                disabled={sortedTracks.length === 0}
                className="h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium bg-white dark:bg-[#2d2d2d] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-100 border border-black/[0.08] dark:border-white/[0.08] transition-colors whitespace-nowrap"
              >
                <Shuffle size={14} />
                <span>Shuffle & play</span>
              </button>

              <button
                type="button"
                onClick={() => onAddAlbumToQueue(album.id)}
                disabled={sortedTracks.length === 0}
                className="h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium bg-white dark:bg-[#2d2d2d] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-100 border border-black/[0.08] dark:border-white/[0.08] transition-colors whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Add to queue</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tracklist Table */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-[44px_1fr_80px_142px] items-center gap-3 px-3 py-2 text-[12px] font-medium text-neutral-500 dark:text-neutral-400 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="text-right">Duration</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {sortedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isFav = favorites.has(track.id);
            return (
              <div
                key={track.id}
                onClick={() => {
                  if (isCurrent) {
                    onTogglePlayPause();
                  } else {
                    onPlayTrack(track, sortedTracks);
                  }
                }}
                className={`group grid grid-cols-[44px_1fr_80px_142px] items-center gap-3 px-3 h-11 rounded-md cursor-pointer transition-colors relative ${
                  isCurrent
                    ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                    : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-center">
                  <span
                    className={`text-[13px] tabular-nums group-hover:hidden ${
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

                <div className="min-w-0">
                  <div
                    className={`text-[13.5px] font-medium truncate ${
                      isCurrent
                        ? palette.activeText
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {track.title}
                  </div>
                </div>

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
                        setPlaylistMenuTrackId(playlistMenuTrackId === track.id ? null : track.id)
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
    </div>
  );
}
