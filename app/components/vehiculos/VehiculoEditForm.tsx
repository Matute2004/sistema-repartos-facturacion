"use client";

import { useActionState } from "react";
import { actualizarVehiculoAction } from "@/app/actions/vehiculos";
import { estadoInicial } from "@/app/actions/estado";
import {
  Button,
  ButtonLink,
  FormError,
} from "@/app/components/ui/form";
import { CamposVehiculo } from "@/app/components/vehiculos/CamposVehiculo";
import type { Vehiculo } from "@/lib/types";

export function VehiculoEditForm({ vehiculo }: { vehiculo: Vehiculo }) {
  const [estado, formAction, pending] = useActionState(
    actualizarVehiculoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={vehiculo.id} />
      <FormError message={estado.error} />
      <CamposVehiculo disabled={pending} vehiculo={vehiculo} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <ButtonLink href={`/vehiculos/${vehiculo.id}`} disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}