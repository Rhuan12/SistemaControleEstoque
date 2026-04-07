import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageOff, ShoppingCart, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TIPOS_LABEL = {
  "oversized": "Oversized", "t-shirt": "T-Shirt", "baby-look": "Baby Look",
  "infantil": "Infantil", "regata": "Regata",
};

const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "2", "4", "6", "8", "10", "12", "14", "16"];

function sortEstoque(estoque) {
  return [...(estoque || [])].sort(
    (a, b) => ORDEM_TAMANHOS.indexOf(a.tamanho) - ORDEM_TAMANHOS.indexOf(b.tamanho)
  );
}

export default function ModalProduto({ camisa, open, onClose, onAdicionar }) {
  // qtds[corId][tamanho] = quantidade
  const [qtds, setQtds] = useState({});
  const [tipoPreco, setTipoPreco] = useState("varejo");
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (open && camisa) {
      setQtds({});
      setTipoPreco("varejo");
      setDesconto(0);
    }
  }, [open, camisa]);

  if (!camisa) return null;

  const precoBase = tipoPreco === "varejo" ? Number(camisa.preco_varejo) : Number(camisa.preco_atacado);
  const descontoValor = tipoPreco === "varejo" ? (precoBase * (Number(desconto) || 0)) / 100 : 0;
  const precoFinal = precoBase - descontoValor;

  function getQtd(corId, tamanho) {
    return qtds[corId]?.[tamanho] || 0;
  }

  function setQtd(corId, tamanho, valor, estoqueMax) {
    const v = Math.min(estoqueMax, Math.max(0, parseInt(valor) || 0));
    setQtds((prev) => ({
      ...prev,
      [corId]: { ...(prev[corId] || {}), [tamanho]: v },
    }));
  }

  function incrementar(corId, tamanho, estoqueMax) {
    setQtds((prev) => ({
      ...prev,
      [corId]: {
        ...(prev[corId] || {}),
        [tamanho]: Math.min(estoqueMax, (prev[corId]?.[tamanho] || 0) + 1),
      },
    }));
  }

  function decrementar(corId, tamanho) {
    setQtds((prev) => ({
      ...prev,
      [corId]: {
        ...(prev[corId] || {}),
        [tamanho]: Math.max(0, (prev[corId]?.[tamanho] || 0) - 1),
      },
    }));
  }

  // Gerar lista de itens selecionados (qty > 0) de todas as cores
  const itensSelecionados = (camisa.camisa_cores || []).flatMap((cor) =>
    sortEstoque(cor.camisa_estoque)
      .filter((e) => getQtd(cor.id, e.tamanho) > 0)
      .map((e) => ({
        camisa_id: camisa.id,
        camisa_cor_id: cor.id,
        nome_camisa: camisa.nome,
        referencia: camisa.referencia,
        cor: cor.cor,
        foto_url: cor.foto_url,
        tamanho: e.tamanho,
        quantidade: getQtd(cor.id, e.tamanho),
        tipo_preco: tipoPreco,
        preco_unitario: precoBase,
        desconto_percentual: tipoPreco === "varejo" ? Number(desconto) || 0 : 0,
        preco_final: precoFinal,
        subtotal: precoFinal * getQtd(cor.id, e.tamanho),
        estoque_disponivel: e.quantidade,
      }))
  );

  const totalPecas = itensSelecionados.reduce((s, i) => s + i.quantidade, 0);
  const subtotalTotal = itensSelecionados.reduce((s, i) => s + i.subtotal, 0);

  function handleAdicionar() {
    if (itensSelecionados.length === 0) return;
    onAdicionar(itensSelecionados);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Adicionar ao Carrinho
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Info do produto */}
          <div className="flex gap-3 p-3 bg-slate-50 rounded-lg">
            {camisa.camisa_cores?.[0]?.foto_url ? (
              <img src={camisa.camisa_cores[0].foto_url} alt={camisa.nome}
                className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <ImageOff className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">{camisa.nome}</p>
              <p className="text-xs text-muted-foreground">Ref: {camisa.referencia}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">{TIPOS_LABEL[camisa.tipo]}</Badge>
                {camisa.estampada && <Badge variant="outline" className="text-xs">Estampada</Badge>}
              </div>
            </div>
          </div>

          {/* Tipo de preço */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de Preço</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setTipoPreco("varejo"); setDesconto(0); }}
                className={cn(
                  "p-3 rounded-lg border text-sm transition-all text-left",
                  tipoPreco === "varejo" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <p className={cn("font-semibold", tipoPreco === "varejo" && "text-primary")}>Varejo</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  R$ {Number(camisa.preco_varejo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </button>
              <button
                type="button"
                onClick={() => { setTipoPreco("atacado"); setDesconto(0); }}
                className={cn(
                  "p-3 rounded-lg border text-sm transition-all text-left",
                  tipoPreco === "atacado" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <p className={cn("font-semibold", tipoPreco === "atacado" && "text-primary")}>Atacado</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  R$ {Number(camisa.preco_atacado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </button>
            </div>
          </div>

          {/* Desconto (somente varejo) */}
          {tipoPreco === "varejo" && (
            <div className="space-y-1.5">
              <Label htmlFor="desconto" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Desconto (%) — opcional
              </Label>
              <Input
                id="desconto"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="0"
                value={desconto}
                onChange={(e) => setDesconto(Math.min(100, Math.max(0, e.target.value)))}
                className="w-32"
              />
            </div>
          )}

          {/* Cores com tamanhos e quantidades */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cores · Tamanhos · Quantidades
            </Label>

            {(camisa.camisa_cores || []).map((cor) => {
              const qtdCor = Object.values(qtds[cor.id] || {}).reduce((s, q) => s + q, 0);
              return (
                <div
                  key={cor.id}
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all",
                    qtdCor > 0 ? "border-primary/40" : "border-border"
                  )}
                >
                  {/* Header da cor */}
                  <div className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm font-medium",
                    qtdCor > 0 ? "bg-primary/5" : "bg-slate-50"
                  )}>
                    {cor.foto_url ? (
                      <img src={cor.foto_url} alt={cor.cor}
                        className="w-8 h-8 rounded-md object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <ImageOff className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className={cn(qtdCor > 0 && "text-primary font-semibold")}>{cor.cor}</span>
                    {qtdCor > 0 && (
                      <Badge variant="default" className="ml-auto text-xs h-5 px-1.5">
                        {qtdCor} {qtdCor === 1 ? "peça" : "peças"}
                      </Badge>
                    )}
                  </div>

                  {/* Grid de tamanhos */}
                  <div className="p-2 space-y-1.5">
                    {sortEstoque(cor.camisa_estoque).map((e) => {
                      const sem = e.quantidade === 0;
                      const qty = getQtd(cor.id, e.tamanho);
                      return (
                        <div
                          key={e.tamanho}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all",
                            sem && "opacity-40",
                            !sem && qty > 0 ? "bg-primary/5" : ""
                          )}
                        >
                          {/* Tamanho + estoque */}
                          <span className={cn(
                            "font-semibold text-sm w-9 flex-shrink-0",
                            qty > 0 && "text-primary"
                          )}>
                            {e.tamanho}
                          </span>
                          <span className="text-xs text-muted-foreground w-16 flex-shrink-0">
                            {sem ? "sem estoque" : `${e.quantidade} un.`}
                          </span>

                          {/* Controles */}
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              disabled={sem || qty === 0}
                              onClick={() => decrementar(cor.id, e.tamanho)}
                              className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <Input
                              type="number"
                              min="0"
                              max={e.quantidade}
                              value={qty}
                              disabled={sem}
                              onChange={(ev) => setQtd(cor.id, e.tamanho, ev.target.value, e.quantidade)}
                              className="w-12 h-6 text-center text-sm px-1"
                            />
                            <button
                              type="button"
                              disabled={sem || qty >= e.quantidade}
                              onClick={() => incrementar(cor.id, e.tamanho, e.quantidade)}
                              className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Subtotal da linha */}
                          <span className={cn(
                            "text-xs font-semibold text-right w-20 flex-shrink-0",
                            qty > 0 ? "text-primary" : "text-transparent"
                          )}>
                            R$ {(precoFinal * qty).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo total */}
          {itensSelecionados.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Preço unitário</span>
                <span>R$ {precoBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              {descontoValor > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto ({desconto}%)</span>
                  <span>- R$ {descontoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {totalPecas} {totalPecas === 1 ? "peça" : "peças"} ·{" "}
                  {itensSelecionados.length} {itensSelecionados.length === 1 ? "combinação" : "combinações"}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-primary/20">
                <span>Total</span>
                <span className="text-primary">
                  R$ {subtotalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Botão */}
          <Button
            className="w-full"
            disabled={itensSelecionados.length === 0}
            onClick={handleAdicionar}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {itensSelecionados.length === 0
              ? "Informe as quantidades desejadas"
              : `Adicionar ${totalPecas} ${totalPecas === 1 ? "peça" : "peças"} ao Carrinho`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
