import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import type {
  GenericDiscoveryResult,
  MedicineDiscoveryResult,
  ProductDiscoveryResult,
  ProductSearchResponse,
  ShoppingIntentResult,
} from '@/types/product-discovery';

export const dynamic = 'force-dynamic';

type SearchType = 'all' | 'grocery' | 'medicine';

const FALLBACK_PRODUCTS: ProductDiscoveryResult[] = [
  {
    id: 'fallback-amul-cheese-cubes',
    type: 'product',
    name: 'Cheese Cubes',
    brand: 'Amul',
    genericName: 'Cheese',
    category: 'grocery',
    productKind: 'packaged',
    mrp: 145,
    score: 0,
    variants: [
      { id: 'fallback-amul-cheese-cubes-200g', label: '200g', quantityValue: 200, unitCode: 'g', mrp: 145 },
      { id: 'fallback-amul-cheese-cubes-400g', label: '400g', quantityValue: 400, unitCode: 'g', mrp: 280 },
    ],
  },
  {
    id: 'fallback-britannia-cheese-cubes',
    type: 'product',
    name: 'Cheese Cubes',
    brand: 'Britannia',
    genericName: 'Cheese',
    category: 'grocery',
    productKind: 'packaged',
    score: 0,
    variants: [{ id: 'fallback-britannia-cheese-cubes-200g', label: '200g', quantityValue: 200, unitCode: 'g' }],
  },
  {
    id: 'fallback-go-cheese-slices',
    type: 'product',
    name: 'Cheese Slices',
    brand: 'Go',
    genericName: 'Cheese',
    category: 'grocery',
    productKind: 'packaged',
    score: 0,
    variants: [{ id: 'fallback-go-cheese-slices-200g', label: '200g', quantityValue: 200, unitCode: 'g' }],
  },
  {
    id: 'fallback-coke',
    type: 'product',
    name: 'Coke',
    brand: 'Coca-Cola',
    genericName: 'Soft Drink',
    category: 'grocery',
    productKind: 'drink',
    score: 0,
    variants: [
      { id: 'fallback-coke-250ml', label: '250ml', quantityValue: 250, unitCode: 'ml' },
      { id: 'fallback-coke-500ml', label: '500ml', quantityValue: 500, unitCode: 'ml' },
      { id: 'fallback-coke-750ml', label: '750ml', quantityValue: 750, unitCode: 'ml' },
      { id: 'fallback-coke-2l', label: '2L', quantityValue: 2, unitCode: 'l' },
    ],
  },
  {
    id: 'fallback-bread',
    type: 'product',
    name: 'White Bread',
    brand: 'Britannia',
    genericName: 'Bread',
    category: 'grocery',
    productKind: 'bakery',
    score: 0,
    variants: [{ id: 'fallback-bread-400g', label: '400g loaf', quantityValue: 400, unitCode: 'g' }],
  },
];

const FALLBACK_GENERICS: GenericDiscoveryResult[] = [
  { id: 'generic-cheese', type: 'generic', name: 'Generic Cheese', category: 'grocery', productKind: 'generic', emoji: '🧀', score: 0 },
  { id: 'generic-tomato', type: 'generic', name: 'Tomato', category: 'grocery', productKind: 'fresh', emoji: '🍅', score: 0 },
  { id: 'generic-bread', type: 'generic', name: 'Generic Bread', category: 'grocery', productKind: 'bakery', emoji: '🍞', score: 0 },
  { id: 'generic-soft-drink', type: 'generic', name: 'Generic Soft Drink', category: 'grocery', productKind: 'drink', emoji: '🥤', score: 0 },
];

const FALLBACK_MEDICINES: MedicineDiscoveryResult[] = [
  {
    id: 'fallback-dolo-650',
    type: 'medicine',
    name: 'Dolo 650 Tablet',
    manufacturer: 'Micro Labs',
    medicineType: 'human',
    isOtc: true,
    requiresPrescription: false,
    score: 0,
    variants: [{ id: 'fallback-dolo-650-strip', label: 'Strip of 15', strength: '650mg', form: 'Tablet' }],
  },
  {
    id: 'fallback-dolo-500',
    type: 'medicine',
    name: 'Dolo 500 Tablet',
    manufacturer: 'Micro Labs',
    medicineType: 'human',
    isOtc: true,
    requiresPrescription: false,
    score: 0,
    variants: [{ id: 'fallback-dolo-500-strip', label: 'Strip of 15', strength: '500mg', form: 'Tablet' }],
  },
  {
    id: 'fallback-nexgard',
    type: 'medicine',
    name: 'Nexgard',
    manufacturer: 'Boehringer Ingelheim',
    medicineType: 'pet',
    isOtc: false,
    requiresPrescription: true,
    species: 'Dog',
    score: 0,
    variants: [
      { id: 'fallback-nexgard-2-4', label: '2-4kg', animalWeightRange: '2-4kg', requiresPrescription: true },
      { id: 'fallback-nexgard-4-10', label: '4-10kg', animalWeightRange: '4-10kg', requiresPrescription: true },
      { id: 'fallback-nexgard-10-25', label: '10-25kg', animalWeightRange: '10-25kg', requiresPrescription: true },
    ],
  },
];

