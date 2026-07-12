-- Remove public read access from wallet_actions table
-- Edge functions use service_role to check free actions, so this won't break functionality
-- Users don't need to see other users' wallet activity
DROP POLICY IF EXISTS "Users can read all actions" ON public.wallet_actions;

-- wallet_actions are now only accessible via service role for backend checks