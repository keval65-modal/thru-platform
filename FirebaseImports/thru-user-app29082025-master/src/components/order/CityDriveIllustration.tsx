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
      transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        offsetPath: `path("${routePath}")`,
        offsetRotate: 'auto',
      }}
    >
      <ellipse cx="0" cy="15" rx="27" ry="7" fill="hsl(var(--foreground) / 0.12)" />
      <g transform="translate(-25 -17)">
        <path
          d="M8 16 L15 8 H35 L43 16 H47 C50 16 52 18 52 21 V28 H2 V21 C2 18 5 16 8 16 Z"
          fill="hsl(var(--primary))"
        />
        <path d="M17 11 H26 V16 H12 Z" fill="hsl(var(--primary-foreground) / 0.8)" />
        <path d="M29 11 H35 L40 16 H29 Z" fill="hsl(var(--primary-foreground) / 0.65)" />
        <rect x="7" y="20" width="38" height="8" rx="4" fill="hsl(var(--primary))" />
        <circle cx="14" cy="29" r="5" fill="hsl(var(--foreground))" />
        <circle cx="40" cy="29" r="5" fill="hsl(var(--foreground))" />
        <circle cx="14" cy="29" r="2" fill="hsl(var(--card))" />
        <circle cx="40" cy="29" r="2" fill="hsl(var(--card))" />
      </g>
    </motion.g>
  );
}

function PickupPin({
  x,
  y,
  label,
  delay,
}: {
  x: number;
  y: number;
  label: string;
  delay: number;
}) {
  return (
    <motion.g
      initial={{ scale: 0.9, opacity: 0.72 }}
      animate={{ scale: [0.9, 1.08, 0.9], opacity: [0.72, 1, 0.72] }}
      transition={{ duration: 2.3, delay, repeat: Infinity, ease: 'easeInOut' }}
      transform={`translate(${x} ${y})`}
    >
      <circle r="13" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="3" />
      <path d="M-4 -2 H5 V6 H-4 Z" fill="hsl(var(--primary))" />
      <path d="M-2 -6 H7 V-1 H-2 Z" fill="hsl(var(--primary) / 0.7)" />
      <text
        x="0"
        y="28"
        textAnchor="middle"
        className="fill-foreground text-[12px] font-semibold"
      >
        {label}
      </text>
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
          <p className="text-sm font-semibold leading-snug text-foreground">Route planned. Pickups ready.</p>
          <p className="text-xs font-medium text-primary">Drive-thru stops on your way.</p>
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

            <motion.g
              initial={{ opacity: 0.7, y: 2 }}
              animate={{ opacity: [0.7, 1, 0.7], y: [2, 0, 2] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect
                x="232"
                y="18"
                width="124"
                height="52"
                rx="14"
                fill="hsl(var(--card) / 0.86)"
                stroke="hsl(var(--primary) / 0.18)"
              />
              <text x="248" y="38" className="fill-foreground text-[12px] font-bold">
                Planning route
              </text>
              <rect x="248" y="48" width="78" height="5" rx="2.5" fill="hsl(var(--primary) / 0.18)" />
              <motion.rect
                x="248"
                y="48"
                height="5"
                rx="2.5"
                fill="hsl(var(--primary))"
                initial={{ width: 20 }}
                animate={{ width: [20, 72, 20] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.g>

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
              transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
              style={{ pathLength: 0.34 }}
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
            <PickupPin x={172} y={112} label="Food" delay={0.2} />
            <PickupPin x={342} y={104} label="Pickup" delay={0.8} />
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
