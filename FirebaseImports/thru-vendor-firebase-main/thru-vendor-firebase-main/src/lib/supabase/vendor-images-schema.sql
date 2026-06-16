-- Shop image storage for vendor signup and profile (run in Supabase SQL editor)
-- Shop path: vendor_shop_images/{vendor_id}/shop_image.{ext}
-- Menu item photos: menu_item_images/{vendor_id}/{item_id}.{ext}
-- Bucket id must match uploadVendorImage() / uploadMenuItemImage() in src/lib/supabase-auth.ts

insert into storage.buckets (id, name, public)
values ('vendor-images', 'vendor-images', true)
on conflict (id) do update set public = true;

-- Public read (shop logos on dashboard, orders, nav)
drop policy if exists "vendor_images_public_read" on storage.objects;
create policy "vendor_images_public_read"
  on storage.objects for select
  using (bucket_id = 'vendor-images');

-- Server (service role) uploads during signup/profile; optional client uploads when authed as vendor
drop policy if exists "vendor_images_insert_own" on storage.objects;
create policy "vendor_images_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'vendor_shop_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "vendor_images_update_own" on storage.objects;
create policy "vendor_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'vendor_shop_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "vendor_images_delete_own" on storage.objects;
create policy "vendor_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'vendor_shop_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Menu item photos (optional client uploads when authed as vendor)
drop policy if exists "vendor_menu_item_images_insert_own" on storage.objects;
create policy "vendor_menu_item_images_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'menu_item_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "vendor_menu_item_images_update_own" on storage.objects;
create policy "vendor_menu_item_images_update_own"
  on storage.objects for update
  using (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'menu_item_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "vendor_menu_item_images_delete_own" on storage.objects;
create policy "vendor_menu_item_images_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'vendor-images'
    and (storage.foldername(name))[1] = 'menu_item_images'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Server signup/profile uploads use service role (bypasses RLS). Listed for documentation.
drop policy if exists "vendor_images_service_role_all" on storage.objects;
create policy "vendor_images_service_role_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'vendor-images')
  with check (bucket_id = 'vendor-images');
