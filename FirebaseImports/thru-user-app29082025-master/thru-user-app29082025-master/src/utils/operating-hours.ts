/**
 * Operating Hours Utility Functions
 */

import { OperatingHours, DayHours, ShopStatus } from '@/types/map-types';

/**
 * Get the current day name in lowercase
 */
function getCurrentDay(): keyof OperatingHours {
  const days: (keyof OperatingHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  return days[new Date().getDay()];
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a shop is currently open based on operating hours
 */
export function isShopOpen(operatingHours?: OperatingHours | null): boolean {
  if (!operatingHours) {
    // If no operating hours specified, assume open 24/7
    return true;
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];

  if (!todayHours || todayHours.closed) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(todayHours.open);
  const closeMinutes = timeToMinutes(todayHours.close);

  // Handle cases where closing time is past midnight
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Get shop status with additional details
 */
export function getShopStatus(operatingHours?: OperatingHours | null): ShopStatus {
  if (!operatingHours) {
    return {
      isOpen: true,
      currentDayHours: undefined
    };
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];
  const isOpen = isShopOpen(operatingHours);

  return {
    isOpen,
    currentDayHours: todayHours,
    nextOpenTime: isOpen ? undefined : getNextOpenTime(operatingHours)
  };
}

/**
 * Get the next opening time for a closed shop
 */
function getNextOpenTime(operatingHours: OperatingHours): string | undefined {
  const days: (keyof OperatingHours)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  
  const currentDayIndex = new Date().getDay();
  
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const day = days[dayIndex];
    const dayHours = operatingHours[day];
    
    if (dayHours && !dayHours.closed) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      return `${dayName} ${formatTime(dayHours.open)}`;
    }
  }
  
  return undefined;
}

/**
 * Format time from 24-hour to 12-hour format
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format operating hours for display
 */
export function formatOperatingHours(dayHours?: DayHours): string {
  if (!dayHours || dayHours.closed) {
    return 'Closed';
  }
  return `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`;
}

/**
 * Get today's operating hours formatted
 */
export function getTodayHours(operatingHours?: OperatingHours | null): string {
  if (!operatingHours) {
    return 'Hours not listed';
  }

  const currentDay = getCurrentDay();
  const todayHours = operatingHours[currentDay];
  
  return formatOperatingHours(todayHours);
}

const DAY_NAME_TO_KEY: Record<string, keyof OperatingHours> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
};

/** Parse vendor signup time labels like "09:00 AM" or "12:00 PM (Noon)" to 24h HH:MM. */
export function parseVendorTimeLabel(label?: string | null): string | null {
  if (!label?.trim()) return null;
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === 'AM') {
    if (hours === 12) hours = 0;
  } else if (hours !== 12) {
    hours += 12;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Build structured operating hours from vendor profile fields (opening_time, closing_time, weekly_close_on).
 */
export function operatingHoursFromVendorFields(
  openingTime?: string | null,
  closingTime?: string | null,
  weeklyCloseOn?: string | null
): OperatingHours | null {
  const open = parseVendorTimeLabel(openingTime);
  const close = parseVendorTimeLabel(closingTime);
  if (!open || !close) return null;

  const days: (keyof OperatingHours)[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];

  // Same open/close (e.g. 12:00 AM → 12:00 AM) is treated as open all day.
  if (open === close) {
    const allDay: OperatingHours = {};
    for (const day of days) {
      allDay[day] = { open: '00:00', close: '23:59', closed: false };
    }
    return allDay;
  }

  const weeklyCloseKey =
    weeklyCloseOn && weeklyCloseOn !== 'Never Closed'
      ? DAY_NAME_TO_KEY[weeklyCloseOn.trim().toLowerCase()]
      : undefined;

  const hours: OperatingHours = {};
  for (const day of days) {
    if (weeklyCloseKey && day === weeklyCloseKey) {
      hours[day] = { open: '00:00', close: '00:00', closed: true };
    } else {
      hours[day] = { open, close, closed: false };
    }
  }
  return hours;
}

/** Human-readable hours line for map popups (includes closed / opens-later hints). */
export function getHoursDisplayLine(operatingHours?: OperatingHours | null): string {
  if (!operatingHours) return 'Hours not listed';

  const status = getShopStatus(operatingHours);
  const today = getTodayHours(operatingHours);

  if (status.isOpen) {
    return `Open now · ${today}`;
  }
  if (status.nextOpenTime) {
    return `Closed · Opens ${status.nextOpenTime}`;
  }
  return `Closed · ${today}`;
}
