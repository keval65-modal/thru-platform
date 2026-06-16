'use client';

import * as React from 'react';
import { Loader2, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { formatCartInr } from '@/lib/order-cart-pricing';
import type { CartFoodItem } from '@/types/order-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category?: string | null;
  is_veg?: boolean | null;
  vendor_id: string;
};

export type VendorMenuShop = {
  id: string;
  name: string;
  address?: string;
};

type Props = {
  shop: VendorMenuShop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function persistFoodCartToStorage(items: CartFoodItem[], shop: VendorMenuShop) {
  if (typeof window === 'undefined') return;
  const entries = items.map((item) => [
    item.id,
    {
      item: { id: item.id, name: item.name, price: item.unitPrice },
      quantity: item.quantity,
    },
  ]);
  localStorage.setItem('food_cart', JSON.stringify(entries));
  localStorage.setItem(
    'food_cart_shop',
    JSON.stringify({ id: shop.id, name: shop.name, address: shop.address })
  );
}

export function VendorMenuModal({ shop, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { foodItems, selectedFoodVendor, setFoodItems, setSelectedFoodVendor } = useOrderFlow();

  const [menu, setMenu] = React.useState<MenuItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [draft, setDraft] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (!open || !shop) return;

    setSelectedCategory('all');
    const initialDraft: Record<string, number> = {};
    if (selectedFoodVendor?.vendorId === shop.id) {
      for (const item of foodItems) {
        if (item.quantity > 0) initialDraft[item.id] = item.quantity;
      }
    }
    setDraft(initialDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset draft when modal opens for a shop
  }, [open, shop?.id]);

  React.useEffect(() => {
    if (!open || !shop) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/menu/${shop.id}`);
        if (!res.ok) throw new Error('Failed to load menu');
        const data = await res.json();
        if (cancelled) return;
        const items: MenuItem[] = (data.items ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          name: String(row.name),
          description: row.description ? String(row.description) : null,
          price: Number(row.price) || 0,
          image_url: row.image_url ? String(row.image_url) : null,
          category: row.category ? String(row.category) : null,
          is_veg: row.is_veg ?? null,
          vendor_id: String(row.vendor_id ?? shop.id),
        }));
        setMenu(items);
      } catch {
        if (!cancelled) {
          setMenu([]);
          toast({
            variant: 'destructive',
            title: 'Could not load menu',
            description: 'This vendor may not have uploaded a menu yet.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, shop?.id, toast]);

  const categories = React.useMemo(
    () => ['all', ...new Set(menu.map((i) => i.category).filter(Boolean) as string[])],
    [menu]
  );

  const filteredMenu =
    selectedCategory === 'all'
      ? menu
      : menu.filter((i) => (i.category ?? 'Other') === selectedCategory);

  const draftCount = Object.values(draft).reduce((s, q) => s + q, 0);
  const draftTotal = menu.reduce((sum, item) => sum + (draft[item.id] ?? 0) * item.price, 0);

  const setQty = (itemId: string, qty: number) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
  };

  const handleAddToCart = () => {
    if (!shop || draftCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing selected',
        description: 'Add at least one item from the menu.',
      });
      return;
    }

    const nextItems: CartFoodItem[] = [];
    for (const item of menu) {
      const qty = draft[item.id] ?? 0;
      if (qty <= 0) continue;
      nextItems.push({
        id: item.id,
        name: item.name,
        quantity: qty,
        unitPrice: item.price,
        vendorId: shop.id,
        vendorName: shop.name,
      });
    }

    if (nextItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing selected',
        description: 'Add at least one item from the menu.',
      });
      return;
    }

    const vendor = {
      category: 'food' as const,
      vendorId: shop.id,
      vendorName: shop.name,
      address: shop.address,
    };

    setSelectedFoodVendor(vendor);
    setFoodItems(nextItems);
    persistFoodCartToStorage(nextItems, shop);

    toast({
      title: 'Added to cart',
      description: `${draftCount} item${draftCount === 1 ? '' : 's'} from ${shop.name}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 max-w-lg w-[calc(100%-1.5rem)] max-h-[min(92dvh,720px)] overflow-hidden',
          'border border-white/40 bg-white/75 dark:bg-background/80',
          'backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)]',
          'rounded-3xl sm:rounded-3xl'
        )}
        overlayClassName="bg-black/35 backdrop-blur-md"
      >
        <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-white/30 bg-white/40 backdrop-blur-sm">
          <DialogTitle className="text-left text-lg pr-8">{shop?.name ?? 'Menu'}</DialogTitle>
          {shop?.address && (
            <DialogDescription className="text-left line-clamp-2">{shop.address}</DialogDescription>
          )}
        </DialogHeader>

        {categories.length > 1 && (
          <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 border-b border-white/20 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-white/50 text-foreground hover:bg-white/70'
                )}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Loading menu…</p>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <UtensilsCrossed className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">No menu items yet</p>
              <p className="text-xs mt-1">This vendor hasn&apos;t uploaded their menu.</p>
            </div>
          ) : (
            filteredMenu.map((item) => {
              const qty = draft[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'rounded-2xl p-3 flex gap-3 transition-colors',
                    'bg-white/55 dark:bg-white/5 border border-white/50 backdrop-blur-sm',
                    qty > 0 && 'ring-2 ring-primary/25 border-primary/30'
                  )}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted/40 shrink-0 flex items-center justify-center">
                      <UtensilsCrossed className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight">{item.name}</p>
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        {formatCartInr(item.price)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.is_veg != null && (
                      <Badge variant="secondary" className="mt-1.5 text-[10px] h-5">
                        {item.is_veg ? '🌱 Veg' : 'Non-veg'}
                      </Badge>
                    )}
                    <div className="mt-2 flex items-center">
                      {qty === 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full bg-white/60 border-white/60"
                          onClick={() => setQty(item.id, 1)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      ) : (
                        <div className="flex items-center rounded-full border border-border/60 bg-white/70 p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setQty(item.id, qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {qty}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => setQty(item.id, qty + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div
          className={cn(
            'shrink-0 px-4 py-4 border-t border-white/30',
            'bg-white/50 dark:bg-background/60 backdrop-blur-xl'
          )}
        >
          <div className="flex items-center justify-between gap-3 mb-3 text-sm">
            <span className="text-muted-foreground">
              {draftCount > 0
                ? `${draftCount} item${draftCount === 1 ? '' : 's'} selected`
                : 'Select items to add'}
            </span>
            {draftCount > 0 && (
              <span className="font-bold tabular-nums">{formatCartInr(draftTotal)}</span>
            )}
          </div>
          <Button
            type="button"
            className="w-full h-12 rounded-2xl font-semibold shadow-lg"
            disabled={draftCount === 0}
            onClick={handleAddToCart}
          >
            Add to cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
