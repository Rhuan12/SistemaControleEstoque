import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, BarChart2, TrendingUp, ShoppingCart, Package, DollarSign, RefreshCw,
  Banknote, Smartphone, CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";

const PAGAMENTO_CONFIG = {
  dinheiro: { label: "Dinheiro", icon: Banknote,    color: "bg-green-500" },
  pix:      { label: "PIX",     icon: Smartphone,  color: "bg-blue-500" },
  debito:   { label: "Débito",  icon: CreditCard,  color: "bg-purple-500" },
  credito:  { label: "Crédito", icon: CreditCard,  color: "bg-orange-500" },
};

function StatCard({ icon: Icon, label, value, sub, color = "text-foreground" }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function Relatorio() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [data, setData] = useState(today);
  const [vendas, setVendas] = useState([]);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = useCallback(async () => {
    setLoading(true);
    const inicio = new Date(data);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(data);
    fim.setHours(23, 59, 59, 999);

    const [vendasRes, itensRes] = await Promise.all([
      supabase
        .from("vendas")
        .select("*")
        .gte("created_at", inicio.toISOString())
        .lte("created_at", fim.toISOString())
        .order("created_at"),
      supabase
        .from("venda_itens")
        .select("*, vendas!inner(created_at, status)")
        .gte("vendas.created_at", inicio.toISOString())
        .lte("vendas.created_at", fim.toISOString()),
    ]);

    if (vendasRes.error) toast.error("Erro ao carregar relatório.");
    setVendas(vendasRes.data || []);
    setItens(itensRes.data || []);
    setLoading(false);
  }, [data]);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  const vendasConcluidas = vendas.filter((v) => v.status === "concluida");
  const totalArrecadado = vendasConcluidas.reduce((s, v) => s + Number(v.total), 0);
  const totalDescontos = vendasConcluidas.reduce((s, v) => s + Number(v.desconto_total), 0);
  const totalPecas = itens
    .filter((i) => i.vendas?.status === "concluida")
    .reduce((s, i) => s + i.quantidade, 0);
  const ticketMedio = vendasConcluidas.length > 0 ? totalArrecadado / vendasConcluidas.length : 0;

  // Agrupamento por forma de pagamento
  const porPagamento = Object.entries(PAGAMENTO_CONFIG).map(([key, cfg]) => {
    const grupo = vendasConcluidas.filter((v) => v.forma_pagamento === key);
    return {
      ...cfg,
      key,
      count: grupo.length,
      total: grupo.reduce((s, v) => s + Number(v.total), 0),
    };
  }).filter((g) => g.count > 0);

  // Vendas por hora (gráfico de barras CSS)
  const porHora = Array.from({ length: 24 }, (_, h) => ({
    hora: h,
    total: vendasConcluidas
      .filter((v) => new Date(v.created_at).getHours() === h)
      .reduce((s, v) => s + Number(v.total), 0),
  })).filter((h) => h.total > 0);

  const maxHora = Math.max(...porHora.map((h) => h.total), 1);

  // Top produtos
  const topProdutos = Object.values(
    itens
      .filter((i) => i.vendas?.status === "concluida")
      .reduce((acc, item) => {
        const key = `${item.nome_camisa}|${item.cor}|${item.tamanho}`;
        if (!acc[key]) acc[key] = { nome: item.nome_camisa, cor: item.cor, tamanho: item.tamanho, quantidade: 0, total: 0 };
        acc[key].quantidade += item.quantidade;
        acc[key].total += Number(item.subtotal);
        return acc;
      }, {})
  ).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => router.push("/caixa")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart2 className="w-6 h-6" /> Relatório de Vendas
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input
                type="date"
                value={data}
                max={today}
                onChange={(e) => setData(e.target.value)}
                className="w-40 h-9"
              />
              <Button variant="outline" size="icon" onClick={fetchDados}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Cards de resumo */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={DollarSign}
                  label="Total Arrecadado"
                  value={`R$ ${totalArrecadado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  sub={totalDescontos > 0 ? `${totalDescontos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em descontos` : undefined}
                  color="text-primary"
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Vendas Concluídas"
                  value={vendasConcluidas.length}
                  sub={vendas.filter((v) => v.status === "cancelada").length > 0
                    ? `${vendas.filter((v) => v.status === "cancelada").length} cancelada(s)`
                    : undefined}
                />
                <StatCard
                  icon={Package}
                  label="Peças Vendidas"
                  value={totalPecas}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Ticket Médio"
                  value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
              </div>

              {vendasConcluidas.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-white rounded-xl border border-border">
                  <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma venda concluída neste dia</p>
                  <p className="text-sm mt-1">
                    {data === today ? "As vendas de hoje aparecerão aqui." : "Selecione outra data para ver os dados."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Por forma de pagamento */}
                  <div className="bg-white rounded-xl border border-border p-5">
                    <h2 className="font-semibold mb-4">Por Forma de Pagamento</h2>
                    <div className="space-y-3">
                      {porPagamento.map((p) => {
                        const pct = totalArrecadado > 0 ? (p.total / totalArrecadado) * 100 : 0;
                        const Icon = p.icon;
                        return (
                          <div key={p.key}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span>{p.label}</span>
                                <span className="text-muted-foreground text-xs">({p.count} venda{p.count !== 1 ? "s" : ""})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
                                <span className="font-semibold">
                                  R$ {p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${p.color} transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vendas por hora */}
                  {porHora.length > 0 && (
                    <div className="bg-white rounded-xl border border-border p-5">
                      <h2 className="font-semibold mb-4">Vendas por Horário</h2>
                      <div className="flex items-end gap-1.5 h-32">
                        {porHora.map((h) => (
                          <div key={h.hora} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-primary/80 rounded-sm transition-all"
                              style={{ height: `${(h.total / maxHora) * 100}%`, minHeight: "4px" }}
                              title={`R$ ${h.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                            />
                            <span className="text-[10px] text-muted-foreground">{String(h.hora).padStart(2, "0")}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top produtos */}
                  {topProdutos.length > 0 && (
                    <div className="bg-white rounded-xl border border-border p-5">
                      <h2 className="font-semibold mb-4">Produtos Mais Vendidos</h2>
                      <div className="space-y-2">
                        {topProdutos.map((p, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium">{p.nome}</p>
                                <p className="text-xs text-muted-foreground">{p.cor} · {p.tamanho}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{p.quantidade} un.</p>
                              <p className="text-xs text-muted-foreground">
                                R$ {p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
