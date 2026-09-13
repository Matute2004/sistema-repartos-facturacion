import { notFound } from "next/navigation";
import { obtenerVehiculo } from "@/lib/data/vehiculos";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { VehiculoEditForm } from "@/app/components/vehiculos/VehiculoEditForm";
import { VehiculoDeleteButton } from "@/app/components/vehiculos/VehiculoDeleteButton";

export const metadata = { title: "Editar vehículo" };

export default async function EditarVehiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehiculo = await obtenerVehiculo(Number(id));
  if (!vehiculo) notFound();

  return (
    <div>
      <PageHeader
        title={`Editar: ${vehiculo.nombre}`}
        description="Actualizá los datos del vehículo. Los cambios se guardan al enviar."
        action={
          <ButtonLink href={`/vehiculos/${vehiculo.id}`} variant="secondary">
            ← Volver al detalle
          </ButtonLink>
        }
      />
      <Card className="max-w-2xl p-5">
        <VehiculoEditForm vehiculo={vehiculo} />
      </Card>

      <Card className="mt-6 max-w-2xl border-red-200 p-5">
        <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Eliminar al vehículo es definitivo. Se vuelve al listado después de
          borrarlo.
        </p>
        <div className="mt-3">
          <VehiculoDeleteButton
            id={vehiculo.id}
            nombre={vehiculo.nombre}
            variant="danger"
          />
        </div>
      </Card>
    </div>
  );
}