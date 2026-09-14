"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { EstadoReparto, Reparto } from "@/lib/types";
import { formatFecha, formatPesos } from "@/lib/types";
import {
  ETIQUETA_ESTADO_REPARTO,
  TONE_ESTADO_REPARTO,
} from "@/lib/estados";
import { Badge, Table, Td, Th } from "@/app/components/ui/display";
import { Input } from "@/app/components/ui/form";
import { EstadoRepartoCheckbox } from "@/app/components/repartos/EstadoRepartoCheckbox";
import { FormaPagoSelect } from "@/app/components/repartos/FormaPagoSelect";
import { RemitoModal } from "@/app/components/repartos/RemitoModal";

/**
 * Tabla de repartos con buscador arriba. Filtra por cliente: quién envía
 * (cliente vinculado o texto libre) o quién recibe.
 *
 * Los repartos llegan ya ordenados desde la capa de datos (pendientes/en curso
 * primero por fecha, después completados y cancelados), así que acá solo se
 * filtran y se marcan los grupos con una fila separadora.
 */
export function RepartosTablaBusqueda({ repartos }: { repartos: Reparto[] }) {
  const [consulto, setConsulto] = useState("");

  const filtrados = useMemo(() => {
    const termino = consulto.trim().toLowerCase();
    if (!termino) return repartos;
    return repartos.filter((reparto) =>
      [reparto.clienteNombre, reparto.enviadoPor, reparto.recibidoPor].some(
        (valor) => valor != null && valor.toLowerCase().includes(termino),
      ),
    );
  }, [repartos, consulto]);

  if (repartos.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-zinc-500">
        Todavía no hay repartos. Creá el primero para armar una hoja de ruta.
      </p>
    );
  }

  return (
    <div>
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="relative max-w-md">
          <label htmlFor="buscar-repartos" className="sr-only">
            Buscar reparto por cliente
          </label>
          <Input
            id="buscar-repartos"
            type="search"
            value={consulto}
            onChange={(evento) => setConsulto(evento.target.value)}
            placeholder="Buscar por quién envía o quién recibe…"
            autoComplete="off"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">Sin resultados</p>
          <p className="mt-1 text-sm text-zinc-500">
            No hay repartos que coincidan con “{consulto}”.
          </p>
        </div>
      ) : (
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
            {filtrados.map((reparto, indice) => {
              const grupo = grupoDeEstado(reparto.estado);
              const grupoAnterior =
                indice > 0 ? grupoDeEstado(filtrados[indice - 1].estado) : -1;
              return (
                <Fragment key={reparto.id}>
                  {grupo !== grupoAnterior && (
                    <tr className="bg-zinc-50/70">
                      <td
                        colSpan={9}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
                      >
                        {ETIQUETAS_GRUPO[grupo]}
                      </td>
                    </tr>
                  )}
                  <FilaReparto reparto={reparto} />
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

const ETIQUETAS_GRUPO = ["Pendientes", "Completados", "Cancelados"] as const;

/** Posición del grupo en el listado: activos, completados y cancelados. */
function grupoDeEstado(estado: EstadoReparto): number {
  if (estado === "pendiente" || estado === "en_curso") return 0;
  if (estado === "completado") return 1;
  return 2;
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