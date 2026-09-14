"use client";

import { useActionState, useState } from "react";
import { crearRepartoAction } from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";
import {
  ETIQUETA_FORMA_PAGO,
  fechaHoyLocal,
  FORMAS_PAGO,
  formatPesos,
  pesosACentavos,
} from "@/lib/types";
import type { RemitoDisponible } from "@/lib/data/remitos";
import type { ClienteSeleccion } from "@/lib/data/clientes";
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

export function RepartoForm({
  remitosDisponibles,
  clientes,
}: {
  remitosDisponibles: RemitoDisponible[];
  clientes: ClienteSeleccion[];
}) {
  const [estado, formAction, pending] = useActionState(
    crearRepartoAction,
    estadoInicial,
  );

  const [llevaRemito, setLlevaRemito] = useState(false);
  const [items, setItems] = useState<FilaItem[]>([
    { key: 0, descripcion: "", cantidad: "1", precio: "" },
  ]);
  const [cantidadDirecta, setCantidadDirecta] = useState("1");
  const [unidadDirecta, setUnidadDirecta] = useState("caja");
  const [valorDirecto, setValorDirecto] = useState("");

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

  const totalItemsCentavos = items.reduce(
    (total, fila) => total + Number(fila.cantidad) * pesosACentavos(fila.precio),
    0,
  );
  const totalDirectoCentavos = Number(cantidadDirecta) * pesosACentavos(valorDirecto);

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
        <Field
          label="Envía"
          htmlFor="enviado_por"
          required
          hint="Buscá un cliente existente en el desplegable, o escribí un nombre nuevo: el cliente se creará solo con ese dato."
        >
          <Input
            id="enviado_por"
            name="enviado_por"
            list="lista-clientes"
            placeholder="Ej: Juan Pérez"
            disabled={pending}
          />
          <datalist id="lista-clientes">
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.nombre} />
            ))}
          </datalist>
        </Field>
        <Field label="Recibe" htmlFor="recibido_por">
          <Input
            id="recibido_por"
            name="recibido_por"
            placeholder="Ej: María Gómez"
            disabled={pending}
          />
        </Field>
        <Field label="Forma de pago" htmlFor="forma_pago">
          <Select
            id="forma_pago"
            name="forma_pago"
            defaultValue="contado"
            disabled={pending}
          >
            {FORMAS_PAGO.map((forma) => (
              <option key={forma} value={forma}>
                {ETIQUETA_FORMA_PAGO[forma]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-zinc-200 p-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="lleva_remito"
            checked={llevaRemito}
            onChange={(evento) => setLlevaRemito(evento.target.checked)}
            disabled={pending}
            className="size-4 rounded border-zinc-300 accent-emerald-600"
          />
          <span className="text-sm font-medium text-zinc-800">
            Este reparto lleva remito
          </span>
        </label>
        <p className="mt-1 pl-7 text-xs text-zinc-500">
          Si lo tildás, emitís el remito acá mismo y queda asociado al cliente
          del campo “Envía”. Si no, cargás la mercadería directa del reparto
          (cantidad, unidad y valor).
        </p>
      </div>

      {llevaRemito ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">Remito incluido</p>
            <Button
              type="button"
              variant="secondary"
              onClick={agregarFila}
              disabled={pending}
            >
              + Agregar línea
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            El remito se emite a nombre del cliente del campo “Envía” y queda
            asignado a este reparto.
          </p>

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
                <Field
                  label={`Descripción ${indice + 1}`}
                  htmlFor={`desc-${fila.key}`}
                >
                  <Input
                    id={`desc-${fila.key}`}
                    name="item_descripcion"
                    placeholder="Ej: Caja de botellas 1,5 L"
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
            <span className="text-zinc-500">Total del remito</span>
            <span className="text-lg font-bold text-zinc-900">
              {formatPesos(totalItemsCentavos)}
            </span>
          </div>

          <Field label="Observaciones del remito" htmlFor="remito_observaciones">
            <Textarea
              id="remito_observaciones"
              name="remito_observaciones"
              rows={2}
              placeholder="Condiciones de entrega, vence, acuerdos…"
              disabled={pending}
            />
          </Field>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <p className="text-sm font-medium text-zinc-700">Mercadería del reparto</p>
          <div className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-12 sm:col-span-6">
              <Field label="Descripción" htmlFor="item_descripcion">
                <Input
                  id="item_descripcion"
                  name="item_descripcion"
                  placeholder="Ej: Caja surtida"
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Field label="Cantidad" htmlFor="cantidad">
                <Input
                  id="cantidad"
                  name="cantidad"
                  inputMode="decimal"
                  placeholder="1"
                  value={cantidadDirecta}
                  onChange={(e) => setCantidadDirecta(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Field label="Unidad" htmlFor="unidad">
                <Input
                  id="unidad"
                  name="unidad"
                  placeholder="caja"
                  value={unidadDirecta}
                  onChange={(e) => setUnidadDirecta(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
            <div className="col-span-4 sm:col-span-2">
              <Field label="Valor" htmlFor="item_precio">
                <Input
                  id="item_precio"
                  name="item_precio"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorDirecto}
                  onChange={(e) => setValorDirecto(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1 text-sm">
            <span className="text-zinc-500">Valor del reparto</span>
            <span className="text-lg font-bold text-zinc-900">
              {formatPesos(totalDirectoCentavos)}
            </span>
          </div>
        </div>
      )}

      <Field label="Observaciones del reparto" htmlFor="observaciones">
        <Textarea
          id="observaciones"
          name="observaciones"
          rows={2}
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