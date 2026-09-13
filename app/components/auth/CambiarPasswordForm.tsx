"use client";

import { useActionState } from "react";
import { cambiarPasswordAction } from "@/app/actions/auth";
import { estadoInicialCuenta } from "@/app/actions/estado";
import { Button, Field, FormError, Input } from "@/app/components/ui/form";

export function CambiarPasswordForm() {
  const [estado, formAction, pending] = useActionState(
    cambiarPasswordAction,
    estadoInicialCuenta,
  );
  const { error, ok } = estado;

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Contraseña anterior"
        htmlFor="password_anterior"
        required
        hint="Tu contraseña actual para confirmar el cambio."
      >
        <Input
          id="password_anterior"
          name="password_anterior"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="Contraseña nueva"
        htmlFor="password_nueva"
        required
        hint="Mínimo 4 caracteres y distinta a la anterior."
      >
        <Input
          id="password_nueva"
          name="password_nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={4}
        />
      </Field>

      {ok ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Contraseña actualizada correctamente.
        </div>
      ) : error ? (
        <FormError message={error} />
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}