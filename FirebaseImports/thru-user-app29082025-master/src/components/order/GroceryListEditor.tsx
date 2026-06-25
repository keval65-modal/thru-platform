'use client';

import * as React from 'react';
import { Loader2, Minus, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { CategoryRouteShops } from '@/components/order/CategoryRouteShops';
import type { GroceryListItem, GroceryUnit } from '@/types/order-flow';
import type {
  GenericDiscoveryResult,
  ProductDiscoveryResult,
  ProductDiscoveryVariant,
  ProductSearchResponse,
  ShoppingIntentResult,
} from '@/types/product-discovery';

type PendingSelection =
  | { type: 'product'; product: ProductDiscoveryResult }
  | { type: 'generic'; product: GenericDiscoveryResult };

const PRODUCE_OPTIONS: ProductDiscoveryVariant[] = [
  { id: 'fresh-250g', label: '250g', quantityValue: 250, unitCode: 'g' },
  { id: 'fresh-500g', label: '500g', quantityValue: 500, unitCode: 'g' },
  { id: 'fresh-1kg', label: '1kg', quantityValue: 1, unitCode: 'kg' },
  { id: 'fresh-2kg', label: '2kg', quantityValue: 2, unitCode: 'kg' },
  { id: 'fresh-custom', label: 'Custom Weight', quantityValue: 500, unitCode: 'g' },
];

function normalizeUnit(unit?: string | null): GroceryUnit {
  const normalized = unit?.toLowerCase().trim();
  if (normalized === 'g' || normalized === 'gram' || normalized === 'grams') return 'gram';
  if (normalized === 'l' || normalized === 'liter' || normalized === 'litre' || normalized === 'liters' || normalized === 'litres') return 'litre';
  if (normalized === 'pack' || normalized === 'packs' || normalized === 'packet' || normalized === 'packets') return 'packet';
  if (normalized === 'pc' || normalized === 'pcs' || normalized === 'piece' || normalized === 'pieces') return 'piece';
  if (normalized === 'kg' || normalized === 'ml' || normalized === 'box' || normalized === 'dozen' || normalized === 'bottle' || normalized === 'loaf') {
    return normalized;
  }
  return 'piece';
}

function titleCase(value: string): string {
  return value.trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrice(value?: number | null): string | null {
  if (value == null) return null;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function productImageLabel(product: ProductDiscoveryResult | GenericDiscoveryResult): string {
  if ('emoji' in product && product.emoji) return product.emoji;
  const name = product.name.toLowerCase();
  if (name.includes('cheese')) return '🧀';
  if (name.includes('tomato')) return '🍅';
  if (name.includes('bread')) return '🍞';
  if (name.includes('drink') || name.includes('coke')) return '🥤';
  return '🛒';
}

function variantsFor(selection: PendingSelection): ProductDiscoveryVariant[] {
  if (selection.type === 'generic') {
    if (selection.product.productKind === 'fresh') return PRODUCE_OPTIONS;
    return [{ id: 'generic-vendor-choice', label: 'Vendor will choose closest option', quantityValue: 1, unitCode: 'piece' }];
  }
  if (selection.product.productKind === 'fresh') return PRODUCE_OPTIONS;
  return selection.product.variants.length > 0
    ? selection.product.variants
    : [{ id: `${selection.product.id}-default`, label: 'Pack', quantityValue: 1, unitCode: 'packet' }];
}

function ProductCard({
  product,
  onSelect,
}: {
  product: ProductDiscoveryResult;
  onSelect: () => void;
}) {
  const variant = product.variants[0];
  return (
    <div className="rounded-xl border border-border/60 bg-background p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-2xl">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            productImageLabel(product)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{product.brand || product.genericName || 'Product'}</p>
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="text-xs text-muted-foreground">{variant?.label || 'Pack size varies'}</p>
          {formatPrice(variant?.mrp ?? product.mrp) ? (
            <p className="mt-1 text-sm font-bold text-primary">{formatPrice(variant?.mrp ?? product.mrp)}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSelect}>
          Add
        </Button>
      </div>
    </div>
  );
}

function GenericCard({
  product,
  onSelect,
}: {
  product: GenericDiscoveryResult;
  onSelect: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-2xl">
          {productImageLabel(product)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {product.name.startsWith('Generic') ? product.name : `Generic ${product.name}`}
          </p>
          <p className="text-xs text-muted-foreground">Vendor will choose the closest available option.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSelect}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function GroceryListEditor() {
  const {
    groceryItems,
    addGroceryItem,
    updateGroceryItem,
    removeGroceryItem,
    selectedGroceryVendor,
    setSelectedGroceryVendor,
  } = useOrderFlow();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ProductSearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selection, setSelection] = React.useState<PendingSelection | null>(null);
  const [selectedVariantId, setSelectedVariantId] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [customWeight, setCustomWeight] = React.useState('500');
  const [removedIntentItems, setRemovedIntentItems] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, type: 'grocery' });
        const response = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        setResults(data);
        setRemovedIntentItems(new Set());
      } catch (error) {
        if (!controller.signal.aborted) setResults(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const openSelection = (nextSelection: PendingSelection) => {
    const variants = variantsFor(nextSelection);
    setSelection(nextSelection);
    setSelectedVariantId(variants[0]?.id ?? '');
    setQuantity(1);
    setCustomWeight('500');
  };

  const addSelectionToCart = () => {
    if (!selection) return;
    const variants = variantsFor(selection);
    const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
    const isCustomWeight = selectedVariant?.id === 'fresh-custom';
    const unit = normalizeUnit(isCustomWeight ? 'g' : selectedVariant?.unitCode);
    const selectedQuantity = isCustomWeight
      ? Math.max(1, Number(customWeight) || 500)
      : selectedVariant?.quantityValue ?? 1;
    const product = selection.product;
    const brand = selection.type === 'product' ? selection.product.brand ?? undefined : undefined;

    const item: Omit<GroceryListItem, 'id'> = {
      name: titleCase(product.name.replace(/^Generic\s+/i, '')),
      brand,
      packSize: isCustomWeight ? `${selectedQuantity}g` : selectedVariant?.label,
      productSource: selection.type === 'generic' ? 'Vendor will choose' : 'Supabase catalog',
      quantity: selection.type === 'generic' && product.productKind !== 'fresh' ? quantity : selectedQuantity * quantity,
      unit,
      showUnit: true,
    };

    addGroceryItem(item);
    setSelection(null);
    setQuery('');
    setResults(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addIntentItem = (label: string) => {
    openSelection({
      type: 'generic',
      product: {
        id: `intent-${label.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'generic',
        name: label,
        category: 'grocery',
        productKind: label.toLowerCase().match(/tomato|banana|flower/) ? 'fresh' : 'generic',
        score: 100,
      },
    });
  };

  const addIntentList = (intent: ShoppingIntentResult) => {
    intent.items
      .filter((item) => !removedIntentItems.has(item.id))
      .forEach((item) => {
        addGroceryItem({
          name: titleCase(item.label.replace(/^Generic\s+/i, '')),
          quantity: item.defaultQuantity,
          unit: 'piece',
          productSource: intent.name,
          showUnit: true,
        });
      });
    setQuery('');
    setResults(null);
  };

  const currentVariants = selection ? variantsFor(selection) : [];
  const selectedVariant = currentVariants.find((variant) => variant.id === selectedVariantId) ?? currentVariants[0];
  const primaryIntent = results?.intents?.[0];

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 pb-2 backdrop-blur">
        <p className="mb-3 text-sm text-muted-foreground">
          Search products from stores on your route. Choose brand, pack size, then add.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cheese, tomato, bread, birthday…"
            className="h-12 rounded-xl border-0 bg-muted/50 pl-9 text-base"
            autoComplete="off"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching products…
        </div>
      ) : null}

      {primaryIntent ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Shopping List</p>
              <h3 className="text-lg font-bold">{primaryIntent.name}</h3>
              {primaryIntent.description ? (
                <p className="text-sm text-muted-foreground">{primaryIntent.description}</p>
              ) : null}
            </div>
            <Button type="button" size="sm" onClick={() => addIntentList(primaryIntent)}>
              Add list
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {primaryIntent.items
              .filter((item) => !removedIntentItems.has(item.id))
              .map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-background p-2">
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => addIntentItem(item.label)}>
                    Choose
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => setRemovedIntentItems((prev) => new Set([...prev, item.id]))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {results?.products?.length ? (
        <div className="space-y-2">
          {results.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={() => openSelection({ type: 'product', product })}
            />
          ))}
        </div>
      ) : null}

      {results?.genericProducts?.length ? (
        <div className="space-y-2">
          {results.genericProducts.map((product) => (
            <GenericCard
              key={product.id}
              product={product}
              onSelect={() => openSelection({ type: 'generic', product })}
            />
          ))}
        </div>
      ) : null}

      {!loading && query.trim().length >= 2 && !results?.products?.length && !results?.genericProducts?.length && !primaryIntent ? (
        <GenericCard
          product={{
            id: `generic-${query.trim().toLowerCase()}`,
            type: 'generic',
            name: `Generic ${query.trim()}`,
            category: 'grocery',
            productKind: 'generic',
            score: 70,
          }}
          onSelect={() =>
            openSelection({
              type: 'generic',
              product: {
                id: `generic-${query.trim().toLowerCase()}`,
                type: 'generic',
                name: `Generic ${query.trim()}`,
                category: 'grocery',
                productKind: 'generic',
                score: 70,
              },
            })
          }
        />
      ) : null}

      {groceryItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Added items</p>
          {groceryItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{item.brand ? `${item.brand} ` : ''}{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.packSize || item.productSource || 'Vendor will confirm pack'}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Qty</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeGroceryItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-2 flex w-fit items-center rounded-full border border-border bg-muted/30 p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateGroceryItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => updateGroceryItem(item.id, { quantity: item.quantity + 1 })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Search to discover products. Nothing is added until you choose a pack and tap Add to Cart.
        </p>
      )}

      <CategoryRouteShops
        category="grocery"
        selectedVendor={selectedGroceryVendor}
        onSelectVendor={setSelectedGroceryVendor}
      />

      <Sheet open={Boolean(selection)} onOpenChange={(open) => !open && setSelection(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          {selection ? (
            <div className="space-y-5">
              <SheetHeader>
                <SheetTitle className="text-left">
                  {selection.type === 'product' && selection.product.brand
                    ? `${selection.product.brand} ${selection.product.name}`
                    : selection.product.name}
                </SheetTitle>
              </SheetHeader>

              <div>
                <p className="mb-2 text-sm font-semibold">
                  {selection.product.productKind === 'fresh' ? 'Choose Quantity' : 'Choose Pack Size'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {currentVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      className={`rounded-xl border p-3 text-left text-sm font-medium ${
                        selectedVariantId === variant.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                      }`}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      {variant.label}
                      {formatPrice(variant.mrp) ? <span className="mt-1 block text-xs">{formatPrice(variant.mrp)}</span> : null}
                    </button>
                  ))}
                </div>
              </div>

              {selectedVariant?.id === 'fresh-custom' ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Custom Weight</p>
                  <Input
                    type="number"
                    min={1}
                    value={customWeight}
                    onChange={(event) => setCustomWeight(event.target.value)}
                    placeholder="Weight in grams"
                  />
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm font-semibold">Quantity</p>
                <div className="flex w-fit items-center rounded-full border border-border bg-muted/30 p-1">
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-10 text-center font-bold">{quantity}</span>
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setQuantity((value) => value + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button type="button" className="h-12 w-full rounded-xl text-base font-semibold" onClick={addSelectionToCart}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
