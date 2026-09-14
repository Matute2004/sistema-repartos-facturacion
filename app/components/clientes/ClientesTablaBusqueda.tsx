"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClienteResumen } from "@/lib/data/clientes";
import { Badge, Table, Td, Th } from "@/app/components/ui/display";
import { Input } from "@/app/components/ui/form";

/** Tabla de clientes con buscador arriba. Filtra por número, nombre,
 *  CUIT, dirección, localidad, teléfono o email. Recibe la vista liviana
 *  (sin notas internas ni fechas) para no exponer PII innecesaria. */
export function ClientesTablaBusqueda({
  clientes,
}: {
  clientes: ClienteResumen[];
}) {
  const [consulta, setConsulta] = useState("");

  const filtrados = useMemo(() => {
    const termino = consulta.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter((cliente) =>
      [
        cliente.numero != null ? String(cliente.numero) : null,
        cliente.nombre,
        cliente.cuit,
        cliente.direccion,
        cliente.localidad,
        cliente.telefono,
        cliente.email,
      ].some((valor) => valor != null && valor.toLowerCase().includes(termino)),
    );
  }, [clientes, consulta]);

  return (
    <div>
      <div className="border-b border-zinc-100 px-5 py-4">
        <div className="relative max-w-md">
          <label htmlFor="buscar-clientes" className="sr-only">
            Buscar cliente
          </label>
          <Input
            id="buscar-clientes"
            type="search"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar por número, nombre, CUIT, localidad…"
            autoComplete="off"
          />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">Sin resultados</p>
          <p className="mt-1 text-sm text-zinc-500">
            No hay clientes que coincidan con “{consulta}”.
          </p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>N°</Th>
              <Th>Cliente</Th>
              <Th>CUIT / CUIL</Th>
              <Th>Dirección</Th>
              <Th>Teléfono</Th>
              <Th>Email</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtrados.map((cliente) => (
              <tr key={cliente.id} className="hover:bg-zinc-50">
                <Td className="whitespace-nowrap font-semibold text-zinc-400">
                  {cliente.numero ?? <span className="text-zinc-300">—</span>}
                </Td>
                <Td>
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    {cliente.nombre}
                  </Link>
                </Td>
                <Td>
                  {cliente.cuit ?? (
                    <Badge tone="zinc">Sin CUIT</Badge>
                  )}
                </Td>
                <Td>
                  {[
                    cliente.direccion,
                    cliente.localidad,
                  ]
                    .filter(Boolean)
                    .join(", ") || <span className="text-zinc-400">—</span>}
                </Td>
                <Td>{cliente.telefono ?? <span className="text-zinc-400">—</span>}</Td>
                <Td>{cliente.email ?? <span className="text-zinc-400">—</span>}</Td>
                <Td className="text-right">
                  <Link
                    href={`/clientes/${cliente.id}/editar`}
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