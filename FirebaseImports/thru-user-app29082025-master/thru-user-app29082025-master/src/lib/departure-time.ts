/** Parse strict 24-hour time strings like "08:30" or "23:05". */
export function parseTime24h(input: string): { hours: number; minutes: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function formatTime24h(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Normalize partial user typing into HH:MM shape (digits only, max 4). */
export function formatTime24hInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function time24hFromDateString(dateString: string): { hours: number; minutes: number } | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return { hours: date.getHours(), minutes: date.getMinutes() };
}

/** Next 5-minute slot at or after the reference time (local). */
export function nextValidDepartureParts(reference: Date = new Date()): { hours: number; minutes: number } {
  const rounded = new Date(reference);
  rounded.setSeconds(0, 0);
  const minutes = Math.ceil(rounded.getMinutes() / 5) * 5;
  if (minutes >= 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
    return { hours: rounded.getHours() % 24, minutes: 0 };
  }
  return { hours: rounded.getHours(), minutes };
}

export function buildLocalDepartureIso(
  hours: number,
  minutes: number,
  reference: Date = new Date()
): string {
  const selected = new Date(reference);
  selected.setHours(hours, minutes, 0, 0);
  const y = selected.getFullYear();
  const mo = String(selected.getMonth() + 1).padStart(2, '0');
  const d = String(selected.getDate()).padStart(2, '0');
  const h = String(selected.getHours()).padStart(2, '0');
  const mi = String(selected.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/** True when the chosen clock time today is already before now. */
export function isScheduledTimeInPast(
  hours: number,
  minutes: number,
  reference: Date = new Date()
): boolean {
  const selected = new Date(reference);
  selected.setHours(hours, minutes, 0, 0);
  const now = new Date(reference);
  now.setSeconds(0, 0);
  return selected.getTime() < now.getTime();
}

export function isDepartureIsoInPast(isoString: string, reference: Date = new Date()): boolean {
  if (!isoString) return true;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date(reference);
  now.setSeconds(0, 0);
  return date.getTime() < now.getTime();
}

export function clampScheduledDepartureIso(isoString: string, reference: Date = new Date()): string {
  if (!isDepartureIsoInPast(isoString, reference)) return isoString;
  const parts = nextValidDepartureParts(reference);
  return buildLocalDepartureIso(parts.hours, parts.minutes, reference);
}

export const PAST_DEPARTURE_TIME_MESSAGE =
  'That time has already passed. Choose a later departure time.';

export function buildDepartureDateTimeFromTime(
  hours: number,
  minutes: number,
  reference: Date = new Date()
): string {
  return buildLocalDepartureIso(hours, minutes, reference);
}
