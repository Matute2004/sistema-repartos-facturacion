"use client";

import { useState } from "react";
import Link from "next/link";
import { formatFecha, formatPesos } from "@/lib/types";
import { Button } from "@/app/components/ui/form";

interface RemitoResumen {
  id: number;
  numero: number;
}

interface DetalleRemito {
  remito: {
    id: number;
    numero: number;
    repartoId: number | null;
    fecha: string;
    observaciones: string | null;
    valorCentavos: number;
    creadoEn: string;
  };
  reparto: {
    id: number;
    fecha: string;
    enviadoPor: string | null;
  } | null;
  cliente: {
    id: number;
    nombre: string;
    cuit: string | null;
    direccion: string | null;
    localidad: string | null;
    telefono: string | null;
  } | null;
  /** Nombre visible: el del cliente vinculado al reparto o el texto "Envía". */
  clienteNombre: string | null;
  items: Array<{
    id: number;
    remitoId: number;
    descripcion: string;
    cantidad: number;
    precioUnitarioCentavos: number;
  }>;
}

/**
 * Muestra los números de remito de un reparto como enlaces que abren un modal
 * con el detalle completo del remito (traído del route handler /api/remitos/[id]).
 */
export function RemitoModal({ remitos }: { remitos: RemitoResumen[] }) {
  const [abierto, setAbierto] = useState<DetalleRemito | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrirRemito(id: number) {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/remitos/${id}`);
      if (!respuesta.ok) {
        throw new Error(`Error ${respuesta.status}`);
      }
      const datos: DetalleRemito = await respuesta.json();
      setAbierto(datos);
    } catch {
      setError("No se pudo cargar el detalle del remito.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {remitos.map((remito) => (
          <button
            key={remito.id}
            type="button"
            onClick={() => abrirRemito(remito.id)}
            title={`Ver detalle del remito N° ${String(remito.numero).padStart(4, "0")}`}
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            {String(remito.numero).padStart(4, "0")}
          </button>
        ))}
      </div>

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del remito N° ${String(abierto.remito.numero).padStart(4, "0")}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAbierto(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Remito N° {String(abierto.remito.numero).padStart(4, "0")}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  {abierto.clienteNombre ?? "Sin reparto"} · emitido el{" "}
                  {formatFecha(abierto.remito.fecha)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="px-2.5 py-1.5"
                  onClick={() => setAbierto(null)}
                  aria-label="Cerrar detalle del remito"
                >
                  ✕
                </Button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {abierto.cliente &&
              (abierto.cliente.direccion ||
                abierto.cliente.cuit ||
                abierto.cliente.telefono) && (
                <div className="mt-3 space-y-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  {abierto.cliente.direccion && (
                    <p>
                      {abierto.cliente.direccion}
                      {abierto.cliente.localidad
                        ? `, ${abierto.cliente.localidad}`
                        : ""}
                    </p>
                  )}
                  {abierto.cliente.cuit && (
                    <p>CUIT/CUIL: {abierto.cliente.cuit}</p>
                  )}
                  {abierto.cliente.telefono && (
                    <p>Tel: {abierto.cliente.telefono}</p>
                  )}
                </div>
              )}

            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-300 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Descripción</th>
                  <th className="w-16 py-2 pr-4 text-center">Cant.</th>
                  <th className="w-28 py-2 pr-4 text-right">P. unitario</th>
                  <th className="w-28 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {abierto.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-4 text-zinc-900">{item.descripcion}</td>
                    <td className="py-2 pr-4 text-center text-zinc-700">
                      {item.cantidad}
                    </td>
                    <td className="py-2 pr-4 text-right text-zinc-700">
                      {formatPesos(item.precioUnitarioCentavos)}
                    </td>
                    <td className="py-2 text-right font-medium text-zinc-900">
                      {formatPesos(item.cantidad * item.precioUnitarioCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-900">
                  <td
                    colSpan={3}
                    className="py-2 text-right text-sm font-semibold text-zinc-900"
                  >
                    TOTAL
                  </td>
                  <td className="py-2 text-right text-base font-bold text-zinc-900">
                    {formatPesos(totalCentavos(abierto.items))}
                  </td>
                </tr>
              </tfoot>
            </table>

            {abierto.remito.observaciones && (
              <div className="mt-4 rounded-lg border border-zinc-200 p-3 text-sm text-zinc-600">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Observaciones
                </p>
                <p className="mt-1">{abierto.remito.observaciones}</p>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {cargando && (
                <span className="self-center text-sm text-zinc-500">Cargando…</span>
              )}
              <Button variant="ghost" onClick={() => setAbierto(null)}>
                Cerrar
              </Button>
              <Link
                href={`/remitos/${abierto.remito.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Abrir remito completo
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function totalCentavos(items: DetalleRemito["items"]): number {
  return items.reduce(
    (total, item) => total + item.cantidad * item.precioUnitarioCentavos,
    0,
  );
}