-- Product discovery schema for Thru user app
-- Run in Supabase SQL editor or via the existing SQL apply script pattern.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS measurement_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count', 'length', 'other')),
  base_unit_code TEXT,
  multiplier_to_base NUMERIC(14, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packaging_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generic_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  subcategory TEXT,
  product_kind TEXT NOT NULL DEFAULT 'packaged' CHECK (product_kind IN ('packaged', 'fresh', 'bakery', 'drink', 'generic')),
  emoji TEXT,
  description TEXT,
  search_text TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_product_id UUID NOT NULL REFERENCES generic_products(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  product_kind TEXT NOT NULL DEFAULT 'packaged' CHECK (product_kind IN ('packaged', 'fresh', 'bakery', 'drink', 'generic')),
  barcode TEXT,
  source TEXT,
  source_product_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  search_text TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_product_id),
  UNIQUE (brand_id, normalized_name, generic_product_id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  measurement_unit_id UUID REFERENCES measurement_units(id) ON DELETE SET NULL,
  packaging_type_id UUID REFERENCES packaging_types(id) ON DELETE SET NULL,
  pack_size_label TEXT NOT NULL,
  quantity_value NUMERIC(12, 3),
  mrp NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  barcode TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT,
  source_variant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_variant_id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL DEFAULT 'front' CHECK (image_type IN ('front', 'pack', 'nutrition', 'other')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (product_id IS NOT NULL OR product_variant_id IS NOT NULL),
  UNIQUE (product_id, image_url)
);

CREATE TABLE IF NOT EXISTS product_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generic_product_id UUID REFERENCES generic_products(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  synonym TEXT NOT NULL,
  normalized_synonym TEXT NOT NULL,
  weight NUMERIC(6, 3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (generic_product_id IS NOT NULL OR product_id IS NOT NULL),
  UNIQUE (generic_product_id, product_id, normalized_synonym)
);

CREATE TABLE IF NOT EXISTS vendor_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  medicine_variant_id UUID,
  sku TEXT,
  price NUMERIC(12, 2),
  mrp NUMERIC(12, 2),
  stock_status TEXT NOT NULL DEFAULT 'unknown' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'low_stock', 'unknown')),
  available_quantity INTEGER,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (product_variant_id IS NOT NULL OR medicine_variant_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS medicine_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  manufacturer TEXT,
  medicine_type TEXT NOT NULL DEFAULT 'human' CHECK (medicine_type IN ('human', 'pet')),
  active_ingredients TEXT[],
  schedule TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  is_otc BOOLEAN NOT NULL DEFAULT FALSE,
  species TEXT,
  search_text TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicine_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_product_id UUID NOT NULL REFERENCES medicine_products(id) ON DELETE CASCADE,
  strength_label TEXT,
  pack_size_label TEXT NOT NULL,
  form TEXT,
  animal_weight_range TEXT,
  mrp NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  requires_prescription BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendor_inventory
  DROP CONSTRAINT IF EXISTS vendor_inventory_medicine_variant_id_fkey;
ALTER TABLE vendor_inventory
  ADD CONSTRAINT vendor_inventory_medicine_variant_id_fkey
  FOREIGN KEY (medicine_variant_id) REFERENCES medicine_variants(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS medicine_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_product_id UUID NOT NULL REFERENCES medicine_products(id) ON DELETE CASCADE,
  synonym TEXT NOT NULL,
  normalized_synonym TEXT NOT NULL,
  weight NUMERIC(6, 3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medicine_product_id, normalized_synonym)
);

CREATE TABLE IF NOT EXISTS shopping_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  trigger_phrases TEXT[] NOT NULL DEFAULT '{}',
  min_confidence NUMERIC(5, 2) NOT NULL DEFAULT 95,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  search_text TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_intent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_intent_id UUID NOT NULL REFERENCES shopping_intents(id) ON DELETE CASCADE,
  generic_product_id UUID REFERENCES generic_products(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  medicine_product_id UUID REFERENCES medicine_products(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    generic_product_id IS NOT NULL OR
    product_id IS NOT NULL OR
    medicine_product_id IS NOT NULL OR
    label IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'all' CHECK (search_type IN ('all', 'grocery', 'medicine')),
  matched_intent_id UUID REFERENCES shopping_intents(id) ON DELETE SET NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  selected_result_type TEXT,
  selected_result_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_generic_products_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.subcategory, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_products_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.normalized_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.subcategory, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.barcode, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_medicine_products_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.manufacturer, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.active_ingredients, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.species, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_shopping_intents_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.trigger_phrases, ' '), '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_generic_products_search ON generic_products USING GIN(search_text);
CREATE INDEX IF NOT EXISTS idx_generic_products_name_trgm ON generic_products USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN(search_text);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_generic ON products(generic_product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_synonyms_normalized ON product_synonyms(normalized_synonym);
CREATE INDEX IF NOT EXISTS idx_product_synonyms_trgm ON product_synonyms USING GIN(normalized_synonym gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_vendor ON vendor_inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_product_variant ON vendor_inventory(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_medicine_variant ON vendor_inventory(medicine_variant_id);
CREATE INDEX IF NOT EXISTS idx_medicine_products_search ON medicine_products USING GIN(search_text);
CREATE INDEX IF NOT EXISTS idx_medicine_products_name_trgm ON medicine_products USING GIN(name gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicine_products_unique_normalized
  ON medicine_products (normalized_name, coalesce(manufacturer, ''), medicine_type);
CREATE INDEX IF NOT EXISTS idx_medicine_variants_product ON medicine_variants(medicine_product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicine_variants_unique_pack
  ON medicine_variants (medicine_product_id, coalesce(strength_label, ''), pack_size_label, coalesce(animal_weight_range, ''));
CREATE INDEX IF NOT EXISTS idx_medicine_synonyms_normalized ON medicine_synonyms(normalized_synonym);
CREATE INDEX IF NOT EXISTS idx_medicine_synonyms_trgm ON medicine_synonyms USING GIN(normalized_synonym gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shopping_intents_search ON shopping_intents USING GIN(search_text);
CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);

DROP TRIGGER IF EXISTS update_measurement_units_updated_at ON measurement_units;
CREATE TRIGGER update_measurement_units_updated_at BEFORE UPDATE ON measurement_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_packaging_types_updated_at ON packaging_types;
CREATE TRIGGER update_packaging_types_updated_at BEFORE UPDATE ON packaging_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_generic_products_updated_at ON generic_products;
CREATE TRIGGER update_generic_products_updated_at BEFORE UPDATE ON generic_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_generic_products_search_text ON generic_products;
CREATE TRIGGER update_generic_products_search_text BEFORE INSERT OR UPDATE ON generic_products FOR EACH ROW EXECUTE FUNCTION update_generic_products_search_text();
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_search_text ON products;
CREATE TRIGGER update_products_search_text BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_products_search_text();
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_vendor_inventory_updated_at ON vendor_inventory;
CREATE TRIGGER update_vendor_inventory_updated_at BEFORE UPDATE ON vendor_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_medicine_products_updated_at ON medicine_products;
CREATE TRIGGER update_medicine_products_updated_at BEFORE UPDATE ON medicine_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_medicine_products_search_text ON medicine_products;
CREATE TRIGGER update_medicine_products_search_text BEFORE INSERT OR UPDATE ON medicine_products FOR EACH ROW EXECUTE FUNCTION update_medicine_products_search_text();
DROP TRIGGER IF EXISTS update_medicine_variants_updated_at ON medicine_variants;
CREATE TRIGGER update_medicine_variants_updated_at BEFORE UPDATE ON medicine_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_shopping_intents_updated_at ON shopping_intents;
CREATE TRIGGER update_shopping_intents_updated_at BEFORE UPDATE ON shopping_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_shopping_intents_search_text ON shopping_intents;
CREATE TRIGGER update_shopping_intents_search_text BEFORE INSERT OR UPDATE ON shopping_intents FOR EACH ROW EXECUTE FUNCTION update_shopping_intents_search_text();

ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE generic_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_intent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  public_read_tables TEXT[] := ARRAY[
    'measurement_units', 'packaging_types', 'generic_products', 'brands',
    'products', 'product_variants', 'product_images', 'product_synonyms',
    'vendor_inventory', 'medicine_products', 'medicine_variants',
    'medicine_synonyms', 'shopping_intents', 'shopping_intent_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY public_read_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public read %I" ON %I FOR SELECT USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Service role manage %I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Service role manage %I" ON %I FOR ALL USING (auth.role() = ''service_role'') WITH CHECK (auth.role() = ''service_role'')', tbl, tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public insert search logs" ON search_logs;
CREATE POLICY "Public insert search logs" ON search_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service role read search logs" ON search_logs;
CREATE POLICY "Service role read search logs" ON search_logs FOR SELECT USING (auth.role() = 'service_role');

INSERT INTO measurement_units (code, label, unit_type, base_unit_code, multiplier_to_base)
VALUES
  ('g', 'Gram', 'weight', 'g', 1),
  ('kg', 'Kilogram', 'weight', 'g', 1000),
  ('ml', 'Millilitre', 'volume', 'ml', 1),
  ('l', 'Litre', 'volume', 'ml', 1000),
  ('piece', 'Piece', 'count', 'piece', 1),
  ('pack', 'Pack', 'count', 'pack', 1),
  ('strip', 'Strip', 'count', 'strip', 1),
  ('bottle', 'Bottle', 'count', 'bottle', 1)
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, unit_type = EXCLUDED.unit_type, updated_at = NOW();

INSERT INTO packaging_types (code, label)
VALUES
  ('packet', 'Packet'),
  ('box', 'Box'),
  ('bottle', 'Bottle'),
  ('strip', 'Strip'),
  ('loose', 'Loose'),
  ('tray', 'Tray')
ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, updated_at = NOW();
