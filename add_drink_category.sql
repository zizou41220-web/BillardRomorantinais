-- ==============================================================================
-- Script Supabase : Ajout de la colonne 'category' sur la table 'drinks'
-- Projet : Billard Club Romorantinais
-- ==============================================================================

-- 1. Ajouter la colonne 'category' avec valeur par défaut 'bar'
ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS category text DEFAULT 'bar';

-- 2. Mettre à jour les consommables et matériels de billard connus
UPDATE public.drinks 
SET category = 'billard'
WHERE LOWER(name) LIKE '%procédé%' 
   OR LOWER(name) LIKE '%procede%' 
   OR LOWER(name) LIKE '%craie%' 
   OR LOWER(name) LIKE '%crai%' 
   OR LOWER(name) LIKE '%taom%'
   OR LOWER(name) LIKE '%virole%'
   OR LOWER(name) LIKE '%embout%'
   OR LOWER(name) LIKE '%queue%'
   OR LOWER(name) LIKE '%flèche%'
   OR LOWER(name) LIKE '%fleche%';

-- 3. Tous les autres restent en 'bar' (boissons, friandises, snacks)
UPDATE public.drinks 
SET category = 'bar'
WHERE category IS NULL OR category = '';
