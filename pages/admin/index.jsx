import { useState, useEffect, useCallback } from "react";
import AdminGuard from "@/components/AdminGuard";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle, XCircle, Clock, Users, ShieldCheck, UserCheck, UserX, RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending: { label: "Pendente", variant: "warning", icon: Clock },
  active: { label: "Ativo", variant: "success", icon: UserCheck },
  rejected: { label: "Recusado", variant: "destructive", icon: UserX },
};

function UserRow({ user, onAction }) {
  const status = STATUS_CONFIG[user.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {user.nome?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{user.nome}</p>
            {user.role === "admin" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <Badge variant={status.variant} className="gap-1">
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>

        {user.status === "pending" && (
          <>
            <Button
              size="sm"
              onClick={() => onAction(user.id, "active")}
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Aceitar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(user.id, "rejected")}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Recusar
            </Button>
          </>
        )}

        {user.status === "active" && user.role !== "admin" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(user.id, "rejected")}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserX className="w-3.5 h-3.5 mr-1" />
              Desativar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(user.id, "active", "admin")}
              className="h-8"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Tornar Admin
            </Button>
          </>
        )}

        {user.status === "rejected" && (
          <Button
            size="sm"
            onClick={() => onAction(user.id, "active")}
            className="h-8"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Reativar
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    // Usa RPC com SECURITY DEFINER para evitar recursão no RLS
    const { data, error } = await supabase.rpc("get_all_profiles");

    if (error) {
      toast.error("Erro ao carregar usuários.");
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function handleAction(userId, newStatus, newRole) {
    // Usa RPC com SECURITY DEFINER para evitar restrição de RLS no update
    const { error } = await supabase.rpc("update_profile_by_admin", {
      target_id: userId,
      new_status: newStatus,
      new_role: newRole || null,
    });

    if (error) {
      toast.error("Erro ao atualizar usuário.");
    } else {
      const mensagens = {
        active: newRole === "admin" ? "Usuário promovido a admin!" : "Cadastro aprovado!",
        rejected: "Usuário desativado.",
      };
      toast.success(mensagens[newStatus] || "Atualizado com sucesso.");
      fetchProfiles();
    }
  }

  const pendentes = profiles.filter((p) => p.status === "pending");
  const ativos = profiles.filter((p) => p.status === "active");
  const recusados = profiles.filter((p) => p.status === "rejected");

  return (
    <AdminGuard>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Painel Administrativo
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Gerencie os usuários do sistema
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProfiles}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Atualizar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Pendentes</span>
              </div>
              <p className="text-2xl font-bold">{pendentes.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Ativos</span>
              </div>
              <p className="text-2xl font-bold">{ativos.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold">{profiles.length}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-border p-6">
            <Tabs defaultValue="pendentes">
              <TabsList className="mb-4">
                <TabsTrigger value="pendentes" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Pendentes
                  {pendentes.length > 0 && (
                    <span className="bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {pendentes.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="todos" className="gap-2">
                  <Users className="w-4 h-4" />
                  Todos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pendentes">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : pendentes.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <p className="font-medium">Nenhum cadastro pendente</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Todos os cadastros foram processados.
                    </p>
                  </div>
                ) : (
                  <div>
                    {pendentes.map((user) => (
                      <UserRow key={user.id} user={user} onAction={handleAction} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="todos">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">Nenhum usuário cadastrado</p>
                  </div>
                ) : (
                  <div>
                    {/* Ativos */}
                    {ativos.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          Ativos ({ativos.length})
                        </h3>
                        {ativos.map((user) => (
                          <UserRow key={user.id} user={user} onAction={handleAction} />
                        ))}
                      </div>
                    )}

                    {/* Pendentes */}
                    {pendentes.length > 0 && (
                      <div className="mb-4">
                        <Separator className="mb-4" />
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          Pendentes ({pendentes.length})
                        </h3>
                        {pendentes.map((user) => (
                          <UserRow key={user.id} user={user} onAction={handleAction} />
                        ))}
                      </div>
                    )}

                    {/* Recusados */}
                    {recusados.length > 0 && (
                      <div>
                        <Separator className="mb-4" />
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <UserX className="w-4 h-4 text-destructive" />
                          Desativados ({recusados.length})
                        </h3>
                        {recusados.map((user) => (
                          <UserRow key={user.id} user={user} onAction={handleAction} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
