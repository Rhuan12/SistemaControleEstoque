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
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [tipoPreco, setTipoPreco] = useState("varejo");
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (open && camisa) {
      setCorSelecionada(camisa.camisa_cores?.[0] || null);
      setTamanhoSelecionado(null);
      setQuantidade(1);
      setTipoPreco("varejo");
      setDesconto(0);
    }
  }, [open, camisa]);

  if (!camisa) return null;

  const precoBase = tipoPreco === "varejo" ? Number(camisa.preco_varejo) : Number(camisa.preco_atacado);
  const descontoValor = tipoPreco === "varejo" ? (precoBase * (Number(desconto) || 0)) / 100 : 0;
  const precoFinal = precoBase - descontoValor;
  const subtotal = precoFinal * quantidade;

  const estoqueDoTamanho = tamanhoSelecionado
    ? (corSelecionada?.camisa_estoque?.find((e) => e.tamanho === tamanhoSelecionado)?.quantidade || 0)
    : 0;

  function handleAdicionar() {
    if (!corSelecionada || !tamanhoSelecionado) return;
    onAdicionar({
      camisa_id: camisa.id,
      camisa_cor_id: corSelecionada.id,
      nome_camisa: camisa.nome,
      referencia: camisa.referencia,
      cor: corSelecionada.cor,
      foto_url: corSelecionada.foto_url,
      tamanho: tamanhoSelecionado,
      quantidade,
      tipo_preco: tipoPreco,
      preco_unitario: precoBase,
      desconto_percentual: tipoPreco === "varejo" ? Number(desconto) || 0 : 0,
      preco_final: precoFinal,
      subtotal,
      estoque_disponivel: estoqueDoTamanho,
    });
    onClose();
  }

  const tamanhos = corSelecionada?.camisa_estoque || [];

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
                  onClick={() => { setCorSelecionada(cor); setTamanhoSelecionado(null); setQuantidade(1); }}
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

          {/* Tamanho */}
          {corSelecionada && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tamanho</Label>
              <div className="flex flex-wrap gap-2">
                {tamanhos.map((e) => {
                  const sem = e.quantidade === 0;
                  return (
                    <button
                      key={e.tamanho}
                      type="button"
                      disabled={sem}
                      onClick={() => { setTamanhoSelecionado(e.tamanho); setQuantidade(1); }}
                      className={cn(
                        "w-14 h-10 rounded-lg border text-sm font-medium transition-all relative",
                        sem && "opacity-40 cursor-not-allowed line-through",
                        !sem && tamanhoSelecionado === e.tamanho
                          ? "border-primary bg-primary text-primary-foreground"
                          : !sem && "border-border hover:border-primary/50"
                      )}
                    >
                      {e.tamanho}
                      {!sem && (
                        <span className="absolute -top-1.5 -right-1.5 bg-slate-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {e.quantidade > 99 ? "99+" : e.quantidade}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tipo de preço */}
          {tamanhoSelecionado && (
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
          )}

          {/* Desconto (somente varejo) */}
          {tamanhoSelecionado && tipoPreco === "varejo" && (
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

          {/* Quantidade */}
          {tamanhoSelecionado && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quantidade (máx: {estoqueDoTamanho})
              </Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  min="1"
                  max={estoqueDoTamanho}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.min(estoqueDoTamanho, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center"
                />
                <button
                  type="button"
                  onClick={() => setQuantidade((q) => Math.min(estoqueDoTamanho, q + 1))}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-accent"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Resumo do item */}
          {tamanhoSelecionado && (
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
              {descontoValor > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço final</span>
                  <span>R$ {precoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t border-primary/20">
                <span>Subtotal</span>
                <span className="text-primary">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* Botão */}
          <Button
            className="w-full"
            disabled={!corSelecionada || !tamanhoSelecionado || quantidade < 1}
            onClick={handleAdicionar}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Adicionar ao Carrinho
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
