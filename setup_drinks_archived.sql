-- ==============================================================================
-- Mise à jour Supabase : Désactivation / Réactivation d'un article (archived)
-- Projet : Billard Club Romorantinais
-- Sûr à relancer : n'ajoute que ce qui manque, ne supprime aucune donnée.
-- ==============================================================================

ALTER TABLE public.drinks ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
