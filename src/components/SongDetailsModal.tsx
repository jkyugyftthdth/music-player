import { Disc3, Play, Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { AccentTheme, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { formatDuration, formatFileSize, formatSampleRate } from '@/src/utils/format';
import { CoverArt } from './CoverArt';

interface SongDetailsModalProps {
  track: Track | null;
  accent: AccentTheme;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onSelectAlbum: (albumId: string) => void;
  onSelectArtist: (artistId: string) => void;
}

export function SongDetailsModal({
  track,
  accent,
  onClose,
  onPlayTrack,
  onAddToQueue,
  onSelectAlbum,
  onSelectArtist,
}: SongDetailsModalProps) {
  const palette = ACCENT_PALETTES[accent];

  useEffect(() => {
    if (!track) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [track, onClose]);

  if (!track) return null;

  const bitrateDisplay = track.bitrateKbps ? `${track.bitrateKbps} kbps` : 'Variable / Auto';
  const sampleRateDisplay = formatSampleRate(track.sampleRateHz);
  const fileSizeDisplay = formatFileSize(track.fileSizeBytes);

  const technicalSpecs: { label: string; value: string }[] = [
    { label: 'Bitrate', value: bitrateDisplay },
    { label: 'Format / Codec', value: track.format || 'Audio stream' },
    { label: 'Sample rate', value: sampleRateDisplay },
    { label: 'Channels', value: track.channels || '2 (Stereo)' },
    { label: 'Duration', value: formatDuration(track.duration) },
    { label: 'File size', value: fileSizeDisplay },
    { label: 'Release year', value: String(track.year) },
    { label: 'Genre', value: track.genre },
    ...(track.keySignature ? [{ label: 'Musical key', value: track.keySignature }] : []),
    ...(track.synthRecipe?.bpm ? [{ label: 'Tempo', value: `${track.synthRecipe.bpm} BPM` }] : []),
    ...(track.composer ? [{ label: 'Composer', value: track.composer }] : []),
    ...(track.fileName ? [{ label: 'Source file', value: track.fileName }] : []),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="song-details-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl bg-[#fafafa] dark:bg-[#252525] text-neutral-900 dark:text-neutral-100 border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Top Windows 11 Dialog Bar */}
        <div className="px-5 py-3.5 border-b border-black/[0.07] dark:border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            <Disc3 size={15} className={palette.activeText} />
            <span>Song details & audio properties</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close song details"
            className="w-8 h-8 rounded-md flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {/* Header with Cover & Primary Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-28 h-28 shrink-0 rounded-lg overflow-hidden shadow-md border border-black/10 dark:border-white/10">
              <CoverArt
                src={track.coverUrl}
                alt={track.title}
                className="w-full h-full"
                iconSize={34}
                roundedClass="rounded-lg"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2
                id="song-details-title"
                className="font-display text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white truncate"
              >
                {track.title}
              </h2>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[13.5px] text-neutral-600 dark:text-neutral-300">
                <button
                  type="button"
                  onClick={() => {
                    onSelectArtist(track.artistId);
                    onClose();
                  }}
                  className={`font-medium hover:underline ${palette.activeText}`}
                >
                  {track.artist}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => {
                    onSelectAlbum(track.albumId);
                    onClose();
                  }}
                  className="hover:underline"
                >
                  {track.album}
                </button>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Track {track.trackNumber}</span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => onPlayTrack(track)}
                  className={`h-8 px-3.5 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors ${palette.buttonBg} ${palette.buttonText}`}
                >
                  <Play size={13} className="fill-current" />
                  <span>Play song</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddToQueue(track)}
                  className="h-8 px-3.5 rounded-md inline-flex items-center gap-1.5 text-[12.5px] font-medium bg-white dark:bg-[#323232] hover:bg-neutral-100 dark:hover:bg-[#3a3a3a] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] transition-colors"
                >
                  <Plus size={13} />
                  <span>Add to queue</span>
                </button>
              </div>
            </div>
          </div>

          {/* About This Song */}
          <div>
            <h3 className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
              About this song
            </h3>
            <p className="text-[13.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">
              {track.about ||
                `"${track.title}" by ${track.artist} from the album ${track.album} (${track.year}).`}
            </p>
          </div>

          {/* Technical Audio & File Properties */}
          <div className="border-t border-black/[0.07] dark:border-white/[0.07] pt-5">
            <h3 className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
              Audio & file details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
              {technicalSpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-3 py-1 border-b border-black/[0.04] dark:border-white/[0.04]"
                >
                  <dt className="text-neutral-500 dark:text-neutral-400 shrink-0">{spec.label}</dt>
                  <dd className="font-medium text-neutral-900 dark:text-neutral-100 text-right truncate tabular-nums">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
