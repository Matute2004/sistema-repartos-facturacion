import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getMetricasDashboard } from "@/lib/data/dashboard";
import { fechaHoyLocal, formatPesos } from "@/lib/types";
import { Card, PageHeader } from "@/app/components/ui/display";

export const metadata: Metadata = { title: "Ohana Comisiones" };

const accesosRapidos = [
  {
    href: "/clientes",
    titulo: "Clientes",
    descripcion: "Cargar o actualizar clientes",
  },
  {
    href: "/repartos",
    titulo: "Repartos",
    descripcion: "Hojas de ruta del día",
  },
  {
    href: "/remitos",
    titulo: "Remitos",
    descripcion: "Emitir y organizar remitos",
  },
  {
    href: "/vehiculos",
    titulo: "Vehículos",
    descripcion: "Flota, kilómetros y services",
  },
  {
    href: "/facturacion",
    titulo: "Facturación",
    descripcion: "Atajo a AFIP / facturación",
  },
  {
    href: "/gastos",
    titulo: "Gastos",
    descripcion: "Registrar gastos operativos",
  },
];

export default async function Home() {
  const hoy = fechaHoyLocal();
  const mesLegible = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${hoy.slice(0, 8)}01T12:00:00`));
  const diaLegible = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${hoy}T12:00:00`));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Panorama del día · ${diaLegible}`}
      />

      {/* Las tarjetas de métricas streaman cuando terminan; el resto del
          dashboard (accesos rápidos) aparece de inmediato. */}
      <Suspense
        fallback={
          <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-28 p-5">
                <div className="h-4 w-20 rounded bg-zinc-200" />
                <div className="mt-3 h-7 w-24 rounded bg-zinc-100" />
                <div className="mt-2 h-4 w-28 rounded bg-zinc-100" />
              </Card>
            ))}
          </div>
        }
      >
        <TarjetasMetricas mesLegible={mesLegible} />
      </Suspense>

      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-zinc-900">
          Accesos rápidos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {accesosRapidos.map((acceso) => (
            <Link key={acceso.href} href={acceso.href}>
              <Card className="h-full p-4 transition-colors hover:border-emerald-300">
                <p className="text-sm font-semibold text-zinc-900">
                  {acceso.titulo}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{acceso.descripcion}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tarjetas de métricas del dashboard (stream solo con la data). */
async function TarjetasMetricas({ mesLegible }: { mesLegible: string }) {
  const metricas = await getMetricasDashboard();

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
      detalle: "Hojas de ruta programadas",
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

      <Card className="flex flex-col justify-center gap-3 border-dashed p-5">
        <p className="text-sm font-medium text-zinc-700">Empezar a trabajar</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/remitos"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            + Nuevo remito
          </Link>
          <Link
            href="/gastos"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Registrar gasto
          </Link>
        </div>
      </Card>
    </div>
  );
}
