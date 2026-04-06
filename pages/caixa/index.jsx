import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ModalProduto from "@/components/caixa/ModalProduto";
import CarrinhoItem from "@/components/caixa/CarrinhoItem";
import ResumoVenda from "@/components/caixa/ResumoVenda";
import {
  Search, ShoppingCart, ImageOff, Banknote, Smartphone,
  CreditCard, History, BarChart2, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TIPOS_LABEL = {
  "oversized": "Oversized", "t-shirt": "T-Shirt", "baby-look": "Baby Look",
  "infantil": "Infantil", "regata": "Regata",
};

const FORMAS_PAG = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "pix",      label: "PIX",      icon: Smartphone },
  { value: "debito",   label: "Débito",   icon: CreditCard },
  { value: "credito",  label: "Crédito",  icon: CreditCard },
];

export default function Caixa() {
  const router = useRouter();
  const { user } = useAuth();

  // Produtos
  const [camisas, setCamisas] = useState([]);
  const [loadingCamisas, setLoadingCamisas] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalCamisa, setModalCamisa] = useState(null);

  // Carrinho
  const [carrinho, setCarrinho] = useState([]);

  // Pagamento
  const [formaPag, setFormaPag] = useState("dinheiro");
  const [parcelas, setParcelas] = useState(1);
  const [valorRecebido, setValorRecebido] = useState("");

  // Finalização
  const [salvando, setSalvando] = useState(false);
  const [vendaFinalizada, setVendaFinalizada] = useState(null);
  const [itensFinalizado, setItensFinalizado] = useState([]);
  const [resumoAberto, setResumoAberto] = useState(false);

  const fetchCamisas = useCallback(async () => {
    setLoadingCamisas(true);
    const { data } = await supabase
      .from("camisas")
      .select(`*, camisa_cores(id, cor, foto_url, camisa_estoque(tamanho, quantidade))`)
      .order("nome");
    setCamisas(data || []);
    setLoadingCamisas(false);
  }, []);

  useEffect(() => { fetchCamisas(); }, [fetchCamisas]);

  // Carrinho
  function adicionarAoCarrinho(item) {
    const key = `${item.camisa_cor_id}_${item.tamanho}_${item.tipo_preco}_${item.desconto_percentual}`;
    setCarrinho((prev) => {
      const existente = prev.find((i) => i._key === key);
      if (existente) {
        const novaQtd = existente.quantidade + item.quantidade;
        if (novaQtd > item.estoque_disponivel) {
          toast.error(`Estoque insuficiente. Disponível: ${item.estoque_disponivel}`);
          return prev;
        }
        return prev.map((i) =>
          i._key === key
            ? { ...i, quantidade: novaQtd, subtotal: i.preco_final * novaQtd }
            : i
        );
      }
      return [...prev, { ...item, _key: key }];
    });
    toast.success(`${item.nome_camisa} adicionado!`);
  }

  function removerDoCarrinho(key) {
    setCarrinho((prev) => prev.filter((i) => i._key !== key));
  }

  function limparCarrinho() {
    if (!confirm("Deseja limpar o carrinho?")) return;
    setCarrinho([]);
  }

  // Totais
  const subtotal = carrinho.reduce((s, i) => s + i.subtotal, 0);
  const descontoTotal = carrinho.reduce(
    (s, i) => s + (i.preco_unitario * i.quantidade - i.subtotal), 0
  );
  const total = subtotal;
  const troco = formaPag === "dinheiro" && valorRecebido ? Math.max(0, Number(valorRecebido) - total) : 0;

  // Finalizar venda
  async function finalizarVenda() {
    if (carrinho.length === 0) { toast.error("Carrinho vazio."); return; }
    if (formaPag === "dinheiro" && (!valorRecebido || Number(valorRecebido) < total)) {
      toast.error("Valor recebido insuficiente."); return;
    }

    setSalvando(true);
    try {
      // 1. Inserir venda
      const vendaPayload = {
        forma_pagamento: formaPag,
        parcelas: formaPag === "credito" ? parcelas : 1,
        valor_recebido: formaPag === "dinheiro" ? Number(valorRecebido) : null,
        troco: formaPag === "dinheiro" ? troco : null,
        subtotal,
        desconto_total: descontoTotal,
        total,
        status: "concluida",
        created_by: user.id,
      };

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas").insert(vendaPayload).select().single();
      if (vendaErr) throw vendaErr;

      // 2. Inserir itens
      const itensPayload = carrinho.map((item) => ({
        venda_id: vendaData.id,
        camisa_id: item.camisa_id,
        camisa_cor_id: item.camisa_cor_id,
        nome_camisa: item.nome_camisa,
        referencia: item.referencia,
        cor: item.cor,
        tamanho: item.tamanho,
        quantidade: item.quantidade,
        tipo_preco: item.tipo_preco,
        preco_unitario: item.preco_unitario,
        desconto_percentual: item.desconto_percentual,
        preco_final: item.preco_final,
        subtotal: item.subtotal,
      }));

      const { error: itensErr } = await supabase.from("venda_itens").insert(itensPayload);
      if (itensErr) throw itensErr;

      // 3. Decrementar estoque
      for (const item of carrinho) {
        const { error: estoqueErr } = await supabase.rpc("decrementar_estoque", {
          p_camisa_cor_id: item.camisa_cor_id,
          p_tamanho: item.tamanho,
          p_quantidade: item.quantidade,
        });
        // fallback manual se RPC não existir
        if (estoqueErr) {
          await supabase
            .from("camisa_estoque")
            .update({ quantidade: supabase.raw(`quantidade - ${item.quantidade}`) })
            .eq("camisa_cor_id", item.camisa_cor_id)
            .eq("tamanho", item.tamanho);
        }
      }

      // 4. Abrir resumo
      setVendaFinalizada(vendaData);
      setItensFinalizado(itensPayload);
      setResumoAberto(true);

      // Limpar carrinho e pagamento
      setCarrinho([]);
      setValorRecebido("");
      setParcelas(1);
      setFormaPag("dinheiro");

      // Recarregar estoque
      fetchCamisas();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar venda. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const camisasFiltradas = camisas.filter((c) => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return c.nome.toLowerCase().includes(t) || c.referencia.toLowerCase().includes(t);
  });

  return (
    <AuthGuard>
      <Layout>
        {/* Modais */}
        <ModalProduto
          camisa={modalCamisa}
          open={!!modalCamisa}
          onClose={() => setModalCamisa(null)}
          onAdicionar={adicionarAoCarrinho}
        />
        <ResumoVenda
          venda={vendaFinalizada}
          itens={itensFinalizado}
          open={resumoAberto}
          onClose={() => setResumoAberto(false)}
          onNovaVenda={() => setResumoAberto(false)}
        />

        <div className="flex flex-col lg:flex-row gap-6 h-full">

          {/* ── Painel esquerdo: Produtos ── */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6" /> Caixa
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">Selecione os produtos para adicionar ao carrinho</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/caixa/historico")}>
                  <History className="w-4 h-4 mr-1" /> Histórico
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.push("/caixa/relatorio")}>
                  <BarChart2 className="w-4 h-4 mr-1" /> Relatório
                </Button>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar camisa por nome ou referência..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Grid de produtos */}
            {loadingCamisas ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : camisasFiltradas.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma camisa encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {camisasFiltradas.map((camisa) => {
                  const foto = camisa.camisa_cores?.[0]?.foto_url;
                  const totalEstoque = camisa.camisa_cores?.reduce(
                    (a, c) => a + (c.camisa_estoque?.reduce((s, e) => s + e.quantidade, 0) || 0), 0
                  ) || 0;
                  const semEstoque = totalEstoque === 0;

                  return (
                    <button
                      key={camisa.id}
                      type="button"
                      disabled={semEstoque}
                      onClick={() => setModalCamisa(camisa)}
                      className={cn(
                        "bg-white rounded-xl border text-left overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
                        semEstoque ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
                      )}
                    >
                      <div className="aspect-square bg-slate-100">
                        {foto ? (
                          <img src={foto} alt={camisa.nome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-semibold text-xs leading-tight line-clamp-2">{camisa.nome}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{camisa.referencia}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {TIPOS_LABEL[camisa.tipo]}
                          </Badge>
                          {semEstoque
                            ? <span className="text-[10px] text-destructive font-medium">Sem estoque</span>
                            : <span className="text-[10px] text-muted-foreground">{totalEstoque} un.</span>
                          }
                        </div>
                        <p className="text-xs font-semibold mt-1 text-primary">
                          R$ {Number(camisa.preco_varejo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Painel direito: Carrinho ── */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-border sticky top-20 flex flex-col max-h-[calc(100vh-6rem)]">
              {/* Header carrinho */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Carrinho
                  {carrinho.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {carrinho.length}
                    </span>
                  )}
                </h2>
                {carrinho.length > 0 && (
                  <button onClick={limparCarrinho} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>

              {/* Lista de itens */}
              <div className="flex-1 overflow-y-auto px-4">
                {carrinho.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Carrinho vazio</p>
                    <p className="text-xs mt-1">Clique em uma camisa para adicionar</p>
                  </div>
                ) : (
                  <div>
                    {carrinho.map((item) => (
                      <CarrinhoItem key={item._key} item={item} onRemover={removerDoCarrinho} />
                    ))}
                  </div>
                )}
              </div>

              {/* Rodapé: totais + pagamento + finalizar */}
              {carrinho.length > 0 && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Totais */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {descontoTotal > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Descontos</span>
                        <span>- R$ {descontoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-1">
                      <span>Total</span>
                      <span className="text-primary">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Forma de pagamento */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORMAS_PAG.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { setFormaPag(value); setValorRecebido(""); setParcelas(1); }}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all",
                            formaPag === value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Dinheiro: valor recebido */}
                    {formaPag === "dinheiro" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Valor recebido (R$)</label>
                        <Input
                          type="number"
                          min={total}
                          step="0.01"
                          placeholder={total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          value={valorRecebido}
                          onChange={(e) => setValorRecebido(e.target.value)}
                        />
                        {valorRecebido && Number(valorRecebido) >= total && (
                          <div className="flex justify-between text-sm font-semibold text-green-600 bg-green-50 rounded px-2 py-1">
                            <span>Troco</span>
                            <span>R$ {troco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Crédito: parcelas */}
                    {formaPag === "credito" && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Parcelas</label>
                        <select
                          value={parcelas}
                          onChange={(e) => setParcelas(Number(e.target.value))}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}x de R$ {(total / n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Botão finalizar */}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={salvando || (formaPag === "dinheiro" && (!valorRecebido || Number(valorRecebido) < total))}
                    onClick={finalizarVenda}
                  >
                    {salvando ? "Finalizando..." : `Finalizar Venda · R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
