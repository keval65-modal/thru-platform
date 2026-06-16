'use client';

import * as React from 'react';
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
import {
  formatTime24h,
  formatTime24hInput,
  formatTimeForDisplay,
  formatTimeInputValue,
  isScheduledTimeInPast,
  loadDepartureTimeFormat,
  meridiemFromHours24,
  nextValidDepartureParts,
  parseTime12h,
  parseTime24h,
  PAST_DEPARTURE_TIME_MESSAGE,
  saveDepartureTimeFormat,
  time24hFromDateString,
  type Meridiem,
  type TimeFormatPreference,
} from '@/lib/departure-time';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onConfirm: (time24h: string) => void;
};

export function DepartureTimePicker({ open, onOpenChange, value, onConfirm }: Props) {
  const [format, setFormat] = React.useState<TimeFormatPreference>('12');
  const [hours, setHours] = React.useState(8);
  const [minutes, setMinutes] = React.useState(0);
  const [meridiem, setMeridiem] = React.useState<Meridiem>('AM');
  const [textValue, setTextValue] = React.useState('08:00');
  const [textError, setTextError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const savedFormat = loadDepartureTimeFormat();
    setFormat(savedFormat);

    const parsedValue = time24hFromDateString(value);
    const fromValue =
      parsedValue && !isScheduledTimeInPast(parsedValue.hours, parsedValue.minutes)
        ? parsedValue
        : nextValidDepartureParts();

    setHours(fromValue.hours);
    setMinutes(fromValue.minutes);
    setMeridiem(meridiemFromHours24(fromValue.hours));
    setTextValue(formatTimeInputValue(fromValue.hours, fromValue.minutes, savedFormat));
    setTextError(null);
  }, [open, value]);

  const handleFormatChange = (next: TimeFormatPreference) => {
    setFormat(next);
    saveDepartureTimeFormat(next);
    setTextValue(formatTimeInputValue(hours, minutes, next));
    setTextError(null);
  };

  const handleTextChange = (raw: string) => {
    const formatted = formatTime24hInput(raw);
    setTextValue(formatted);
    setTextError(null);

    const parsed =
      format === '24' ? parseTime24h(formatted) : parseTime12h(formatted, meridiem);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  };

  const handleMeridiemChange = (next: Meridiem) => {
    setMeridiem(next);
    setTextError(null);
    const parsed = parseTime12h(textValue, next);
    if (parsed) {
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  };

  const handleConfirm = () => {
    const parsed =
      format === '24' ? parseTime24h(textValue) : parseTime12h(textValue, meridiem);

    if (!parsed) {
      setTextError(
        format === '24'
          ? 'Enter a valid 24-hour time (HH:MM, e.g. 14:30)'
          : 'Enter a valid 12-hour time (e.g. 03:30) and choose AM or PM'
      );
      return;
    }

    if (isScheduledTimeInPast(parsed.hours, parsed.minutes)) {
      setTextError(PAST_DEPARTURE_TIME_MESSAGE);
      return;
    }

    onConfirm(formatTime24h(parsed.hours, parsed.minutes));
    onOpenChange(false);
  };

  const selectedIsPast = isScheduledTimeInPast(hours, minutes);
  const confirmLabel = formatTimeForDisplay(hours, minutes, format);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Departure time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Enter departure time</Label>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => handleFormatChange('12')}
                className={cn(
                  'rounded-lg py-2 text-sm font-medium transition-colors',
                  format === '12'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                12-hour
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('24')}
                className={cn(
                  'rounded-lg py-2 text-sm font-medium transition-colors',
                  format === '24'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                24-hour
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              id="departure-time-input"
              inputMode="numeric"
              placeholder={format === '24' ? 'HH:MM' : 'hh:mm'}
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

            {format === '12' && (
              <div className="grid grid-cols-2 gap-2">
                {(['AM', 'PM'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleMeridiemChange(option)}
                    className={cn(
                      'rounded-xl border py-2.5 text-sm font-semibold transition-colors',
                      meridiem === option
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {format === '24'
                ? 'Use 24-hour format — e.g. 07:15 for morning, 19:45 for evening'
                : 'Use 12-hour format — e.g. 07:15 AM or 07:45 PM'}
            </p>

            {(textError || selectedIsPast) && (
              <p className="text-xs text-destructive text-center">
                {textError ?? PAST_DEPARTURE_TIME_MESSAGE}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={selectedIsPast}>
            Set {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
