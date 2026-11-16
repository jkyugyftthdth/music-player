import { ArrowLeft, Disc3, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/src/audio/AudioEngine';
import { AccentTheme, ThemeMode, Track } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';
import { CoverArt } from './CoverArt';

interface NowPlayingViewProps {
  track: Track | null;
  isPlaying: boolean;
  theme: ThemeMode;
  accent: AccentTheme;
  onBack: () => void;
  onSelectAlbum: (albumId: string) => void;
  onSelectArtist: (artistId: string) => void;
  onOpenDetails: (track: Track) => void;
}

type VisualizerMode = 'spectrum' | 'wave' | 'mirror' | 'circle' | 'scope' | 'dots' | 'aurora' | 'off';

const VIZ_MODES: { id: VisualizerMode; label: string }[] = [
  { id: 'spectrum', label: 'Bars' },
  { id: 'wave', label: 'Wave' },
  { id: 'mirror', label: 'Mirror' },
  { id: 'circle', label: 'Circle' },
  { id: 'scope', label: 'Scope' },
  { id: 'dots', label: 'Dots' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'off', label: 'Off' },
];

function loadVizMode(): VisualizerMode {
  try {
    const v = localStorage.getItem('mp-viz-mode') as VisualizerMode | null;
    if (v && VIZ_MODES.some((m) => m.id === v)) return v;
  } catch {
    // storage unavailable
  }
  return 'spectrum';
}

export function NowPlayingView({
  track,
  isPlaying,
  theme,
  accent,
  onBack,
  onSelectAlbum,
  onSelectArtist,
  onOpenDetails,
}: NowPlayingViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedBinsRef = useRef<Float32Array>(new Float32Array(72));
  const [vizMode, setVizMode] = useState<VisualizerMode>(loadVizMode);
  const peaksRef = useRef<Float32Array>(new Float32Array(72));
  const timeBufRef = useRef<Uint8Array>(new Uint8Array(256));
  const tickRef = useRef(0);

  const palette = ACCENT_PALETTES[accent];

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId = 0;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    const resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(container);

    const freqBuffer = new Uint8Array(128);
    const barCount = 72;
    const smoothed = smoothedBinsRef.current;

    const renderFrame = () => {
      ctx.clearRect(0, 0, width, height);

      if (vizMode === 'off') {
        return;
      }

      const analyser = audioEngine.getAnalyser();
      const hasLiveAnalyser = Boolean(analyser && isPlaying && !prefersReducedMotion);

      if (hasLiveAnalyser && analyser) {
        if (freqBuffer.length !== analyser.frequencyBinCount) {
          analyser.getByteFrequencyData(freqBuffer);
        } else {
          analyser.getByteFrequencyData(freqBuffer);
        }
      }

      const accentColor = theme === 'dark' ? palette.hexDark : palette.hexLight;
      let bassSum = 0;

      for (let i = 0; i < barCount; i++) {
        let target = 0.03;
        if (hasLiveAnalyser && analyser) {
          const binCount = Math.min(analyser.frequencyBinCount, 96);
          const binIdx = Math.min(binCount - 1, Math.floor((i / barCount) * binCount));
          target = freqBuffer[binIdx] / 255;
        } else if (isPlaying) {
          target = 0.16 + 0.1 * Math.sin(i * 0.35);
        }

        const lerpFactor = target > smoothed[i] ? 0.35 : 0.12;
        smoothed[i] += (target - smoothed[i]) * lerpFactor;
        if (i < 10) bassSum += smoothed[i];
      }

      const bassEnergy = bassSum / 10;

      // Subtle bass-reactive radial glow behind the center album art
      const glowRadius = Math.max(width, height) * (0.34 + bassEnergy * 0.22);
      const radial = ctx.createRadialGradient(
        width * 0.5,
        height * 0.44,
        12,
        width * 0.5,
        height * 0.44,
        glowRadius
      );
      radial.addColorStop(0, accentColor);
      radial.addColorStop(1, 'transparent');

      ctx.save();
      ctx.globalAlpha = (theme === 'dark' ? 0.12 : 0.09) + bassEnergy * 0.16;
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      if (vizMode === 'spectrum') {
        // Full-width bottom-anchored background frequency bars + subtle crest line
        const gap = Math.max(3, Math.floor(width / 220));
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(2, (width - totalGap) / barCount);
        const maxBarHeight = height * 0.44;

        const barGrad = ctx.createLinearGradient(0, height - maxBarHeight, 0, height);
        barGrad.addColorStop(0, accentColor);
        barGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = barGrad;
        for (let i = 0; i < barCount; i++) {
          const val = smoothed[i];
          const barH = Math.max(4, val * maxBarHeight);
          const x = i * (barWidth + gap);
          const y = height - barH;

          ctx.globalAlpha = (theme === 'dark' ? 0.16 : 0.12) + val * 0.34;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (vizMode === 'wave') {
        // Smooth layered frequency waveform across the lower background
        const maxAmp = height * 0.26;
        const baseLine = height * 0.84;

        const drawWaveLayer = (alpha: number, scale: number, phaseShift: number) => {
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let i = 0; i < barCount; i++) {
            const x = (i / (barCount - 1)) * width;
            const idx = (i + phaseShift) % barCount;
            const y = baseLine - smoothed[idx] * maxAmp * scale;
            if (i === 0) {
              ctx.lineTo(x, y);
            } else {
              const prevX = ((i - 1) / (barCount - 1)) * width;
              const prevIdx = (i - 1 + phaseShift) % barCount;
              const prevY = baseLine - smoothed[prevIdx] * maxAmp * scale;
              const midX = (prevX + x) / 2;
              ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + y) / 2);
            }
          }
          ctx.lineTo(width, height);
          ctx.closePath();

          const fillGrad = ctx.createLinearGradient(0, baseLine - maxAmp, 0, height);
          fillGrad.addColorStop(0, accentColor);
          fillGrad.addColorStop(1, 'transparent');

          ctx.globalAlpha = alpha;
          ctx.fillStyle = fillGrad;
          ctx.fill();
        };

        drawWaveLayer(theme === 'dark' ? 0.28 : 0.2, 1.0, 0);
        drawWaveLayer(theme === 'dark' ? 0.16 : 0.12, 0.72, 4);
        ctx.globalAlpha = 1;
      }


      tickRef.current += 1;
      const tick = tickRef.current;
      const cx = width * 0.5;
      const cy = height * 0.44;
      const dark = theme === 'dark';

      if (vizMode === 'mirror') {
        // Bars growing up and down from a center line
        const gap = Math.max(3, Math.floor(width / 220));
        const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
        const maxH = height * 0.22;
        const mid = height * 0.8;
        ctx.fillStyle = accentColor;
        for (let i = 0; i < barCount; i++) {
          const v = smoothed[i];
          const h = Math.max(3, v * maxH);
          const x = i * (barWidth + gap);
          ctx.globalAlpha = (dark ? 0.2 : 0.15) + v * 0.4;
          ctx.beginPath();
          ctx.roundRect(x, mid - h, barWidth, h, [3, 3, 0, 0]);
          ctx.fill();
          ctx.globalAlpha = (dark ? 0.1 : 0.08) + v * 0.2;
          ctx.beginPath();
          ctx.roundRect(x, mid, barWidth, h * 0.7, [0, 0, 3, 3]);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (vizMode === 'circle') {
        // Radial spectrum around the album art
        const baseR = Math.min(width, height) * 0.27;
        const maxLen = Math.min(width, height) * 0.2;
        ctx.strokeStyle = accentColor;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
        const rot = tick * 0.0012;
        for (let i = 0; i < barCount; i++) {
          const v = smoothed[i];
          const a = (i / barCount) * Math.PI * 2 + rot - Math.PI / 2;
          const len = 4 + v * maxLen;
          ctx.globalAlpha = (dark ? 0.25 : 0.2) + v * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * baseR, cy + Math.sin(a) * baseR);
          ctx.lineTo(cx + Math.cos(a) * (baseR + len), cy + Math.sin(a) * (baseR + len));
          ctx.stroke();
        }
        ctx.globalAlpha = (dark ? 0.2 : 0.15) + bassEnergy * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR - 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (vizMode === 'scope') {
        // Live oscilloscope (time-domain waveform)
        const buf = timeBufRef.current;
        const analyserNode = audioEngine.getAnalyser();
        let live = false;
        if (analyserNode && isPlaying && !prefersReducedMotion) {
          if (buf.length !== analyserNode.fftSize) timeBufRef.current = new Uint8Array(analyserNode.fftSize);
          analyserNode.getByteTimeDomainData(timeBufRef.current);
          live = true;
        }
        const data = timeBufRef.current;
        const mid = height * 0.74;
        const amp = height * 0.2;
        ctx.strokeStyle = accentColor;
        ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass === 0 ? (dark ? 0.18 : 0.12) : (dark ? 0.7 : 0.55);
          ctx.lineWidth = pass === 0 ? 7 : 2;
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * width;
            const v = live ? (data[i] - 128) / 128 : Math.sin(i * 0.05 + tick * 0.03) * 0.04;
            const y = mid + v * amp;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (vizMode === 'dots') {
        // Dot matrix with falling peak caps
        const peaks = peaksRef.current;
        const cols = 36;
        const cell = width / cols;
        const rows = 14;
        const rowH = (height * 0.4) / rows;
        const dotR = Math.max(1.6, Math.min(cell, rowH) * 0.28);
        ctx.fillStyle = accentColor;
        for (let c = 0; c < cols; c++) {
          const v = (smoothed[c * 2] + smoothed[c * 2 + 1]) / 2;
          const lit = Math.round(v * rows);
          if (lit > peaks[c]) peaks[c] = lit;
          else peaks[c] = Math.max(0, peaks[c] - 0.18);
          for (let r = 0; r < rows; r++) {
            const x = c * cell + cell / 2;
            const y = height - 10 - r * rowH;
            const on = r < lit;
            ctx.globalAlpha = on ? (dark ? 0.35 : 0.28) + (r / rows) * 0.45 : dark ? 0.05 : 0.04;
            ctx.beginPath();
            ctx.arc(x, y, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.arc(c * cell + cell / 2, height - 10 - Math.min(rows - 1, peaks[c]) * rowH, dotR * 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (vizMode === 'aurora') {
        // Slow flowing light ribbons driven by bass / mids / highs
        let mids = 0;
        let highs = 0;
        for (let i = 20; i < 44; i++) mids += smoothed[i];
        for (let i = 44; i < 72; i++) highs += smoothed[i];
        mids /= 24;
        highs /= 28;
        const levels = [bassEnergy, mids, highs];
        for (let l = 0; l < 3; l++) {
          const amp = height * (0.06 + levels[l] * 0.16);
          const baseY = height * (0.62 + l * 0.1);
          ctx.beginPath();
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 12) {
            const y =
              baseY +
              Math.sin(x * 0.006 + tick * (0.012 + l * 0.006) + l * 2) * amp +
              Math.sin(x * 0.013 - tick * 0.009 + l) * amp * 0.5;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, baseY - amp * 1.5, 0, height);
          g.addColorStop(0, accentColor);
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = (dark ? 0.2 : 0.15) + levels[l] * 0.25;
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (isPlaying && !prefersReducedMotion) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      resizeObserver.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, theme, palette.hexDark, palette.hexLight, track?.id, vizMode]);

  if (!track) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <Disc3 size={48} className="text-neutral-400 dark:text-neutral-500 mb-3" />
        <h2 className="font-display text-xl font-medium text-neutral-800 dark:text-neutral-200">
          Nothing is playing
        </h2>
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-1">
          Choose an album or song from your library to start listening.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 h-9 px-4 rounded-md text-[13px] font-medium bg-black/[0.06] dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200"
        >
          Back to library
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full relative overflow-hidden flex flex-col px-6 py-5 bg-gradient-to-b from-black/[0.03] dark:from-white/[0.03] to-transparent"
    >
      {/* Full-Background HTML5 Canvas Audio Visualizer */}
      <canvas
        ref={canvasRef}
        aria-label="Audio frequency visualizer"
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Top Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 -ml-2.5 rounded-md text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
        >
          <ArrowLeft size={15} />
          <span>Back to library</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Visualizer Mode Selector */}
          <div
            role="group"
            aria-label="Background visualizer style"
            className="inline-flex flex-wrap items-center p-0.5 rounded-md bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08]"
          >
            {VIZ_MODES.map(({ id: mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setVizMode(mode);
                  try {
                    localStorage.setItem('mp-viz-mode', mode);
                  } catch {
                    // storage unavailable
                  }
                }}
                className={`h-7 px-2.5 rounded text-[12px] font-medium capitalize transition-colors ${
                  vizMode === mode
                    ? 'bg-white dark:bg-[#383838] text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onOpenDetails(track)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium bg-white/85 dark:bg-[#2b2b2b]/85 hover:bg-white dark:hover:bg-[#343434] text-neutral-800 dark:text-neutral-200 border border-black/[0.08] dark:border-white/[0.08] backdrop-blur-xs transition-colors"
          >
            <Info size={14} />
            <span>Song details</span>
          </button>
        </div>
      </div>

      {/* Foreground Album Art & Track Metadata */}
      <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center py-6 max-w-2xl mx-auto w-full text-center">
        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 mb-7">
          <CoverArt
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full"
            iconSize={64}
            roundedClass="rounded-xl"
          />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 dark:text-white text-balance">
          {track.title}
        </h1>

        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 mt-2 text-[15px] text-neutral-700 dark:text-neutral-300">
          <button
            type="button"
            onClick={() => onSelectArtist(track.artistId)}
            className={`font-medium hover:underline ${palette.activeText}`}
          >
            {track.artist}
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onSelectAlbum(track.albumId)}
            className="hover:underline"
          >
            {track.album}
          </button>
        </div>
      </div>
    </div>
  );
}
