"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstadoRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import { ESTADOS_REPARTO, ETIQUETA_ESTADO_REPARTO } from "@/lib/estados";
import type { EstadoReparto } from "@/lib/types";
import {
  Button,
  Field,
  FormError,
  Select,
} from "@/app/components/ui/form";

export function EstadoRepartoForm({
  repartoId,
  estadoActual,
}: {
  repartoId: number;
  estadoActual: EstadoReparto;
}) {
  const router = useRouter();
  const [estado, formAction, pending] = useActionState(
    actualizarEstadoRepartoAction,
    estadoInicial,
  );

  useEffect(() => {
    if (!pending && !estado.error) {
      router.refresh();
    }
  }, [pending, estado.error, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={repartoId} />
      <div className="min-w-40">
        <Field label="Estado" htmlFor="estado-reparto">
          <Select
            id="estado-reparto"
            name="estado"
            disabled={pending}
            defaultValue={estadoActual}
          >
            {ESTADOS_REPARTO.map((estadoReparto) => (
              <option key={estadoReparto} value={estadoReparto}>
                {ETIQUETA_ESTADO_REPARTO[estadoReparto]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Aplicando…" : "Actualizar estado"}
      </Button>
      <FormError message={estado.error} />
    </form>
  );
}