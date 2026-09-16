"use client";

import { useActionState, useMemo, useState } from "react";
import { crearRemitoAction } from "@/app/actions/remitos";
import { estadoInicial } from "@/app/actions/estado";
import {
  fechaHoyLocal,
  formatFecha,
  formatPesos,
  pesosACentavos,
} from "@/lib/types";
import type { RepartoSeleccion } from "@/lib/data/repartos";
import {
  Button,
  ButtonLink,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from "@/app/components/ui/form";

interface FilaItem {
  key: number;
  descripcion: string;
  cantidad: string;
  precio: string;
}

let siguienteKey = 1;

export function RemitoForm({
  repartos,
  numeroProximo,
}: {
  repartos: RepartoSeleccion[];
  numeroProximo: number;
}) {
  const [estado, formAction, pending] = useActionState(
    crearRemitoAction,
    estadoInicial,
  );
  const [items, setItems] = useState<FilaItem[]>([
    { key: 0, descripcion: "", cantidad: "1", precio: "" },
  ]);

  const totalCentavos = useMemo(
    () =>
      items.reduce(
        (total, fila) => total + Number(fila.cantidad) * pesosACentavos(fila.precio),
        0,
      ),
    [items],
  );

  function actualizarFila(key: number, campo: keyof FilaItem, valor: string) {
    setItems((prev) =>
      prev.map((fila) => (fila.key === key ? { ...fila, [campo]: valor } : fila)),
    );
  }

  function agregarFila() {
    setItems((prev) => [
      ...prev,
      { key: siguienteKey, descripcion: "", cantidad: "1", precio: "" },
    ]);
    siguienteKey += 1;
  }

  function quitarFila(key: number) {
    setItems((prev) => prev.filter((fila) => fila.key !== key));
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={estado.error} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Reparto"
          htmlFor="reparto_id"
          required
          hint="El cliente del remito es el del reparto elegido."
        >
          <Select
            id="reparto_id"
            name="reparto_id"
            required
            disabled={pending}
            defaultValue=""
          >
            <option value="" disabled>
              Seleccioná un reparto…
            </option>
            {repartos.map((reparto) => (
              <option key={reparto.id} value={reparto.id}>
                Reparto del {formatFecha(reparto.fecha)} ·{" "}
                {reparto.clienteNombre ?? "Cliente no cargado"}
              </option>
            ))}
          </Select>
        </Field>
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
        <Field
          label="Número de remito"
          htmlFor="numero"
          hint={`Si lo dejás vacío se asigna el siguiente automáticamente: N° ${String(numeroProximo).padStart(4, "0")}`}
        >
          <Input
            id="numero"
            name="numero"
            inputMode="numeric"
            defaultValue={numeroProximo}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Detalle de mercadería</p>
          <Button
            type="button"
            variant="secondary"
            onClick={agregarFila}
            disabled={pending}
          >
            + Agregar línea
          </Button>
        </div>

        {items.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
            Todavía no hay líneas. Agregá al menos una.
          </p>
        )}

        {items.map((fila, indice) => (
          <div
            key={fila.key}
            className="grid grid-cols-12 items-end gap-2 rounded-lg border border-zinc-200 p-3"
          >
            <div className="col-span-12 sm:col-span-6">
              <Field label={`Descripción ${indice + 1}`} htmlFor={`desc-${fila.key}`}>
                <Input
                  id={`desc-${fila.key}`}
                  name="item_descripcion"
                  placeholder="Ej: Cajón de botellas 1,5 L"
                  value={fila.descripcion}
                  onChange={(e) =>
                    actualizarFila(fila.key, "descripcion", e.target.value)
                  }
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Field label="Cantidad" htmlFor={`cant-${fila.key}`} required>
                <Input
                  id={`cant-${fila.key}`}
                  name="item_cantidad"
                  inputMode="decimal"
                  placeholder="1"
                  value={fila.cantidad}
                  onChange={(e) =>
                    actualizarFila(fila.key, "cantidad", e.target.value)
                  }
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <Field label="Precio unitario" htmlFor={`prec-${fila.key}`}>
                <Input
                  id={`prec-${fila.key}`}
                  name="item_precio"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={fila.precio}
                  onChange={(e) =>
                    actualizarFila(fila.key, "precio", e.target.value)
                  }
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-12 flex items-center gap-2 sm:col-span-1 sm:justify-end">
              <Button
                type="button"
                variant="danger"
                className="px-2.5 py-2"
                aria-label={`Quitar línea ${indice + 1}`}
                onClick={() => quitarFila(fila.key)}
                disabled={pending}
              >
                ✕
              </Button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-end gap-3 pt-1 text-sm">
          <span className="text-zinc-500">Total</span>
          <span className="text-lg font-bold text-zinc-900">
            {formatPesos(totalCentavos)}
          </span>
        </div>
      </div>

      <Field label="Observaciones" htmlFor="observaciones">
        <Textarea
          id="observaciones"
          name="observaciones"
          rows={2}
          placeholder="Condiciones de entrega, vence, acuerdos…"
          disabled={pending}
        />
      </Field>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar remito"}
        </Button>
        <ButtonLink href="/remitos" disabled={pending}>
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}