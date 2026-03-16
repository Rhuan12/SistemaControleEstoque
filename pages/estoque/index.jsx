import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, Package, Edit, Trash2, RefreshCw, ImageOff,
} from "lucide-react";
import toast from "react-hot-toast";

const TIPOS_LABEL = {
  "oversized": "Oversized",
  "t-shirt": "T-Shirt",
  "baby-look": "Baby Look",
  "infantil": "Infantil",
  "regata": "Regata",
};

function CamisaCard({ camisa, onDelete }) {
  const router = useRouter();
  const primeiraFoto = camisa.camisa_cores?.[0]?.foto_url;
  const totalEstoque = camisa.camisa_cores?.reduce((acc, cor) => {
    return acc + (cor.camisa_estoque?.reduce((s, e) => s + (e.quantidade || 0), 0) || 0);
  }, 0) || 0;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Foto */}
      <div className="aspect-square bg-slate-100 relative">
        {primeiraFoto ? (
          <img
            src={primeiraFoto}
            alt={camisa.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ImageOff className="w-8 h-8" />
            <span className="text-xs">Sem foto</span>
          </div>
        )}
        {/* Cores disponíveis */}
        <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end max-w-[80%]">
          {camisa.camisa_cores?.slice(0, 4).map((cor) => (
            <span
              key={cor.id}
              className="bg-white/90 backdrop-blur-sm text-xs px-1.5 py-0.5 rounded-full border border-border text-foreground"
            >
              {cor.cor}
            </span>
          ))}
          {camisa.camisa_cores?.length > 4 && (
            <span className="bg-white/90 backdrop-blur-sm text-xs px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
              +{camisa.camisa_cores.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{camisa.nome}</h3>
            <p className="text-xs text-muted-foreground">Ref: {camisa.referencia}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">{TIPOS_LABEL[camisa.tipo]}</Badge>
            {camisa.estampada && <Badge variant="outline" className="text-xs">Estampada</Badge>}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>Estoque total: <strong className="text-foreground">{totalEstoque} un.</strong></span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Varejo</p>
            <p className="font-semibold text-sm">
              R$ {Number(camisa.preco_varejo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Atacado</p>
            <p className="font-semibold text-sm">
              R$ {Number(camisa.preco_atacado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/estoque/${camisa.id}`)}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(camisa)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Estoque() {
  const router = useRouter();
  const [camisas, setCamisas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstampada, setFiltroEstampada] = useState("todos");

  const fetchCamisas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("camisas")
      .select(`
        *,
        camisa_cores (
          id, cor, foto_url,
          camisa_estoque ( tamanho, quantidade )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar estoque.");
    } else {
      setCamisas(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCamisas();
  }, [fetchCamisas]);

  async function handleDelete(camisa) {
    if (!confirm(`Deseja excluir a camisa "${camisa.nome}"? Esta ação não pode ser desfeita.`)) return;

    // Deletar fotos do storage
    for (const cor of camisa.camisa_cores || []) {
      if (cor.foto_url) {
        const path = cor.foto_url.split("/camisa-fotos/")[1];
        if (path) await supabase.storage.from("camisa-fotos").remove([path]);
      }
    }

    const { error } = await supabase.from("camisas").delete().eq("id", camisa.id);
    if (error) {
      toast.error("Erro ao excluir camisa.");
    } else {
      toast.success("Camisa excluída com sucesso.");
      fetchCamisas();
    }
  }

  const camisasFiltradas = camisas.filter((c) => {
    const termoBusca = busca.toLowerCase();
    const matchBusca =
      !busca ||
      c.nome.toLowerCase().includes(termoBusca) ||
      c.referencia.toLowerCase().includes(termoBusca) ||
      c.camisa_cores?.some((cor) => cor.cor.toLowerCase().includes(termoBusca));

    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
    const matchEstampada =
      filtroEstampada === "todos" ||
      (filtroEstampada === "sim" && c.estampada) ||
      (filtroEstampada === "nao" && !c.estampada);

    return matchBusca && matchTipo && matchEstampada;
  });

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="w-6 h-6" />
                Estoque de Camisas
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {camisas.length} camisa{camisas.length !== 1 ? "s" : ""} cadastrada{camisas.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => router.push("/estoque/novo")}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Camisa
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, referência ou cor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="oversized">Oversized</SelectItem>
                <SelectItem value="t-shirt">T-Shirt</SelectItem>
                <SelectItem value="baby-look">Baby Look</SelectItem>
                <SelectItem value="infantil">Infantil</SelectItem>
                <SelectItem value="regata">Regata</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroEstampada} onValueChange={setFiltroEstampada}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Estampada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="sim">Estampadas</SelectItem>
                <SelectItem value="nao">Sem estampa</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchCamisas} title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Grid de camisas */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : camisasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma camisa encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {busca || filtroTipo !== "todos" || filtroEstampada !== "todos"
                  ? "Tente ajustar os filtros de busca."
                  : "Clique em \"Nova Camisa\" para cadastrar a primeira."}
              </p>
              {!busca && filtroTipo === "todos" && filtroEstampada === "todos" && (
                <Button className="mt-4" onClick={() => router.push("/estoque/novo")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar primeira camisa
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {camisasFiltradas.map((camisa) => (
                <CamisaCard key={camisa.id} camisa={camisa} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
