export type OrderCategory = 'grocery' | 'food' | 'medicine';

export type GroceryUnit =
  | 'piece'
  | 'kg'
  | 'gram'
  | 'litre'
  | 'ml'
  | 'packet'
  | 'box'
  | 'dozen'
  | 'bottle'
  | 'loaf';

export type GroceryListItem = {
  id: string;
  name: string;
  quantity: number;
  unit: GroceryUnit;
  /** When false, unit chip is hidden (e.g. bread sold by piece) */
  showUnit?: boolean;
};

export type RouteStop = {
  id: string;
  name: string;
  type: 'grocery' | 'food' | 'other';
  placeId?: string;
};

export type RouteCoords = {
  start: { lat: number; lng: number };
  dest: { lat: number; lng: number };
};

export type RouteOption = {
  id: string;
  label: string;
  totalPrice: number;
  savings: number;
  addedMinutes: number;
  shopIds: string[];
  shopNames: string[];
  description: string;
};

export type WorthStopPlace = {
  id: string;
  name: string;
  rating?: number;
  addedMinutes: number;
  perk?: string;
  isSponsored?: boolean;
  imageUrl?: string;
  address?: string;
};

export type OrderFlowState = {
  startLocationQuery: string;
  selectedStartLocation: string | null;
  destinationQuery: string;
  selectedDestination: string | null;
  routeCoords: RouteCoords | null;
  routeStops: RouteStop[];
  departureTime: string;
  isImmediate: boolean;
  categories: OrderCategory[];
  groceryItems: GroceryListItem[];
  selectedRouteOptionId: string | null;
  routeOptions: RouteOption[];
};

export const ORDER_FLOW_STEPS = [
  { id: 'destination', label: 'Where', path: '/order/destination' },
  { id: 'needs', label: 'What', path: '/order/needs' },
  { id: 'optimize', label: 'Options', path: '/order/optimize' },
  { id: 'review', label: 'Checkout', path: '/order/review' },
] as const;

export const MEDICINE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MEDICINE !== 'false';

/** Internal detour — never shown to users */
export const AUTO_DETOUR_KM = 12;
