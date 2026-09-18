import Link from "next/link";
import { Suspense } from "react";
import { obtenerHojaDeRutaDia } from "@/lib/data/repartos";
import {
  esFechaValida,
  fechaHoyLocal,
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

export const metadata = { title: "Hoja de Ruta" };

export default function HojaDeRutaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-72 rounded-xl bg-zinc-100" /></div>}>
      <HojaDeRutaDelDia searchParams={searchParams} />
    </Suspense>
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

  // OPTIMIZACIÓN CRÍTICA: 4 queries en 1 request HTTP
  const { diasConRepartos, repartos, gastos, resumen } = await obtenerHojaDeRutaDia(fecha);

  const gastosCentavos = gastos.reduce((acc, g) => acc + g.montoCentavos, 0);
  const rindeCentavos = resumen.cobradoCentavos - gastosCentavos;
  const rindePositivo = rindeCentavos >= 0;

  return (
    <div>
      <PageHeader title="Hoja de Ruta" description="Elegí el día en el calendario." />
      <CalendarioHojaRuta fecha={fecha} diasConRepartos={diasConRepartos} />

      <div className="mb-4 flex items-center gap-3">
        <Link href={`/repartos?fecha=${diaAnterior}`} className="rounded px-3 py-2 text-sm hover:bg-zinc-100">← Ayer</Link>
        {!esHoy && <Link href="/repartos" className="rounded px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50">Hoy</Link>}
        <Link href={`/repartos?fecha=${diaSiguiente}`} className="rounded px-3 py-2 text-sm hover:bg-zinc-100">Mañana →</Link>
        <ButtonLink href={`/repartos/nuevo?fecha=${fecha}`}>+ Nuevo</ButtonLink>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-zinc-500">Total</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{formatPesos(resumen.totalCentavos)}</p>
          <p className="mt-1 text-xs text-zinc-400">{resumen.cantidadTotal} repartos</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-emerald-600">Cobrado</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatPesos(resumen.cobradoCentavos)}</p>
          <p className="mt-1 text-xs text-zinc-400">{resumen.cantidadCobrados} con pago</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-rose-600">Gastos</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{formatPesos(gastosCentavos)}</p>
          <p className="mt-1 text-xs text-zinc-400">{gastos.length} gastos</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase text-zinc-500">Rinde</p>
          <p className={`mt-2 text-2xl font-bold ${rindePositivo ? "text-emerald-700" : "text-red-700"}`}>{formatPesos(rindeCentavos)}</p>
          <p className="mt-1 text-xs text-zinc-400">Cobrado − gastos</p>
        </Card>
      </div>

      {gastos.length > 0 && (
        <Card className="mb-4">
          <CardHeader title={`Gastos del ${formatFecha(fecha)}`} description="Se restan del cobrado." />
          <ul className="divide-y">
            {gastos.map((g) => (
              <li key={g.id} className="flex justify-between px-5 py-2 text-sm">
                <span className="font-medium">{g.descripcion}</span>
                <span className="text-rose-700">−{formatPesos(g.montoCentavos)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title={`Repartos del ${formatFecha(fecha)}`} description="Detalle del día." />
        {repartos.length === 0 ? (
          <p className="px-5 py-10 text-center text-zinc-600">Sin repartos</p>
        ) : (
          <RepartosTablaBusqueda repartos={repartos} />
        )}
      </Card>
    </div>
  );
}