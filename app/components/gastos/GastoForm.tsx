"use client";

import { useActionState } from "react";
import { crearGastoAction } from "@/app/actions/gastos";
import { estadoInicial } from "@/app/actions/estado";
import { CATEGORIAS_GASTO, ETIQUETA_CATEGORIA, fechaHoyLocal } from "@/lib/types";
import {
  Button,
  Field,
  FormError,
  Input,
  Select,
} from "@/app/components/ui/form";

export function GastoForm() {
  const [estado, formAction, pending] = useActionState(
    crearGastoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={estado.error} />

      <Field label="Fecha" htmlFor="fecha" required>
        <Input
          id="fecha"
          name="fecha"
          type="date"
          required
          defaultValue={fechaHoyLocal()}
          disabled={pending}
        />
      </Field>

      <Field label="Categoría" htmlFor="categoria" required>
        <Select id="categoria" name="categoria" required disabled={pending}>
          {CATEGORIAS_GASTO.map((categoria) => (
            <option key={categoria} value={categoria}>
              {ETIQUETA_CATEGORIA[categoria]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Descripción" htmlFor="descripcion" required>
        <Input
          id="descripcion"
          name="descripcion"
          placeholder="Ej: Carga de combustible"
          required
          disabled={pending}
        />
      </Field>

      <Field label="Proveedor / lugar" htmlFor="proveedor">
        <Input
          id="proveedor"
          name="proveedor"
          placeholder="Ej: YPF Ruta 9"
          disabled={pending}
        />
      </Field>

      <Field
        label="Monto"
        htmlFor="monto"
        required
        hint="Usá punto o coma para los decimales, ej: 12.500,50"
      >
        <Input
          id="monto"
          name="monto"
          inputMode="decimal"
          placeholder="0,00"
          required
          disabled={pending}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar gasto"}
      </Button>
    </form>
  );
}