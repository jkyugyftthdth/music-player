import { ListMusic, Pause, Play, Shuffle, Trash2, X } from 'lucide-react';
import { AccentTheme, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatTotalDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface QueueViewProps {
  queue: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  accent: AccentTheme;
  onPlayAtIndex: (idx: number) => void;
  onTogglePlayPause: () => void;
  onRemoveAtIndex: (idx: number) => void;
  onClearQueue: () => void;
  onShuffleQueue: () => void;
}

export function QueueView({
  queue,
  currentTrackIndex,
  isPlaying,
  accent,
  onPlayAtIndex,
  onTogglePlayPause,
  onRemoveAtIndex,
  onClearQueue,
  onShuffleQueue,
}: QueueViewProps) {
  const palette = ACCENT_PALETTES[accent];
  const totalSec = queue.reduce((s, t) => s + t.duration, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Play queue
          </h1>
          <span className="text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {queue.length} {queue.length === 1 ? 'song' : 'songs'} · {formatTotalDuration(totalSec)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShuffleQueue}
            disabled={queue.length < 2}
            className="h-9 px-3.5 rounded-md inline-flex items-center gap-2 text-[12.5px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] disabled:opacity-40 transition-colors"
          >
            <Shuffle size={13} />
            <span>Shuffle queue</span>
          </button>

          <button
            type="button"
            onClick={onClearQueue}
            disabled={queue.length === 0}
            className="h-9 px-3.5 rounded-md inline-flex items-center gap-2 text-[12.5px] font-medium bg-white dark:bg-[#2b2b2b] hover:bg-neutral-50 dark:hover:bg-[#353535] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] disabled:opacity-40 transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear queue</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {queue.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <ListMusic size={36} className="text-neutral-400 dark:text-neutral-500 mb-3" />
            <p className="text-[15px] font-medium text-neutral-800 dark:text-neutral-200">
              Your play queue is empty
            </p>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
              Play an album, artist, or song to start building your queue.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {queue.map((track, idx) => {
              const isCurrent = idx === currentTrackIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => {
                    if (isCurrent) {
                      onTogglePlayPause();
                    } else {
                      onPlayAtIndex(idx);
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
                      onRemoveAtIndex(idx);
                    }}
                    title="Remove from queue"
                    aria-label={`Remove ${track.title} from queue`}
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
