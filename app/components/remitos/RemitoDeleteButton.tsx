"use client";

import { useActionState } from "react";
import { eliminarRemitoAction } from "@/app/actions/remitos";
import { estadoInicial } from "@/app/actions/estado";
import { Button, FormError } from "@/app/components/ui/form";

export function RemitoDeleteButton({ id }: { id: number }) {
  const [estado, formAction, pending] = useActionState(
    eliminarRemitoAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (!window.confirm("¿Eliminar este remito y sus líneas?")) {
          evento.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar remito"}
      </Button>
      {estado.error && <FormError message={estado.error} />}
    </form>
  );
}