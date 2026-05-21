-- Add unique constraints for email and phone in vendors table
-- This ensures no duplicate vendors can be registered

-- 1. Add unique constraint for email
ALTER TABLE vendors
ADD CONSTRAINT vendors_email_unique UNIQUE (email);

-- 2. Add unique constraint for phone
ALTER TABLE vendors
ADD CONSTRAINT vendors_phone_unique UNIQUE (phone);

-- 3. Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone);

-- 4. Update RLS policies to allow signup checks
-- Allow anyone to check if email/phone exists (for validation)
CREATE POLICY "Anyone can check email existence"
ON vendors FOR SELECT
USING (true);

-- Note: The above policy allows reading, but we'll only expose
-- email and phone in our API, not sensitive data

-- Verification: Check if constraints were added
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'vendors' 
AND constraint_type = 'UNIQUE';











