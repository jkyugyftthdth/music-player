import {
  ArrowLeft,
  Folder,
  FolderOpen,
  Info,
  Pause,
  Play,
  Plus,
  Shuffle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AccentTheme, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface FoldersViewProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  accent: AccentTheme;
  onOpenFolderPicker: () => void;
  onPlayTrack: (track: Track, contextTracks: Track[]) => void;
  onPlayFolderTracks: (folderTracks: Track[], shuffle?: boolean) => void;
  onTogglePlayPause: () => void;
  onAddTrackToQueue: (track: Track) => void;
  onOpenDetails: (track: Track) => void;
}

interface FolderGroup {
  path: string;
  name: string;
  isLocal: boolean;
  tracks: Track[];
  totalSec: number;
  coverUrl?: string;
}

export function FoldersView({
  tracks,
  currentTrack,
  isPlaying,
  accent,
  onOpenFolderPicker,
  onPlayTrack,
  onPlayFolderTracks,
  onTogglePlayPause,
  onAddTrackToQueue,
  onOpenDetails,
}: FoldersViewProps) {
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const palette = ACCENT_PALETTES[accent];

  const folders = useMemo<FolderGroup[]>(() => {
    const map = new Map<string, FolderGroup>();

    for (const track of tracks) {
      const folderPath = track.folderPath || `Music Library / ${track.album}`;
      const parts = folderPath.split('/').filter(Boolean);
      const name = parts[parts.length - 1] || folderPath;

      const existing = map.get(folderPath);
      if (existing) {
        existing.tracks.push(track);
        existing.totalSec += track.duration;
        if (!existing.coverUrl && track.coverUrl) {
          existing.coverUrl = track.coverUrl;
        }
      } else {
        map.set(folderPath, {
          path: folderPath,
          name,
          isLocal: Boolean(track.isLocal),
          tracks: [track],
          totalSec: track.duration,
          coverUrl: track.coverUrl,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [tracks]);

  const activeFolder = selectedFolderPath
    ? folders.find((f) => f.path === selectedFolderPath) || null
    : null;

  if (activeFolder) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 pt-5 pb-5 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setSelectedFolderPath(null)}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 -ml-2.5 mb-2 rounded-md text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
            >
              <ArrowLeft size={15} />
              <span>Folders</span>
            </button>

            <div className="flex items-center gap-3">
              <FolderOpen size={24} className={palette.activeText} />
              <h1 className="font-display text-[26px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {activeFolder.name}
              </h1>
            </div>
            <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400 mt-1 tabular-nums">
              {activeFolder.path} · {activeFolder.tracks.length}{' '}
              {activeFolder.tracks.length === 1 ? 'song' : 'songs'} ·{' '}
              {formatTotalDuration(activeFolder.totalSec)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onPlayFolderTracks(activeFolder.tracks, false)}
              className={`h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors ${palette.buttonBg} ${palette.buttonText}`}
            >
              <Play size={14} className="fill-current" />
              <span>Play folder</span>
            </button>
            <button
              type="button"
              onClick={() => onPlayFolderTracks(activeFolder.tracks, true)}
              className="h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#343434] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
            >
              <Shuffle size={14} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {activeFolder.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayTrack(track, activeFolder.tracks);
                    }
                  }}
                  className={`group grid grid-cols-[38px_1fr_minmax(130px,1fr)_72px_76px] items-center gap-3 px-3 h-12 rounded-md cursor-pointer transition-colors ${
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
                    {track.fileName || track.album}
                  </span>

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
                      aria-label={`Add ${track.title} to queue`}
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
      <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Folders
          </h1>
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenFolderPicker}
          className={`h-9 px-4 rounded-md inline-flex items-center gap-2 text-[13px] font-medium transition-colors whitespace-nowrap ${palette.buttonBg} ${palette.buttonText}`}
        >
          <FolderOpen size={15} />
          <span>Play music folder from PC</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {folders.map((folder) => {
            const isActiveFolder = folder.tracks.some((t) => t.id === currentTrack?.id);
            return (
              <div
                key={folder.path}
                onClick={() => setSelectedFolderPath(folder.path)}
                className={`group p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                  isActiveFolder
                    ? 'bg-black/[0.05] dark:bg-[#2c2c2c] border-black/[0.1] dark:border-white/[0.12]'
                    : 'bg-white/60 dark:bg-[#272727]/80 hover:bg-white dark:hover:bg-[#2f2f2f] border-black/[0.05] dark:border-white/[0.05]'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0">
                    <Folder size={24} className={palette.activeText} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`text-[14.5px] font-semibold truncate ${
                        isActiveFolder
                          ? palette.activeText
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {folder.name}
                    </h2>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {folder.path}
                    </p>
                    <p className="text-[12px] text-neutral-500 dark:text-neutral-400 tabular-nums mt-1">
                      {folder.tracks.length} {folder.tracks.length === 1 ? 'song' : 'songs'} ·{' '}
                      {formatTotalDuration(folder.totalSec)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-[11.5px] text-neutral-500 dark:text-neutral-400">
                    {folder.isLocal ? 'Local directory' : 'Library folder'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayFolderTracks(folder.tracks, false);
                    }}
                    className={`h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${palette.buttonBg} ${palette.buttonText}`}
                  >
                    <Play size={12} className="fill-current" />
                    <span>Play folder</span>
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
