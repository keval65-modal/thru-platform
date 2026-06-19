'use client';

import { motion } from 'framer-motion';

const routePath = 'M38 116 C88 62 128 168 180 108 S282 52 340 105 S408 152 462 74';

function Skyline() {
  return (
    <g opacity="0.16">
      <path
        d="M0 148 H28 V112 H58 V130 H84 V96 H126 V122 H150 V82 H196 V118 H224 V102 H252 V132 H286 V92 H328 V116 H354 V70 H392 V124 H426 V104 H456 V136 H488 V148 Z"
        fill="hsl(var(--foreground))"
      />
      <path d="M0 148 H488" stroke="hsl(var(--foreground))" strokeOpacity="0.25" />
    </g>
  );
}

function RouteMarker() {
  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: ['0%', '100%'] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
      style={{
        offsetPath: `path("${routePath}")`,
        offsetRotate: 'auto',
      }}
    >
      <ellipse cx="0" cy="11" rx="24" ry="6" fill="hsl(var(--foreground) / 0.1)" />
      <g transform="translate(-18 -16)">
        <rect x="0" y="5" width="36" height="22" rx="11" fill="hsl(var(--primary))" />
        <path d="M12 10 L22 16 L12 22 Z" fill="hsl(var(--primary-foreground))" />
        <rect x="22" y="10" width="7" height="12" rx="3.5" fill="hsl(var(--primary-foreground) / 0.38)" />
      </g>
    </motion.g>
  );
}

export function CityDriveIllustration() {
  return (
    <div className="relative mt-2 overflow-hidden rounded-[1.35rem] border border-primary/10 bg-card/80 shadow-md">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--primary)/0.05),hsl(var(--muted)/0.4))]"
        aria-hidden
      />

      <div className="relative z-10 grid min-h-[10.5rem] grid-cols-[1fr_auto] gap-3 px-5 py-4">
        <div className="flex flex-col justify-end pb-1">
          <p className="text-sm font-semibold leading-snug text-foreground">Just pickup and go!</p>
          <p className="text-xs font-medium text-primary">We&apos;ve got you.</p>
        </div>

        <div className="relative h-32 w-64 max-w-[58vw]" aria-hidden>
          <svg viewBox="0 0 488 170" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="route-gradient" x1="38" y1="116" x2="462" y2="74" gradientUnits="userSpaceOnUse">
                <stop stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="0.45" stopColor="hsl(var(--primary))" />
                <stop offset="1" stopColor="hsl(var(--accent))" />
              </linearGradient>
              <filter id="route-glow" x="-20%" y="-70%" width="140%" height="240%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <Skyline />

            <path
              d={routePath}
              fill="none"
              stroke="hsl(var(--foreground) / 0.08)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <motion.path
              d={routePath}
              fill="none"
              stroke="url(#route-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#route-glow)"
              initial={{ pathLength: 0.15, pathOffset: 0 }}
              animate={{ pathOffset: [0, 1] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
              style={{ pathLength: 0.28 }}
            />

            <motion.circle
              cx="38"
              cy="116"
              r="8"
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              animate={{ r: [7, 9, 7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="462"
              cy="74"
              r="8"
              fill="hsl(var(--primary))"
              animate={{ opacity: [0.55, 1, 0.55], scale: [0.9, 1.08, 0.9] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />

            <RouteMarker />
          </svg>
        </div>
      </div>
    </div>
  );
}
