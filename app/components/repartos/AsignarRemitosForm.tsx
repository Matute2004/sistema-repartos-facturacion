"use client";

import { useActionState } from "react";
import { asignarRemitosAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import type { RemitoDisponible } from "@/lib/data/remitos";
import { Button, FormError } from "@/app/components/ui/form";

export function AsignarRemitosForm({
  repartoId,
  remitosDisponibles,
}: {
  repartoId: number;
  remitosDisponibles: RemitoDisponible[];
}) {
  const [estado, formAction, pending] = useActionState(
    asignarRemitosAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="reparto_id" value={repartoId} />
      {remitosDisponibles.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No hay remitos pendientes sin asignar por el momento.
        </p>
      ) : (
        <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-3">
          {remitosDisponibles.map((remito) => (
            <label
              key={remito.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="remito_id"
                value={remito.id}
                disabled={pending}
                className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
              />
              <span className="font-semibold text-zinc-900">
                N° {String(remito.numero).padStart(4, "0")}
              </span>
              <span className="text-zinc-500">· {remito.clienteNombre}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Asignando…" : "Asignar remitos"}
        </Button>
        <FormError message={estado.error} />
      </div>
    </form>
  );
}