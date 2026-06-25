export type ProductDiscoveryVariant = {
  id: string;
  label: string;
  quantityValue?: number | null;
  unitCode?: string | null;
  mrp?: number | null;
};

export type ProductDiscoveryResult = {
  id: string;
  type: 'product';
  name: string;
  brand?: string | null;
  genericName?: string | null;
  category?: string | null;
  productKind: 'packaged' | 'fresh' | 'bakery' | 'drink' | 'generic';
  imageUrl?: string | null;
  mrp?: number | null;
  score: number;
  variants: ProductDiscoveryVariant[];
};

export type GenericDiscoveryResult = {
  id: string;
  type: 'generic';
  name: string;
  category?: string | null;
  productKind: 'packaged' | 'fresh' | 'bakery' | 'drink' | 'generic';
  emoji?: string | null;
  score: number;
};

export type MedicineDiscoveryVariant = {
  id: string;
  label: string;
  strength?: string | null;
  form?: string | null;
  animalWeightRange?: string | null;
  requiresPrescription?: boolean | null;
  mrp?: number | null;
};

export type MedicineDiscoveryResult = {
  id: string;
  type: 'medicine';
  name: string;
  manufacturer?: string | null;
  medicineType: 'human' | 'pet';
  isOtc: boolean;
  requiresPrescription: boolean;
  species?: string | null;
  score: number;
  variants: MedicineDiscoveryVariant[];
};

export type ShoppingIntentItemResult = {
  id: string;
  label: string;
  defaultQuantity: number;
  result?: ProductDiscoveryResult | GenericDiscoveryResult | MedicineDiscoveryResult | null;
};

export type ShoppingIntentResult = {
  id: string;
  type: 'intent';
  name: string;
  description?: string | null;
  confidence: number;
  items: ShoppingIntentItemResult[];
};

export type ProductSearchResponse = {
  success: boolean;
  query: string;
  intents: ShoppingIntentResult[];
  products: ProductDiscoveryResult[];
  genericProducts: GenericDiscoveryResult[];
  medicines: MedicineDiscoveryResult[];
  error?: string;
};
