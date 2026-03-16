-- ================================================
-- CORREÇÃO: RLS recursivo na tabela profiles
-- Execute no Supabase SQL Editor
-- ================================================

-- 1. Remover policies problemáticas
DROP POLICY IF EXISTS "Usuários veem próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admin vê todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Admin atualiza qualquer perfil" ON profiles;
DROP POLICY IF EXISTS "Sistema insere profiles" ON profiles;

-- 2. Policy simples: cada usuário vê/atualiza só o próprio perfil
CREATE POLICY "Usuários leem próprio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuários atualizam próprio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sistema insere profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- 3. Função SECURITY DEFINER para admin buscar TODOS os perfis
--    (ignora RLS, evita recursão)
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM profiles ORDER BY created_at DESC;
$$;

-- 4. Função SECURITY DEFINER para admin atualizar status/role de qualquer usuário
CREATE OR REPLACE FUNCTION update_profile_by_admin(
  target_id uuid,
  new_status text DEFAULT NULL,
  new_role text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem chama é admin (usando o próprio perfil via auth.uid())
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem executar esta ação.';
  END IF;

  UPDATE profiles
  SET
    status = COALESCE(new_status, status),
    role   = COALESCE(new_role, role)
  WHERE id = target_id;
END;
$$;

-- Dar permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_profile_by_admin(uuid, text, text) TO authenticated;
