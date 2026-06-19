'use client';

import { motion } from 'framer-motion';

const benefitLines = ['Items at MRP', 'No extra charges', 'No parking hassles'];

const skyline = [
  { width: 26, height: 44 },
  { width: 34, height: 66 },
  { width: 24, height: 52 },
  { width: 42, height: 78 },
  { width: 30, height: 58 },
  { width: 36, height: 92 },
  { width: 28, height: 64 },
  { width: 44, height: 74 },
  { width: 24, height: 50 },
  { width: 38, height: 84 },
  { width: 32, height: 56 },
  { width: 46, height: 70 },
];

function SkylineLayer({
  duration,
  opacity,
  bottom,
  scale = 1,
}: {
  duration: number;
  opacity: number;
  bottom: string;
  scale?: number;
}) {
  return (
    <motion.div
      className="absolute left-0 flex w-[200%] items-end gap-2"
      style={{ bottom, opacity, scale }}
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      {[0, 1].map((copy) => (
        <div key={copy} className="flex w-1/2 shrink-0 items-end justify-around gap-2 px-2">
          {skyline.map((building, index) => (
            <div
              key={`${copy}-${index}`}
              className="relative rounded-t-sm bg-foreground/70"
              style={{ width: building.width, height: building.height }}
            >
              <div className="absolute inset-x-1 top-3 grid grid-cols-2 gap-1">
                {Array.from({ length: Math.max(2, Math.floor(building.height / 18)) }).map((_, windowIndex) => (
                  <span key={windowIndex} className="h-1.5 rounded-[1px] bg-background/45" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

function LaneMarks() {
  return (
    <motion.div
      className="absolute bottom-[2.55rem] left-0 flex w-[200%] gap-7"
      animate={{ x: ['0%', '-50%'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      aria-hidden
    >
      {Array.from({ length: 28 }).map((_, index) => (
        <span key={index} className="h-1 w-8 shrink-0 rounded-full bg-background/70" />
      ))}
    </motion.div>
  );
}

function DrivingCar() {
  return (
    <motion.div
      className="absolute bottom-[2.05rem] left-[18%] z-20"
      animate={{ y: [0, -2, 0], rotate: [-1, 0.6, -1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <svg viewBox="0 0 112 58" className="h-14 w-28 drop-shadow-lg">
        <ellipse cx="55" cy="51" rx="44" ry="5" fill="hsl(var(--foreground) / 0.13)" />
        <path
          d="M17 31 L32 14 H70 C81 14 91 20 98 31 L103 32 C107 33 110 37 110 42 V48 H4 V40 C4 35 10 31 17 31 Z"
          fill="hsl(var(--primary))"
        />
        <path d="M35 19 H53 V31 H25 Z" fill="hsl(var(--primary-foreground) / 0.84)" />
        <path d="M58 19 H70 C78 20 84 25 88 31 H58 Z" fill="hsl(var(--primary-foreground) / 0.68)" />
        <rect x="15" y="34" width="82" height="14" rx="7" fill="hsl(var(--primary))" />
        <circle cx="30" cy="48" r="8" fill="hsl(var(--foreground))" />
        <circle cx="82" cy="48" r="8" fill="hsl(var(--foreground))" />
        <motion.circle
          cx="30"
          cy="48"
          r="3"
          fill="hsl(var(--card))"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'linear' }}
        />
        <motion.circle
          cx="82"
          cy="48"
          r="3"
          fill="hsl(var(--card))"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.65, repeat: Infinity, ease: 'linear' }}
        />
        <path d="M99 36 H109" stroke="hsl(var(--primary-foreground) / 0.8)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

function BenefitTicker() {
  return (
    <div className="relative h-6 overflow-hidden text-xs font-semibold text-primary">
      {benefitLines.map((line, index) => (
        <motion.span
          key={line}
          className="absolute left-0 top-0 rounded-full bg-primary/10 px-2.5 py-1"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -12] }}
          transition={{
            duration: 6,
            delay: index * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.08, 0.32, 0.42],
          }}
        >
          {line}
        </motion.span>
      ))}
    </div>
  );
}

export function CityDriveIllustration() {
  return (
    <div className="relative mt-2 overflow-hidden rounded-[1.35rem] border border-primary/10 bg-card/80 shadow-md">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_78%_18%,hsl(var(--accent)/0.12),transparent_30%),linear-gradient(180deg,hsl(var(--primary)/0.04),hsl(var(--muted)/0.38))]"
        aria-hidden
      />

      <div className="relative z-10 min-h-[14rem] px-5 pb-4 pt-4">
        <div className="relative z-30 max-w-[82%] space-y-2">
          <p className="text-[15px] font-bold leading-snug text-foreground">
            Plan your route, Add Items, Pickup On the Go!
          </p>
          <BenefitTicker />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-36 overflow-hidden" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-muted/20 to-muted/70" />
          <SkylineLayer duration={34} opacity={0.12} bottom="4.5rem" scale={0.9} />
          <SkylineLayer duration={18} opacity={0.22} bottom="3.15rem" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-foreground/10" />
          <div className="absolute inset-x-0 bottom-16 h-px bg-foreground/10" />
          <LaneMarks />
          <DrivingCar />
        </div>
      </div>
    </div>
  );
}
