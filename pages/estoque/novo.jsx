import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import CamisaForm from "@/components/estoque/CamisaForm";

export default function NovaCamisa() {
  return (
    <AuthGuard>
      <Layout>
        <CamisaForm />
      </Layout>
    </AuthGuard>
  );
}
