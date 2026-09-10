"use client";

import { useActionState } from "react";
import { eliminarClienteAction } from "@/app/actions/clientes";
import { estadoInicial } from "@/app/actions/estado";
import { Button, FormError } from "@/app/components/ui/form";

export function ClienteDeleteButton({ id, nombre }: { id: number; nombre: string }) {
  const [estado, formAction, pending] = useActionState(
    eliminarClienteAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (
          !window.confirm(
            `¿Eliminar a "${nombre}"? Esta acción es definitiva.`,
          )
        ) {
          evento.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar cliente"}
      </Button>
      <FormError message={estado.error} />
    </form>
  );
}