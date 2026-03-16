import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Shirt, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { status } = router.query;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile?.status === "active") {
      router.replace("/selecao");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (status === "pending") {
      toast("Seu cadastro está aguardando aprovação do administrador.", { icon: "⏳" });
    } else if (status === "rejected") {
      toast.error("Seu cadastro foi recusado. Entre em contato com o administrador.");
    }
  }, [status]);

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitting(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      toast.error("Email ou senha incorretos.");
      setSubmitting(false);
      return;
    }

    // Verificar status do perfil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .single();

    if (!profileData || profileData.status === "pending") {
      await supabase.auth.signOut();
      toast("Seu cadastro está aguardando aprovação do administrador.", { icon: "⏳" });
      setSubmitting(false);
      return;
    }

    if (profileData.status === "rejected") {
      await supabase.auth.signOut();
      toast.error("Seu cadastro foi recusado. Entre em contato com o administrador.");
      setSubmitting(false);
      return;
    }

    toast.success("Login realizado com sucesso!");
    router.replace("/selecao");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Shirt className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Controle de Estoque de Camisas</h1>
          <p className="text-sm text-muted-foreground mt-1">Feito e Desenvolvido por UnnoHits</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar na sua conta</CardTitle>
            <CardDescription>Digite seu email e senha para acessar o sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link href="/cadastro" className="text-primary font-medium hover:underline">
                Cadastre-se
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
