import type { OrderFlowState } from '@/types/order-flow';
import { clampScheduledDepartureIso, isDepartureIsoInPast } from '@/lib/departure-time';

const STORAGE_KEY = 'thru-order-flow-v1';

export function defaultOrderFlowState(): OrderFlowState {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    startLocationQuery: '',
    selectedStartLocation: null,
    destinationQuery: '',
    selectedDestination: null,
    routeCoords: null,
    routeStops: [],
    departureTime: `${year}-${month}-${day}T${hours}:${minutes}`,
    isImmediate: true,
    categories: [],
    groceryItems: [],
    selectedRouteOptionId: null,
    routeOptions: [],
  };
}

export function loadOrderFlowState(): OrderFlowState {
  if (typeof window === 'undefined') return defaultOrderFlowState();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultOrderFlowState();
    const merged = { ...defaultOrderFlowState(), ...JSON.parse(raw) } as OrderFlowState;
    if (!merged.isImmediate && merged.departureTime && isDepartureIsoInPast(merged.departureTime)) {
      merged.departureTime = clampScheduledDepartureIso(merged.departureTime);
    }
    return merged;
  } catch {
    return defaultOrderFlowState();
  }
}

export function saveOrderFlowState(state: OrderFlowState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearOrderFlowState(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
