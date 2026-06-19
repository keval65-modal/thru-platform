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
  brand?: string;
  packSize?: string;
  productSource?: string;
  quantity: number;
  unit: GroceryUnit;
  /** When false, unit chip is hidden (e.g. bread sold by piece) */
  showUnit?: boolean;
};

export type CartFoodItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vendorId?: string;
  vendorName?: string;
};

export type CartMedicineItem = {
  id: string;
  name: string;
  dosage?: string;
  quantity: number;
  /** 0 when awaiting pharmacy quote */
  unitPrice: number;
};

export type PickupStore = {
  category: OrderCategory;
  vendorId: string;
  vendorName: string;
  address?: string;
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
  /** Shop display name (primary title) */
  label: string;
  totalPrice: number;
  savings: number;
  /** Extra minutes off route; 0 when on path */
  addedMinutes: number;
  /** User-facing timing badge, e.g. "On your path" */
  timingLabel: string;
  isOnPath: boolean;
  shopIds: string[];
  shopNames: string[];
  shopAddress: string;
  streetName: string;
  isSuggested: boolean;
  isOnRoute: boolean;
  /** Street line or short location hint */
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
  foodItems: CartFoodItem[];
  medicineItems: CartMedicineItem[];
  selectedFoodVendor: PickupStore | null;
  selectedGroceryVendor: PickupStore | null;
  selectedMedicineVendor: PickupStore | null;
  selectedRouteOptionId: string | null;
  routeOptions: RouteOption[];
};

export const ORDER_FLOW_STEPS = [
  { id: 'destination', label: 'Where', path: '/order/destination' },
  { id: 'needs', label: 'What', path: '/order/needs' },
  { id: 'review', label: 'Checkout', path: '/order/review' },
] as const;

export const MEDICINE_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_MEDICINE !== 'false';

/** Tight corridor — shops considered directly on the route */
export const ON_ROUTE_DETOUR_KM = 2;

/** Maximum detour when nothing is found on-route */
export const MAX_ROUTE_DETOUR_KM = 5;

/** @deprecated Use MAX_ROUTE_DETOUR_KM */
export const AUTO_DETOUR_KM = MAX_ROUTE_DETOUR_KM;
