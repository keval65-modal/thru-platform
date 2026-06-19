'use client';

import * as React from 'react';
import { Loader2, Mic, MicOff, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { GroceryItemRow } from '@/components/order/GroceryItemRow';
import { CategoryRouteShops } from '@/components/order/CategoryRouteShops';
import { getUnitDefaults } from '@/lib/grocery-unit-defaults';
import { parseGroceryVoiceInput } from '@/lib/grocery-voice-parser';
import { DynamicProduct, scalableGroceryAIService } from '@/lib/scalable-grocery-ai-service';
import { useToast } from '@/hooks/use-toast';
import type { GroceryListItem, GroceryUnit } from '@/types/order-flow';

type QuantityOption = {
  quantity: number;
  unit: string;
  packSize?: string;
  reason?: string;
  source?: string;
};

type GrocerySuggestion = {
  product: DynamicProduct;
  packOptions: QuantityOption[];
};

function titleCase(value: string): string {
  return value.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeUnit(unit?: string): GroceryUnit {
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

function dedupePackOptions(options: QuantityOption[]): QuantityOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.quantity}-${normalizeUnit(option.unit)}-${option.packSize ?? ''}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSourceLabel(source?: string): string {
  if (!source) return 'Google search';
  if (source === 'google_shopping') return 'Google Shopping';
  if (source === 'bigbasket') return 'BigBasket';
  if (source === 'grofers') return 'Blinkit';
  if (source === 'amazon') return 'Amazon';
  if (source === 'database') return 'Saved result';
  return source;
}

export function GroceryListEditor() {
  const { groceryItems, addGroceryItem, updateGroceryItem, removeGroceryItem, selectedGroceryVendor, setSelectedGroceryVendor } = useOrderFlow();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<GrocerySuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [listening, setListening] = React.useState(false);

  React.useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await scalableGroceryAIService.searchProducts(query.trim());
        const richSuggestions = await Promise.all(
          results.slice(0, 6).map(async (product) => {
            let packOptions: QuantityOption[] = product.availableQuantities;
            try {
              const smartOptions = await scalableGroceryAIService.getSmartQuantitySuggestions(product);
              if (smartOptions.length > 0) {
                packOptions = smartOptions;
              }
            } catch {
              packOptions = product.availableQuantities;
            }

            return {
              product,
              packOptions: dedupePackOptions(packOptions).slice(0, 4),
            };
          })
        );
        setSuggestions(richSuggestions);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const addByName = React.useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const defaults = getUnitDefaults(trimmed);
      addGroceryItem({
        name: trimmed.replace(/\b\w/g, (c) => c.toUpperCase()),
        quantity: defaults.quantity,
        unit: defaults.unit,
        showUnit: defaults.showUnit,
      });
      setQuery('');
      setSuggestions([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [addGroceryItem]
  );

  const addProduct = React.useCallback(
    (product: DynamicProduct, option?: QuantityOption) => {
      const defaults = getUnitDefaults(product.name);
      const unit = option ? normalizeUnit(option.unit) : defaults.unit;
      const item: Omit<GroceryListItem, 'id'> = {
        name: titleCase(product.name),
        brand: product.brand ? titleCase(product.brand) : undefined,
        packSize: option?.packSize,
        productSource: option?.source || getSourceLabel(product.source),
        quantity: option?.quantity ?? defaults.quantity,
        unit,
        showUnit: true,
      };

      addGroceryItem(item);
      setQuery('');
      setSuggestions([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [addGroceryItem]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[0]) addProduct(suggestions[0].product, suggestions[0].packOptions[0]);
      else addByName(query);
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Voice not supported',
        description: 'Try typing your list instead.',
        variant: 'destructive',
      });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setQuery(transcript);
      const parsed = parseGroceryVoiceInput(transcript);
      if (parsed.length > 0) {
        parsed.forEach((item) => addGroceryItem(item));
        setQuery('');
        toast({ title: 'Added from voice', description: `${parsed.length} item(s) added` });
      }
    };
    recognition.onerror = () => {
      toast({ variant: 'destructive', title: 'Could not hear you', description: 'Please try again.' });
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          Tell us what you need — we&apos;ll find the best prices on your route.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. tomatoes, milk, bread…"
            className="pl-9 pr-12 h-12 rounded-xl border-0 bg-muted/50 text-base"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
            onClick={startVoice}
            aria-label="Voice input"
          >
            {listening ? (
              <MicOff className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <Mic className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {(loading || suggestions.length > 0) && query.trim() && (
          <div className="mt-2 rounded-xl bg-muted/40 overflow-hidden">
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : (
              suggestions.map(({ product, packOptions }) => (
                <div
                  key={`${product.source}-${product.id}`}
                  className="border-b border-border/30 px-3 py-3 last:border-0"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => addProduct(product, packOptions[0])}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {product.brand ? `${product.brand} · ` : ''}
                          {getSourceLabel(product.source)}
                        </p>
                      </div>
                      {product.brand ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          Brand
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {packOptions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {packOptions.map((option, index) => (
                        <button
                          key={`${option.quantity}-${option.unit}-${option.packSize ?? index}`}
                          type="button"
                          className="rounded-full border border-primary/20 bg-background px-2.5 py-1 text-xs font-medium hover:border-primary/50 hover:bg-primary/10"
                          onClick={() => addProduct(product, option)}
                        >
                          {option.packSize || `${option.quantity} ${normalizeUnit(option.unit)}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {groceryItems.length > 0 ? (
        <div>
          <p className="mb-2 text-right text-xs text-muted-foreground">
            Tap the unit label to pick kg, packet, and more
          </p>
          <div className="divide-y divide-border/40">
            {groceryItems.map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                onChange={(patch) => updateGroceryItem(item.id, patch)}
                onRemove={() => removeGroceryItem(item.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-8">
          Your list is empty — search or use the mic to add items
        </p>
      )}

      <CategoryRouteShops
        category="grocery"
        selectedVendor={selectedGroceryVendor}
        onSelectVendor={setSelectedGroceryVendor}
      />
    </div>
  );
}
