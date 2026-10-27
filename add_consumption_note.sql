-- ==============================================================================
-- Script Supabase : Ajout d'une colonne de note pour les rectifications
-- Table : consumptions
-- ==============================================================================

ALTER TABLE public.consumptions ADD COLUMN IF NOT EXISTS note text;
