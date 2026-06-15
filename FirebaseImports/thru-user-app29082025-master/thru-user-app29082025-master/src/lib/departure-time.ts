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

export function buildDepartureDateTimeFromTime(
  hours: number,
  minutes: number,
  reference: Date = new Date()
): string {
  const selected = new Date(reference);
  selected.setHours(hours, minutes, 0, 0);

  if (selected < reference) {
    selected.setDate(selected.getDate() + 1);
  }

  return selected.toISOString().slice(0, 16);
}
