import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import CamisaForm from "@/components/estoque/CamisaForm";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function EditarCamisa() {
  const router = useRouter();
  const { id } = router.query;
  const [camisa, setCamisa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchCamisa() {
      const { data, error } = await supabase
        .from("camisas")
        .select(`
          *,
          camisa_cores (
            id, cor, foto_url,
            camisa_estoque ( id, tamanho, quantidade )
          )
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Camisa não encontrada.");
        router.replace("/estoque");
        return;
      }

      setCamisa(data);
      setLoading(false);
    }

    fetchCamisa();
  }, [id, router]);

  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </Layout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <CamisaForm initialData={camisa} />
      </Layout>
    </AuthGuard>
  );
}
