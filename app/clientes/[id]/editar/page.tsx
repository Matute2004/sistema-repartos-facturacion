import { notFound } from "next/navigation";
import { obtenerCliente } from "@/lib/data/clientes";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { ClienteEditForm } from "@/app/components/clientes/ClienteEditForm";
import { ClienteDeleteButton } from "@/app/components/clientes/ClienteDeleteButton";

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

      <Card className="mt-6 max-w-2xl border-red-200 p-5">
        <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Eliminar al cliente es definitivo. Se vuelve al dashboard después de
          borrarlo.
        </p>
        <div className="mt-3">
          <ClienteDeleteButton id={cliente.id} nombre={cliente.nombre} />
        </div>
      </Card>
    </div>
  );
}