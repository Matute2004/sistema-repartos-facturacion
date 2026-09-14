import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { RepartoForm } from "@/app/components/repartos/RepartoForm";
import { listarRemitosPendientesSinAsignar } from "@/lib/data/remitos";
import { listarClientesParaSeleccion } from "@/lib/data/clientes";

export const metadata = { title: "Nuevo reparto" };

// Debe mostrar remitos pendientes y clientes frescos al abrir el form.
export const instant = false;

export default async function NuevoRepartoPage() {
  const [remitosDisponibles, clientes] = await Promise.all([
    listarRemitosPendientesSinAsignar(),
    listarClientesParaSeleccion(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nuevo reparto"
        description="Creá una hoja de ruta: elegí el cliente, marcá si lleva remito y la forma de pago."
        action={
          <ButtonLink href="/repartos" variant="ghost">
            ← Volver a repartos
          </ButtonLink>
        }
      />

      <Card className="p-5">
        <RepartoForm remitosDisponibles={remitosDisponibles} clientes={clientes} />
      </Card>
    </div>
  );
}