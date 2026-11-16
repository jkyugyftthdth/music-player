import { EQ_FREQUENCIES, SynthRecipe, Track } from '@/src/types/music';
import { nativeApi } from '@/src/audio/native';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Generates a warm stereo WAV Blob URL for built-in tracks so they support
 * standard HTMLAudioElement playback, instant scrubbing, speed control, 10-band EQ,
 * and real-time AnalyserNode spectrum visualization.
 */
function synthesizeTrackToWavUrl(recipe: SynthRecipe, durationSec: number): string {
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const beatSec = 60 / recipe.bpm;
  const barSec = beatSec * 4;
  const eighthSec = beatSec / 2;

  const { rootMidi, scaleIntervals, progression, waveform, hasPercussion, arpPattern, brightness } =
    recipe;

  let seed = rootMidi * 1337 + recipe.bpm * 17;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / barSec);
    const barPos = (t % barSec) / barSec;
    const beatPos = (t % beatSec) / beatSec;
    const eighthIndex = Math.floor(t / eighthSec);
    const eighthPos = (t % eighthSec) / eighthSec;

    const progStep = progression[barIndex % progression.length];
    const chordRootInterval = scaleIntervals[progStep % scaleIntervals.length];
    const chordRootMidi = rootMidi + chordRootInterval - 12;

    const idx3 = (progStep + 2) % scaleIntervals.length;
    const idx5 = (progStep + 4) % scaleIntervals.length;
    const idx7 = (progStep + 6) % scaleIntervals.length;
    const octave3 = progStep + 2 >= scaleIntervals.length ? 12 : 0;
    const octave5 = progStep + 4 >= scaleIntervals.length ? 12 : 0;
    const octave7 = progStep + 6 >= scaleIntervals.length ? 12 : 0;

    const chordNotes = [
      midiToFreq(rootMidi + chordRootInterval),
      midiToFreq(rootMidi + scaleIntervals[idx3] + octave3),
      midiToFreq(rootMidi + scaleIntervals[idx5] + octave5),
      midiToFreq(rootMidi + scaleIntervals[idx7] + octave7),
    ];

    const chordEnv =
      Math.min(1, barPos * 8) * Math.pow(Math.max(0, 1 - barPos * 0.45), 0.7);

    let padL = 0;
    let padR = 0;
    for (let c = 0; c < chordNotes.length; c++) {
      const f = chordNotes[c];
      const detune = (c - 1.5) * 0.0022;
      const phaseL = 2 * Math.PI * f * (1 + detune) * t;
      const phaseR = 2 * Math.PI * f * (1 - detune) * t;

      let voiceL = 0;
      let voiceR = 0;
      if (waveform === 'sine') {
        voiceL = Math.sin(phaseL) + 0.18 * Math.sin(phaseL * 2);
        voiceR = Math.sin(phaseR) + 0.18 * Math.sin(phaseR * 2);
      } else if (waveform === 'triangle') {
        voiceL =
          0.7 * Math.sin(phaseL) +
          0.25 * Math.sin(phaseL * 2) * brightness +
          0.1 * Math.sin(phaseL * 3) * brightness;
        voiceR =
          0.7 * Math.sin(phaseR) +
          0.25 * Math.sin(phaseR * 2) * brightness +
          0.1 * Math.sin(phaseR * 3) * brightness;
      } else if (waveform === 'epiano') {
        const bell = Math.exp(-barPos * 6) * 0.35 * brightness;
        voiceL = Math.sin(phaseL) + bell * Math.sin(phaseL * 3) + 0.15 * Math.sin(phaseL * 2);
        voiceR = Math.sin(phaseR) + bell * Math.sin(phaseR * 3) + 0.15 * Math.sin(phaseR * 2);
      } else {
        voiceL =
          0.75 * Math.sin(phaseL) +
          0.25 * Math.sin(phaseL * 0.5) +
          0.14 * Math.sin(phaseL * 2) * brightness;
        voiceR =
          0.75 * Math.sin(phaseR) +
          0.25 * Math.sin(phaseR * 0.5) +
          0.14 * Math.sin(phaseR * 2) * brightness;
      }

      const pan = 0.35 + (c / (chordNotes.length - 1)) * 0.3;
      padL += voiceL * (1 - pan);
      padR += voiceR * pan;
    }
    padL *= 0.14 * chordEnv;
    padR *= 0.14 * chordEnv;

    const bassFreq = midiToFreq(chordRootMidi);
    const bassEnv = Math.min(1, beatPos * 14) * Math.exp(-beatPos * 1.3);
    const bass =
      (0.85 * Math.sin(2 * Math.PI * bassFreq * t) +
        0.15 * Math.sin(2 * Math.PI * bassFreq * 2 * t)) *
      0.16 *
      bassEnv;

    const arpDegree = arpPattern[eighthIndex % arpPattern.length];
    const arpScaleIdx = (progStep + arpDegree) % scaleIntervals.length;
    const arpOctave = progStep + arpDegree >= scaleIntervals.length ? 24 : 12;
    const arpFreq = midiToFreq(rootMidi + scaleIntervals[arpScaleIdx] + arpOctave);
    const arpEnv = Math.min(1, eighthPos * 22) * Math.exp(-eighthPos * 4.2);
    const arpGate = eighthIndex % 5 === 4 ? 0.2 : 1.0;
    const arpSig =
      (Math.sin(2 * Math.PI * arpFreq * t) + 0.2 * Math.sin(2 * Math.PI * arpFreq * 2 * t)) *
      0.085 *
      arpEnv *
      arpGate;
    const arpPan = eighthIndex % 2 === 0 ? 0.38 : 0.62;

    let percL = 0;
    let percR = 0;
    if (hasPercussion) {
      const noise = nextRand();
      const beatIndex = Math.floor(t / beatSec) % 4;
      if (beatIndex === 0 || beatIndex === 2) {
        const kickEnv = Math.exp(-beatPos * 16);
        const kickFreq = 52 + 85 * Math.exp(-beatPos * 28);
        const kick = Math.sin(2 * Math.PI * kickFreq * t) * 0.22 * kickEnv;
        percL += kick;
        percR += kick;
      }
      if (beatIndex === 1 || beatIndex === 3) {
        const snareEnv = Math.exp(-beatPos * 20);
        const snare = noise * 0.055 * snareEnv;
        percL += snare * 0.9;
        percR += snare * 1.1;
      }
      const hatEnv = Math.exp(-eighthPos * 30);
      const hat = noise * 0.022 * hatEnv;
      percL += hat * 1.1;
      percR += hat * 0.9;
    }

    const fadeIn = Math.min(1, t / 1.2);
    const fadeOut = Math.min(1, (durationSec - t) / 2.5);
    const masterEnv = Math.max(0, Math.min(fadeIn, fadeOut));

    const sampleL = Math.tanh((padL + bass + arpSig * (1 - arpPan) + percL) * masterEnv);
    const sampleR = Math.tanh((padR + bass + arpSig * arpPan + percR) * masterEnv);

    left[i] = sampleL;
    right[i] = sampleR;
  }

  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = totalSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export interface AudioOutputSettings {
  outputDeviceId: string; // '' = system default device
  pauseOnOtherMedia: boolean;
}

