'use client';

import * as React from 'react';
import { Loader2, Mic, MicOff, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOrderFlow } from '@/contexts/OrderFlowContext';
import { GroceryItemRow } from '@/components/order/GroceryItemRow';
import { getUnitDefaults } from '@/lib/grocery-unit-defaults';
import { parseGroceryVoiceInput } from '@/lib/grocery-voice-parser';
import { scalableGroceryAIService } from '@/lib/scalable-grocery-ai-service';
import { useToast } from '@/hooks/use-toast';

export function GroceryListEditor() {
  const { groceryItems, addGroceryItem, updateGroceryItem, removeGroceryItem } = useOrderFlow();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
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
        setSuggestions(results.slice(0, 6).map((r) => r.name));
      } catch {
        setSuggestions([query.trim()]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[0]) addByName(suggestions[0]);
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
              suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/80 border-b border-border/30 last:border-0"
                  onClick={() => addByName(name)}
                >
                  {name}
                </button>
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
    </div>
  );
}
