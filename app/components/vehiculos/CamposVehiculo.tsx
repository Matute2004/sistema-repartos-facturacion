"use client";

import { useActionState } from "react";
import { crearVehiculoAction } from "@/app/actions/vehiculos";
import { estadoInicial } from "@/app/actions/estado";
import type { Vehiculo } from "@/lib/types";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  Input,
  Textarea,
} from "@/app/components/ui/form";

/**
 * Campos en común entre alta y edición de vehículo.
 * En edición (`vehiculo` presente) arranca con los datos cargados.
 */
export function CamposVehiculo({
  disabled = false,
  vehiculo,
}: {
  disabled?: boolean;
  vehiculo?: Vehiculo | null;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre / alias" htmlFor="nombre" required>
          <Input
            id="nombre"
            name="nombre"
            required
            defaultValue={vehiculo?.nombre ?? ""}
            placeholder="Ej: Furgón 1"
            disabled={disabled}
          />
        </Field>
        <Field label="Patente / dominio" htmlFor="patente">
          <Input
            id="patente"
            name="patente"
            defaultValue={vehiculo?.patente ?? ""}
            placeholder="Ej: AB 123 CD"
            disabled={disabled}
          />
        </Field>
        <Field label="Marca" htmlFor="marca">
          <Input
            id="marca"
            name="marca"
            defaultValue={vehiculo?.marca ?? ""}
            placeholder="Ej: Renault"
            disabled={disabled}
          />
        </Field>
        <Field label="Modelo" htmlFor="modelo">
          <Input
            id="modelo"
            name="modelo"
            defaultValue={vehiculo?.modelo ?? ""}
            placeholder="Ej: Kangoo"
            disabled={disabled}
          />
        </Field>
        <Field label="Año" htmlFor="anio">
          <Input
            id="anio"
            name="anio"
            type="number"
            min={1950}
            max={2100}
            step={1}
            defaultValue={vehiculo?.anio ?? ""}
            placeholder="Ej: 2021"
            inputMode="numeric"
            disabled={disabled}
          />
        </Field>
        <Field label="Kilómetros actuales" htmlFor="kilometros">
          <Input
            id="kilometros"
            name="kilometros"
            type="number"
            min={0}
            step={1}
            defaultValue={vehiculo?.kilometros ?? ""}
            placeholder="Ej: 84500"
            inputMode="numeric"
            disabled={disabled}
          />
        </Field>
        <Field
          label="Km del próximo service"
          htmlFor="km_proximo_service"
          hint="En cuántos km toca el próximo service."
        >
          <Input
            id="km_proximo_service"
            name="km_proximo_service"
            type="number"
            min={0}
            step={1}
            defaultValue={vehiculo?.kmProximoService ?? ""}
            placeholder="Ej: 95000"
            inputMode="numeric"
            disabled={disabled}
          />
        </Field>
        <Field
          label="Fecha del último service"
          htmlFor="fecha_ultimo_service"
        >
          <Input
            id="fecha_ultimo_service"
            name="fecha_ultimo_service"
            type="date"
            defaultValue={vehiculo?.fechaUltimoService ?? ""}
            disabled={disabled}
          />
        </Field>
      </div>
      <Field label="Notas" htmlFor="notas">
        <Textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={vehiculo?.notas ?? ""}
          placeholder="Seguro, vencimientos, observaciones…"
          disabled={disabled}
        />
      </Field>
    </>
  );
}

export function VehiculoForm() {
  const [estado, formAction, pending] = useActionState(
    crearVehiculoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={estado.error} />
      <CamposVehiculo disabled={pending} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar vehículo"}
        </Button>
        <ButtonLink href="/vehiculos" disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}