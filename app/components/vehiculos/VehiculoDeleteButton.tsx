"use client";

import { useActionState } from "react";
import { eliminarVehiculoAction } from "@/app/actions/vehiculos";
import { estadoInicial } from "@/app/actions/estado";
import { Button, FormError } from "@/app/components/ui/form";

export function VehiculoDeleteButton({
  id,
  nombre,
  texto = "Eliminar vehículo",
  variant = "ghost",
}: {
  id: number;
  nombre: string;
  texto?: string;
  variant?: "ghost" | "danger";
}) {
  const [estado, formAction, pending] = useActionState(
    eliminarVehiculoAction,
    estadoInicial,
  );

  return (
    <form
      action={formAction}
      onSubmit={(evento) => {
        if (
          !window.confirm(
            `¿Eliminar el vehículo "${nombre}"? Esta acción es definitiva.`,
          )
        ) {
          evento.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Eliminando…" : texto}
      </Button>
      <FormError message={estado.error} />
    </form>
  );
}