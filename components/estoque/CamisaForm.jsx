import { useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Upload, X, ImageOff, Save, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const TAMANHOS_ADULTO = ["PP", "P", "M", "G", "GG", "XG"];
const TAMANHOS_INFANTIL = ["2", "4", "6", "8", "10", "12", "14", "16"];

function getTamanhos(tipo) {
  return tipo === "infantil" ? TAMANHOS_INFANTIL : TAMANHOS_ADULTO;
}

function criarEstoqueVazio(tipo) {
  return getTamanhos(tipo).reduce((acc, tam) => ({ ...acc, [tam]: 0 }), {});
}

function CorItem({ cor, index, tipo, onChange, onRemove }) {
  const fileInputRef = useRef(null);
  const tamanhos = getTamanhos(tipo);

  function handleQuantidade(tamanho, valor) {
    const num = Math.max(0, parseInt(valor) || 0);
    onChange(index, { estoque: { ...cor.estoque, [tamanho]: num } });
  }

  function handleCorNome(e) {
    onChange(index, { cor: e.target.value });
  }

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg"];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou JPEG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB.");
      return;
    }

    // Preview local
    const previewUrl = URL.createObjectURL(file);
    onChange(index, { fotoFile: file, fotoPreview: previewUrl });
  }

  function handleRemoveFoto() {
    onChange(index, { fotoFile: null, fotoPreview: null, foto_url: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const fotoAtual = cor.fotoPreview || cor.foto_url;

  return (
    <div className="border border-border rounded-xl p-4 bg-slate-50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Cor #{index + 1}</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onRemove(index)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nome da cor */}
        <div className="space-y-1.5">
          <Label className="text-xs">Nome da cor *</Label>
          <Input
            placeholder="Ex: Azul Royal, Preto..."
            value={cor.cor}
            onChange={handleCorNome}
            required
          />
        </div>

        {/* Upload de foto */}
        <div className="space-y-1.5">
          <Label className="text-xs">Foto desta cor</Label>
          <div className="flex gap-2">
            {fotoAtual ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img src={fotoAtual} alt={cor.cor} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveFoto}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg border border-dashed border-border bg-white flex items-center justify-center flex-shrink-0">
                <ImageOff className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                className="hidden"
                onChange={handleFotoChange}
                id={`foto-${index}`}
              />
              <label htmlFor={`foto-${index}`}>
                <Button type="button" variant="outline" size="sm" className="w-full cursor-pointer" asChild>
                  <span>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {fotoAtual ? "Trocar foto" : "Enviar foto"}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG até 5MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estoque por tamanho */}
      <div>
        <Label className="text-xs mb-2 block">Estoque por tamanho</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {tamanhos.map((tam) => (
            <div key={tam} className="text-center">
              <div className="text-xs font-medium text-muted-foreground mb-1">{tam}</div>
              <Input
                type="number"
                min="0"
                value={cor.estoque[tam] ?? 0}
                onChange={(e) => handleQuantidade(tam, e.target.value)}
                className="text-center text-sm h-8 px-1"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CamisaForm({ initialData = null }) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [nome, setNome] = useState(initialData?.nome || "");
  const [referencia, setReferencia] = useState(initialData?.referencia || "");
  const [tipo, setTipo] = useState(initialData?.tipo || "");
  const [estampada, setEstampada] = useState(initialData?.estampada || false);
  const [precoVarejo, setPrecoVarejo] = useState(initialData?.preco_varejo?.toString() || "");
  const [precoAtacado, setPrecoAtacado] = useState(initialData?.preco_atacado?.toString() || "");
  const [cores, setCores] = useState(() => {
    if (initialData?.camisa_cores) {
      return initialData.camisa_cores.map((c) => ({
        id: c.id,
        cor: c.cor,
        foto_url: c.foto_url,
        fotoFile: null,
        fotoPreview: null,
        estoque: c.camisa_estoque?.reduce(
          (acc, e) => ({ ...acc, [e.tamanho]: e.quantidade }),
          {}
        ) || criarEstoqueVazio(initialData.tipo),
      }));
    }
    return [];
  });

  const [saving, setSaving] = useState(false);

  function adicionarCor() {
    setCores((prev) => [
      ...prev,
      { cor: "", foto_url: null, fotoFile: null, fotoPreview: null, estoque: criarEstoqueVazio(tipo || "t-shirt") },
    ]);
  }

  function atualizarCor(index, changes) {
    setCores((prev) => prev.map((c, i) => (i === index ? { ...c, ...changes } : c)));
  }

  function removerCor(index) {
    setCores((prev) => prev.filter((_, i) => i !== index));
  }

  // Quando muda tipo, resetar estoque de todas as cores
  function handleTipoChange(novoTipo) {
    setTipo(novoTipo);
    setCores((prev) =>
      prev.map((c) => ({ ...c, estoque: criarEstoqueVazio(novoTipo) }))
    );
  }

  async function uploadFoto(file, camisaId, corNome) {
    const ext = file.name.split(".").pop();
    const fileName = `${camisaId}/${corNome.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("camisa-fotos")
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("camisa-fotos").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!nome.trim()) { toast.error("Informe o nome da camisa."); return; }
    if (!referencia.trim()) { toast.error("Informe a referência."); return; }
    if (!tipo) { toast.error("Selecione o tipo da camisa."); return; }
    if (!precoVarejo || isNaN(Number(precoVarejo))) { toast.error("Informe o preço de varejo."); return; }
    if (!precoAtacado || isNaN(Number(precoAtacado))) { toast.error("Informe o preço de atacado."); return; }
    if (cores.length === 0) { toast.error("Adicione pelo menos uma cor."); return; }
    if (cores.some((c) => !c.cor.trim())) { toast.error("Informe o nome de todas as cores."); return; }

    setSaving(true);

    try {
      let camisaId;

      if (isEditing) {
        // Atualizar camisa
        const { error } = await supabase
          .from("camisas")
          .update({ nome, referencia, tipo, estampada, preco_varejo: Number(precoVarejo), preco_atacado: Number(precoAtacado) })
          .eq("id", initialData.id);
        if (error) throw error;
        camisaId = initialData.id;

        // Deletar cores removidas
        const coresIds = cores.filter((c) => c.id).map((c) => c.id);
        const coresOriginais = initialData.camisa_cores?.map((c) => c.id) || [];
        const coresParaDeletar = coresOriginais.filter((id) => !coresIds.includes(id));
        if (coresParaDeletar.length > 0) {
          await supabase.from("camisa_cores").delete().in("id", coresParaDeletar);
        }
      } else {
        // Inserir nova camisa
        const { data, error } = await supabase
          .from("camisas")
          .insert({ nome, referencia, tipo, estampada, preco_varejo: Number(precoVarejo), preco_atacado: Number(precoAtacado) })
          .select()
          .single();
        if (error) throw error;
        camisaId = data.id;
      }

      // Processar cada cor
      for (const cor of cores) {
        let fotoUrl = cor.foto_url;

        // Upload de nova foto se necessário
        if (cor.fotoFile) {
          fotoUrl = await uploadFoto(cor.fotoFile, camisaId, cor.cor);
        }

        let corId = cor.id;

        if (cor.id) {
          // Atualizar cor existente
          const { error } = await supabase
            .from("camisa_cores")
            .update({ cor: cor.cor, foto_url: fotoUrl })
            .eq("id", cor.id);
          if (error) throw error;
        } else {
          // Inserir nova cor
          const { data, error } = await supabase
            .from("camisa_cores")
            .insert({ camisa_id: camisaId, cor: cor.cor, foto_url: fotoUrl })
            .select()
            .single();
          if (error) throw error;
          corId = data.id;
        }

        // Upsert do estoque
        const tamanhos = getTamanhos(tipo);
        const estoqueRows = tamanhos.map((tam) => ({
          camisa_cor_id: corId,
          tamanho: tam,
          quantidade: cor.estoque[tam] ?? 0,
        }));

        const { error: estoqueError } = await supabase
          .from("camisa_estoque")
          .upsert(estoqueRows, { onConflict: "camisa_cor_id,tamanho" });
        if (estoqueError) throw estoqueError;
      }

      toast.success(isEditing ? "Camisa atualizada com sucesso!" : "Camisa cadastrada com sucesso!");
      router.push("/estoque");
    } catch (err) {
      console.error(err);
      if (err?.code === "23505") {
        toast.error("Já existe uma camisa com essa referência.");
      } else {
        toast.error("Erro ao salvar camisa. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Navegação */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Camisa" : "Nova Camisa"}
        </h1>
      </div>

      {/* Seção 1: Dados da camisa */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg">Dados da Camisa</h2>
        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da camisa *</Label>
            <Input
              id="nome"
              placeholder="Ex: Camisa Básica Premium"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="referencia">Referência *</Label>
            <Input
              id="referencia"
              placeholder="Ex: CAM-001"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo da camisa *</Label>
            <Select value={tipo} onValueChange={handleTipoChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oversized">Oversized</SelectItem>
                <SelectItem value="t-shirt">T-Shirt</SelectItem>
                <SelectItem value="baby-look">Baby Look</SelectItem>
                <SelectItem value="infantil">Infantil</SelectItem>
                <SelectItem value="regata">Regata</SelectItem>
              </SelectContent>
            </Select>
            {tipo && (
              <p className="text-xs text-muted-foreground">
                Tamanhos: {getTamanhos(tipo).join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precoVarejo">Preço Varejo (R$) *</Label>
            <Input
              id="precoVarejo"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={precoVarejo}
              onChange={(e) => setPrecoVarejo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precoAtacado">Preço Atacado (R$) *</Label>
            <Input
              id="precoAtacado"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={precoAtacado}
              onChange={(e) => setPrecoAtacado(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="estampada"
            checked={estampada}
            onCheckedChange={setEstampada}
          />
          <Label htmlFor="estampada" className="cursor-pointer">
            Camisa estampada
          </Label>
        </div>
      </div>

      {/* Seção 2: Cores e Estoque */}
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Cores e Estoque</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={adicionarCor}
            disabled={!tipo}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Cor
          </Button>
        </div>
        <Separator />

        {!tipo && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Selecione o tipo da camisa antes de adicionar cores.
          </p>
        )}

        {tipo && cores.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">Nenhuma cor cadastrada.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={adicionarCor}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar primeira cor
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {cores.map((cor, index) => (
            <CorItem
              key={index}
              cor={cor}
              index={index}
              tipo={tipo}
              onChange={atualizarCor}
              onRemove={removerCor}
            />
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar camisa"}
        </Button>
      </div>
    </form>
  );
}
