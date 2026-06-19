'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, Minus, Plus, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { GroceryItemRow } from '@/components/order/GroceryItemRow';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import {
  computeCartSummary,
  estimateFoodLinePrice,
  estimateGroceryLinePrice,
  estimateMedicineLinePrice,
  formatCartInr,
} from '@/lib/order-cart-pricing';
import type { OrderCategory } from '@/types/order-flow';
import { cn } from '@/lib/utils';

const CATEGORY_EMOJI: Record<OrderCategory, string> = {
  grocery: '🛒',
  food: '🍽️',
  medicine: '💊',
};

function SimpleCartRow({
  name,
  subtitle,
  quantity,
  linePrice,
  priceLabel,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  name: string;
  subtitle?: string;
  quantity: number;
  linePrice: number;
  priceLabel?: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const qtyControls = (
    <div className="flex items-center rounded-full border border-border/90 bg-muted/30 p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onDecrease}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onIncrease}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="py-3 border-b border-border/40 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          <p className="text-sm font-semibold mt-1 tabular-nums">
            {priceLabel ?? formatCartInr(linePrice)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 h-8 px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onRemove}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
      <div className="mt-2 flex justify-start">{qtyControls}</div>
    </div>
  );
}

export function OrderCart() {
  const flow = useOrderFlow();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const {
    hydrated,
    categories,
    groceryItems,
    foodItems,
    medicineItems,
    updateGroceryItem,
    removeGroceryItem,
    setGroceryItems,
    updateFoodItem,
    removeFoodItem,
    setFoodItems,
    updateMedicineItem,
    removeMedicineItem,
    setMedicineItems,
  } = flow;

  const summary = React.useMemo(() => computeCartSummary(flow), [flow]);

  if (!hydrated) return null;

  const hasItems = summary.itemCount > 0;
  const showBar = categories.length > 0 || hasItems;

  const handleCheckout = () => {
    setOpen(false);
    router.push('/order/review');
  };

  if (!showBar) return null;

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pointer-events-none">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between gap-2',
            'rounded-2xl border border-primary/20 bg-background px-3 py-2 shadow-lg',
            'hover:border-primary/35 active:scale-[0.99] transition-all'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </span>
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold leading-tight">
                {hasItems
                  ? `${summary.itemCount} item${summary.itemCount === 1 ? '' : 's'} in cart`
                  : 'Your cart'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {summary.pickupStores.length > 0
                  ? summary.pickupStores.map((s) => s.vendorName).join(' · ')
                  : 'Add items to see pickup stores'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasItems && (
              <span className="text-base font-bold tabular-nums text-primary">
                {formatCartInr(summary.total)}
              </span>
            )}
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col pb-8">
          <SheetHeader>
            <SheetTitle className="text-left">Your cart</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-5 mt-2 pr-1">
            {summary.pickupStores.length > 0 && (
              <section className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  Pickup stores
                </p>
                {summary.pickupStores.map((store) => (
                  <div key={`${store.category}-${store.vendorId}`} className="flex justify-between gap-2 text-sm">
                    <span className="text-muted-foreground capitalize">
                      {CATEGORY_EMOJI[store.category]} {store.category}
                    </span>
                    <span className="font-medium text-right">{store.vendorName}</span>
                  </div>
                ))}
              </section>
            )}

            {!hasItems && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Your cart is empty — add items from the steps above.
              </p>
            )}

            {categories.includes('grocery') && groceryItems.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-1 flex items-center justify-between gap-2">
                  <span>{CATEGORY_EMOJI.grocery} Grocery</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground font-normal tabular-nums">
                      {formatCartInr(
                        groceryItems.reduce((s, i) => s + estimateGroceryLinePrice(i), 0)
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setGroceryItems([])}
                    >
                      Clear all
                    </Button>
                  </span>
                </h3>
                <div className="rounded-xl border border-border/50 px-3">
                  {groceryItems.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      variant="cart"
                      onChange={(patch) => updateGroceryItem(item.id, patch)}
                      onRemove={() => removeGroceryItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {categories.includes('food') && foodItems.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-1 flex items-center justify-between gap-2">
                  <span>{CATEGORY_EMOJI.food} Food</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground font-normal tabular-nums">
                      {formatCartInr(
                        foodItems.reduce((s, i) => s + estimateFoodLinePrice(i), 0)
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setFoodItems([])}
                    >
                      Clear all
                    </Button>
                  </span>
                </h3>
                <div className="rounded-xl border border-border/50 px-3">
                  {foodItems.map((item) => (
                    <SimpleCartRow
                      key={item.id}
                      name={item.name}
                      subtitle={item.vendorName}
                      quantity={item.quantity}
                      linePrice={estimateFoodLinePrice(item)}
                      onDecrease={() =>
                        item.quantity <= 1
                          ? removeFoodItem(item.id)
                          : updateFoodItem(item.id, { quantity: item.quantity - 1 })
                      }
                      onIncrease={() =>
                        updateFoodItem(item.id, { quantity: item.quantity + 1 })
                      }
                      onRemove={() => removeFoodItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {categories.includes('medicine') && medicineItems.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-1 flex items-center justify-between gap-2">
                  <span>{CATEGORY_EMOJI.medicine} Medicine</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground font-normal tabular-nums">
                      {summary.categories.find((c) => c.category === 'medicine')?.hasQuotePending
                        ? 'Quote pending'
                        : formatCartInr(
                            medicineItems.reduce((s, i) => s + estimateMedicineLinePrice(i), 0)
                          )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setMedicineItems([])}
                    >
                      Clear all
                    </Button>
                  </span>
                </h3>
                <div className="rounded-xl border border-border/50 px-3">
                  {medicineItems.map((item) => (
                    <SimpleCartRow
                      key={item.id}
                      name={item.name}
                      subtitle={item.dosage}
                      quantity={item.quantity}
                      linePrice={estimateMedicineLinePrice(item)}
                      priceLabel={item.unitPrice > 0 ? formatCartInr(estimateMedicineLinePrice(item)) : 'Awaiting quote'}
                      onDecrease={() =>
                        updateMedicineItem(item.id, {
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      onIncrease={() =>
                        updateMedicineItem(item.id, { quantity: item.quantity + 1 })
                      }
                      onRemove={() => removeMedicineItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {hasItems && (
            <div className="mt-4 pt-4 border-t border-border/60 space-y-2 shrink-0">
              {summary.savings > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Estimated savings</span>
                  <span className="font-medium">−{formatCartInr(summary.savings)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-semibold">Cart total</span>
                <span className="text-2xl font-bold tabular-nums text-primary">
                  {formatCartInr(summary.total)}
                </span>
              </div>
              <Button
                type="button"
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={handleCheckout}
              >
                Checkout
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
