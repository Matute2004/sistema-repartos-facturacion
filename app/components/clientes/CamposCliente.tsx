"use client";

import { useActionState } from "react";
import { crearClienteAction } from "@/app/actions/clientes";
import { estadoInicial } from "@/app/actions/estado";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  Input,
  Textarea,
} from "@/app/components/ui/form";

/** Campos en común entre alta y edición de cliente. */
export function CamposCliente({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="nombre" required>
          <Input
            id="nombre"
            name="nombre"
            required
            placeholder="Ej: Ferretería El Tornillo"
            disabled={disabled}
          />
        </Field>
        <Field
          label="CUIT / CUIL"
          htmlFor="cuit"
          hint="Opcional. Solo números y guiones."
        >
          <Input
            id="cuit"
            name="cuit"
            placeholder="20-12345678-9"
            inputMode="numeric"
            disabled={disabled}
          />
        </Field>
        <Field label="Dirección" htmlFor="direccion">
          <Input
            id="direccion"
            name="direccion"
            placeholder="Calle, número, piso…"
            disabled={disabled}
          />
        </Field>
        <Field label="Localidad" htmlFor="localidad">
          <Input
            id="localidad"
            name="localidad"
            placeholder="Ej: San Nicolás"
            disabled={disabled}
          />
        </Field>
        <Field label="Teléfono" htmlFor="telefono">
          <Input
            id="telefono"
            name="telefono"
            placeholder="Ej: 336 412-3456"
            disabled={disabled}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="cliente@empresa.com"
            disabled={disabled}
          />
        </Field>
      </div>
      <Field label="Notas" htmlFor="notas">
        <Textarea
          id="notas"
          name="notas"
          rows={3}
          placeholder="Forma de pago, horarios de entrega, observaciones…"
          disabled={disabled}
        />
      </Field>
    </>
  );
}

export function ClienteForm() {
  const [estado, formAction, pending] = useActionState(
    crearClienteAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={estado.error} />
      <CamposCliente disabled={pending} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cliente"}
        </Button>
        <ButtonLink href="/clientes" disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}