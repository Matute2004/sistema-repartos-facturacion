import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { RepartoForm } from "@/app/components/repartos/RepartoForm";
import { listarRemitosSinAsignar } from "@/lib/data/remitos";
import { listarClientesParaSeleccion } from "@/lib/data/clientes";
import { esFechaValida } from "@/lib/types";

export const metadata = { title: "Nuevo reparto" };

// Debe mostrar remitos sin asignar y clientes frescos al abrir el form.
export const instant = false;

export default async function NuevoRepartoPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const fecha = esFechaValida(fechaParam) ? fechaParam : undefined;

  const [remitosDisponibles, clientes] = await Promise.all([
    listarRemitosSinAsignar(),
    listarClientesParaSeleccion(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nuevo reparto"
        description="Creá un reparto para la hoja de ruta: elegí el cliente, marcá si lleva remito y la forma de pago."
        action={
          <ButtonLink href="/repartos" variant="ghost">
            ← Volver a la hoja de ruta
          </ButtonLink>
        }
      />

      <Card className="p-5">
        <RepartoForm
          remitosDisponibles={remitosDisponibles}
          clientes={clientes}
          fechaInicial={fecha}
        />
      </Card>
    </div>
  );
}