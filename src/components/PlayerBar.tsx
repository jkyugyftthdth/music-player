import {
  Heart,
  Info,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AccentTheme, EqPreset, RepeatMode, ThemeMode, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  eqPreset: EqPreset;
  eqEnabled: boolean;
  isFavorite: boolean;
  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  theme: ThemeMode;
  accent: AccentTheme;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (timeSec: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenEqualizer: () => void;
  onToggleFavorite: (trackId: string) => void;
  onToggleNowPlaying: () => void;
  onToggleMiniPlayer: () => void;
  onOpenDetails: (track: Track) => void;
  onToggleQueue: () => void;
  onSelectAlbum: (albumId: string) => void;
  onSelectArtist: (artistId: string) => void;
}

export function PlayerBar({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  muted,
  shuffle,
  repeatMode,
  playbackRate,
  eqPreset,
  eqEnabled,
  isFavorite,
  isNowPlayingOpen,
  isQueueOpen,
  theme,
  accent,
  onTogglePlayPause,
  onNext,
  onPrev,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onOpenEqualizer,
  onToggleFavorite,
  onToggleNowPlaying,
  onToggleMiniPlayer,
  onOpenDetails,
  onToggleQueue,
  onSelectAlbum,
  onSelectArtist,
}: PlayerBarProps) {
  const palette = ACCENT_PALETTES[accent];
  const accentHex = theme === 'dark' ? palette.hexDark : palette.hexLight;
  const thumbRing = theme === 'dark' ? '#272727' : '#ffffff';

  const effectiveDuration = duration > 0 ? duration : currentTrack?.duration || 0;
  const progressPct =
    effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0;
  const volPct = muted ? 0 : Math.round(volume * 100);
  const trackBg = theme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';

  const eqActive = (eqEnabled && eqPreset !== 'flat') || playbackRate !== 1;

  return (
    <footer
      aria-label="Media playback controls"
      style={
        {
          '--accent-color': accentHex,
          '--thumb-ring': thumbRing,
        } as React.CSSProperties
      }
      className="h-[92px] shrink-0 px-4 sm:px-5 bg-[#f7f7f7]/95 dark:bg-[#202020]/95 backdrop-blur-xl border-t border-black/[0.08] dark:border-white/[0.08] grid grid-cols-[minmax(180px,1fr)_minmax(280px,1.5fr)_minmax(180px,1fr)] items-center gap-4 select-none relative z-30"
    >
      {/* Left: Current Track Info */}
      <div className="flex items-center gap-3 min-w-0">
        {currentTrack ? (
          <>
            <button
              type="button"
              onClick={onToggleNowPlaying}
              title={isNowPlayingOpen ? 'Close Now Playing' : 'Open Now Playing'}
              className="w-14 h-14 rounded-md overflow-hidden shrink-0 border border-black/10 dark:border-white/10 hover:opacity-90 transition-opacity"
            >
              <CoverArt
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full"
                iconSize={22}
                roundedClass="rounded-md"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onSelectAlbum(currentTrack.albumId)}
                className="block text-left text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100 hover:underline truncate max-w-full"
              >
                {currentTrack.title}
              </button>
              <button
                type="button"
                onClick={() => onSelectArtist(currentTrack.artistId)}
                className="block text-left text-[12px] text-neutral-600 dark:text-neutral-400 hover:underline truncate max-w-full mt-0.5"
              >
                {currentTrack.artist}
              </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(currentTrack.id)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                isFavorite
                  ? palette.activeText
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
              }`}
            >
              <Heart size={15} className={isFavorite ? 'fill-current' : ''} />
            </button>
            <button
              type="button"
              onClick={() => onOpenDetails(currentTrack)}
              title="Song details & bitrate"
              aria-label="View song details and bitrate"
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
            >
              <Info size={15} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
            <div className="w-14 h-14 rounded-md bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center">
              <CoverArt alt="No track" className="w-14 h-14" iconSize={20} />
            </div>
            <span className="text-[13px]">Select a song to play</span>
          </div>
        )}
      </div>

      {/* Center: Transport & Seekbar */}
      <div className="flex flex-col items-center justify-center gap-1.5 max-w-xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleShuffle}
            title="Shuffle"
            aria-label="Toggle shuffle"
            aria-pressed={shuffle}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              shuffle
                ? `${palette.activeText} bg-black/[0.06] dark:bg-white/[0.08]`
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
            }`}
          >
            <Shuffle size={15} />
          </button>

          <button
            type="button"
            onClick={onPrev}
            disabled={!currentTrack}
            title="Previous"
            aria-label="Previous track"
            className="w-9 h-9 rounded-md flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] disabled:opacity-40 transition-colors"
          >
            <SkipBack size={17} className="fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlayPause}
            disabled={!currentTrack}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 disabled:opacity-40 ${palette.buttonBg} ${palette.buttonText}`}
          >
            {isPlaying ? (
              <Pause size={17} className="fill-current" />
            ) : (
              <Play size={17} className="fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!currentTrack}
            title="Next"
            aria-label="Next track"
            className="w-9 h-9 rounded-md flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] disabled:opacity-40 transition-colors"
          >
            <SkipForward size={17} className="fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            title={`Repeat: ${repeatMode}`}
            aria-label={`Repeat mode: ${repeatMode}`}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              repeatMode !== 'off'
                ? `${palette.activeText} bg-black/[0.06] dark:bg-white/[0.08]`
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>

        {/* Seek Bar */}
        <div className="w-full flex items-center gap-2.5">
          <span className="text-[11px] font-mono-tabular text-neutral-600 dark:text-neutral-400 w-10 text-right shrink-0">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 1}
            step={0.25}
            value={Math.min(currentTime, effectiveDuration || 1)}
            disabled={!currentTrack}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek playback position"
            style={{
              background: `linear-gradient(to right, ${accentHex} ${progressPct}%, ${trackBg} ${progressPct}%)`,
            }}
            className="fluent-slider flex-1 h-1 rounded-full disabled:opacity-40"
          />
          <span className="text-[11px] font-mono-tabular text-neutral-600 dark:text-neutral-400 w-10 shrink-0">
            {formatDuration(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* Right: 10-Band Equalizer / Volume / Queue / Mini Player / Expand */}
      <div className="flex items-center justify-end gap-1.5 relative">
        <button
          type="button"
          onClick={onOpenEqualizer}
          title="Custom 10-band Equalizer & speed"
          aria-label="Open 10-band Equalizer"
          className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
            eqActive
              ? `${palette.activeText} bg-black/[0.06] dark:bg-white/[0.08]`
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden lg:inline">EQ</span>
        </button>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-1.5 w-28">
          <button
            type="button"
            onClick={onToggleMute}
            title={muted || volume === 0 ? 'Unmute' : 'Mute'}
            aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] shrink-0"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            aria-label="Volume"
            style={{
              background: `linear-gradient(to right, ${accentHex} ${volPct}%, ${trackBg} ${volPct}%)`,
            }}
            className="fluent-slider w-full h-1 rounded-full"
          />
        </div>

        {/* Queue shortcut */}
        <button
          type="button"
          onClick={onToggleQueue}
          title="Play queue"
          aria-label="Open play queue"
          aria-pressed={isQueueOpen}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isQueueOpen
              ? `${palette.activeText} bg-black/[0.06] dark:bg-white/[0.08]`
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
          }`}
        >
          <ListMusic size={15} />
        </button>

        {/* Mini Player Mode Switch */}
        <button
          type="button"
          onClick={onToggleMiniPlayer}
          title="Switch to Mini Player"
          aria-label="Switch to Mini Player"
          className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
        >
          <PictureInPicture2 size={15} />
        </button>

        {/* Now Playing View Toggle */}
        <button
          type="button"
          onClick={onToggleNowPlaying}
          title={isNowPlayingOpen ? 'Exit Now Playing view' : 'Now Playing view'}
          aria-label={isNowPlayingOpen ? 'Exit Now Playing view' : 'Open Now Playing view'}
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isNowPlayingOpen
              ? `${palette.activeText} bg-black/[0.06] dark:bg-white/[0.08]`
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07]'
          }`}
        >
          {isNowPlayingOpen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </footer>
  );
}
