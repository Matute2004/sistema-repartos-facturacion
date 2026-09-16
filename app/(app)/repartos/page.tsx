import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  listarRepartosDelDia,
  resumenDia,
  type ResumenDia,
} from "@/lib/data/repartos";
import {
  esFechaValida,
  fechaHoyLocal,
  fechaLegible,
  formatFecha,
  formatPesos,
  sumarDias,
} from "@/lib/types";
import { ButtonLink } from "@/app/components/ui/form";
import {
  Card,
  CardHeader,
  PageHeader,
} from "@/app/components/ui/display";
import { RepartosTablaBusqueda } from "@/app/components/repartos/RepartosTablaBusqueda";
import type { Reparto } from "@/lib/types";

export const metadata = { title: "Hoja de Ruta" };

/**
 * Hoja de Ruta: los repartos de un día, con navegación entre días y el
 * resumen de cobros del día (total, cobrado y por cobrar). Al abrir el
 * apartado muestra SIEMPRE el día actual; con las flechas se recorre.
 *
 * La fecha viaja en `?fecha=YYYY-MM-DD`. La lectura de searchParams queda
 * dentro de un Suspense para que el shell de la página se siga prerenderizando.
 */
export default function HojaDeRutaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  return (
    <div>
      <PageHeader
        title="Hoja de Ruta"
        description="Los repartos de cada día, con lo cobrado y lo que falta cobrar."
      />
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-20 rounded-xl bg-zinc-100" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-100" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-zinc-100" />
          </div>
        }
      >
        <HojaDeRutaDelDia searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function HojaDeRutaDelDia({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha: fechaParam } = await searchParams;
  const fechaRaw = Array.isArray(fechaParam) ? fechaParam[0] : fechaParam;
  const fecha = esFechaValida(fechaRaw) ? fechaRaw : fechaHoyLocal();
  const hoy = fechaHoyLocal();
  const esHoy = fecha === hoy;
  const diaAnterior = sumarDias(fecha, -1);
  const diaSiguiente = sumarDias(fecha, 1);

  return (
    <div>
      {/* Navegador de días: flechas a los costados, día actual arriba */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <Link
          href={`/repartos?fecha=${diaAnterior}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Ver la hoja de ruta del día anterior"
        >
          ← Ayer
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
            {fechaLegible(fecha)}
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {esHoy ? "Día de hoy" : formatFecha(fecha)}
          </p>
          {!esHoy && (
            <Link
              href="/repartos"
              className="mt-1 inline-block text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
            >
              Ir al día de hoy
            </Link>
          )}
        </div>
        <Link
          href={`/repartos?fecha=${diaSiguiente}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Ver la hoja de ruta del día siguiente"
        >
          Mañana →
        </Link>
      </div>

      <div className="mb-4 flex justify-end">
        <ButtonLink href={`/repartos/nuevo?fecha=${fecha}`} variant="primary">
          + Nuevo reparto
        </ButtonLink>
      </div>

      <ResumenYTablaDelDia fecha={fecha} />
    </div>
  );
}

/** Resumen del día + la tabla de repartos, cacheados ~1 min por fecha. */
async function ResumenYTablaDelDia({ fecha }: { fecha: string }) {
  const [resumen, repartos] = await Promise.all([
    cargarResumenDelDia(fecha),
    cargarRepartosDelDia(fecha),
  ]);

  return (
    <div>
      {/* Qué se cobró y qué falta cobrar del día, por separado */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Total del día
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            {formatPesos(resumen.totalCentavos)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {resumen.cantidadTotal}{" "}
            {resumen.cantidadTotal === 1 ? "reparto" : "repartos"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Cobrado
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
            {formatPesos(resumen.cobradoCentavos)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {resumen.cantidadCobrados}{" "}
            {resumen.cantidadCobrados === 1 ? "reparto" : "repartos"}{" "}
            con forma de pago
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Falta cobrar
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
            {formatPesos(resumen.faltaCobrarCentavos)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {resumen.cantidadTotal - resumen.cantidadCobrados} sin cobrar
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Repartos del ${formatFecha(fecha)}`}
          description="Tocá la fecha para abrir el detalle del reparto y asignar remitos."
        />
        {repartos.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Este día no tiene repartos
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Creá un reparto para armar la hoja de ruta de este día.
            </p>
          </div>
        ) : (
          <RepartosTablaBusqueda repartos={repartos} />
        )}
      </Card>
    </div>
  );
}

/** Repartos del día (con valor, remitos e items), cacheados ~1 min por fecha. */
async function cargarRepartosDelDia(fecha: string): Promise<Reparto[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("repartos");
  cacheTag("remitos");
  cacheTag("clientes");
  return listarRepartosDelDia(fecha);
}

/** Resumen del día (total, cobrado y falta cobrar), cacheados ~1 min por fecha. */
async function cargarResumenDelDia(fecha: string): Promise<ResumenDia> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("repartos");
  cacheTag("remitos");
  return resumenDia(fecha);
}