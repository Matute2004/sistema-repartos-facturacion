import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/data/clientes";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { ClienteEditForm } from "@/app/components/clientes/ClienteEditForm";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await obtenerCliente(Number(id));
  if (!cliente) notFound();

  return (
    <div>
      <PageHeader
        title={`Editar: ${cliente.nombre}`}
        description="Actualizá los datos del cliente. Los cambios se guardan al enviar."
        action={
          <ButtonLink href={`/clientes/${cliente.id}`} variant="secondary">
            ← Volver al detalle
          </ButtonLink>
        }
      />
      <Card className="max-w-2xl p-5">
        <ClienteEditForm cliente={cliente} />
      </Card>
    </div>
  );
}