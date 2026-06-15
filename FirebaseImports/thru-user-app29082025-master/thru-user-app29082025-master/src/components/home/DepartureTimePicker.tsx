'use client';

import * as React from 'react';
import { Clock3, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalogClockPicker } from '@/components/home/AnalogClockPicker';
import {
  formatTime24h,
  formatTime24hInput,
  parseTime24h,
  time24hFromDateString,
} from '@/lib/departure-time';

const PREFERENCE_KEY = 'thru-departure-time-picker-mode';

type PickerMode = 'clock' | 'text';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (time24h: string) => void;
};

function defaultTimeParts(): { hours: number; minutes: number } {
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 5) * 5;
  if (minutes >= 60) {
    return { hours: (now.getHours() + 1) % 24, minutes: 0 };
  }
  return { hours: now.getHours(), minutes };
}

export function DepartureTimePicker({ open, onOpenChange, value, onConfirm }: Props) {
  const [mode, setMode] = React.useState<PickerMode>('clock');
  const [hours, setHours] = React.useState(8);
  const [minutes, setMinutes] = React.useState(0);
  const [activeHand, setActiveHand] = React.useState<'hour' | 'minute'>('hour');
  const [textValue, setTextValue] = React.useState('08:00');
  const [textError, setTextError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const stored = typeof window !== 'undefined'
      ? (localStorage.getItem(PREFERENCE_KEY) as PickerMode | null)
      : null;
    if (stored === 'clock' || stored === 'text') {
      setMode(stored);
    }

    const fromValue = time24hFromDateString(value) ?? defaultTimeParts();
    setHours(fromValue.hours);
    setMinutes(fromValue.minutes);
    setTextValue(formatTime24h(fromValue.hours, fromValue.minutes));
    setTextError(null);
    setActiveHand('hour');
  }, [open, value]);

  const handleModeChange = (next: string) => {
    if (next !== 'clock' && next !== 'text') return;
    setMode(next);
    localStorage.setItem(PREFERENCE_KEY, next);

    if (next === 'text') {
      setTextValue(formatTime24h(hours, minutes));
      setTextError(null);
    }
  };

  const handleClockChange = (nextHours: number, nextMinutes: number) => {
    setHours(nextHours);
    setMinutes(nextMinutes);
    setTextValue(formatTime24h(nextHours, nextMinutes));
    setTextError(null);
  };

  const handleTextChange = (raw: string) => {
    const formatted = formatTime24hInput(raw);
    setTextValue(formatted);
    setTextError(null);

    const parsed = parseTime24h(formatted);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  };

  const handleConfirm = () => {
    const parsed = parseTime24h(mode === 'text' ? textValue : formatTime24h(hours, minutes));
    if (!parsed) {
      setTextError('Enter a valid 24-hour time (HH:MM, e.g. 14:30)');
      return;
    }

    onConfirm(formatTime24h(parsed.hours, parsed.minutes));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Departure time</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clock" className="gap-2">
              <Clock3 className="h-4 w-4" />
              Clock
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2">
              <Keyboard className="h-4 w-4" />
              Type time
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clock" className="mt-4">
            <AnalogClockPicker
              hours={hours}
              minutes={minutes}
              activeHand={activeHand}
              onActiveHandChange={setActiveHand}
              onChange={handleClockChange}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="departure-time-24h">24-hour time</Label>
              <Input
                id="departure-time-24h"
                inputMode="numeric"
                placeholder="HH:MM"
                value={textValue}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                className="text-center text-2xl font-semibold tracking-widest tabular-nums h-14"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground text-center">
                Use 24-hour format — e.g. 07:15 for morning, 19:45 for evening
              </p>
              {textError && <p className="text-xs text-destructive text-center">{textError}</p>}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Set {formatTime24h(hours, minutes)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
