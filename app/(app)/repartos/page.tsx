import Link from "next/link";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import {
  listarDiasConRepartosDelMes,
  listarRepartosDelDia,
  resumenDia,
  type ResumenDia,
} from "@/lib/data/repartos";
import { listarGastosDelDia } from "@/lib/data/gastos";
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
import { CalendarioHojaRuta } from "@/app/components/repartos/CalendarioHojaRuta";
import type { Gasto, Reparto } from "@/lib/types";

export const metadata = { title: "Hoja de Ruta" };

/**
 * Hoja de Ruta: un calendario para elegir el día (y saltar de mes) más la
 * hoja de ruta de ese día: repartos, lo cobrado, los gastos y el rinde.
 * Al abrir el apartado muestra SIEMPRE el día actual.
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
        description="Elegí el día en el calendario y mirá lo cobrado, los gastos y lo que rindió cada jornada."
      />
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-72 rounded-xl bg-zinc-100" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
  const diasConRepartos = await cargarDiasConRepartos(fecha.slice(0, 7));

  return (
    <div>
      <CalendarioHojaRuta fecha={fecha} diasConRepartos={diasConRepartos} />

      {/* Navegador rápido de un día a otro + alta de reparto */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <Link
            href={`/repartos?fecha=${diaAnterior}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Ver la hoja de ruta del día anterior"
          >
            ← Ayer
          </Link>
          {!esHoy && (
            <Link
              href="/repartos"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              Hoy
            </Link>
          )}
          <Link
            href={`/repartos?fecha=${diaSiguiente}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Ver la hoja de ruta del día siguiente"
          >
            Mañana →
          </Link>
        </div>

        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
            {fechaLegible(fecha)}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {esHoy ? "Día de hoy" : formatFecha(fecha)}
          </p>
        </div>

        <ButtonLink href={`/repartos/nuevo?fecha=${fecha}`} variant="primary">
          + Nuevo reparto
        </ButtonLink>
      </div>

      <ResumenYTablaDelDia fecha={fecha} />
    </div>
  );
/** Resumen del día (cobrado + gastos + rinde) y la tabla de repartos. */
async function ResumenYTablaDelDia({ fecha }: { fecha: string }) {
  const [resumen, repartos, gastos] = await Promise.all([
    cargarResumenDelDia(fecha),
    cargarRepartosDelDia(fecha),
    cargarGastosDelDia(fecha),
  ]);
  const gastosCentavos = gastos.reduce(
    (total, gasto) => total + gasto.montoCentavos,
    0,
  );
  const rindeCentavos = resumen.cobradoCentavos - gastosCentavos;
  const rindePositivo = rindeCentavos >= 0;

  return (
    <div>
      {/* Qué se cobró, qué se gastó y qué rindió el día, por separado */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
            Gastos del día
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-700">
            {formatPesos(gastosCentavos)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {gastos.length === 0
              ? "Sin gastos cargados"
              : `${gastos.length} ${gastos.length === 1 ? "gasto" : "gastos"} del día`}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Rinde del día
          </p>
          <p
            className={`mt-2 text-2xl font-bold tracking-tight ${
              rindePositivo ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatPesos(rindeCentavos)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Cobrado − gastos</p>
        </Card>
      </div>
{/* Qué se gastó ese día, para entender por qué rindió así */}
      <Card className="mb-4">
        <CardHeader
          title={`Gastos del ${formatFecha(fecha)}`}
          description={
            gastos.length === 0
              ? "No hay gastos cargados para este día."
              : "Se restan de lo cobrado para ver si el día rindió."
          }
        />
        {gastos.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-500">
            Sin gastos cargados este día.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {gastos.map((gasto) => (
              <li
                key={gasto.id}
                className="flex items-baseline justify-between gap-4 px-5 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-zinc-900">
                    {gasto.descripcion}
                  </span>
                  {gasto.proveedor != null && (
                    <span className="ml-2 text-xs text-zinc-400">
                      {gasto.proveedor}
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap font-semibold text-rose-700">
                  −{formatPesos(gasto.montoCentavos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

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

/** Fechas con repartos del mes, cacheadas ~1 min por mes. */
async function cargarDiasConRepartos(mes: string): Promise<string[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("repartos");
  return listarDiasConRepartosDelMes(mes);
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

/** Gastos del día, cacheados ~1 min por fecha. */
async function cargarGastosDelDia(fecha: string): Promise<Gasto[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("gastos");
  return listarGastosDelDia(fecha);
}

/** Resumen del día (total, cobrado y falta cobrar), cacheados ~1 min por fecha. */
async function cargarResumenDelDia(fecha: string): Promise<ResumenDia> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("repartos");
  cacheTag("remitos");
  return resumenDia(fecha);
}
}