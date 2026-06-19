'use client';

import { motion } from 'framer-motion';

const routePath = 'M30 154 C86 110 150 174 214 138 S324 94 386 132 S456 170 492 96';
const benefitLines = ['Items at MRP', 'No extra charges', 'No parking hassles'];

function Skyline() {
  return (
    <g opacity="0.18">
      <path
        d="M0 166 H26 V124 H58 V146 H82 V102 H122 V136 H146 V86 H194 V132 H222 V112 H254 V150 H286 V94 H330 V128 H358 V76 H398 V142 H428 V112 H462 V154 H520 V166 Z"
        fill="hsl(var(--foreground))"
      />
      <path d="M0 166 H520" stroke="hsl(var(--foreground))" strokeOpacity="0.25" />
      <path d="M96 118 H110 M166 102 H180 M306 112 H320 M374 94 H388" stroke="hsl(var(--card))" strokeOpacity="0.7" strokeWidth="5" />
    </g>
  );
}

function RouteMarker() {
  return (
    <motion.g
      initial={{ offsetDistance: '0%' }}
      animate={{ offsetDistance: ['0%', '100%'] }}
      transition={{ duration: 6.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        offsetPath: `path("${routePath}")`,
        offsetRotate: 'auto',
      }}
    >
      <ellipse cx="0" cy="18" rx="34" ry="8" fill="hsl(var(--foreground) / 0.13)" />
      <g transform="translate(-32 -20)">
        <path
          d="M9 18 L19 7 H43 L54 18 H60 C64 18 67 21 67 25 V34 H2 V25 C2 21 5 18 9 18 Z"
          fill="hsl(var(--primary))"
        />
        <path d="M21 11 H32 V18 H14 Z" fill="hsl(var(--primary-foreground) / 0.82)" />
        <path d="M36 11 H43 L50 18 H36 Z" fill="hsl(var(--primary-foreground) / 0.68)" />
        <rect x="8" y="23" width="48" height="11" rx="5.5" fill="hsl(var(--primary))" />
        <circle cx="18" cy="35" r="6" fill="hsl(var(--foreground))" />
        <circle cx="50" cy="35" r="6" fill="hsl(var(--foreground))" />
        <circle cx="18" cy="35" r="2.5" fill="hsl(var(--card))" />
        <circle cx="50" cy="35" r="2.5" fill="hsl(var(--card))" />
      </g>
    </motion.g>
  );
}

function PickupStop({ x, y, label, delay }: { x: number; y: number; label: string; delay: number }) {
  return (
    <motion.g
      initial={{ scale: 0.92, opacity: 0.72 }}
      animate={{ scale: [0.92, 1.05, 0.92], opacity: [0.72, 1, 0.72] }}
      transition={{ duration: 2.6, delay, repeat: Infinity, ease: 'easeInOut' }}
      transform={`translate(${x} ${y})`}
    >
      <rect x="-31" y="-33" width="62" height="40" rx="12" fill="hsl(var(--card) / 0.94)" stroke="hsl(var(--primary) / 0.22)" />
      <path d="M-18 -12 H13 V2 H-18 Z" fill="hsl(var(--primary) / 0.18)" />
      <path d="M-14 -24 H10 V-12 H-14 Z" fill="hsl(var(--primary))" />
      <circle cx="18" cy="-17" r="5" fill="hsl(var(--primary))" />
      <text x="0" y="-43" textAnchor="middle" className="fill-foreground text-[12px] font-bold">
        {label}
      </text>
    </motion.g>
  );
}

function PlanningCard() {
  return (
    <motion.g
      initial={{ opacity: 0.78, y: 3 }}
      animate={{ opacity: [0.78, 1, 0.78], y: [3, 0, 3] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <rect
        x="46"
        y="28"
        width="142"
        height="58"
        rx="16"
        fill="hsl(var(--card) / 0.94)"
        stroke="hsl(var(--primary) / 0.2)"
      />
      <text x="64" y="49" className="fill-foreground text-[13px] font-bold">
        Plan your route
      </text>
      <circle cx="70" cy="66" r="4" fill="hsl(var(--primary))" />
      <path d="M82 66 H144" stroke="hsl(var(--primary) / 0.22)" strokeWidth="5" strokeLinecap="round" />
      <motion.path
        d="M82 66 H144"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeLinecap="round"
        initial={{ pathLength: 0.2 }}
        animate={{ pathLength: [0.2, 1, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.g>
  );
}

export function CityDriveIllustration() {
  return (
    <div className="relative mt-2 overflow-hidden rounded-[1.35rem] border border-primary/10 bg-card/80 shadow-md">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_78%_18%,hsl(var(--accent)/0.12),transparent_30%),linear-gradient(180deg,hsl(var(--primary)/0.04),hsl(var(--muted)/0.38))]"
        aria-hidden
      />

      <div className="relative z-10 min-h-[14rem] px-5 py-4">
        <div className="relative z-20 space-y-2">
          <p className="text-sm font-bold leading-snug text-foreground">
            Plan your route, Add Items, Pickup On the Go!
          </p>
          <div className="relative h-5 overflow-hidden text-xs font-semibold text-primary">
            {benefitLines.map((line, index) => (
              <motion.span
                key={line}
                className="absolute left-0 top-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10] }}
                transition={{
                  duration: 6,
                  delay: index * 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  times: [0, 0.08, 0.28, 0.36],
                }}
              >
                {line}
              </motion.span>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-2 h-40" aria-hidden>
          <svg viewBox="0 0 520 220" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="route-gradient" x1="30" y1="154" x2="492" y2="96" gradientUnits="userSpaceOnUse">
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
            <PlanningCard />
            <PickupStop x={292} y={120} label="Add items" delay={0.4} />
            <PickupStop x={405} y={135} label="Pickup" delay={1.1} />

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
              cx="30"
              cy="154"
              r="8"
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              animate={{ r: [7, 9, 7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
              cx="492"
              cy="96"
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
