"use client";

import { useActionState } from "react";
import { actualizarFormaPagoRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import { ETIQUETA_FORMA_PAGO, FORMAS_PAGO } from "@/lib/types";
import type { FormaPago } from "@/lib/types";
import { Select } from "@/app/components/ui/form";

/**
 * Desplegable de forma de pago en la tabla de repartos. Al elegir una opción
 * se guarda al instante (submit automático de la server action).
 */
export function FormaPagoSelect({
  repartoId,
  valorActual,
}: {
  repartoId: number;
  valorActual: FormaPago;
}) {
  const [estado, formAction, pending] = useActionState(
    actualizarFormaPagoRepartoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="id" value={repartoId} />
      <Select
        name="forma_pago"
        value={valorActual}
        disabled={pending}
        onChange={(evento) => {
          if (!pending) evento.currentTarget.form?.requestSubmit();
        }}
        className="w-auto min-w-36 cursor-pointer py-1.5"
        aria-label="Forma de pago del reparto"
      >
        {FORMAS_PAGO.map((forma) => (
          <option key={forma} value={forma}>
            {ETIQUETA_FORMA_PAGO[forma]}
          </option>
        ))}
      </Select>
      {estado.error && (
        <span className="sr-only" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}