"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Vehiculo } from "@/lib/types";
import { formatFecha } from "@/lib/types";
import { Table, Td, Th } from "@/app/components/ui/display";
import { Input } from "@/app/components/ui/form";

/** Tabla de vehículos con buscador arriba. Filtra por nombre, patente, marca,
 *  modelo o año. */
export function VehiculosTablaBusqueda({ vehiculos }: { vehiculos: Vehiculo[] }) {
  const [consulta, setConsulta] = useState("");

  const filtrados = useMemo(() => {
    const termino = consulta.trim().toLowerCase();
    if (!termino) return vehiculos;
    return vehiculos.filter((vehiculo) =>
      [
        vehiculo.nombre,
        vehiculo.patente,
        vehiculo.marca,
        vehiculo.modelo,
        vehiculo.anio != null ? String(vehiculo.anio) : null,
      ].some((valor) => valor != null && valor.toLowerCase().includes(termino)),
    );
  }, [vehiculos, consulta]);

  return (
    <div>
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="relative max-w-md">
          <label htmlFor="buscar-vehiculos" className="sr-only">
            Buscar vehículo
          </label>
          <Input
            id="buscar-vehiculos"
            type="search"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar por nombre, patente, marca, modelo…"
            autoComplete="off"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">Sin resultados</p>
          <p className="mt-1 text-sm text-zinc-500">
            No hay vehículos que coincidan con “{consulta}”.
          </p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Vehículo</Th>
              <Th>Patente</Th>
              <Th>Marca / Modelo</Th>
              <Th className="text-right">Kilómetros</Th>
              <Th>Último service</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtrados.map((vehiculo) => (
              <tr key={vehiculo.id} className="hover:bg-zinc-50">
                <Td>
                  <Link
                    href={`/vehiculos/${vehiculo.id}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {vehiculo.nombre}
                  </Link>
                </Td>
                <Td>
                  {vehiculo.patente ?? <span className="text-zinc-400">—</span>}
                </Td>
                <Td>
                  {[vehiculo.marca, vehiculo.modelo]
                    .filter(Boolean)
                    .join(" ") || <span className="text-zinc-400">—</span>}
                </Td>
                <Td className="text-right tabular-nums">
                  {vehiculo.kilometros != null ? (
                    <span className="font-medium text-zinc-900">
                      {vehiculo.kilometros.toLocaleString("es-AR")} km
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {vehiculo.fechaUltimoService ? (
                    formatFecha(vehiculo.fechaUltimoService)
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/vehiculos/${vehiculo.id}/editar`}
                    className="text-sm font-medium text-zinc-500 hover:text-emerald-700"
                  >
                    Editar
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}