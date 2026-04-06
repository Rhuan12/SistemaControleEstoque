-- ================================================
-- MÓDULO CAIXA — Tabelas de Vendas
-- Execute no Supabase SQL Editor
-- ================================================


-- ================================================
-- 1. TABELA: vendas
-- ================================================
CREATE TABLE vendas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito')),
  parcelas        integer NOT NULL DEFAULT 1,
  valor_recebido  numeric(10,2),      -- apenas para forma_pagamento = 'dinheiro'
  troco           numeric(10,2),      -- apenas para forma_pagamento = 'dinheiro'
  subtotal        numeric(10,2) NOT NULL,
  desconto_total  numeric(10,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL,
  status          text NOT NULL DEFAULT 'concluida' CHECK (status IN ('concluida', 'cancelada')),
  observacao      text,
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ================================================
-- 2. TABELA: venda_itens
-- ================================================
CREATE TABLE venda_itens (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id             uuid NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  camisa_id            uuid REFERENCES camisas(id) ON DELETE SET NULL,
  camisa_cor_id        uuid REFERENCES camisa_cores(id) ON DELETE SET NULL,
  -- Snapshot do produto no momento da venda
  nome_camisa          text NOT NULL,
  referencia           text NOT NULL,
  cor                  text NOT NULL,
  tamanho              text NOT NULL,
  quantidade           integer NOT NULL CHECK (quantidade > 0),
  tipo_preco           text NOT NULL CHECK (tipo_preco IN ('varejo', 'atacado')),
  preco_unitario       numeric(10,2) NOT NULL,
  desconto_percentual  numeric(5,2) NOT NULL DEFAULT 0,
  preco_final          numeric(10,2) NOT NULL,   -- preco_unitario após desconto
  subtotal             numeric(10,2) NOT NULL    -- preco_final * quantidade
);


-- ================================================
-- 3. RLS — vendas
-- ================================================
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários ativos leem próprias vendas" ON vendas
  FOR SELECT USING (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos inserem vendas" ON vendas
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Usuários ativos atualizam próprias vendas" ON vendas
  FOR UPDATE USING (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active')
  );


-- ================================================
-- 4. RLS — venda_itens
-- ================================================
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários ativos leem itens de suas vendas" ON venda_itens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vendas
      WHERE vendas.id = venda_itens.venda_id
        AND vendas.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários ativos inserem itens" ON venda_itens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM vendas
      WHERE vendas.id = venda_itens.venda_id
        AND vendas.created_by = auth.uid()
    )
  );


-- ================================================
-- 5. RPC: Admin lê todas as vendas (SECURITY DEFINER)
-- ================================================
CREATE OR REPLACE FUNCTION get_all_vendas(
  data_inicio timestamptz DEFAULT NULL,
  data_fim    timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  forma_pagamento text,
  parcelas        integer,
  valor_recebido  numeric,
  troco           numeric,
  subtotal        numeric,
  desconto_total  numeric,
  total           numeric,
  status          text,
  observacao      text,
  created_by      uuid,
  created_at      timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT v.*
  FROM vendas v
  WHERE (data_inicio IS NULL OR v.created_at >= data_inicio)
    AND (data_fim    IS NULL OR v.created_at <= data_fim)
  ORDER BY v.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_vendas(timestamptz, timestamptz) TO authenticated;


-- ================================================
-- 6. RPC: Cancelar venda (restaura estoque)
-- ================================================
CREATE OR REPLACE FUNCTION cancelar_venda(venda_uuid uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Verificar se a venda pertence ao usuário ou se é admin
  IF NOT EXISTS (
    SELECT 1 FROM vendas
    WHERE id = venda_uuid
      AND (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
  ) THEN
    RAISE EXCEPTION 'Venda não encontrada ou sem permissão.';
  END IF;

  -- Verificar se já está cancelada
  IF EXISTS (SELECT 1 FROM vendas WHERE id = venda_uuid AND status = 'cancelada') THEN
    RAISE EXCEPTION 'Esta venda já foi cancelada.';
  END IF;

  -- Restaurar estoque de cada item
  FOR item IN
    SELECT camisa_cor_id, tamanho, quantidade
    FROM venda_itens
    WHERE venda_id = venda_uuid
  LOOP
    UPDATE camisa_estoque
    SET quantidade = quantidade + item.quantidade
    WHERE camisa_cor_id = item.camisa_cor_id
      AND tamanho = item.tamanho;
  END LOOP;

  -- Marcar venda como cancelada
  UPDATE vendas SET status = 'cancelada' WHERE id = venda_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION cancelar_venda(uuid) TO authenticated;


-- ================================================
-- 7. RPC: Decrementar estoque ao finalizar venda
-- ================================================
CREATE OR REPLACE FUNCTION decrementar_estoque(
  p_camisa_cor_id uuid,
  p_tamanho       text,
  p_quantidade    integer
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE camisa_estoque
  SET quantidade = GREATEST(0, quantidade - p_quantidade)
  WHERE camisa_cor_id = p_camisa_cor_id
    AND tamanho = p_tamanho;
END;
$$;

GRANT EXECUTE ON FUNCTION decrementar_estoque(uuid, text, integer) TO authenticated;
