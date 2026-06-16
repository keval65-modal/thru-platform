'use client';

import { motion } from 'framer-motion';

const buildings = [
  { x: 0, w: 28, h: 52 },
  { x: 34, w: 22, h: 72 },
  { x: 62, w: 18, h: 44 },
  { x: 86, w: 32, h: 64 },
  { x: 124, w: 20, h: 80 },
  { x: 150, w: 26, h: 48 },
  { x: 182, w: 24, h: 68 },
  { x: 212, w: 30, h: 56 },
  { x: 248, w: 18, h: 76 },
  { x: 272, w: 28, h: 42 },
  { x: 306, w: 22, h: 62 },
  { x: 334, w: 26, h: 50 },
  { x: 366, w: 20, h: 74 },
  { x: 392, w: 32, h: 58 },
  { x: 430, w: 24, h: 46 },
  { x: 460, w: 28, h: 70 },
];

function BuildingLayer({
  opacity,
  duration,
  className,
}: {
  opacity: number;
  duration: number;
  className?: string;
}) {
  return (
    <motion.div
      className={`absolute bottom-10 left-0 flex h-24 w-[200%] ${className ?? ''}`}
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      {[0, 1].map((copy) => (
        <svg
          key={copy}
          viewBox="0 0 488 96"
          className="h-full w-1/2 shrink-0"
          preserveAspectRatio="none"
        >
          {buildings.map((building, index) => (
            <g key={`${copy}-${index}`}>
              <rect
                x={building.x}
                y={96 - building.h}
                width={building.w}
                height={building.h}
                rx="2"
                fill={`hsl(var(--foreground) / ${opacity})`}
              />
              {Array.from({ length: Math.floor(building.h / 14) }).map((_, row) =>
                Array.from({ length: Math.max(1, Math.floor(building.w / 10)) }).map((__, col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={building.x + 4 + col * 8}
                    y={96 - building.h + 6 + row * 14}
                    width="4"
                    height="6"
                    rx="0.5"
                    fill={`hsl(var(--primary) / ${opacity * 0.35})`}
                  />
                )),
              )}
            </g>
          ))}
        </svg>
      ))}
    </motion.div>
  );
}

function SideViewCar() {
  return (
    <svg viewBox="0 0 88 36" className="h-9 w-[4.5rem] drop-shadow-md" aria-hidden>
      <ellipse cx="44" cy="32" rx="38" ry="3" fill="hsl(var(--foreground) / 0.08)" />
      <path
        d="M8 22 C8 14 18 10 30 10 L52 10 C62 10 72 12 78 18 L82 22 L82 26 C82 28 80 30 78 30 L12 30 C10 30 8 28 8 26 Z"
        fill="hsl(var(--primary))"
      />
      <path d="M28 12 L48 12 L52 20 L24 20 Z" fill="hsl(var(--primary-foreground) / 0.9)" />
      <circle cx="24" cy="28" r="5" fill="hsl(var(--foreground))" />
      <circle cx="24" cy="28" r="2" fill="hsl(var(--muted))" />
      <circle cx="64" cy="28" r="5" fill="hsl(var(--foreground))" />
      <circle cx="64" cy="28" r="2" fill="hsl(var(--muted))" />
      <rect x="76" y="18" width="4" height="3" rx="1" fill="#fbbf24" />
      <rect x="6" y="20" width="3" height="2" rx="0.5" fill="#ef4444" />
    </svg>
  );
}

export function CityDriveIllustration() {
  return (
    <div className="relative mt-2 flex min-h-[11rem] flex-col items-center justify-end overflow-hidden rounded-2xl pb-3 pt-6">
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 via-transparent to-muted/30"
        aria-hidden
      />

      <BuildingLayer opacity={0.12} duration={28} />
      <BuildingLayer opacity={0.08} duration={42} className="bottom-8 scale-110" />

      <div className="absolute bottom-0 left-0 right-0 h-12 bg-muted/50" aria-hidden />
      <motion.div className="absolute bottom-[2.65rem] left-0 right-0 h-0.5 overflow-hidden" aria-hidden>
        <motion.div
          className="flex h-full w-[200%]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex h-full w-1/2 shrink-0 gap-3 px-1">
              {Array.from({ length: 24 }).map((_, index) => (
                <div key={index} className="h-full w-4 rounded-full bg-foreground/15" />
              ))}
            </div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-[2.35rem] left-0 z-10"
        animate={{ x: ['-15%', '115%'], y: [0, -1.5, 0, -1, 0] }}
        transition={{
          x: { duration: 5.5, repeat: Infinity, ease: 'linear' },
          y: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
        }}
        aria-hidden
      >
        <SideViewCar />
      </motion.div>

      <p className="relative z-10 px-4 text-center text-sm font-medium leading-snug text-muted-foreground">
        <span className="text-foreground">Just pickup and go!</span>
        <span className="block text-primary">We&apos;ve got you.</span>
      </p>
    </div>
  );
}
