"use client";

import { useActionState } from "react";
import { crearRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import { fechaHoyLocal } from "@/lib/types";
import type { RemitoDisponible } from "@/lib/data/remitos";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  Input,
  Textarea,
} from "@/app/components/ui/form";

export function RepartoForm({
  remitosDisponibles,
}: {
  remitosDisponibles: RemitoDisponible[];
}) {
  const [estado, formAction, pending] = useActionState(
    crearRepartoAction,
    estadoInicial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={estado.error} />

      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Envía" htmlFor="enviado_por">
          <Input
            id="enviado_por"
            name="enviado_por"
            placeholder="Ej: Juan Pérez"
            disabled={pending}
          />
        </Field>
        <Field label="Recibe" htmlFor="recibido_por">
          <Input
            id="recibido_por"
            name="recibido_por"
            placeholder="Ej: María Gómez"
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Observaciones" htmlFor="observaciones">
        <Textarea
          id="observaciones"
          name="observaciones"
          rows={3}
          placeholder="Observaciones de la hoja de ruta…"
          disabled={pending}
        />
      </Field>

      <Field
        label="Remitos a incluir"
        htmlFor="remitos-disponibles"
        hint={
          remitosDisponibles.length === 0
            ? "No hay remitos pendientes sin asignar. Podes crear uno y asignarlo después."
            : "Seleccioná los remitos pendientes que van en esta hoja de ruta."
        }
      >
        {remitosDisponibles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
            Aún no hay remitos pendientes sin asignar.
          </div>
        ) : (
          <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-3">
            {remitosDisponibles.map((remito) => (
              <label
                key={remito.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="remito_id"
                  value={remito.id}
                  disabled={pending}
                  className="h-4 w-4 rounded border-zinc-300 accent-emerald-600"
                />
                <span className="font-semibold text-zinc-900">
                  N° {String(remito.numero).padStart(4, "0")}
                </span>
                <span className="text-zinc-500">· {remito.clienteNombre}</span>
              </label>
            ))}
          </div>
        )}
      </Field>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar reparto"}
        </Button>
        <ButtonLink href="/repartos" disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}