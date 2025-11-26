-- Fix: Enable RLS on public.rate_limit_blocks and add a policy for service_role
-- This addresses the critical security issue "RLS Disabled in Public" reported by Supabase Advisor.

-- 1. Enable Row Level Security on the table.
-- This is a secure-by-default action. Without any policies, all access is denied.
ALTER TABLE public.rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy to allow the service_role to manage blocks.
-- This is necessary for backend processes (e.g., Supabase Functions) that handle rate limiting logic
-- to be able to insert records into this table.
CREATE POLICY "Allow service_role to manage rate_limit_blocks"
ON public.rate_limit_blocks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow service_role to manage rate_limit_blocks" ON public.rate_limit_blocks IS 'Allows the service_role to perform any action on the rate_limit_blocks table, necessary for backend rate limiting logic.';
