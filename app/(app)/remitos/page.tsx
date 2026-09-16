import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { listarRemitos } from "@/lib/data/remitos";
import { formatFecha, formatPesos } from "@/lib/types";
import Link from "next/link";
import { ButtonLink } from "@/app/components/ui/form";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/app/components/ui/display";
import {
  ETIQUETA_ESTADO_REMITO,
  TONE_ESTADO_REMITO,
} from "@/lib/estados";

export const metadata = { title: "Remitos" };

export default function RemitosPage() {
  return (
    <div>
      <PageHeader
        title="Remitos"
        description="Emití remitos con detalle de mercadería y dales seguimiento."
        action={
          <ButtonLink href="/remitos/nuevo" variant="primary">
            + Nuevo remito
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Remitos emitidos"
          description="Tocá el número para ver, imprimir o cambiar el estado del remito."
        />
        <Suspense
          fallback={
            <div className="animate-pulse p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-6 border-t border-zinc-100 py-3"
                >
                  <div className="h-4 w-16 rounded bg-zinc-100" />
                  <div className="h-4 w-40 rounded bg-zinc-100" />
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-4 w-20 rounded bg-zinc-100" />
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          }
        >
          <TablaRemitos />
        </Suspense>
      </Card>
    </div>
  );
}

/**
 * Remitos listados (muestran el nombre del cliente), cacheados ~1 min para
 * navegación instantánea. Invalida al mutar remitos o clientes.
 */
async function cargarRemitos() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60 });
  cacheTag("remitos");
  cacheTag("clientes");
  return listarRemitos();
}

async function TablaRemitos() {
  const remitos = await cargarRemitos();
  if (remitos.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-zinc-500">
        Todavía no hay remitos. La carga de remitos se habilita en la siguiente
        etapa.
      </p>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>N°</Th>
          <Th>Cliente</Th>
          <Th>Fecha</Th>
          <Th>Estado</Th>
          <Th>Observaciones</Th>
          <Th className="text-right">Valor</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {remitos.map((remito) => (
          <tr key={remito.id} className="hover:bg-zinc-50">
            <Td className="font-semibold text-zinc-900">
              <Link
                href={`/remitos/${remito.id}`}
                className="text-emerald-700 underline-offset-2 hover:underline"
              >
                {String(remito.numero).padStart(4, "0")}
              </Link>
            </Td>
            <Td>
              {remito.clienteNombre ?? (
                <span className="text-zinc-400">Sin reparto</span>
              )}
            </Td>
            <Td className="whitespace-nowrap">{formatFecha(remito.fecha)}</Td>
            <Td>
              <Badge tone={TONE_ESTADO_REMITO[remito.estado]}>
                {ETIQUETA_ESTADO_REMITO[remito.estado]}
              </Badge>
            </Td>
            <Td>
              {remito.observaciones ?? (
                <span className="text-zinc-400">—</span>
              )}
            </Td>
            <Td className="whitespace-nowrap text-right font-medium text-zinc-900">
              {formatPesos(remito.valorCentavos)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}