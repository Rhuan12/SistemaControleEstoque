-- ================================================
-- MÓDULO CLIENTES
-- Execute no Supabase SQL Editor
-- ================================================


-- ================================================
-- 1. TABELA: clientes
-- ================================================
CREATE TABLE clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  telefone    text NOT NULL,
  email       text,
  cpf         text,
  endereco    text,
  observacao  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger: atualizar updated_at
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================
-- 2. RLS — clientes
-- ================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários ativos leem clientes" ON clientes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos inserem clientes" ON clientes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos atualizam clientes" ON clientes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos deletam clientes" ON clientes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );


-- ================================================
-- 3. Vincular cliente à venda (opcional)
-- ================================================
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
