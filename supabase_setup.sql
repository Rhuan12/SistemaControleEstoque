-- ================================================
-- SISTEMA DE CONTROLE DE ESTOQUE DE CAMISAS
-- UnnoHits - Setup do Banco de Dados Supabase
-- ================================================
-- Execute este SQL no Supabase SQL Editor


-- ================================================
-- 1. TABELA: profiles
-- ================================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'active' | 'rejected'
  role text NOT NULL DEFAULT 'user',        -- 'user' | 'admin'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger: criar profile automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, status, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'pending',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================
-- 2. TABELA: camisas
-- ================================================
CREATE TABLE camisas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  referencia text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('oversized', 't-shirt', 'baby-look', 'infantil', 'regata')),
  estampada boolean NOT NULL DEFAULT false,
  preco_varejo numeric(10,2) NOT NULL,
  preco_atacado numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger: atualizar updated_at ao editar camisa
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER camisas_updated_at
  BEFORE UPDATE ON camisas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================
-- 3. TABELA: camisa_cores
-- ================================================
CREATE TABLE camisa_cores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camisa_id uuid NOT NULL REFERENCES camisas(id) ON DELETE CASCADE,
  cor text NOT NULL,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ================================================
-- 4. TABELA: camisa_estoque
-- ================================================
CREATE TABLE camisa_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camisa_cor_id uuid NOT NULL REFERENCES camisa_cores(id) ON DELETE CASCADE,
  tamanho text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  UNIQUE(camisa_cor_id, tamanho)
);


-- ================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE camisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE camisa_cores ENABLE ROW LEVEL SECURITY;
ALTER TABLE camisa_estoque ENABLE ROW LEVEL SECURITY;

-- PROFILES: usuário vê/edita só o próprio; admin vê todos
CREATE POLICY "Usuários veem próprio perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin vê todos os perfis" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin atualiza qualquer perfil" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Sistema insere profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- CAMISAS: apenas usuários ativos podem ler e escrever
CREATE POLICY "Usuários ativos leem camisas" ON camisas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos inserem camisas" ON camisas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos atualizam camisas" ON camisas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos deletam camisas" ON camisas
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

-- CAMISA_CORES: mesmas regras
CREATE POLICY "Usuários ativos leem cores" ON camisa_cores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos inserem cores" ON camisa_cores
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos atualizam cores" ON camisa_cores
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos deletam cores" ON camisa_cores
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

-- CAMISA_ESTOQUE: mesmas regras
CREATE POLICY "Usuários ativos leem estoque" ON camisa_estoque
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos inserem estoque" ON camisa_estoque
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos atualizam estoque" ON camisa_estoque
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos deletam estoque" ON camisa_estoque
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );


-- ================================================
-- 6. STORAGE: bucket camisa-fotos
-- ================================================
-- Execute no Supabase Dashboard > Storage > New Bucket
-- Nome: camisa-fotos
-- Public: SIM (para leitura pública das imagens)

-- Ou via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('camisa-fotos', 'camisa-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: usuários ativos podem fazer upload
CREATE POLICY "Usuários ativos fazem upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'camisa-fotos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

-- Policy: leitura pública das fotos
CREATE POLICY "Fotos são públicas" ON storage.objects
  FOR SELECT USING (bucket_id = 'camisa-fotos');

-- Policy: usuários ativos podem deletar fotos
CREATE POLICY "Usuários ativos deletam fotos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'camisa-fotos' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );


-- ================================================
-- 7. PROMOVER PRIMEIRO USUÁRIO COMO ADMIN
-- ================================================
-- Após criar o primeiro usuário via cadastro, execute:
-- UPDATE profiles SET status = 'active', role = 'admin' WHERE email = 'seu@email.com';