function loadOutputSettings(): AudioOutputSettings {
  try {
    const raw = JSON.parse(localStorage.getItem('mp-audio-settings') || '{}');
    return {
      outputDeviceId: typeof raw.outputDeviceId === 'string' ? raw.outputDeviceId : '',
      pauseOnOtherMedia: raw.pauseOnOtherMedia !== false,
    };
  } catch {
    return { outputDeviceId: '', pauseOnOtherMedia: true };
  }
}

class MediaAudioEngine {
  private outputSettings: AudioOutputSettings = loadOutputSettings();
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private cachedUrls = new Map<string, string>();
  private currentTrackId: string | null = null;
  private pendingBands: number[] = new Array(10).fill(0);
  private pendingEqEnabled = true;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
  }

  private ensureGraph() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.source = this.ctx.createMediaElementSource(this.audio);

    // 10-band graphic equalizer nodes matching 32Hz..16kHz
    this.filters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = this.ctx!.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = this.pendingEqEnabled ? (this.pendingBands[idx] ?? 0) : 0;
      return filter;
    });

    this.gainNode = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.84;

    let currentNode: AudioNode = this.source;
    for (const filter of this.filters) {
      currentNode.connect(filter);
      currentNode = filter;
    }
    currentNode.connect(this.gainNode);
    this.applyOutputDevice();
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  getElement(): HTMLAudioElement {
    return this.audio;
  }

  private applyOutputDevice() {
    const ctx = this.ctx as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (ctx?.setSinkId) {
      ctx.setSinkId(this.outputSettings.outputDeviceId || '').catch(() => {
        // device unplugged: fall back to the system default
        ctx.setSinkId?.('').catch(() => {});
      });
    }
  }

  getOutputSettings(): AudioOutputSettings {
    return { ...this.outputSettings };
  }

  updateOutputSettings(patch: Partial<AudioOutputSettings>) {
    this.outputSettings = { ...this.outputSettings, ...patch };
    try {
      localStorage.setItem('mp-audio-settings', JSON.stringify(this.outputSettings));
    } catch {
      // storage unavailable
    }
    if ('outputDeviceId' in patch) {
      this.ensureGraph();
      this.applyOutputDevice();
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  async loadAndPlay(
    track: Track,
    volume: number,
    muted: boolean,
    playbackRate: number,
    eqBands: number[],
    eqEnabled: boolean
  ) {
    this.ensureGraph();

    let url = track.audioUrl;
    if (!url) {
      url = this.cachedUrls.get(track.id);
      if (!url && track.synthRecipe) {
        url = synthesizeTrackToWavUrl(track.synthRecipe, track.duration);
        this.cachedUrls.set(track.id, url);
      }
    }

    if (!url && track.needsTranscode && track.sourcePath && nativeApi()) {
      // Format the browser engine cannot decode (WMA, APE, ALAC, AIFF, ...): convert once with ffmpeg, then play.
      this.currentTrackId = track.id;
      this.audio.pause();
      try {
        url = await nativeApi()!.transcode(track.sourcePath);
      } catch {
        return;
      }
      if (this.currentTrackId !== track.id) return; // user skipped while converting
      this.cachedUrls.set(track.id, url);
    }

    if (!url) return;

    if (this.currentTrackId !== track.id || this.audio.src !== url) {
      this.currentTrackId = track.id;
      this.audio.src = url;
      this.audio.load();
    }

    this.audio.volume = muted ? 0 : volume;
    this.audio.playbackRate = playbackRate;
    this.setEqBands(eqBands, eqEnabled);

    try {
      await this.audio.play();
    } catch {
      // Autoplay or quick-switch interruption handled gracefully
    }
  }

  async play() {
    this.ensureGraph();
    try {
      await this.audio.play();
    } catch {
      // Ignore interrupted play errors
    }
  }

  pause() {
    this.audio.pause();
  }

  seek(timeSec: number) {
    if (Number.isFinite(timeSec) && timeSec >= 0) {
      this.audio.currentTime = timeSec;
    }
  }

  setVolume(volume: number, muted: boolean) {
    this.audio.volume = muted ? 0 : Math.max(0, Math.min(1, volume));
  }

  setPlaybackRate(rate: number) {
    this.audio.playbackRate = rate;
  }

  setEqBands(bands: number[], enabled: boolean) {
    this.pendingBands = [...bands];
    this.pendingEqEnabled = enabled;
    this.filters.forEach((filter, idx) => {
      const targetGain = enabled ? Math.max(-12, Math.min(12, bands[idx] ?? 0)) : 0;
      filter.gain.value = targetGain;
    });
  }
}

export const audioEngine = new MediaAudioEngine();
