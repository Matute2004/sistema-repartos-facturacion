import Link from "next/link";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { RemitoForm } from "@/app/components/remitos/RemitoForm";
import { listarRepartosParaSeleccion } from "@/lib/data/repartos";
import { proximoNumeroRemito } from "@/lib/data/remitos";

export const metadata = { title: "Nuevo remito" };

// Debe mostrar los repartos activos y el próximo N° de remito frescos al abrir.
export const instant = false;

export default async function NuevoRemitoPage() {
  const [repartos, numeroProximo] = await Promise.all([
    listarRepartosParaSeleccion(),
    proximoNumeroRemito(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo remito"
        description="Emití el comprobante y queda asociado al reparto elegido."
        action={
          <ButtonLink href="/remitos" variant="ghost">
            ← Volver a remitos
          </ButtonLink>
        }
      />

      <Card className="p-5">
        {repartos.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
            Primero creá un reparto al que asociar el remito: el cliente del
            remito es el del reparto.{" "}
            <Link href="/repartos/nuevo" className="font-semibold underline">
              Crear reparto
            </Link>
          </div>
        ) : (
          <RemitoForm repartos={repartos} numeroProximo={numeroProximo} />
        )}
      </Card>
    </div>
  );
}