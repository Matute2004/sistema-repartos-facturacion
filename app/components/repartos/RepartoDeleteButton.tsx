"use client";

import { useActionState } from "react";
import { eliminarRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import { Button, FormError } from "@/app/components/ui/form";

export function RepartoDeleteButton({ id }: { id: number }) {
  const [estado, formAction, pending] = useActionState(
    eliminarRepartoAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (!window.confirm("¿Eliminar este reparto? Los remitos asignados quedarán sin reparto.")) {
          evento.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar reparto"}
      </Button>
      {estado.error && <FormError message={estado.error} />}
    </form>
  );
}