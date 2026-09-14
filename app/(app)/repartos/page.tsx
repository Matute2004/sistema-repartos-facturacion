import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { listarRepartos } from "@/lib/data/repartos";
import { ButtonLink } from "@/app/components/ui/form";
import {
  Card,
  CardHeader,
  PageHeader,
} from "@/app/components/ui/display";
import { RepartosTablaBusqueda } from "@/app/components/repartos/RepartosTablaBusqueda";

export const metadata = { title: "Repartos" };

export default function RepartosPage() {
  return (
    <div>
      <PageHeader
        title="Repartos"
        description="Hojas de ruta diarias: asigná remitos a cada reparto y registrá la forma de pago."
        action={
          <ButtonLink href="/repartos/nuevo" variant="primary">
            + Crear reparto
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Repartos registrados"
          description="Los pendientes aparecen arriba (por fecha, del más reciente al más viejo) y después los completados. Tildá la casilla para marcar un reparto como completado, o tocá la fecha para ver el detalle."
        />
        {/* La tabla consulta valores consolidados de remitos y mercadería:
            streama aparte para que el resto de la página aparezca de inmediato. */}
        <Suspense
          fallback={
            <div className="animate-pulse p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-6 border-t border-zinc-100 py-3"
                >
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-4 w-20 rounded bg-zinc-100" />
                  <div className="h-4 w-32 rounded bg-zinc-100" />
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-4 w-20 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          }
        >
          <TablaRepartos />
        </Suspense>
      </Card>
    </div>
  );
}

/**
 * Repartos consolidados (valor, remitos asociados), cacheados ~1 min para
 * navegación instantánea entre apartados. Invalida al mutar repartos, remitos
 * o clientes (los nombres de cliente se muestran en la tabla).
 */
async function cargarRepartos() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("repartos");
  cacheTag("remitos");
  cacheTag("clientes");
  return listarRepartos();
}

async function TablaRepartos() {
  const repartos = await cargarRepartos();
  return <RepartosTablaBusqueda repartos={repartos} />;
}