const FALLBACK_INTENTS: ShoppingIntentResult[] = [
  {
    id: 'intent-birthday',
    type: 'intent',
    name: 'Birthday Essentials',
    description: 'Everything for a quick birthday setup',
    confidence: 100,
    items: ['Cake', 'Candles', 'Soft Drinks', 'Chips', 'Paper Plates', 'Balloons'].map((label, index) => ({
      id: `birthday-${index}`,
      label,
      defaultQuantity: 1,
      result: { id: `generic-${label.toLowerCase().replace(/\s+/g, '-')}`, type: 'generic', name: `Generic ${label}`, productKind: 'generic', score: 90 },
    })),
  },
  {
    id: 'intent-diwali',
    type: 'intent',
    name: 'Diwali Essentials',
    description: 'Festive pickup list',
    confidence: 100,
    items: ['Oil', 'Diyas', 'Flowers', 'Sweets'].map((label, index) => ({
      id: `diwali-${index}`,
      label,
      defaultQuantity: 1,
      result: { id: `generic-${label.toLowerCase()}`, type: 'generic', name: `Generic ${label}`, productKind: 'generic', score: 90 },
    })),
  },
  {
    id: 'intent-gym',
    type: 'intent',
    name: 'Gym Essentials',
    description: 'High protein and quick energy',
    confidence: 100,
    items: ['Protein Milk', 'Bananas', 'Peanut Butter', 'Oats'].map((label, index) => ({
      id: `gym-${index}`,
      label,
      defaultQuantity: 1,
      result: { id: `generic-${label.toLowerCase().replace(/\s+/g, '-')}`, type: 'generic', name: `Generic ${label}`, productKind: 'generic', score: 90 },
    })),
  },
  {
    id: 'intent-pet-puppy',
    type: 'intent',
    name: 'Puppy Essentials',
    description: 'Starter list for a puppy',
    confidence: 100,
    items: ['Pedigree Puppy Food', 'Chew Toy', 'Training Pads', 'Calcium'].map((label, index) => ({
      id: `pet-puppy-${index}`,
      label,
      defaultQuantity: 1,
      result: { id: `generic-${label.toLowerCase().replace(/\s+/g, '-')}`, type: 'generic', name: `Generic ${label}`, productKind: 'generic', score: 90 },
    })),
  },
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreText(query: string, ...values: Array<string | null | undefined>): number {
  const q = normalize(query);
  const haystack = normalize(values.filter(Boolean).join(' '));
  if (!q || !haystack) return 0;
  if (haystack === q) return 100;
  if (haystack.startsWith(q)) return 92;
  if (haystack.includes(q)) return 82;
  const terms = q.split(/\s+/).filter(Boolean);
  const matched = terms.filter((term) => haystack.includes(term)).length;
  return matched > 0 ? 55 + Math.round((matched / terms.length) * 20) : 0;
}

function rank<T extends { score: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.score - a.score).slice(0, 12);
}

function deterministicRerank<T extends { score: number }>(items: T[]): T[] {
  // AI reranking hook: keep disabled until a provider is chosen.
  // Any future model must only reorder these rows and must never add products.
  return rank(items);
}

function withFallbackProducts(query: string): ProductDiscoveryResult[] {
  return rank(
    FALLBACK_PRODUCTS.map((item) => ({
      ...item,
      score: scoreText(query, item.name, item.brand, item.genericName),
    })).filter((item) => item.score > 0)
  );
}

function withFallbackGenerics(query: string): GenericDiscoveryResult[] {
  const scored = FALLBACK_GENERICS.map((item) => ({
    ...item,
    score: scoreText(query, item.name),
  })).filter((item) => item.score > 0);
  const exactGenericName = `Generic ${query.trim()}`;
  if (query.trim().length >= 2 && !scored.some((item) => normalize(item.name).includes(normalize(query)))) {
    scored.push({
      id: `generic-${normalize(query).replace(/\s+/g, '-')}`,
      type: 'generic',
      name: exactGenericName,
      category: 'grocery',
      productKind: inferProductKind(query),
      score: 76,
    });
  }
  return rank(scored);
}

function inferProductKind(query: string): GenericDiscoveryResult['productKind'] {
  const text = normalize(query);
  if (/(tomato|potato|onion|banana|apple|fruit|vegetable)/.test(text)) return 'fresh';
  if (/(bread|bun|pav)/.test(text)) return 'bakery';
  if (/(coke|drink|juice|water|soda)/.test(text)) return 'drink';
  return 'generic';
}

