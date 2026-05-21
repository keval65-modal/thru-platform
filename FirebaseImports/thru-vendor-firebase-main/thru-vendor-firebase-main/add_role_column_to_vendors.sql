-- Add role column to vendors table for admin functionality
-- Run this in your Supabase SQL Editor

-- Add role column if it doesn't exist
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'vendor' NOT NULL;

-- Update existing vendors to have 'vendor' role (if any are NULL)
UPDATE public.vendors
SET role = 'vendor'
WHERE role IS NULL;

-- Add a check constraint to ensure role is either 'vendor' or 'admin'
ALTER TABLE public.vendors
DROP CONSTRAINT IF EXISTS vendors_role_check;

ALTER TABLE public.vendors
ADD CONSTRAINT vendors_role_check CHECK (role IN ('vendor', 'admin'));

-- Create an index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_vendors_role ON public.vendors(role);

-- Add comment to document the column
COMMENT ON COLUMN public.vendors.role IS 'User role: vendor (default) or admin';
