import { ImageOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CarrinhoItem({ item, onRemover }) {
  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      {/* Foto */}
      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-slate-100">
        {item.foto_url ? (
          <img src={item.foto_url} alt={item.cor} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm leading-tight truncate">{item.nome_camisa}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.cor} · {item.tamanho} · {item.quantidade}x
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground capitalize bg-slate-100 px-1.5 py-0.5 rounded">
            {item.tipo_preco}
          </span>
          {item.desconto_percentual > 0 && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              -{item.desconto_percentual}%
            </span>
          )}
        </div>
      </div>

      {/* Preço + remover */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="font-semibold text-sm">
          R$ {item.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
        {item.desconto_percentual > 0 && (
          <span className="text-xs text-muted-foreground line-through">
            R$ {(item.preco_unitario * item.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemover(item._key)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
