-- Add bank details column to vendors table
-- Run this in the Supabase SQL Editor

-- Add bank_details as JSONB column to store bank information
ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN public.vendors.bank_details IS 'Bank account details stored as JSON: {account_holder_name, account_number, ifsc_code, bank_name, branch_name}';

-- Create index for querying vendors with bank details
CREATE INDEX IF NOT EXISTS idx_vendors_bank_details ON public.vendors USING GIN(bank_details) WHERE bank_details IS NOT NULL;
