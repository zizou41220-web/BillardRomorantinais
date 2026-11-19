-- ==============================================================================
-- Mise à jour Supabase : Menu Smartphone & Menu du Jour (QR Code Public)
-- Projet : Billard Club Romorantinais
-- Sûr à relancer : n'ajoute que ce qui manque, ne supprime aucune donnée.
-- ==============================================================================

-- 1. Ajouter la colonne 'menu_du_jour' sur 'settings'
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS menu_du_jour jsonb;

-- 2. Autoriser la lecture publique (visiteurs scannant le QR Code) sur 'drinks' et 'settings'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'drinks' AND policyname = 'Public read drinks for menu') THEN
    CREATE POLICY "Public read drinks for menu" ON public.drinks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'Public read settings for menu') THEN
    CREATE POLICY "Public read settings for menu" ON public.settings FOR SELECT USING (true);
  END IF;
END $$;

-- 3. Recharger le cache de l'API Supabase
NOTIFY pgrst, 'reload schema';
