-- ===================================================================
-- Just You & Me 💗 — Ensure metadata & theme_preference exist
-- Run this in your Supabase SQL Editor if you want native columns:
-- https://supabase.com/dashboard/project/_/sql/new
-- ===================================================================

-- 1. Add metadata column if not present
ALTER TABLE public.couple_spaces 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Add theme_preference column if not present
ALTER TABLE public.couple_spaces 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'blush';

-- 3. Confirm RLS allows updates to couple_spaces for members and creators
DROP POLICY IF EXISTS "Couple spaces updatable by members or creator" ON public.couple_spaces;
CREATE POLICY "Couple spaces updatable by members or creator"
    ON public.couple_spaces FOR UPDATE
    USING (created_by = auth.uid() OR public.is_couple_member(auth.uid(), id))
    WITH CHECK (created_by = auth.uid() OR public.is_couple_member(auth.uid(), id));
