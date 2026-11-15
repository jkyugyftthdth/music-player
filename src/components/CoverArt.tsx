import { Disc3 } from 'lucide-react';
import { useState } from 'react';

interface CoverArtProps {
  src?: string;
  alt: string;
  className?: string;
  iconSize?: number;
  roundedClass?: string;
}

export function CoverArt({
  src,
  alt,
  className = 'w-full h-full',
  iconSize = 28,
  roundedClass = 'rounded-md',
}: CoverArtProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} ${roundedClass} bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-[#2f2f2f] dark:to-[#1f1f1f] flex items-center justify-center border border-black/5 dark:border-white/5 select-none`}
        aria-label={alt}
      >
        <Disc3
          size={iconSize}
          className="text-neutral-500 dark:text-neutral-400"
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} ${roundedClass} object-cover select-none`}
      loading="lazy"
    />
  );
}
