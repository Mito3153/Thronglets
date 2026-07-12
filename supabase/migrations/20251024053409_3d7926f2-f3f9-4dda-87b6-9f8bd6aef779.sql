-- Remove public read access from vip_wallets table
-- The is_vip_wallet() function will still work because it uses SECURITY DEFINER
DROP POLICY IF EXISTS "Anyone can read VIP wallets" ON public.vip_wallets;

-- VIP wallets are now only accessible via the is_vip_wallet() security definer function
-- and direct service role access for management