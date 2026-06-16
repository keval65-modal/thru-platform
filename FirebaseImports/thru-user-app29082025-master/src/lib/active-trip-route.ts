import type { OrderCategory } from '@/types/order-flow';

export type ActiveTripPickupStop = {
  id: string;
  name: string;
  address?: string;
  category: OrderCategory;
  vendorId: string;
};

export type ActiveTripRoute = {
  orderId: string;
  startLocation: string;
  destination: string;
  pickupStops: ActiveTripPickupStop[];
  createdAt: string;
};

const STORAGE_KEY = 'thru-active-trip-route';

export function saveActiveTripRoute(trip: ActiveTripRoute): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
}

export function loadActiveTripRoute(): ActiveTripRoute | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveTripRoute;
  } catch {
    return null;
  }
}

export function clearActiveTripRoute(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
