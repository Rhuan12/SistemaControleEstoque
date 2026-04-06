import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, History, RefreshCw, ChevronDown, ChevronUp,
  Banknote, Smartphone, CreditCard, XCircle, CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const PAGAMENTO_LABEL = {
  dinheiro: { label: "Dinheiro", icon: Banknote, color: "text-green-600" },
  pix:      { label: "PIX",     icon: Smartphone, color: "text-blue-600" },
  debito:   { label: "Débito",  icon: CreditCard, color: "text-purple-600" },
  credito:  { label: "Crédito", icon: CreditCard, color: "text-orange-600" },
};

function VendaRow({ venda, onCancelar }) {
  const [expandido, setExpandido] = useState(false);
  const [itens, setItens] = useState(null);
  const [loadingItens, setLoadingItens] = useState(false);

  const pag = PAGAMENTO_LABEL[venda.forma_pagamento] || { label: venda.forma_pagamento, icon: CreditCard, color: "" };
  const PagIcon = pag.icon;

  async function toggleExpand() {
    if (!expandido && !itens) {
      setLoadingItens(true);
      const { data } = await supabase
        .from("venda_itens")
        .select("*")
        .eq("venda_id", venda.id)
        .order("id");
      setItens(data || []);
      setLoadingItens(false);
    }
    setExpandido((v) => !v);
  }

  return (
    <div className={cn(
      "border border-border rounded-xl overflow-hidden transition-all",
      venda.status === "cancelada" && "opacity-60"
    )}>
      {/* Linha principal */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={toggleExpand}
      >
        {/* Data/hora */}
        <div className="min-w-[110px]">
          <p className="text-sm font-medium">
            {new Date(venda.created_at).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(venda.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Pagamento */}
        <div className={cn("flex items-center gap-1.5 text-sm flex-1", pag.color)}>
          <PagIcon className="w-4 h-4" />
          <span>{pag.label}</span>
          {venda.forma_pagamento === "credito" && venda.parcelas > 1 && (
            <span className="text-xs text-muted-foreground">({venda.parcelas}x)</span>
          )}
        </div>

        {/* Total */}
        <div className="text-right mr-2">
          <p className="font-bold text-sm">
            R$ {Number(venda.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          {Number(venda.desconto_total) > 0 && (
            <p className="text-xs text-green-600">
              -{Number(venda.desconto_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} desc.
            </p>
          )}
        </div>

        {/* Status */}
        <Badge variant={venda.status === "cancelada" ? "destructive" : "success"} className="gap-1 flex-shrink-0">
          {venda.status === "cancelada"
            ? <><XCircle className="w-3 h-3" /> Cancelada</>
            : <><CheckCircle className="w-3 h-3" /> Concluída</>
          }
        </Badge>

        {/* Expand toggle */}
        <button className="text-muted-foreground ml-1">
          {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detalhe expandido */}
      {expandido && (
        <div className="border-t border-border bg-slate-50 p-4 space-y-3">
          {loadingItens ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Itens */}
              <div className="space-y-2">
                {(itens || []).map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.nome_camisa}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.cor} · {item.tamanho} · {item.quantidade}x ·{" "}
                        <span className="capitalize">{item.tipo_preco}</span>
                        {item.desconto_percentual > 0 && ` · -${item.desconto_percentual}%`}
                      </p>
                    </div>
                    <span className="font-semibold ml-4 flex-shrink-0">
                      R$ {Number(item.subtotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totais e troco */}
              <div className="space-y-1 text-sm">
                {Number(venda.desconto_total) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descontos</span>
                    <span>- R$ {Number(venda.desconto_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>R$ {Number(venda.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                {venda.forma_pagamento === "dinheiro" && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Recebido</span>
                      <span>R$ {Number(venda.valor_recebido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Troco</span>
                      <span>R$ {Number(venda.troco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Botão cancelar */}
              {venda.status === "concluida" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                  onClick={() => onCancelar(venda)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Cancelar / Estornar venda
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Historico() {
  const router = useRouter();
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroData, setFiltroData] = useState("hoje");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [confirmCancelar, setConfirmCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const fetchVendas = useCallback(async () => {
    setLoading(true);

    let inicio, fim;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (filtroData === "hoje") {
      inicio = hoje.toISOString();
      fim = new Date(hoje.getTime() + 86400000).toISOString();
    } else if (filtroData === "7dias") {
      inicio = new Date(hoje.getTime() - 6 * 86400000).toISOString();
      fim = new Date(hoje.getTime() + 86400000).toISOString();
    } else if (filtroData === "30dias") {
      inicio = new Date(hoje.getTime() - 29 * 86400000).toISOString();
      fim = new Date(hoje.getTime() + 86400000).toISOString();
    } else if (filtroData === "custom" && dataInicio && dataFim) {
      inicio = new Date(dataInicio).toISOString();
      fim = new Date(new Date(dataFim).getTime() + 86400000).toISOString();
    }

    const query = supabase
      .from("vendas")
      .select("*")
      .order("created_at", { ascending: false });

    if (inicio) query.gte("created_at", inicio);
    if (fim) query.lte("created_at", fim);

    const { data, error } = await query;
    if (error) toast.error("Erro ao carregar vendas.");
    else setVendas(data || []);
    setLoading(false);
  }, [filtroData, dataInicio, dataFim]);

  useEffect(() => { fetchVendas(); }, [fetchVendas]);

  async function handleCancelar(venda) {
    setCancelando(true);
    const { error } = await supabase.rpc("cancelar_venda", { venda_uuid: venda.id });
    if (error) {
      toast.error("Erro ao cancelar venda.");
    } else {
      toast.success("Venda cancelada e estoque restaurado.");
      setConfirmCancelar(null);
      fetchVendas();
    }
    setCancelando(false);
  }

  const totalPeriodo = vendas
    .filter((v) => v.status === "concluida")
    .reduce((s, v) => s + Number(v.total), 0);

  return (
    <AuthGuard>
      <Layout>
        {/* Dialog confirmação cancelamento */}
        <Dialog open={!!confirmCancelar} onOpenChange={() => setConfirmCancelar(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancelar venda?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              O estoque de todos os itens será restaurado. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmCancelar(null)}>
                Não
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={cancelando}
                onClick={() => handleCancelar(confirmCancelar)}
              >
                {cancelando ? "Cancelando..." : "Sim, cancelar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => router.push("/caixa")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="w-6 h-6" /> Histórico de Vendas
              </h1>
            </div>
            <Button variant="outline" size="icon" className="ml-auto" onClick={fetchVendas}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Filtros de data */}
          <div className="flex flex-wrap gap-2 items-center">
            {["hoje", "7dias", "30dias", "custom"].map((f) => (
              <button
                key={f}
                onClick={() => setFiltroData(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                  filtroData === f ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"
                )}
              >
                {{ hoje: "Hoje", "7dias": "7 dias", "30dias": "30 dias", custom: "Personalizado" }[f]}
              </button>
            ))}
            {filtroData === "custom" && (
              <div className="flex gap-2 items-center">
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-36 h-9" />
                <span className="text-muted-foreground text-sm">até</span>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-36 h-9" />
              </div>
            )}
          </div>

          {/* Resumo rápido */}
          {vendas.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Vendas concluídas</p>
                <p className="text-2xl font-bold mt-1">{vendas.filter((v) => v.status === "concluida").length}</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Total arrecadado</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  R$ {totalPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold mt-1 text-destructive">
                  {vendas.filter((v) => v.status === "cancelada").length}
                </p>
              </div>
            </div>
          )}

          {/* Lista de vendas */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : vendas.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma venda encontrada</p>
              <p className="text-sm mt-1">Tente ajustar o período de busca.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendas.map((venda) => (
                <VendaRow
                  key={venda.id}
                  venda={venda}
                  onCancelar={setConfirmCancelar}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
