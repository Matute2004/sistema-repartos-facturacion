"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Reparto } from "@/lib/types";
import { formatFecha, formatPesos } from "@/lib/types";
import { Table, Td, Th } from "@/app/components/ui/display";
import { Input } from "@/app/components/ui/form";
import { FormaPagoSelect } from "@/app/components/repartos/FormaPagoSelect";
import { RemitoModal } from "@/app/components/repartos/RemitoModal";

/**
 * Tabla de repartos (hoja de ruta diaria) con buscador arriba. Filtra por
 * cliente: quién envía (cliente vinculado o texto libre) o quién recibe.
 *
 * Los repartos llegan ya filtrados por día y ordenados desde la capa de datos.
 * Ya no hay estado ni casilla de completado: cada fila apenas muestra los
 * datos del reparto y la forma de pago (cobrado / por cobrar) se elige inline.
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
        Todavía no hay repartos para este día. Creá el primero para armar la
        hoja de ruta.
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
              <Th>Fecha</Th>
              <Th>Envía</Th>
              <Th>Recibe</Th>
              <Th>Observaciones</Th>
              <Th>Remitos</Th>
              <Th className="text-right">Valor</Th>
              <Th>Forma de pago</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtrados.map((reparto) => (
              <tr key={reparto.id} className="hover:bg-zinc-50">
                <Td className="whitespace-nowrap">
                  <Link
                    href={`/repartos/${reparto.id}`}
                    className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
                  >
                    {formatFecha(reparto.fecha)}
                  </Link>
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
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}