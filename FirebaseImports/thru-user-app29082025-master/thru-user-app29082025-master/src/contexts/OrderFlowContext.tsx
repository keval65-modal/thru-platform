'use client';

import * as React from 'react';
import type {
  CartFoodItem,
  CartMedicineItem,
  GroceryListItem,
  OrderCategory,
  OrderFlowState,
  PickupStore,
  RouteOption,
  RouteStop,
} from '@/types/order-flow';
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
  setGroceryItems: (items: GroceryListItem[]) => void;
  setFoodItems: (items: CartFoodItem[]) => void;
  updateFoodItem: (id: string, patch: Partial<CartFoodItem>) => void;
  removeFoodItem: (id: string) => void;
  setMedicineItems: (items: CartMedicineItem[]) => void;
  updateMedicineItem: (id: string, patch: Partial<CartMedicineItem>) => void;
  removeMedicineItem: (id: string) => void;
  setSelectedFoodVendor: (vendor: PickupStore | null) => void;
  setSelectedGroceryVendor: (vendor: PickupStore | null) => void;
  setSelectedMedicineVendor: (vendor: PickupStore | null) => void;
  syncFoodCartFromStorage: () => void;
  setRouteOptions: (options: RouteOption[]) => void;
  selectRouteOption: (id: string) => void;
  patch: (partial: Partial<OrderFlowState>) => void;
  reset: () => void;
};

const OrderFlowContext = React.createContext<OrderFlowContextValue | null>(null);

