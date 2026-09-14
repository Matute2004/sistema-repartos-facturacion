import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { listarVehiculos } from "@/lib/data/vehiculos";
import { ButtonLink } from "@/app/components/ui/form";
import { PageHeader, Card } from "@/app/components/ui/display";
import { VehiculosTablaBusqueda } from "@/app/components/vehiculos/VehiculosTablaBusqueda";

export const metadata = { title: "Vehículos" };

export default function VehiculosPage() {
  return (
    <div>
      <PageHeader
        title="Vehículos"
        description="Flota registrada: patentes, kilómetros y próximos services."
        action={
          <ButtonLink href="/vehiculos/nuevo" variant="primary">
            + Nuevo vehículo
          </ButtonLink>
        }
      />

      <Card>
        <Suspense
          fallback={
            <div className="animate-pulse p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-6 border-t border-zinc-100 py-3"
                >
                  <div className="h-4 w-32 rounded bg-zinc-100" />
                  <div className="h-4 w-16 rounded bg-zinc-100" />
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-4 w-28 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          }
        >
          <TablaVehiculos />
        </Suspense>
      </Card>
    </div>
  );
}

/** Flota cachead ~1 min para navegación instantánea. Invalida con revalidateTag
 *  al crear/editar/eliminar vehículos. */
async function cargarVehiculos() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("vehiculos");
  return listarVehiculos();
}

async function TablaVehiculos() {
  const vehiculos = await cargarVehiculos();
  if (vehiculos.length === 0) {
    return (
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
    );
  }
  return <VehiculosTablaBusqueda vehiculos={vehiculos} />;
}