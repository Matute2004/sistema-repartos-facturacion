"use client";

import { useActionState } from "react";
import { actualizarEstadoRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import type { EstadoReparto } from "@/lib/types";

/**
 * Casilla a la izquierda de cada reparto en el listado.
 * Tildada → estado "completado". Destildada → estado "pendiente".
 */
export function EstadoRepartoCheckbox({
  repartoId,
  estadoActual,
}: {
  repartoId: number;
  estadoActual: EstadoReparto;
}) {
  const [estado, formAction, pending] = useActionState(
    actualizarEstadoRepartoAction,
    estadoInicial,
  );
  const completado = estadoActual === "completado";

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="id" value={repartoId} />
      <input
        type="hidden"
        name="estado"
        value={completado ? "pendiente" : "completado"}
      />
      <input
        type="checkbox"
        checked={completado}
        disabled={pending}
        onChange={(evento) => {
          if (!pending) evento.currentTarget.form?.requestSubmit();
        }}
        className="size-5 cursor-pointer rounded border-zinc-300 accent-emerald-600"
        title={
          completado
            ? "Reparto completado. Destildá para volver a pendiente."
            : "Tildá para marcar el reparto como completado."
        }
        aria-label={
          completado ? "Reparto completado" : "Marcar reparto como completado"
        }
      />
      {estado.error && (
        <span className="sr-only" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}