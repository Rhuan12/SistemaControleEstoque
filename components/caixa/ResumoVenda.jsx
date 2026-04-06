import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ShoppingCart, Banknote, CreditCard, Smartphone, Receipt } from "lucide-react";

const PAGAMENTO_LABEL = {
  dinheiro: { label: "Dinheiro", icon: Banknote },
  pix:      { label: "PIX",     icon: Smartphone },
  debito:   { label: "Débito",  icon: CreditCard },
  credito:  { label: "Crédito", icon: CreditCard },
};

export default function ResumoVenda({ venda, itens, open, onClose, onNovaVenda }) {
  if (!venda) return null;

  const pag = PAGAMENTO_LABEL[venda.forma_pagamento] || { label: venda.forma_pagamento, icon: Receipt };
  const PagIcon = pag.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Venda Concluída!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Itens */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itens vendidos</p>
            {itens.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div>
                  <p className="font-medium leading-tight">{item.nome_camisa}</p>
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

          {/* Totais */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {Number(venda.subtotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(venda.desconto_total) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descontos</span>
                <span>- R$ {Number(venda.desconto_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">R$ {Number(venda.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagamento</p>
            <div className="flex items-center gap-2 text-sm">
              <PagIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{pag.label}</span>
              {venda.forma_pagamento === "credito" && venda.parcelas > 1 && (
                <span className="text-muted-foreground">· {venda.parcelas}x</span>
              )}
            </div>
            {venda.forma_pagamento === "dinheiro" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor recebido</span>
                  <span>R$ {Number(venda.valor_recebido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>Troco</span>
                  <span>R$ {Number(venda.troco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Button className="flex-1" onClick={onNovaVenda}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
