import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { ClienteForm } from "@/app/components/clientes/CamposCliente";

export const metadata = { title: "Nuevo cliente" };

// Formulario puro bajo el layout (app) que lee cookies: bloquea en server.
export const instant = false;

export default function NuevoClientePage() {
  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        description="Registrá un cliente para poder emitir remitos a su nombre. El N° se asigna automáticamente al guardar."
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