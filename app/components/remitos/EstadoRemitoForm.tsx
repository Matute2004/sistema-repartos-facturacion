"use client";

import { useActionState } from "react";
import { actualizarEstadoRemitoAction } from "@/app/actions/remitos";
import { estadoInicial } from "@/app/actions/estado";
import { ESTADOS_REMITO, ETIQUETA_ESTADO_REMITO } from "@/lib/estados";
import type { EstadoRemito } from "@/lib/types";
import {
  Button,
  Field,
  FormError,
  Select,
} from "@/app/components/ui/form";

export function EstadoRemitoForm({
  remitoId,
  estadoActual,
}: {
  remitoId: number;
  estadoActual: EstadoRemito;
}) {
  const [estado, formAction, pending] = useActionState(
    actualizarEstadoRemitoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={remitoId} />
      <div className="min-w-40">
        <Field label="Estado" htmlFor="estado-remito">
          <Select
            id="estado-remito"
            name="estado"
            disabled={pending}
            defaultValue={estadoActual}
          >
            {ESTADOS_REMITO.map((estadoRemito) => (
              <option key={estadoRemito} value={estadoRemito}>
                {ETIQUETA_ESTADO_REMITO[estadoRemito]}
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