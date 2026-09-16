"use client";

import { useActionState } from "react";
import { crearClienteAction } from "@/app/actions/clientes";
import { estadoInicial } from "@/app/actions/estado";
import type { Cliente } from "@/lib/types";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  Input,
  Textarea,
} from "@/app/components/ui/form";

/**
 * Campos en común entre alta y edición de cliente.
 * En edición (`cliente` presente) arranca con los datos cargados.
 */
export function CamposCliente({
  disabled = false,
  cliente,
}: {
  disabled?: boolean;
  cliente?: Cliente | null;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {cliente ? (
          <Field
            label="N° de cliente"
            htmlFor="numero"
            hint="Es el id del cliente: no se puede editar."
          >
            <Input
              id="numero"
              value={cliente.numero ?? ""}
              readOnly
              disabled
              tabIndex={-1}
              aria-readonly="true"
            />
          </Field>
        ) : (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 sm:col-span-2">
            El <strong>N° de cliente</strong> se asigna solo al guardar (es el
            id en la base) y no se puede editar.
          </div>
        )}
        <Field label="Nombre" htmlFor="nombre" required>
          <Input
            id="nombre"
            name="nombre"
            required
            defaultValue={cliente?.nombre ?? ""}
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
            defaultValue={cliente?.cuit ?? ""}
            placeholder="20-12345678-9"
            inputMode="numeric"
            disabled={disabled}
          />
        </Field>
        <Field label="Dirección" htmlFor="direccion">
          <Input
            id="direccion"
            name="direccion"
            defaultValue={cliente?.direccion ?? ""}
            placeholder="Calle, número, piso…"
            disabled={disabled}
          />
        </Field>
        <Field label="Localidad" htmlFor="localidad">
          <Input
            id="localidad"
            name="localidad"
            defaultValue={cliente?.localidad ?? ""}
            placeholder="Ej: San Nicolás"
            disabled={disabled}
          />
        </Field>
        <Field label="Teléfono" htmlFor="telefono">
          <Input
            id="telefono"
            name="telefono"
            defaultValue={cliente?.telefono ?? ""}
            placeholder="Ej: 336 412-3456"
            disabled={disabled}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={cliente?.email ?? ""}
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
          defaultValue={cliente?.notas ?? ""}
          placeholder="Forma de pago, horarios de entrega, observaciones…"
          disabled={disabled}
        />
      </Field>
      <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
        Todos los clientes se registran como <strong>cuenta corriente</strong>{" "}
        (clientes fijos): la deuda acumulada se controla desde este módulo.
      </p>
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