import { Suspense } from "react";
import { listarRepartos } from "@/lib/data/repartos";
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
import { EstadoRepartoCheckbox } from "@/app/components/repartos/EstadoRepartoCheckbox";
import { FormaPagoSelect } from "@/app/components/repartos/FormaPagoSelect";
import { RemitoModal } from "@/app/components/repartos/RemitoModal";
import {
  ETIQUETA_ESTADO_REPARTO,
  TONE_ESTADO_REPARTO,
} from "@/lib/estados";
import type { Reparto } from "@/lib/types";

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
          description="Tildá la casilla para marcar el reparto como completado, o tocá la fecha para ver el detalle."
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

async function TablaRepartos() {
  const repartos = await listarRepartos();
  if (repartos.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-zinc-500">
        Todavía no hay repartos. Creá el primero para armar una hoja de ruta.
      </p>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>
            <span className="sr-only">Completado</span>
          </Th>
          <Th>Fecha</Th>
          <Th>Estado</Th>
          <Th>Envía</Th>
          <Th>Recibe</Th>
          <Th>Observaciones</Th>
          <Th>Remitos</Th>
          <Th className="text-right">Valor</Th>
          <Th>Forma de pago</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {repartos.map((reparto) => (
          <FilaReparto key={reparto.id} reparto={reparto} />
        ))}
      </tbody>
    </Table>
  );
}

function FilaReparto({ reparto }: { reparto: Reparto }) {
  return (
    <tr key={reparto.id} className="hover:bg-zinc-50">
      <Td className="align-middle">
        <EstadoRepartoCheckbox
          repartoId={reparto.id}
          estadoActual={reparto.estado}
        />
      </Td>
      <Td className="whitespace-nowrap">
        <Link
          href={`/repartos/${reparto.id}`}
          className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
        >
          {formatFecha(reparto.fecha)}
        </Link>
      </Td>
      <Td>
        <Badge tone={TONE_ESTADO_REPARTO[reparto.estado]}>
          {ETIQUETA_ESTADO_REPARTO[reparto.estado]}
        </Badge>
      </Td>
      <Td>
        {reparto.clienteNombre ?? reparto.enviadoPor ?? (
          <span className="text-zinc-400">—</span>
        )}
      </Td>
      <Td>
        {reparto.recibidoPor ?? (
          <span className="text-zinc-400">—</span>
        )}
      </Td>
      <Td>
        {reparto.observaciones ?? (
          <span className="text-zinc-400">—</span>
        )}
      </Td>
      <Td>
        {reparto.remitos.length === 0 ? (
          <span className="text-zinc-400">—</span>
        ) : (
          <RemitoModal remitos={reparto.remitos} />
        )}
      </Td>
      <Td className="whitespace-nowrap text-right font-medium text-zinc-900">
        {formatPesos(reparto.valorCentavos)}
      </Td>
      <Td className="whitespace-nowrap">
        <FormaPagoSelect
          repartoId={reparto.id}
          valorActual={reparto.formaPago}
        />
      </Td>
    </tr>
  );
}