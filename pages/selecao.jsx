import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Shirt, LogOut } from "lucide-react";

export default function Selecao() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header simples */}
        <header className="bg-white border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shirt className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm sm:text-base">Controle de Estoque de Camisas</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-1" />
              Sair
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Olá, {profile?.nome?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground mt-2">Escolha para onde deseja ir:</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Estoque */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-primary"
              onClick={() => router.push("/estoque")}
            >
              <CardContent className="flex flex-col items-center text-center p-8 gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Ir para Estoque</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerenciar camisas, cores e quantidades
                  </p>
                </div>
                <Button className="w-full mt-2">Acessar Estoque</Button>
              </CardContent>
            </Card>

            {/* Caixa (bloqueado) */}
            <Card className="opacity-60 cursor-not-allowed border-2 border-dashed">
              <CardContent className="flex flex-col items-center text-center p-8 gap-4">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h2 className="text-xl font-bold">Ir para Caixa</h2>
                    <Badge variant="warning">Em desenvolvimento</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sistema de vendas e caixa em breve
                  </p>
                </div>
                <Button className="w-full mt-2" disabled>
                  Em breve
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground mt-10">
            Feito e Desenvolvido por <span className="font-semibold">UnnoHits</span>
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
