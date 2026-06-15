'use client';

import * as React from 'react';
import type { GroceryListItem, OrderCategory, OrderFlowState, RouteOption, RouteStop } from '@/types/order-flow';
import {
  defaultOrderFlowState,
  loadOrderFlowState,
  saveOrderFlowState,
} from '@/lib/order-flow-storage';

type OrderFlowContextValue = OrderFlowState & {
  hydrated: boolean;
  setStart: (query: string, coords: string | null) => void;
  setDestination: (query: string, coords: string | null) => void;
  setRouteCoords: (coords: OrderFlowState['routeCoords']) => void;
  setDeparture: (time: string, immediate: boolean) => void;
  setRouteStops: (stops: RouteStop[]) => void;
  toggleCategory: (category: OrderCategory) => void;
  addGroceryItem: (item: Omit<GroceryListItem, 'id'>) => void;
  updateGroceryItem: (id: string, patch: Partial<GroceryListItem>) => void;
  removeGroceryItem: (id: string) => void;
  setRouteOptions: (options: RouteOption[]) => void;
  selectRouteOption: (id: string) => void;
  patch: (partial: Partial<OrderFlowState>) => void;
  reset: () => void;
};

const OrderFlowContext = React.createContext<OrderFlowContextValue | null>(null);

export function OrderFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<OrderFlowState>(defaultOrderFlowState);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setState(loadOrderFlowState());
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    saveOrderFlowState(state);
  }, [state, hydrated]);

  const patch = React.useCallback((partial: Partial<OrderFlowState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = React.useMemo<OrderFlowContextValue>(
    () => ({
      ...state,
      hydrated,
      setStart: (query, coords) =>
        patch({ startLocationQuery: query, selectedStartLocation: coords }),
      setDestination: (query, coords) =>
        patch({ destinationQuery: query, selectedDestination: coords }),
      setRouteCoords: (coords) => patch({ routeCoords: coords }),
      setDeparture: (time, immediate) => patch({ departureTime: time, isImmediate: immediate }),
      setRouteStops: (stops) => patch({ routeStops: stops }),
      toggleCategory: (category) =>
        setState((prev) => ({
          ...prev,
          categories: prev.categories.includes(category)
            ? prev.categories.filter((c) => c !== category)
            : [...prev.categories, category],
        })),
      addGroceryItem: (item) =>
        setState((prev) => ({
          ...prev,
          groceryItems: [
            ...prev.groceryItems,
            { ...item, id: `grocery_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` },
          ],
        })),
      updateGroceryItem: (id, itemPatch) =>
        setState((prev) => ({
          ...prev,
          groceryItems: prev.groceryItems.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)),
        })),
      removeGroceryItem: (id) =>
        setState((prev) => ({
          ...prev,
          groceryItems: prev.groceryItems.filter((i) => i.id !== id),
        })),
      setRouteOptions: (options) => patch({ routeOptions: options }),
      selectRouteOption: (id) => patch({ selectedRouteOptionId: id }),
      patch,
      reset: () => setState(defaultOrderFlowState()),
    }),
    [state, hydrated, patch]
  );

  return <OrderFlowContext.Provider value={value}>{children}</OrderFlowContext.Provider>;
}

export function useOrderFlow() {
  const ctx = React.useContext(OrderFlowContext);
  if (!ctx) throw new Error('useOrderFlow must be used within OrderFlowProvider');
  return ctx;
}
