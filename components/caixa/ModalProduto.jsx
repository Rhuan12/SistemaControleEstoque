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

export default function ModalProduto({ camisa, open, onClose, onAdicionar }) {
  const [corSelecionada, setCorSelecionada] = useState(null);
  const [qtdPorTamanho, setQtdPorTamanho] = useState({});
  const [tipoPreco, setTipoPreco] = useState("varejo");
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (open && camisa) {
      const cor = camisa.camisa_cores?.[0] || null;
      setCorSelecionada(cor);
      setQtdPorTamanho({});
      setTipoPreco("varejo");
      setDesconto(0);
    }
  }, [open, camisa]);

  if (!camisa) return null;

  const precoBase = tipoPreco === "varejo" ? Number(camisa.preco_varejo) : Number(camisa.preco_atacado);
  const descontoValor = tipoPreco === "varejo" ? (precoBase * (Number(desconto) || 0)) / 100 : 0;
  const precoFinal = precoBase - descontoValor;

  const tamanhos = corSelecionada?.camisa_estoque || [];

  function setQtd(tamanho, valor, estoqueMax) {
    const v = Math.min(estoqueMax, Math.max(0, parseInt(valor) || 0));
    setQtdPorTamanho((prev) => ({ ...prev, [tamanho]: v }));
  }

  function incrementar(tamanho, estoqueMax) {
    setQtdPorTamanho((prev) => ({
      ...prev,
      [tamanho]: Math.min(estoqueMax, (prev[tamanho] || 0) + 1),
    }));
  }

  function decrementar(tamanho) {
    setQtdPorTamanho((prev) => ({
      ...prev,
      [tamanho]: Math.max(0, (prev[tamanho] || 0) - 1),
    }));
  }

  const itensSelecionados = tamanhos
    .filter((e) => (qtdPorTamanho[e.tamanho] || 0) > 0)
    .map((e) => ({
      camisa_id: camisa.id,
      camisa_cor_id: corSelecionada.id,
      nome_camisa: camisa.nome,
      referencia: camisa.referencia,
      cor: corSelecionada.cor,
      foto_url: corSelecionada.foto_url,
      tamanho: e.tamanho,
      quantidade: qtdPorTamanho[e.tamanho],
      tipo_preco: tipoPreco,
      preco_unitario: precoBase,
      desconto_percentual: tipoPreco === "varejo" ? Number(desconto) || 0 : 0,
      preco_final: precoFinal,
      subtotal: precoFinal * qtdPorTamanho[e.tamanho],
      estoque_disponivel: e.quantidade,
    }));

  const subtotalTotal = itensSelecionados.reduce((s, i) => s + i.subtotal, 0);
  const totalPecas = itensSelecionados.reduce((s, i) => s + i.quantidade, 0);

  function handleAdicionar() {
    if (itensSelecionados.length === 0) return;
    onAdicionar(itensSelecionados);
    onClose();
  }

  function handleCorChange(cor) {
    setCorSelecionada(cor);
    setQtdPorTamanho({});
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
            {corSelecionada?.foto_url ? (
              <img src={corSelecionada.foto_url} alt={camisa.nome}
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

          {/* Cor */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cor</Label>
            <div className="flex flex-wrap gap-2">
              {camisa.camisa_cores?.map((cor) => (
                <button
                  key={cor.id}
                  type="button"
                  onClick={() => handleCorChange(cor)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all",
                    corSelecionada?.id === cor.id
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {cor.foto_url && (
                    <img src={cor.foto_url} alt={cor.cor} className="w-5 h-5 rounded object-cover" />
                  )}
                  {cor.cor}
                </button>
              ))}
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

          {/* Tamanhos com quantidade */}
          {corSelecionada && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tamanhos e Quantidades
              </Label>
              <div className="space-y-2">
                {tamanhos.map((e) => {
                  const sem = e.quantidade === 0;
                  const qty = qtdPorTamanho[e.tamanho] || 0;
                  return (
                    <div
                      key={e.tamanho}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                        sem && "opacity-40",
                        !sem && qty > 0 ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      {/* Tamanho + estoque */}
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <span className={cn(
                          "font-semibold text-sm w-10 text-center",
                          qty > 0 && "text-primary"
                        )}>
                          {e.tamanho}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sem ? "sem estoque" : `${e.quantidade} un.`}
                        </span>
                      </div>

                      {/* Controle de quantidade */}
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          disabled={sem || qty === 0}
                          onClick={() => decrementar(e.tamanho)}
                          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <Input
                          type="number"
                          min="0"
                          max={e.quantidade}
                          value={qty}
                          disabled={sem}
                          onChange={(ev) => setQtd(e.tamanho, ev.target.value, e.quantidade)}
                          className="w-14 h-7 text-center text-sm px-1"
                        />
                        <button
                          type="button"
                          disabled={sem || qty >= e.quantidade}
                          onClick={() => incrementar(e.tamanho, e.quantidade)}
                          className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal da linha */}
                      {qty > 0 && (
                        <span className="text-sm font-semibold text-primary min-w-[80px] text-right">
                          R$ {(precoFinal * qty).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumo */}
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
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{totalPecas} {totalPecas === 1 ? "peça" : "peças"} · {itensSelecionados.length} {itensSelecionados.length === 1 ? "tamanho" : "tamanhos"}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-primary/20">
                <span>Total</span>
                <span className="text-primary">R$ {subtotalTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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
              ? "Selecione ao menos um tamanho"
              : `Adicionar ${totalPecas} ${totalPecas === 1 ? "peça" : "peças"} ao Carrinho`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
