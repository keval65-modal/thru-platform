import type { GroceryListItem } from '@/types/order-flow';
import { getUnitDefaults } from '@/lib/grocery-unit-defaults';

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1,
};

/**
 * Parse phrases like "2 kilos tomatoes and one litre milk" into grocery items.
 */
export function parseGroceryVoiceInput(text: string): Omit<GroceryListItem, 'id'>[] {
  const normalized = text
    .toLowerCase()
    .replace(/\band\b/g, ',')
    .replace(/\bkilos?\b/g, 'kg')
    .replace(/\blitres?\b|\bliters?\b/g, 'litre')
    .replace(/\bgrams?\b/g, 'gram')
    .replace(/\bpieces?\b|\bpcs\b/g, 'piece')
    .trim();

  const segments = normalized.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const items: Omit<GroceryListItem, 'id'>[] = [];

  for (const segment of segments) {
    const match = segment.match(
      /^(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|a|an)?\s*(kg|gram|litre|ml|dozen|packet|loaf|piece|bottle|box)?\s*(.+)$/
    );
    if (!match) continue;

    const qtyRaw = match[1]?.trim();
    const unitRaw = match[2]?.trim() as GroceryListItem['unit'] | undefined;
    const name = match[3]?.trim();
    if (!name) continue;

    const quantity = qtyRaw
      ? (NUMBER_WORDS[qtyRaw] ?? parseFloat(qtyRaw))
      : 1;

    const defaults = getUnitDefaults(name);
    const unit = unitRaw && defaults.allowedUnits.includes(unitRaw)
      ? unitRaw
      : defaults.unit;

    items.push({
      name: capitalizeName(name),
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unit,
      showUnit: defaults.showUnit,
    });
  }

  return items;
}

function capitalizeName(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}