function withFallbackMedicines(query: string, pet: boolean): MedicineDiscoveryResult[] {
  return rank(
    FALLBACK_MEDICINES
      .filter((item) => (pet ? item.medicineType === 'pet' : item.medicineType === 'human'))
      .map((item) => ({
        ...item,
        score: scoreText(query, item.name, item.manufacturer, item.species),
      }))
      .filter((item) => item.score > 0)
  );
}

function withFallbackIntents(query: string): ShoppingIntentResult[] {
  const q = normalize(query);
  if (!q) return [];
  return FALLBACK_INTENTS
    .map((intent) => ({
      ...intent,
      confidence: scoreText(query, intent.name, intent.description, intent.id.replace('intent-', ' ')),
    }))
    .filter((intent) => intent.confidence >= 95)
    .slice(0, 1);
}

async function searchSupabase(query: string, type: SearchType, pet: boolean) {
  const supabase = createServiceSupabaseClient() as any;
  const pattern = `%${query}%`;
  const response: ProductSearchResponse = {
    success: true,
    query,
    intents: [],
    products: [],
    genericProducts: [],
    medicines: [],
  };

  if (type !== 'medicine') {
    const { data: products } = await supabase
      .from('products')
      .select(`
        id,name,category,product_kind,normalized_name,
        brands(name),
        generic_products(name),
        product_variants(id,pack_size_label,quantity_value,mrp),
        product_images(image_url)
      `)
      .eq('is_active', true)
      .or(`name.ilike.${pattern},normalized_name.ilike.${pattern},category.ilike.${pattern}`)
      .limit(20);

    response.products = rank((products ?? []).map((row: any) => ({
      id: row.id,
      type: 'product' as const,
      name: row.name,
      brand: row.brands?.name ?? null,
      genericName: row.generic_products?.name ?? null,
      category: row.category,
      productKind: row.product_kind ?? 'packaged',
      imageUrl: row.product_images?.[0]?.image_url ?? null,
      mrp: row.product_variants?.[0]?.mrp ?? null,
      score: scoreText(query, row.name, row.normalized_name, row.brands?.name, row.generic_products?.name),
      variants: (row.product_variants ?? []).map((variant: any) => ({
        id: variant.id,
        label: variant.pack_size_label,
        quantityValue: variant.quantity_value,
        mrp: variant.mrp,
      })),
    })).filter((row: ProductDiscoveryResult) => row.score > 0));

    const { data: generics } = await supabase
      .from('generic_products')
      .select('id,name,category,product_kind,emoji')
      .or(`name.ilike.${pattern},category.ilike.${pattern}`)
      .limit(12);

    response.genericProducts = rank((generics ?? []).map((row: any) => ({
      id: row.id,
      type: 'generic' as const,
      name: row.name,
      category: row.category,
      productKind: row.product_kind ?? 'generic',
      emoji: row.emoji,
      score: scoreText(query, row.name, row.category),
    })).filter((row: GenericDiscoveryResult) => row.score > 0));

    const { data: synonymRows } = await supabase
      .from('product_synonyms')
      .select(`
        normalized_synonym,weight,
        products(id,name,category,product_kind,brands(name),generic_products(name),product_variants(id,pack_size_label,quantity_value,mrp),product_images(image_url)),
        generic_products(id,name,category,product_kind,emoji)
      `)
      .ilike('normalized_synonym', pattern)
      .limit(12);

    for (const row of synonymRows ?? []) {
      if (row.products) {
        const product = row.products;
        response.products.push({
          id: product.id,
          type: 'product',
          name: product.name,
          brand: product.brands?.name ?? null,
          genericName: product.generic_products?.name ?? null,
          category: product.category,
          productKind: product.product_kind ?? 'packaged',
          imageUrl: product.product_images?.[0]?.image_url ?? null,
          mrp: product.product_variants?.[0]?.mrp ?? null,
          score: 70 + Number(row.weight ?? 1),
          variants: (product.product_variants ?? []).map((variant: any) => ({
            id: variant.id,
            label: variant.pack_size_label,
            quantityValue: variant.quantity_value,
            mrp: variant.mrp,
          })),
        });
      }
      if (row.generic_products) {
        const generic = row.generic_products;
        response.genericProducts.push({
          id: generic.id,
          type: 'generic',
          name: generic.name,
          category: generic.category,
          productKind: generic.product_kind ?? 'generic',
          emoji: generic.emoji,
          score: 68 + Number(row.weight ?? 1),
        });
      }
    }

    response.products = deterministicRerank(response.products);
    response.genericProducts = deterministicRerank(response.genericProducts);
  }

  if (type !== 'grocery') {
    const { data: medicines } = await supabase
      .from('medicine_products')
      .select('id,name,manufacturer,medicine_type,is_otc,requires_prescription,species,medicine_variants(id,pack_size_label,strength_label,form,animal_weight_range,requires_prescription,mrp)')
      .eq('medicine_type', pet ? 'pet' : 'human')
      .or(`name.ilike.${pattern},manufacturer.ilike.${pattern},species.ilike.${pattern}`)
      .limit(20);

    response.medicines = rank((medicines ?? []).map((row: any) => ({
      id: row.id,
      type: 'medicine' as const,
      name: row.name,
      manufacturer: row.manufacturer,
      medicineType: row.medicine_type,
      isOtc: Boolean(row.is_otc),
      requiresPrescription: Boolean(row.requires_prescription),
      species: row.species,
      score: scoreText(query, row.name, row.manufacturer, row.species),
      variants: (row.medicine_variants ?? []).map((variant: any) => ({
        id: variant.id,
        label: variant.pack_size_label,
        strength: variant.strength_label,
        form: variant.form,
        animalWeightRange: variant.animal_weight_range,
        requiresPrescription: variant.requires_prescription,
        mrp: variant.mrp,
      })),
    })).filter((row: MedicineDiscoveryResult) => row.score > 0));

    const { data: medicineSynonyms } = await supabase
      .from('medicine_synonyms')
      .select('normalized_synonym,weight,medicine_products(id,name,manufacturer,medicine_type,is_otc,requires_prescription,species,medicine_variants(id,pack_size_label,strength_label,form,animal_weight_range,requires_prescription,mrp))')
      .ilike('normalized_synonym', pattern)
      .limit(12);

    for (const row of medicineSynonyms ?? []) {
      const medicine = row.medicine_products;
      if (!medicine || medicine.medicine_type !== (pet ? 'pet' : 'human')) continue;
      response.medicines.push({
        id: medicine.id,
        type: 'medicine',
        name: medicine.name,
        manufacturer: medicine.manufacturer,
        medicineType: medicine.medicine_type,
        isOtc: Boolean(medicine.is_otc),
        requiresPrescription: Boolean(medicine.requires_prescription),
        species: medicine.species,
        score: 70 + Number(row.weight ?? 1),
        variants: (medicine.medicine_variants ?? []).map((variant: any) => ({
          id: variant.id,
          label: variant.pack_size_label,
          strength: variant.strength_label,
          form: variant.form,
          animalWeightRange: variant.animal_weight_range,
          requiresPrescription: variant.requires_prescription,
          mrp: variant.mrp,
        })),
      });
    }

    response.medicines = deterministicRerank(response.medicines);
  }

  const { data: intents } = await supabase
    .from('shopping_intents')
    .select('id,name,description,trigger_phrases,min_confidence,shopping_intent_items(id,label,default_quantity,sort_order)')
    .eq('is_active', true)
    .limit(20);

  response.intents = (intents ?? [])
    .map((row: any) => ({
      id: row.id,
      type: 'intent' as const,
      name: row.name,
      description: row.description,
      confidence: Math.max(scoreText(query, row.name, row.description), ...(row.trigger_phrases ?? []).map((phrase: string) => scoreText(query, phrase))),
      items: (row.shopping_intent_items ?? [])
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item: any) => ({
          id: item.id,
          label: item.label,
          defaultQuantity: item.default_quantity ?? 1,
          result: null,
        })),
    }))
    .filter((intent: ShoppingIntentResult) => intent.confidence >= 95)
    .slice(0, 1);

  await supabase.from('search_logs').insert({
    query,
    normalized_query: normalize(query),
    search_type: type,
    matched_intent_id: response.intents[0]?.id ?? null,
    result_count: response.products.length + response.genericProducts.length + response.medicines.length,
  });

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const type = (searchParams.get('type') as SearchType | null) ?? 'all';
  const pet = searchParams.get('pet') === 'true';

  if (query.length < 2) {
    return NextResponse.json<ProductSearchResponse>({
      success: true,
      query,
      intents: [],
      products: [],
      genericProducts: [],
      medicines: [],
    });
  }

  try {
    const result = await searchSupabase(query, ['all', 'grocery', 'medicine'].includes(type) ? type : 'all', pet);
    if (result.products.length || result.genericProducts.length || result.medicines.length || result.intents.length) {
      return NextResponse.json(result);
    }
  } catch (error) {
    console.warn('[product-search] Supabase search unavailable, using fallback data', error);
  }

  return NextResponse.json<ProductSearchResponse>({
    success: true,
    query,
    intents: withFallbackIntents(query),
    products: type === 'medicine' ? [] : withFallbackProducts(query),
    genericProducts: type === 'medicine' ? [] : withFallbackGenerics(query),
    medicines: type === 'grocery' ? [] : withFallbackMedicines(query, pet),
  });
}
