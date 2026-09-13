"use client";

import { useActionState } from "react";
import { iniciarSesionAction } from "@/app/actions/auth";
import { estadoInicial } from "@/app/actions/estado";
import { Button, Field, FormError, Input } from "@/app/components/ui/form";

export function LoginForm() {
  const [estado, formAction, pending] = useActionState(
    iniciarSesionAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Usuario" htmlFor="nombre" required>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="username"
          required
          autoFocus
          placeholder="Tu usuario"
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Tu contraseña"
        />
      </Field>

      <FormError message={estado.error} />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}