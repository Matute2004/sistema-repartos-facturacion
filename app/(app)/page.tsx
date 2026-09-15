import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { getMetricasDashboard } from "@/lib/data/dashboard";
import { formatPesos, ZONA_HORARIA } from "@/lib/types";
import { Card, PageHeader } from "@/app/components/ui/display";

export const metadata: Metadata = { title: "Ohana Comisiones" };

export default function Home() {
  return (
    <div>
      {/* La fecha del día (zona horaria de Buenos Aires) y las métricas dependen
          de la hora actual y de la base, así que streaman dentro de un Suspense
          y el shell se renderiza de inmediato. */}
      <Suspense
        fallback={
          <>
            <PageHeader title="Dashboard" description="Panorama del día" />
            <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-28 p-5">
                  <div className="h-4 w-20 rounded bg-zinc-200" />
                  <div className="mt-3 h-7 w-24 rounded bg-zinc-100" />
                  <div className="mt-2 h-4 w-28 rounded bg-zinc-100" />
                </Card>
              ))}
            </div>
          </>
        }
      >
        <ContenidoDashboard />
      </Suspense>
    </div>
  );
}

/** Encabezado con la fecha del día + tarjetas de métricas. Todo lo que
 *  depende de la hora actual streama en request (no entra al prerender).
 *  Las fechas se calculan en la zona de Buenos Aires, sin depender del
 *  reloj del servidor de hosting. */
async function ContenidoDashboard() {
  // Marca esta isla como dinámica por request: evita que el `new Date()` del
  // encabezado se evalúe (y falle) durante el prerender del shell.
  await connection();
  const ahora = new Date();
  const diaLegible = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(ahora);
  const diaCorto = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
  }).format(ahora);
  const mesLegible = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    month: "long",
    year: "numeric",
  }).format(ahora);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Panorama del día · ${diaLegible}`}
      />
      <TarjetasMetricas mesLegible={mesLegible} diaCorto={diaCorto} />
    </>
  );
}

/** 
 * Métricas consolidadas del dashboard: cacheadas ~1 min para que el prefetch
 * de Next traiga el contenido ya resuelto antes del click. Se invalida con
 * revalidateTag al mutar cualquier dominio (por eso lleva todos los tags).
 */
async function cargarMetricas() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("dashboard");
  cacheTag("clientes");
  cacheTag("vehiculos");
  cacheTag("gastos");
  cacheTag("repartos");
  cacheTag("remitos");
  return getMetricasDashboard();
}

/** Tarjetas de métricas del dashboard (stream solo con la data). */
async function TarjetasMetricas({
  mesLegible,
  diaCorto,
}: {
  mesLegible: string;
  diaCorto: string;
}) {
  const metricas = await cargarMetricas();

  const tarjetas = [
    {
      label: "Clientes registrados",
      valor: String(metricas.clientes),
      detalle: "Base de clientes actual",
      href: "/clientes",
    },
    {
      label: "Vehículos",
      valor: String(metricas.vehiculos),
      detalle: "Flota registrada en el sistema",
      href: "/vehiculos",
    },
    {
      label: "Gastos · mes actual",
      valor: formatPesos(metricas.gastosMesCentavos),
      detalle: `Acumulado en ${mesLegible}`,
      href: "/gastos",
    },
    {
      label: "Repartos de hoy",
      valor: String(metricas.repartosHoy),
      detalle: `${diaCorto} · ${metricas.repartosHoyPendientes} ${
        metricas.repartosHoyPendientes === 1 ? "pendiente" : "pendientes"
      }`,
      href: "/repartos",
    },
    {
      label: "Remitos pendientes de hoy",
      valor: String(metricas.remitosHoyPendientes),
      detalle: "Aún en estado pendiente",
      href: "/remitos",
    },
    {
      label: "Remitos por asignar",
      valor: String(metricas.remitosPorAsignar),
      detalle: "Sin reparto asignado",
      href: "/repartos",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tarjetas.map((tarjeta) => (
        <Link key={tarjeta.label} href={tarjeta.href} className="block">
          <Card className="h-full p-5 transition-shadow hover:shadow-md">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {tarjeta.label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
              {tarjeta.valor}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{tarjeta.detalle}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
