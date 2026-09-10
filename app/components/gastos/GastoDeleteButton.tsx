"use client";

import { useActionState } from "react";
import { eliminarGastoAction } from "@/app/actions/gastos";
import { estadoInicial } from "@/app/actions/estado";
import { Button, FormError } from "@/app/components/ui/form";

export function GastoDeleteButton({
  id,
  descripcion,
}: {
  id: number;
  descripcion: string;
}) {
  const [estado, formAction, pending] = useActionState(
    eliminarGastoAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (!window.confirm(`¿Eliminar el gasto "${descripcion}"?`)) {
          evento.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "…" : "Eliminar"}
      </Button>
      {estado.error && <FormError message={estado.error} />}
    </form>
  );
}