'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { formatTime24h } from '@/lib/departure-time';

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2;
const FACE_RADIUS = 108;
const HOUR_INNER = 42;

type ClockHand = 'hour' | 'minute';

type Props = {
  hours: number;
  minutes: number;
  activeHand: ClockHand;
  onActiveHandChange: (hand: ClockHand) => void;
  onChange: (hours: number, minutes: number) => void;
};

function angleFromPoint(x: number, y: number): number {
  const dx = x - CX;
  const dy = y - CY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return angle;
}

function hourFromAngle(angle: number): number {
  const hour = Math.round((angle / 360) * 24) % 24;
  return hour;
}

function minuteFromAngle(angle: number): number {
  return Math.round((angle / 360) * 60) % 60;
}

function handAngleForHour(hour: number): number {
  return ((hour % 24) / 24) * 360;
}

function handAngleForMinute(minute: number): number {
  return (minute / 60) * 360;
}

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

export function AnalogClockPicker({
  hours,
  minutes,
  activeHand,
  onActiveHandChange,
  onChange,
}: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const draggingRef = React.useRef(false);

  const updateFromPointer = React.useCallback(
    (clientX: number, clientY: number, hand: ClockHand) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scale = SIZE / rect.width;
      const x = (clientX - rect.left) * scale;
      const y = (clientY - rect.top) * scale;
      const angle = angleFromPoint(x, y);

      if (hand === 'hour') {
        onChange(hourFromAngle(angle), minutes);
      } else {
        onChange(hours, minuteFromAngle(angle));
      }
    },
    [hours, minutes, onChange]
  );

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scale = SIZE / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    const dist = Math.hypot(x - CX, y - CY);
    const hand: ClockHand = dist <= HOUR_INNER ? 'hour' : 'minute';

    onActiveHandChange(hand);
    draggingRef.current = true;
    svg.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY, hand);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    updateFromPointer(event.clientX, event.clientY, activeHand);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const hourAngle = handAngleForHour(hours);
  const minuteAngle = handAngleForMinute(minutes);
  const hourTip = polarToCartesian(hourAngle, 62);
  const minuteTip = polarToCartesian(minuteAngle, 88);

  const hourMarks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360;
    const inner = polarToCartesian(angle, FACE_RADIUS - (i % 6 === 0 ? 14 : 8));
    const outer = polarToCartesian(angle, FACE_RADIUS);
    const labelPos = polarToCartesian(angle, FACE_RADIUS - 24);
    return { i, inner, outer, labelPos, major: i % 6 === 0 };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-3xl font-semibold tabular-nums tracking-wide">
        <button
          type="button"
          onClick={() => onActiveHandChange('hour')}
          className={cn(
            'rounded-md px-2 py-1 transition-colors',
            activeHand === 'hour' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          {formatTime24h(hours, minutes).split(':')[0]}
        </button>
        <span className="text-muted-foreground">:</span>
        <button
          type="button"
          onClick={() => onActiveHandChange('minute')}
          className={cn(
            'rounded-md px-2 py-1 transition-colors',
            activeHand === 'minute' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          {formatTime24h(hours, minutes).split(':')[1]}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Drag the {activeHand === 'hour' ? 'hour' : 'minute'} hand — tap inner dial for hours, outer for minutes
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[280px] touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="img"
        aria-label={`Analog clock showing ${formatTime24h(hours, minutes)}`}
      >
        <circle cx={CX} cy={CY} r={FACE_RADIUS} className="fill-muted/40 stroke-border" strokeWidth={2} />
        <circle
          cx={CX}
          cy={CY}
          r={HOUR_INNER}
          className="fill-background/60 stroke-border/60"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {hourMarks.map(({ i, inner, outer, labelPos, major }) => (
          <g key={i}>
            <line
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              className="stroke-muted-foreground"
              strokeWidth={major ? 2 : 1}
              opacity={major ? 1 : 0.5}
            />
            {major && (
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {i}
              </text>
            )}
          </g>
        ))}

        <line
          x1={CX}
          y1={CY}
          x2={hourTip.x}
          y2={hourTip.y}
          className={cn('stroke-foreground', activeHand === 'hour' ? 'stroke-[3]' : 'stroke-[2]')}
          strokeLinecap="round"
          opacity={activeHand === 'hour' ? 1 : 0.55}
        />
        <line
          x1={CX}
          y1={CY}
          x2={minuteTip.x}
          y2={minuteTip.y}
          className={cn('stroke-primary', activeHand === 'minute' ? 'stroke-[3]' : 'stroke-[2]')}
          strokeLinecap="round"
          opacity={activeHand === 'minute' ? 1 : 0.75}
        />
        <circle cx={CX} cy={CY} r={6} className="fill-primary" />
        <circle cx={hourTip.x} cy={hourTip.y} r={activeHand === 'hour' ? 7 : 5} className="fill-foreground" />
        <circle cx={minuteTip.x} cy={minuteTip.y} r={activeHand === 'minute' ? 7 : 5} className="fill-primary" />
      </svg>
    </div>
  );
}
