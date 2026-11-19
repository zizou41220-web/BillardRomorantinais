-- ==============================================================================
-- Mise à jour Supabase : Ardoises Visiteurs (Tournois / Passage)
-- Projet : Billard Club Romorantinais
-- Sûr à relancer : n'ajoute que ce qui manque, ne supprime aucune donnée.
-- ==============================================================================

-- 1. Créer la table 'visitors'
CREATE TABLE IF NOT EXISTS public.visitors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name text NOT NULL,
    is_hidden boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visitors' AND policyname = 'Allow read visitors') THEN
    CREATE POLICY "Allow read visitors" ON public.visitors FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visitors' AND policyname = 'Allow insert visitors') THEN
    CREATE POLICY "Allow insert visitors" ON public.visitors FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visitors' AND policyname = 'Allow update visitors') THEN
    CREATE POLICY "Allow update visitors" ON public.visitors FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'visitors' AND policyname = 'Allow delete visitors') THEN
    CREATE POLICY "Allow delete visitors" ON public.visitors FOR DELETE USING (true);
  END IF;
END $$;

-- 2. Ajouter 'visitor_id' sur 'consumptions' et autoriser 'member_id' à être NULL pour les visiteurs
ALTER TABLE public.consumptions ADD COLUMN IF NOT EXISTS visitor_id uuid REFERENCES public.visitors(id) ON DELETE SET NULL;
ALTER TABLE public.consumptions ALTER COLUMN member_id DROP NOT NULL;

-- 3. Recharger le cache de l'API Supabase
NOTIFY pgrst, 'reload schema';
