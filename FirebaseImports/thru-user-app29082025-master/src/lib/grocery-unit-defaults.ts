import type { GroceryUnit } from '@/types/order-flow';

export const GROCERY_UNITS: { value: GroceryUnit; label: string }[] = [
  { value: 'piece', label: 'piece' },
  { value: 'kg', label: 'kg' },
  { value: 'gram', label: 'gram' },
  { value: 'litre', label: 'litre' },
  { value: 'ml', label: 'ml' },
  { value: 'packet', label: 'packet' },
  { value: 'box', label: 'box' },
  { value: 'dozen', label: 'dozen' },
  { value: 'bottle', label: 'bottle' },
  { value: 'loaf', label: 'loaf' },
];

/** Configurable keyword → default unit mapping */
const UNIT_RULES: { keywords: string[]; unit: GroceryUnit; quantity?: number; showUnit?: boolean }[] = [
  { keywords: ['tomato', 'onion', 'potato', 'carrot', 'rice', 'sugar', 'apple', 'banana', 'mango'], unit: 'kg' },
  { keywords: ['milk', 'oil', 'juice', 'curd', 'yogurt'], unit: 'litre' },
  { keywords: ['egg'], unit: 'dozen' },
  { keywords: ['bread'], unit: 'loaf', showUnit: false },
  { keywords: ['paneer'], unit: 'gram', quantity: 250 },
  { keywords: ['cheese'], unit: 'packet' },
  { keywords: ['butter'], unit: 'packet' },
];

export type UnitDefault = {
  unit: GroceryUnit;
  quantity: number;
  showUnit: boolean;
  allowedUnits: GroceryUnit[];
};

export function getUnitDefaults(itemName: string): UnitDefault {
  const item = itemName.toLowerCase().trim();

  for (const rule of UNIT_RULES) {
    if (rule.keywords.some((kw) => item.includes(kw))) {
      return {
        unit: rule.unit,
        quantity: rule.quantity ?? 1,
        showUnit: rule.showUnit ?? true,
        allowedUnits: inferAllowedUnits(rule.unit),
      };
    }
  }

  return {
    unit: 'piece',
    quantity: 1,
    showUnit: false,
    allowedUnits: ['piece', 'kg', 'gram', 'packet', 'box'],
  };
}

function inferAllowedUnits(primary: GroceryUnit): GroceryUnit[] {
  if (primary === 'kg' || primary === 'gram') return ['kg', 'gram', 'piece'];
  if (primary === 'litre' || primary === 'ml') return ['litre', 'ml', 'bottle'];
  if (primary === 'loaf') return ['loaf', 'piece'];
  if (primary === 'dozen') return ['dozen', 'piece'];
  return GROCERY_UNITS.map((u) => u.value);
}

export function cycleUnit(current: GroceryUnit, allowed: GroceryUnit[]): GroceryUnit {
  const idx = allowed.indexOf(current);
  if (idx === -1) return allowed[0];
  return allowed[(idx + 1) % allowed.length];
}

export function formatUnitLabel(unit: GroceryUnit): string {
  return GROCERY_UNITS.find((u) => u.value === unit)?.label ?? unit;
}
