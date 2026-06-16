'use client';

import * as React from 'react';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { CategoryRouteShops, type BrowseShopInfo } from '@/components/order/CategoryRouteShops';
import { VendorMenuModal } from '@/components/order/VendorMenuModal';
import { formatCartInr } from '@/lib/order-cart-pricing';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2 } from 'lucide-react';

export function FoodDiscovery() {
  const {
    foodItems,
    updateFoodItem,
    removeFoodItem,
    selectedFoodVendor,
    setSelectedFoodVendor,
    syncFoodCartFromStorage,
  } = useOrderFlow();

  const [menuShop, setMenuShop] = React.useState<BrowseShopInfo | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    syncFoodCartFromStorage();
  }, [syncFoodCartFromStorage]);

  const openMenu = (shop: BrowseShopInfo) => {
    setMenuShop(shop);
    setMenuOpen(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick a stop on your route, then browse the menu to add items to your cart.
      </p>

      {foodItems.length > 0 ? (
        <div className="rounded-xl border border-border/50 px-3 divide-y divide-border/40">
          {foodItems.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCartInr(item.unitPrice * item.quantity)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center rounded-full border border-border/90 bg-muted/30 p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() =>
                      updateFoodItem(item.id, { quantity: Math.max(1, item.quantity - 1) })
                    }
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => updateFoodItem(item.id, { quantity: item.quantity + 1 })}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFoodItem(item.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-6">
          No food items yet — select a stop below and browse the menu
        </p>
      )}

      <CategoryRouteShops
        category="food"
        selectedVendor={selectedFoodVendor}
        onSelectVendor={setSelectedFoodVendor}
        onBrowseShop={openMenu}
      />

      <VendorMenuModal shop={menuShop} open={menuOpen} onOpenChange={setMenuOpen} />
    </div>
  );
}
