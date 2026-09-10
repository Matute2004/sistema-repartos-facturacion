import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { ClienteForm } from "@/app/components/clientes/CamposCliente";

export const metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        description="Registrá un cliente para poder emitir remitos a su nombre."
        action={
          <ButtonLink href="/clientes" variant="secondary">
            ← Volver a clientes
          </ButtonLink>
        }
      />
      <Card className="max-w-2xl p-5">
        <ClienteForm />
      </Card>
    </div>
  );
}