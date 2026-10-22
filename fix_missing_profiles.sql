-- ==============================================================================
-- Script de Réparation : Insertion des profils manquants & Trigger Automatique
-- Projet : Billard Club Romorantinais
-- ==============================================================================

-- 1. Synchroniser et créer immédiatement les profils manquants
--    (Permet de corriger Celine "gbdos18@gmail.com" et Victor "vicmen.vms@gmail.com")
INSERT INTO public.profiles (id, email, full_name, role, can_manage_stock, is_approved, avatar_url)
SELECT 
    u.id,
    u.email,
    COALESCE(NULLIF(TRIM(im.full_name), ''), split_part(u.email, '@', 1)) AS full_name,
    COALESCE(im.role, 'member') AS role,
    COALESCE(im.can_manage_stock, false) AS can_manage_stock,
    COALESCE(im.is_approved, true) AS is_approved,
    im.avatar_url
FROM auth.users u
LEFT JOIN public.imported_members im ON LOWER(TRIM(im.email)) = LOWER(TRIM(u.email))
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Fonction RPC de synchronisation (appelable par le bouton "Synchroniser" de l'appli)
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, can_manage_stock, is_approved, avatar_url)
  SELECT 
      u.id,
      u.email,
      COALESCE(NULLIF(TRIM(im.full_name), ''), split_part(u.email, '@', 1)),
      COALESCE(im.role, 'member'),
      COALESCE(im.can_manage_stock, false),
      COALESCE(im.is_approved, true),
      im.avatar_url
  FROM auth.users u
  LEFT JOIN public.imported_members im ON LOWER(TRIM(im.email)) = LOWER(TRIM(u.email))
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger automatique à la création de chaque nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    imp_name text;
    imp_role text;
    imp_stock boolean;
    imp_approved boolean;
    imp_avatar text;
BEGIN
    -- Récupérer la pré-configuration de imported_members si présente
    SELECT full_name, role, can_manage_stock, is_approved, avatar_url
    INTO imp_name, imp_role, imp_stock, imp_approved, imp_avatar
    FROM public.imported_members
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(new.email))
    LIMIT 1;

    INSERT INTO public.profiles (id, email, full_name, role, can_manage_stock, is_approved, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(NULLIF(TRIM(imp_name), ''), new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(imp_role, 'member'),
        COALESCE(imp_stock, false),
        COALESCE(imp_approved, true),
        imp_avatar
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        can_manage_stock = COALESCE(EXCLUDED.can_manage_stock, public.profiles.can_manage_stock),
        is_approved = COALESCE(EXCLUDED.is_approved, public.profiles.is_approved),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le déclencheur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Droits RLS pour permettre aux utilisateurs connectés d'insérer / mettre à jour leur propre profil
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;
