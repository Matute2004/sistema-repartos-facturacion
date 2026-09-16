"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClienteResumen } from "@/lib/data/clientes";
import { formatCuit, formatPesos } from "@/lib/types";
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
  const [ordenDeuda, setOrdenDeuda] = useState(false);

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

  const visibles = useMemo(() => {
    if (!ordenDeuda) return filtrados;
    return [...filtrados].sort((a, b) => b.deudaCentavos - a.deudaCentavos);
  }, [filtrados, ordenDeuda]);

  const totalDeuda = visibles.reduce((acc, c) => acc + c.deudaCentavos, 0);

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

      {visibles.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">Sin resultados</p>
          <p className="mt-1 text-sm text-zinc-500">
            No hay clientes que coincidan con “{consulta}”.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-end gap-2 border-b border-zinc-100 px-5 py-3 text-sm text-zinc-500">
            Total por cobrar:{" "}
            <span className="font-semibold text-zinc-900">
              {formatPesos(totalDeuda)}
            </span>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>N°</Th>
                <Th>Cliente</Th>
                <Th>CUIT / CUIL</Th>
                <Th>Dirección</Th>
                <Th>Teléfono</Th>
                <Th>Email</Th>
                <Th className="text-right">
                  <button
                    type="button"
                    onClick={() => setOrdenDeuda((actual) => !actual)}
                    className={`group inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                      ordenDeuda ? "text-emerald-700" : ""
                    }`}
                    title="Ordenar por deuda, de mayor a menor"
                    aria-label={`Ordenar por deuda ${
                      ordenDeuda ? "(activado, de mayor a menor)" : "(sin orden)"
                    }`}
                  >
                    Debe
                    <span aria-hidden className="text-[10px]">
                      {ordenDeuda ? "▼" : "⇅"}
                    </span>
                  </button>
                </Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibles.map((cliente) => (
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
                    </Link>{" "}
                    {cliente.esCuentaCorriente && (
                      <Badge tone="sky">Cuenta corriente</Badge>
                    )}
                  </Td>
                  <Td>
                    {cliente.cuit ? (
                      <span className="whitespace-nowrap">
                        {formatCuit(cliente.cuit)}
                      </span>
                    ) : (
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
                  <Td className="whitespace-nowrap text-right font-semibold">
                    {cliente.deudaCentavos > 0 ? (
                      <span className="text-red-600">
                        {formatPesos(cliente.deudaCentavos)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </Td>
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
        </div>
      )}
    </div>
  );
}