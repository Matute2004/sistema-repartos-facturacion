"use client";

import { useActionState } from "react";
import { actualizarClienteAction } from "@/app/actions/clientes";
import { estadoInicial } from "@/app/actions/estado";
import {
  Button,
  ButtonLink,
  FormError,
} from "@/app/components/ui/form";
import { CamposCliente } from "@/app/components/clientes/CamposCliente";
import type { Cliente } from "@/lib/types";

export function ClienteEditForm({ cliente }: { cliente: Cliente }) {
  const [estado, formAction, pending] = useActionState(
    actualizarClienteAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={cliente.id} />
      <FormError message={estado.error} />
      <CamposCliente disabled={pending} cliente={cliente} />
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <ButtonLink href={`/clientes/${cliente.id}`} disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}