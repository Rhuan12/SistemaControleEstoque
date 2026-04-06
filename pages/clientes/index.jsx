import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, Plus, Search, Phone, Mail, MapPin, FileText,
  Edit, Trash2, RefreshCw, User,
} from "lucide-react";
import toast from "react-hot-toast";

function mascaraTelefone(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function ClienteCard({ cliente, onEditar, onDeletar }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-all flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{cliente.nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {mascaraTelefone(cliente.telefone)}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditar(cliente)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDeletar(cliente)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {(cliente.email || cliente.cpf || cliente.endereco || cliente.observacao) && (
        <div className="space-y-1 pt-2 border-t border-border">
          {cliente.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{cliente.email}</span>
            </p>
          )}
          {cliente.cpf && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3 h-3 flex-shrink-0" />
              {cliente.cpf}
            </p>
          )}
          {cliente.endereco && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{cliente.endereco}</span>
            </p>
          )}
          {cliente.observacao && (
            <p className="text-xs text-muted-foreground italic truncate">"{cliente.observacao}"</p>
          )}
        </div>
      )}
    </div>
  );
}

function FormCliente({ inicial, onSalvar, onCancelar, salvando }) {
  const [nome, setNome] = useState(inicial?.nome || "");
  const [telefone, setTelefone] = useState(inicial?.telefone || "");
  const [email, setEmail] = useState(inicial?.email || "");
  const [cpf, setCpf] = useState(inicial?.cpf || "");
  const [endereco, setEndereco] = useState(inicial?.endereco || "");
  const [observacao, setObservacao] = useState(inicial?.observacao || "");

  function handleTelefone(e) {
    setTelefone(e.target.value.replace(/\D/g, "").slice(0, 11));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe o nome do cliente."); return; }
    if (!telefone.trim()) { toast.error("Informe o telefone."); return; }
    onSalvar({ nome: nome.trim(), telefone, email: email || null, cpf: cpf || null, endereco: endereco || null, observacao: observacao || null });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nome *</label>
          <Input placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Telefone *</label>
          <Input
            placeholder="(00) 00000-0000"
            value={mascaraTelefone(telefone)}
            onChange={handleTelefone}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email <span className="text-muted-foreground text-xs">(opcional)</span></label>
          <Input type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">CPF <span className="text-muted-foreground text-xs">(opcional)</span></label>
          <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Endereço <span className="text-muted-foreground text-xs">(opcional)</span></label>
          <Input placeholder="Rua, número, bairro, cidade..." value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Observação <span className="text-muted-foreground text-xs">(opcional)</span></label>
          <Input placeholder="Alguma anotação sobre o cliente..." value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <Button type="button" variant="outline" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : inicial ? "Salvar alterações" : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}

export default function Clientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome");
    if (error) toast.error("Erro ao carregar clientes.");
    else setClientes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  function abrirNovo() {
    setClienteEditando(null);
    setModalAberto(true);
  }

  function abrirEditar(cliente) {
    setClienteEditando(cliente);
    setModalAberto(true);
  }

  async function salvar(dados) {
    setSalvando(true);
    let error;
    if (clienteEditando) {
      ({ error } = await supabase.from("clientes").update(dados).eq("id", clienteEditando.id));
    } else {
      ({ error } = await supabase.from("clientes").insert(dados));
    }
    if (error) {
      toast.error("Erro ao salvar cliente.");
    } else {
      toast.success(clienteEditando ? "Cliente atualizado!" : "Cliente cadastrado!");
      setModalAberto(false);
      fetchClientes();
    }
    setSalvando(false);
  }

  async function deletar(cliente) {
    if (!confirm(`Deseja excluir o cliente "${cliente.nome}"?`)) return;
    const { error } = await supabase.from("clientes").delete().eq("id", cliente.id);
    if (error) toast.error("Erro ao excluir cliente.");
    else { toast.success("Cliente excluído."); fetchClientes(); }
  }

  const filtrados = clientes.filter((c) => {
    if (!busca) return true;
    const t = busca.toLowerCase();
    return (
      c.nome.toLowerCase().includes(t) ||
      c.telefone.includes(busca.replace(/\D/g, "")) ||
      (c.email && c.email.toLowerCase().includes(t))
    );
  });

  return (
    <AuthGuard>
      <Layout>
        {/* Modal cadastro/edição */}
        <Dialog open={modalAberto} onOpenChange={(v) => { if (!v) setModalAberto(false); }}>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {clienteEditando ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <FormCliente
              inicial={clienteEditando}
              onSalvar={salvar}
              onCancelar={() => setModalAberto(false)}
              salvando={salvando}
            />
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" />
                Clientes
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={abrirNovo}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </div>

          {/* Busca */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchClientes} title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
              <h3 className="font-semibold text-lg">
                {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                {busca ? "Tente outro termo de busca." : "Clique em \"Novo Cliente\" para começar."}
              </p>
              {!busca && (
                <Button className="mt-4" onClick={abrirNovo}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar primeiro cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtrados.map((c) => (
                <ClienteCard key={c.id} cliente={c} onEditar={abrirEditar} onDeletar={deletar} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}
