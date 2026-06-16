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

export type TimeFormatPreference = '12' | '24';
export type Meridiem = 'AM' | 'PM';

export const DEPARTURE_TIME_FORMAT_KEY = 'thru-departure-time-format';

export function loadDepartureTimeFormat(): TimeFormatPreference {
  if (typeof window === 'undefined') return '12';
  const stored = localStorage.getItem(DEPARTURE_TIME_FORMAT_KEY);
  return stored === '24' ? '24' : '12';
}

export function saveDepartureTimeFormat(format: TimeFormatPreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEPARTURE_TIME_FORMAT_KEY, format);
}

export function formatTime12h(hours24: number, minutes: number): string {
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function meridiemFromHours24(hours24: number): Meridiem {
  return hours24 >= 12 ? 'PM' : 'AM';
}

export function parseTime12h(
  input: string,
  meridiem: Meridiem
): { hours: number; minutes: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  let hour12 = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hour12 < 1 || hour12 > 12 || minutes < 0 || minutes > 59) return null;

  let hours24 = hour12 % 12;
  if (meridiem === 'PM') hours24 += 12;
  return { hours: hours24, minutes };
}

export function formatTimeForDisplay(
  hours24: number,
  minutes: number,
  format: TimeFormatPreference
): string {
  if (format === '24') return formatTime24h(hours24, minutes);
  return `${formatTime12h(hours24, minutes)} ${meridiemFromHours24(hours24)}`;
}

export function formatTimeInputValue(
  hours24: number,
  minutes: number,
  format: TimeFormatPreference
): string {
  if (format === '24') return formatTime24h(hours24, minutes);
  return formatTime12h(hours24, minutes);
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
