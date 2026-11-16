import { Check, Speaker } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine } from '@/src/audio/AudioEngine';
import { nativeApi } from '@/src/audio/native';
import { AccentTheme } from '@/src/types/music';
import { ACCENT_PALETTES } from '@/src/utils/accent';

interface Device {
  id: string;
  label: string;
}

interface AudioOutputMenuProps {
  accent: AccentTheme;
}

export function AudioOutputMenu({ accent }: AudioOutputMenuProps) {
  const palette = ACCENT_PALETTES[accent];
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [settings, setSettings] = useState(() => audioEngine.getOutputSettings());
  const rootRef = useRef<HTMLDivElement | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      let list = await navigator.mediaDevices.enumerateDevices();
      // Device names are hidden until the app has had audio-device permission once.
      if (list.some((d) => d.kind === 'audiooutput' && !d.label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          list = await navigator.mediaDevices.enumerateDevices();
        } catch {
          // no microphone / permission denied: keep generic names
        }
      }
      const outs = list.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'default' && d.deviceId !== 'communications');
      setDevices(outs.map((d, i) => ({ id: d.deviceId, label: d.label || `Audio output ${i + 1}` })));
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshDevices();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      window.removeEventListener('mousedown', onDown);
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    };
  }, [open, refreshDevices]);

  const update = (patch: Partial<typeof settings>) => {
    audioEngine.updateOutputSettings(patch);
    setSettings(audioEngine.getOutputSettings());
  };

  const row = (selected: boolean) =>
    `w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-[13px] transition-colors ${
      selected
        ? `bg-black/[0.06] dark:bg-white/[0.09] font-medium ${palette.activeText}`
        : 'text-neutral-800 dark:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
    }`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Audio output device"
        aria-label="Audio output device"
        className="h-8 w-8 rounded-md inline-flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
      >
        <Speaker size={15} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Audio output"
          className="absolute right-0 bottom-10 w-72 py-1.5 rounded-lg bg-white dark:bg-[#2c2c2c] border border-black/10 dark:border-white/10 shadow-xl z-50"
        >
          <div className="px-3 py-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Audio output device
          </div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={settings.outputDeviceId === ''}
            onClick={() => update({ outputDeviceId: '' })}
            className={row(settings.outputDeviceId === '')}
          >
            <span className="truncate">System default</span>
            {settings.outputDeviceId === '' && <Check size={14} className="shrink-0" />}
          </button>
          {devices.map((d) => (
            <button
              key={d.id}
              type="button"
              role="menuitemradio"
              aria-checked={settings.outputDeviceId === d.id}
              onClick={() => update({ outputDeviceId: d.id })}
              className={row(settings.outputDeviceId === d.id)}
            >
              <span className="truncate">{d.label}</span>
              {settings.outputDeviceId === d.id && <Check size={14} className="shrink-0" />}
            </button>
          ))}

          {nativeApi() && (
            <>
              <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.06]" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={settings.pauseOnOtherMedia}
                onClick={() => update({ pauseOnOtherMedia: !settings.pauseOnOtherMedia })}
                className={row(false)}
              >
                <span>Pause when other apps play media</span>
                <span
                  className={`w-8 h-[18px] rounded-full shrink-0 relative transition-colors ${
                    settings.pauseOnOtherMedia ? palette.buttonBg : 'bg-neutral-400/50 dark:bg-neutral-600'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all ${
                      settings.pauseOnOtherMedia ? 'left-[16px]' : 'left-[2px]'
                    }`}
                  />
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
