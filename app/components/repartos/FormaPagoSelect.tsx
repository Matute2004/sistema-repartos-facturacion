"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { actualizarFormaPagoRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import { ETIQUETA_FORMA_PAGO, FORMAS_PAGO } from "@/lib/types";
import type { FormaPago } from "@/lib/types";
import { Select } from "@/app/components/ui/form";

/**
 * Desplegable de forma de pago en las tablas de repartos. Al elegir una opción
 * se guarda al instante (submit automático de la server action). La opción
 * "Por cobrar" (vacía) deja el reparto sin cobrar; recién al cobrarlo se elige
 * una forma de pago.
 */
export function FormaPagoSelect({
  repartoId,
  valorActual,
}: {
  repartoId: number;
  valorActual: FormaPago | null;
}) {
  const router = useRouter();
  const [estado, formAction, pending] = useActionState(
    actualizarFormaPagoRepartoAction,
    estadoInicial,
  );

  useEffect(() => {
    if (!pending && !estado.error) {
      router.refresh();
    }
  }, [pending, estado.error, router]);

  return (
    <form action={formAction} className="inline-flex">
      <input type="hidden" name="id" value={repartoId} />
      <Select
        name="forma_pago"
        value={valorActual ?? ""}
        disabled={pending}
        onChange={(evento) => {
          if (!pending) evento.currentTarget.form?.requestSubmit();
        }}
        className={`w-auto min-w-36 cursor-pointer py-1.5 ${valorActual ? "" : "text-zinc-400"}`}
        aria-label="Forma de pago del reparto"
        title={
          valorActual
            ? "Cambiar la forma de pago"
            : "Reparto sin cobrar: tocá para elegir la forma de pago"
        }
      >
        <option value="">— Por cobrar</option>
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