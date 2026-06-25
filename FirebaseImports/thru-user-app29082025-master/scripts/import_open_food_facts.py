#!/usr/bin/env python3
"""
Import Open Food Facts JSONL data into Thru's Supabase product catalog.

This importer reads a local JSONL stream/file. It never calls Open Food Facts
during app search. Required env vars:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Example:
  python scripts/import_open_food_facts.py --input india-products.jsonl --batch-size 250
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


INDIA_MARKERS = {"india", "in", "en:india"}
DEFAULT_CATEGORY = "grocery"
PACK_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|l|litre|liter|ml|pack|pcs|pieces|tablet|tablets)", re.I)


@dataclass
class ProductRecord:
  source_product_id: str
  generic_name: str
  generic_slug: str
  product_name: str
  normalized_name: str
  brand_name: str | None
  brand_normalized: str | None
  category: str
  subcategory: str | None
  product_kind: str
  barcode: str | None
  pack_size_label: str
  quantity_value: float | None
  unit_code: str | None
  image_url: str | None
  mrp: float | None
  synonyms: list[str]


def normalize_text(value: str | None) -> str:
  value = (value or "").strip().lower()
  value = re.sub(r"[^a-z0-9]+", " ", value)
  return re.sub(r"\s+", " ", value).strip()


def titleish(value: str | None) -> str:
  value = re.sub(r"\s+", " ", (value or "").strip())
  return value[:1].upper() + value[1:] if value else ""


def slugify(value: str) -> str:
  normalized = normalize_text(value).replace(" ", "-")
  return normalized or hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]


def is_india_product(raw: dict[str, Any]) -> bool:
  fields = [
    raw.get("countries_tags"),
    raw.get("countries_hierarchy"),
    raw.get("countries"),
    raw.get("manufacturing_places"),
    raw.get("stores"),
  ]
  for field in fields:
    if isinstance(field, list):
      markers = {normalize_text(str(item)).replace(" ", ":") for item in field}
      if markers & INDIA_MARKERS or "en:india" in markers:
        return True
      if any("india" in marker for marker in markers):
        return True
    elif isinstance(field, str) and "india" in field.lower():
      return True
  return False


def first_brand(raw: dict[str, Any]) -> str | None:
  brands_tags = raw.get("brands_tags")
  if isinstance(brands_tags, list) and brands_tags:
    return titleish(str(brands_tags[0]).replace("-", " "))
  brands = raw.get("brands")
  if isinstance(brands, str) and brands.strip():
    return titleish(brands.split(",")[0])
  return None


def parse_pack(raw: dict[str, Any]) -> tuple[str, float | None, str | None]:
  quantity = raw.get("quantity") or raw.get("product_quantity") or raw.get("serving_size") or ""
  quantity_str = str(quantity).strip()
  match = PACK_RE.search(quantity_str)
  if not match:
    return quantity_str or "Pack", None, None
  value = float(match.group(1))
  unit = match.group(2).lower()
  unit_map = {
    "gram": "g",
    "grams": "g",
    "liter": "l",
    "litre": "l",
    "tablet": "piece",
    "tablets": "piece",
    "pcs": "piece",
    "pieces": "piece",
  }
  unit_code = unit_map.get(unit, unit)
  label = f"{int(value) if value.is_integer() else value:g}{unit}"
  return label, value, unit_code


def infer_kind(name: str, categories: str) -> str:
  text = f"{name} {categories}".lower()
  if any(word in text for word in ["tomato", "potato", "onion", "banana", "apple", "vegetable", "fruit"]):
    return "fresh"
  if any(word in text for word in ["bread", "bun", "pav", "bakery"]):
    return "bakery"
  if any(word in text for word in ["cola", "juice", "drink", "water", "soda"]):
    return "drink"
  return "packaged"


def generic_from_name(product_name: str, categories: str) -> str:
  normalized = normalize_text(product_name)
  stopwords = {
    "amul", "britannia", "nestle", "cadbury", "mother", "dairy", "fresh", "organic",
    "classic", "premium", "natural", "the", "with", "and", "india"
  }
  words = [word for word in normalized.split() if word not in stopwords and not word.isdigit()]
  if not words:
    words = normalize_text(categories).split()[:2] or normalized.split()[:2]
  return titleish(" ".join(words[:3]))


def build_synonyms(record: ProductRecord) -> list[str]:
  values = {
    record.product_name,
    record.generic_name,
    record.normalized_name,
    *(record.synonyms or []),
  }
  if record.brand_name:
    values.add(f"{record.brand_name} {record.generic_name}")
  return sorted({normalize_text(value) for value in values if normalize_text(value)})


def normalize_product(raw: dict[str, Any]) -> ProductRecord | None:
  if not is_india_product(raw):
    return None
  product_name = titleish(raw.get("product_name") or raw.get("generic_name") or raw.get("abbreviated_product_name"))
  if len(product_name) < 2:
    return None
  categories = raw.get("categories") or ""
  brand_name = first_brand(raw)
  pack_label, quantity_value, unit_code = parse_pack(raw)
  generic_name = generic_from_name(product_name, str(categories))
  normalized_name = normalize_text(product_name)
  barcode = str(raw.get("code") or raw.get("_id") or "").strip() or None
  source_id = barcode or hashlib.sha1(json.dumps(raw, sort_keys=True).encode("utf-8")).hexdigest()
  category_tags = raw.get("categories_tags")
  subcategory = None
  if isinstance(category_tags, list) and category_tags:
    subcategory = titleish(str(category_tags[-1]).replace("en:", "").replace("-", " "))

  return ProductRecord(
    source_product_id=source_id,
    generic_name=generic_name,
    generic_slug=slugify(generic_name),
    product_name=product_name,
    normalized_name=normalized_name,
    brand_name=brand_name,
    brand_normalized=normalize_text(brand_name) if brand_name else None,
    category=DEFAULT_CATEGORY,
    subcategory=subcategory,
    product_kind=infer_kind(product_name, str(categories)),
    barcode=barcode,
    pack_size_label=pack_label,
    quantity_value=quantity_value,
    unit_code=unit_code,
    image_url=raw.get("image_front_url") or raw.get("image_url"),
    mrp=None,
    synonyms=[str(item).replace("en:", "").replace("-", " ") for item in raw.get("categories_tags", [])[:5]]
      if isinstance(raw.get("categories_tags"), list) else [],
  )


class SupabaseRest:
  def __init__(self, url: str, service_key: str):
    self.base = url.rstrip("/") + "/rest/v1"
    self.headers = {
      "apikey": service_key,
      "Authorization": f"Bearer {service_key}",
      "Content-Type": "application/json",
      "Prefer": "return=representation,resolution=merge-duplicates",
    }

  def upsert(self, table: str, rows: list[dict[str, Any]], conflict: str) -> list[dict[str, Any]]:
    if not rows:
      return []
    url = f"{self.base}/{table}?on_conflict={conflict}"
    request = urllib.request.Request(
      url,
      data=json.dumps(rows).encode("utf-8"),
      headers=self.headers,
      method="POST",
    )
    try:
      with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8") or "[]")
    except urllib.error.HTTPError as error:
      body = error.read().decode("utf-8", errors="replace")
      raise RuntimeError(f"Supabase upsert failed for {table}: {error.code} {body}") from error


def chunks(items: list[Any], size: int) -> Iterable[list[Any]]:
  for index in range(0, len(items), size):
    yield items[index:index + size]


def read_jsonl(path: Path) -> Iterable[dict[str, Any]]:
  with path.open("r", encoding="utf-8") as handle:
    for line_no, line in enumerate(handle, 1):
      line = line.strip()
      if not line:
        continue
      try:
        yield json.loads(line)
      except json.JSONDecodeError as error:
        yield {"__import_error__": f"line {line_no}: {error}"}


def import_records(records: list[ProductRecord], client: SupabaseRest, batch_size: int) -> None:
  brands = {
    record.brand_normalized: {"name": record.brand_name, "normalized_name": record.brand_normalized}
    for record in records if record.brand_name and record.brand_normalized
  }
  generics = {
    record.generic_slug: {
      "name": record.generic_name,
      "slug": record.generic_slug,
      "category": record.category,
      "subcategory": record.subcategory,
      "product_kind": record.product_kind,
    }
    for record in records
  }

  brand_rows: dict[str, dict[str, Any]] = {}
  for batch in chunks(list(brands.values()), batch_size):
    for row in client.upsert("brands", batch, "normalized_name"):
      brand_rows[row["normalized_name"]] = row

  generic_rows: dict[str, dict[str, Any]] = {}
  for batch in chunks(list(generics.values()), batch_size):
    for row in client.upsert("generic_products", batch, "slug"):
      generic_rows[row["slug"]] = row

  products = []
  for record in records:
    products.append({
      "generic_product_id": generic_rows[record.generic_slug]["id"],
      "brand_id": brand_rows.get(record.brand_normalized or "", {}).get("id"),
      "name": record.product_name,
      "normalized_name": record.normalized_name,
      "category": record.category,
      "subcategory": record.subcategory,
      "product_kind": record.product_kind,
      "barcode": record.barcode,
      "source": "open_food_facts",
      "source_product_id": record.source_product_id,
      "is_active": True,
    })

  product_rows: dict[str, dict[str, Any]] = {}
  for batch in chunks(products, batch_size):
    for row in client.upsert("products", batch, "source,source_product_id"):
      product_rows[row["source_product_id"]] = row

  variants = []
  images = []
  synonyms = []
  for record in records:
    product = product_rows[record.source_product_id]
    variants.append({
      "product_id": product["id"],
      "pack_size_label": record.pack_size_label,
      "quantity_value": record.quantity_value,
      "mrp": record.mrp,
      "barcode": record.barcode,
      "source": "open_food_facts",
      "source_variant_id": f"{record.source_product_id}:{record.pack_size_label}",
      "is_active": True,
    })
    if record.image_url:
      images.append({"product_id": product["id"], "image_url": record.image_url, "image_type": "front"})
    for synonym in build_synonyms(record):
      synonyms.append({
        "product_id": product["id"],
        "generic_product_id": generic_rows[record.generic_slug]["id"],
        "synonym": synonym,
        "normalized_synonym": synonym,
        "weight": 1,
      })

  for batch in chunks(variants, batch_size):
    client.upsert("product_variants", batch, "source,source_variant_id")
  for batch in chunks(images, batch_size):
    client.upsert("product_images", batch, "product_id,image_url")
  for batch in chunks(synonyms, batch_size):
    client.upsert("product_synonyms", batch, "generic_product_id,product_id,normalized_synonym")


def main() -> int:
  parser = argparse.ArgumentParser()
  parser.add_argument("--input", required=True, type=Path)
  parser.add_argument("--batch-size", type=int, default=250)
  parser.add_argument("--failed-log", type=Path, default=Path("open_food_facts_failed_imports.jsonl"))
  args = parser.parse_args()

  supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
  service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
  if not supabase_url or not service_key:
    print("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
    return 2

  client = SupabaseRest(supabase_url, service_key)
  records: list[ProductRecord] = []
  scanned = failed = 0

  with args.failed_log.open("w", encoding="utf-8") as failed_handle:
    for raw in read_jsonl(args.input):
      scanned += 1
      if "__import_error__" in raw:
        failed += 1
        failed_handle.write(json.dumps(raw) + "\n")
        continue
      try:
        record = normalize_product(raw)
        if record:
          records.append(record)
      except Exception as error:  # noqa: BLE001 - importer logs and continues
        failed += 1
        failed_handle.write(json.dumps({"error": str(error), "raw": raw}) + "\n")

      if len(records) >= args.batch_size:
        import_records(records, client, args.batch_size)
        records.clear()
        time.sleep(0.05)

    if records:
      import_records(records, client, args.batch_size)

  print(f"Scanned {scanned} rows. Failed {failed}. See {args.failed_log}.")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