function routeCoordsEqual(
  a: OrderFlowState['routeCoords'],
  b: OrderFlowState['routeCoords']
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.start.lat === b.start.lat &&
    a.start.lng === b.start.lng &&
    a.dest.lat === b.dest.lat &&
    a.dest.lng === b.dest.lng
  );
}

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

  const setStart = React.useCallback((query: string, coords: string | null) => {
    setState((prev) => ({
      ...prev,
      startLocationQuery: query,
      selectedStartLocation: coords,
    }));
  }, []);

  const setDestination = React.useCallback((query: string, coords: string | null) => {
    setState((prev) => ({
      ...prev,
      destinationQuery: query,
      selectedDestination: coords,
    }));
  }, []);

  const setRouteCoords = React.useCallback((coords: OrderFlowState['routeCoords']) => {
    setState((prev) => {
      if (routeCoordsEqual(prev.routeCoords, coords)) return prev;
      return { ...prev, routeCoords: coords };
    });
  }, []);

  const setDeparture = React.useCallback((time: string, immediate: boolean) => {
    setState((prev) => ({
      ...prev,
      departureTime: time,
      isImmediate: immediate,
    }));
  }, []);

  const setRouteStops = React.useCallback((stops: RouteStop[]) => {
    setState((prev) => ({ ...prev, routeStops: stops }));
  }, []);

  const toggleCategory = React.useCallback((category: OrderCategory) => {
    setState((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const addGroceryItem = React.useCallback((item: Omit<GroceryListItem, 'id'>) => {
    setState((prev) => ({
      ...prev,
      groceryItems: [
        ...prev.groceryItems,
        { ...item, id: `grocery_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` },
      ],
    }));
  }, []);

  const updateGroceryItem = React.useCallback((id: string, itemPatch: Partial<GroceryListItem>) => {
    setState((prev) => ({
      ...prev,
      groceryItems: prev.groceryItems.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)),
    }));
  }, []);

  const removeGroceryItem = React.useCallback((id: string) => {
    setState((prev) => {
      const groceryItems = prev.groceryItems.filter((i) => i.id !== id);
      return {
        ...prev,
        groceryItems,
        selectedGroceryVendor: groceryItems.length > 0 ? prev.selectedGroceryVendor : null,
      };
    });
  }, []);

  const setGroceryItems = React.useCallback((items: GroceryListItem[]) => {
    setState((prev) => ({
      ...prev,
      groceryItems: items,
      selectedGroceryVendor: items.length > 0 ? prev.selectedGroceryVendor : null,
    }));
  }, []);

  const setFoodItems = React.useCallback((items: CartFoodItem[]) => {
    setState((prev) => ({
      ...prev,
      foodItems: items,
      selectedFoodVendor: items.length > 0 ? prev.selectedFoodVendor : null,
    }));
  }, []);

  const updateFoodItem = React.useCallback((id: string, itemPatch: Partial<CartFoodItem>) => {
    setState((prev) => ({
      ...prev,
      foodItems: prev.foodItems.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)),
    }));
  }, []);

  const removeFoodItem = React.useCallback((id: string) => {
    setState((prev) => {
      const foodItems = prev.foodItems.filter((i) => i.id !== id);
      return {
        ...prev,
        foodItems,
        selectedFoodVendor: foodItems.length > 0 ? prev.selectedFoodVendor : null,
      };
    });
  }, []);

  const setMedicineItems = React.useCallback((items: CartMedicineItem[]) => {
    setState((prev) => ({
      ...prev,
      medicineItems: items,
      selectedMedicineVendor: items.length > 0 ? prev.selectedMedicineVendor : null,
    }));
  }, []);

  const updateMedicineItem = React.useCallback((id: string, itemPatch: Partial<CartMedicineItem>) => {
    setState((prev) => ({
      ...prev,
      medicineItems: prev.medicineItems.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)),
    }));
  }, []);

  const removeMedicineItem = React.useCallback((id: string) => {
    setState((prev) => {
      const medicineItems = prev.medicineItems.filter((i) => i.id !== id);
      return {
        ...prev,
        medicineItems,
        selectedMedicineVendor: medicineItems.length > 0 ? prev.selectedMedicineVendor : null,
      };
    });
  }, []);

  const setSelectedFoodVendor = React.useCallback((vendor: PickupStore | null) => {
    setState((prev) => ({ ...prev, selectedFoodVendor: vendor }));
  }, []);

  const setSelectedGroceryVendor = React.useCallback((vendor: PickupStore | null) => {
    setState((prev) => ({ ...prev, selectedGroceryVendor: vendor }));
  }, []);

  const setSelectedMedicineVendor = React.useCallback((vendor: PickupStore | null) => {
    setState((prev) => ({ ...prev, selectedMedicineVendor: vendor }));
  }, []);

  const syncFoodCartFromStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedCart = localStorage.getItem('food_cart');
      const savedShop = localStorage.getItem('food_cart_shop');
      if (!savedCart) return;

      const entries: [string, { item: { id: string; name: string; price: number }; quantity: number }][] =
        JSON.parse(savedCart);
      const foodItems: CartFoodItem[] = entries.map(([, cartItem]) => ({
        id: cartItem.item.id,
        name: cartItem.item.name,
        quantity: cartItem.quantity,
        unitPrice: cartItem.item.price,
      }));

      let selectedFoodVendor: PickupStore | null = null;
      if (savedShop) {
        const shop = JSON.parse(savedShop) as { id: string; name: string; address?: string };
        selectedFoodVendor = {
          category: 'food',
          vendorId: shop.id,
          vendorName: shop.name,
          address: shop.address,
        };
      }

      setState((prev) => ({
        ...prev,
        foodItems,
        selectedFoodVendor: selectedFoodVendor ?? prev.selectedFoodVendor,
      }));
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  const setRouteOptions = React.useCallback((options: RouteOption[]) => {
    setState((prev) => ({ ...prev, routeOptions: options }));
  }, []);

  const selectRouteOption = React.useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedRouteOptionId: id }));
  }, []);

  const reset = React.useCallback(() => {
    setState(defaultOrderFlowState());
  }, []);

  const value = React.useMemo<OrderFlowContextValue>(
    () => ({
      ...state,
      hydrated,
      setStart,
      setDestination,
      setRouteCoords,
      setDeparture,
      setRouteStops,
      toggleCategory,
      addGroceryItem,
      updateGroceryItem,
      removeGroceryItem,
      setGroceryItems,
      setFoodItems,
      updateFoodItem,
      removeFoodItem,
      setMedicineItems,
      updateMedicineItem,
      removeMedicineItem,
      setSelectedFoodVendor,
      setSelectedGroceryVendor,
      setSelectedMedicineVendor,
      syncFoodCartFromStorage,
      setRouteOptions,
      selectRouteOption,
      patch,
      reset,
    }),
    [
      state,
      hydrated,
      setStart,
      setDestination,
      setRouteCoords,
      setDeparture,
      setRouteStops,
      toggleCategory,
      addGroceryItem,
      updateGroceryItem,
      removeGroceryItem,
      setGroceryItems,
      setFoodItems,
      updateFoodItem,
      removeFoodItem,
      setMedicineItems,
      updateMedicineItem,
      removeMedicineItem,
      setSelectedFoodVendor,
      setSelectedGroceryVendor,
      setSelectedMedicineVendor,
      syncFoodCartFromStorage,
      setRouteOptions,
      selectRouteOption,
      patch,
      reset,
    ]
  );

  return <OrderFlowContext.Provider value={value}>{children}</OrderFlowContext.Provider>;
}

export function useOrderFlow() {
  const ctx = React.useContext(OrderFlowContext);
  if (!ctx) throw new Error('useOrderFlow must be used within OrderFlowProvider');
  return ctx;
}
