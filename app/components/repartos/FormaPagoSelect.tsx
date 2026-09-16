"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
 *
 * Con «Cuenta corriente» y un reparto que todavía no tiene cliente vinculado,
 * si hay Flete Origen Y Flete Destino se pregunta cuál de las dos puntas es el
 * cliente que se registra (se crea con ese nombre si todavía no está cargado).
 */
export function FormaPagoSelect({
  repartoId,
  valorActual,
  enviadoPor,
  recibidoPor,
  clienteNombre,
}: {
  repartoId: number;
  valorActual: FormaPago | null;
  /** Texto del Flete Origen (quién envía el reparto). */
  enviadoPor: string | null;
  /** Texto del Flete Destino (quién recibe el reparto). */
  recibidoPor: string | null;
  /** Nombre del cliente vinculado al reparto, o null si no tiene cliente. */
  clienteNombre: string | null;
}) {
  const router = useRouter();
  const [estado, formAction, pending] = useActionState(
    actualizarFormaPagoRepartoAction,
    estadoInicial,
  );

  // Valor local del desplegable: permite mostrar "Cuenta corriente" mientras se
  // confirma el lado del cliente antes de hacer el submit. Se reinicia solo
  // cuando cambia la forma guardada: el padre usa `key={formaPago}`.
  const [valor, setValor] = useState(valorActual ?? "");
  const [preguntarCc, setPreguntarCc] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !estado.error) {
      router.refresh();
    }
  }, [pending, estado.error, router]);

  function alCambiar(valorNuevo: string) {
    setValor(valorNuevo);

    if (valorNuevo !== "cuenta_corriente") {
      setPreguntarCc(false);
      formRef.current?.requestSubmit();
      return;
    }

    // Si el reparto ya tiene cliente vinculado o falta alguna de las puntas,
    // no hay nada que elegir: se guarda directo (la acción usa el cliente ya
    // vinculado, o el Flete Origen y, a falta de él, el Flete Destino).
    const hayCliente = (clienteNombre ?? "").trim() !== "";
    const hayAmbosLados =
      (enviadoPor ?? "").trim() !== "" && (recibidoPor ?? "").trim() !== "";

    if (!hayCliente && hayAmbosLados) {
      setPreguntarCc(true);
      return;
    }
    setPreguntarCc(false);
    formRef.current?.requestSubmit();
  }

  function cancelar() {
    setPreguntarCc(false);
    setValor(valorActual ?? "");
  }

  return (
    <form ref={formRef} action={formAction} className="inline-block align-top">
      <input type="hidden" name="id" value={repartoId} />
      <Select
        name="forma_pago"
        value={valor}
        disabled={pending}
        onChange={(evento) => {
          if (!pending) alCambiar(evento.target.value);
        }}
        className={`w-auto min-w-36 cursor-pointer py-1.5 ${
          valorActual ? "text-emerald-700" : "text-red-600"
        }`}
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

      {preguntarCc && (
        <div className="mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl">
          <p className="text-sm font-medium text-zinc-800">
            Cliente en cuenta corriente
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Elegí cuál de las dos puntas es el cliente que queda registrado.
            Se crea con ese nombre si todavía no está cargado.
          </p>
          <div className="mt-2 space-y-1.5">
            <button
              type="submit"
              name="cliente_cc_lado"
              value="origen"
              onClick={() => setPreguntarCc(false)}
              disabled={pending}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="font-medium text-zinc-900">Flete Origen</span>
              <span className="truncate text-xs text-zinc-500">
                {enviadoPor}
              </span>
            </button>
            <button
              type="submit"
              name="cliente_cc_lado"
              value="destino"
              onClick={() => setPreguntarCc(false)}
              disabled={pending}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="font-medium text-zinc-900">Flete Destino</span>
              <span className="truncate text-xs text-zinc-500">
                {recibidoPor}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={cancelar}
            className="mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            Cancelar
          </button>
        </div>
      )}
      {estado.error && (
        <span className="sr-only" role="alert">
          {estado.error}
        </span>
      )}
    </form>
  );
}