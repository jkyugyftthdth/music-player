import {
  Check,
  ListMusic,
  Pause,
  Pencil,
  Play,
  Shuffle,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AccentTheme, Playlist, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface PlaylistsViewProps {
  playlist: Playlist | null;
  allTracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  accent: AccentTheme;
  onPlayTrack: (track: Track, contextTracks: Track[]) => void;
  onTogglePlayPause: () => void;
  onPlayAll: (tracks: Track[], shuffle?: boolean) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onRenamePlaylist: (playlistId: string, newName: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

export function PlaylistsView({
  playlist,
  allTracks,
  currentTrack,
  isPlaying,
  accent,
  onPlayTrack,
  onTogglePlayPause,
  onPlayAll,
  onRemoveTrackFromPlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
}: PlaylistsViewProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const palette = ACCENT_PALETTES[accent];

  if (!playlist) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <ListMusic size={40} className="text-neutral-400 dark:text-neutral-500 mb-3" />
        <h2 className="font-display text-lg font-medium text-neutral-800 dark:text-neutral-200">
          Select a playlist
        </h2>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
          Choose a playlist from the left navigation rail or create a new one.
        </p>
      </div>
    );
  }

  const playlistTracks = playlist.trackIds
    .map((id) => allTracks.find((t) => t.id === id))
    .filter((t): t is Track => Boolean(t));

  const totalSec = playlistTracks.reduce((sum, t) => sum + t.duration, 0);

  const startEditing = () => {
    setDraftName(playlist.name);
    setEditing(true);
  };

  const commitRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (trimmed) {
      onRenamePlaylist(playlist.id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-5 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div>
          {editing ? (
            <form onSubmit={commitRename} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-9 px-3 text-lg font-display font-semibold rounded-md bg-white dark:bg-[#2b2b2b] text-neutral-900 dark:text-white border border-black/15 dark:border-white/15 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Save playlist name"
                className={`w-9 h-9 rounded-md flex items-center justify-center ${palette.buttonBg} ${palette.buttonText}`}
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Cancel rename"
                className="w-9 h-9 rounded-md flex items-center justify-center bg-black/[0.06] dark:bg-white/[0.08] text-neutral-700 dark:text-neutral-300"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {playlist.name}
              </h1>
              <button
                type="button"
                onClick={startEditing}
                title="Rename playlist"
                aria-label="Rename playlist"
                className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}

          <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums">
            {playlistTracks.length} {playlistTracks.length === 1 ? 'song' : 'songs'} ·{' '}
            {formatTotalDuration(totalSec)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onPlayAll(playlistTracks, false)}
            disabled={playlistTracks.length === 0}
            className={`h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors disabled:opacity-40 ${palette.buttonBg} ${palette.buttonText}`}
          >
            <Play size={14} className="fill-current" />
            <span>Play all</span>
          </button>

          <button
            type="button"
            onClick={() => onPlayAll(playlistTracks, true)}
            disabled={playlistTracks.length === 0}
            className="h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-100 border border-black/[0.08] dark:border-white/[0.08] disabled:opacity-40 transition-colors"
          >
            <Shuffle size={14} />
            <span>Shuffle</span>
          </button>

          <button
            type="button"
            onClick={() => onDeletePlaylist(playlist.id)}
            title="Delete playlist"
            aria-label="Delete playlist"
            className="h-9 px-3 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-700 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {playlistTracks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <ListMusic size={36} className="text-neutral-400 dark:text-neutral-500 mb-3" />
            <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
              This playlist has no songs yet
            </p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
              Use the Add to playlist button on any song in Songs or Albums to populate it.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {playlistTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, playlistTracks);
                    }
                  }}
                  className={`group grid grid-cols-[40px_1fr_minmax(130px,1fr)_72px_40px] items-center gap-3 px-3 h-12 rounded-md cursor-pointer transition-colors ${
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

                  <div className="flex items-center gap-3 min-w-0">
                    <CoverArt
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-8 h-8 shrink-0"
                      iconSize={14}
                      roundedClass="rounded"
                    />
                    <div className="min-w-0">
                      <div
                        className={`text-[13.5px] font-medium truncate ${
                          isCurrent ? palette.activeText : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {track.title}
                      </div>
                      <div className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400 truncate">
                    {track.album}
                  </span>

                  <span className="text-[12.5px] font-mono-tabular text-neutral-500 dark:text-neutral-400 text-right">
                    {formatDuration(track.duration)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTrackFromPlaylist(playlist.id, track.id);
                    }}
                    title="Remove from playlist"
                    aria-label={`Remove ${track.title} from playlist`}
                    className="w-8 h-8 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
