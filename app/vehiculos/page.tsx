import { listarVehiculos } from "@/lib/data/vehiculos";
import { ButtonLink } from "@/app/components/ui/form";
import { PageHeader, Card } from "@/app/components/ui/display";
import { VehiculosTablaBusqueda } from "@/app/components/vehiculos/VehiculosTablaBusqueda";

export const metadata = { title: "Vehículos" };

export default async function VehiculosPage() {
  const vehiculos = await listarVehiculos();
  const conDatos = vehiculos.filter((v) => v.patente || v.marca).length;

  return (
    <div>
      <PageHeader
        title="Vehículos"
        description={`${vehiculos.length} vehículos registrados · ${conDatos} con patente o marca`}
        action={
          <ButtonLink href="/vehiculos/nuevo" variant="primary">
            + Nuevo vehículo
          </ButtonLink>
        }
      />

      <Card>
        {vehiculos.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Todavía no hay vehículos
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Cargá tu primer vehículo para llevar el control de kilómetros y
              services.
            </p>
            <div className="mt-4">
              <ButtonLink href="/vehiculos/nuevo" variant="primary">
                + Nuevo vehículo
              </ButtonLink>
            </div>
          </div>
        ) : (
          <VehiculosTablaBusqueda vehiculos={vehiculos} />
        )}
      </Card>
    </div>
  );
}