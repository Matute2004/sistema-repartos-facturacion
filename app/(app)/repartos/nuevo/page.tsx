import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { RepartoForm } from "@/app/components/repartos/RepartoForm";
import { listarRemitosPendientesSinAsignar } from "@/lib/data/remitos";

export const metadata = { title: "Nuevo reparto" };

export default async function NuevoRepartoPage() {
  const remitosDisponibles = await listarRemitosPendientesSinAsignar();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Nuevo reparto"
        description="Creá una hoja de ruta y asigná remitos pendientes."
        action={
          <ButtonLink href="/repartos" variant="ghost">
            ← Volver a repartos
          </ButtonLink>
        }
      />

      <Card className="p-5">
        <RepartoForm remitosDisponibles={remitosDisponibles} />
      </Card>
    </div>
  );
}