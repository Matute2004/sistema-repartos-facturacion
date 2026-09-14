"use client";

import { useActionState, useMemo, useState } from "react";
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

  // Buscador de cliente (campo "Envía"): la lupa filtra los clientes
  // existentes y permite crear uno nuevo al vuelo con el nombre escrito.
  const [busqueda, setBusqueda] = useState("");
  const [clienteElegidoId, setClienteElegidoId] = useState<number | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const lista = termino
      ? clientes.filter((cliente) =>
          cliente.nombre.toLowerCase().includes(termino),
        )
      : clientes;
    return lista.slice(0, 8);
  }, [busqueda, clientes]);

  function elegirCliente(cliente: ClienteSeleccion) {
    setBusqueda(cliente.nombre);
    setClienteElegidoId(cliente.id);
    setListaAbierta(false);
  }

  function elegirNuevoCliente() {
    // El texto queda como está: la server action crea el cliente con ese nombre.
    setClienteElegidoId(null);
    setListaAbierta(false);
  }

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
          label="Cliente (Envía)"
          htmlFor="cliente_buscar"
          required
          hint="Buscá un cliente existente con la lupa, o escribí un nombre nuevo: el cliente se creará solo con ese dato."
        >
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                />
              </svg>
            </span>
            <Input
              id="cliente_buscar"
              name="enviado_por"
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={listaAbierta}
              aria-controls="lista-clientes-buscador"
              placeholder="Buscar cliente por nombre…"
              className="pl-10"
              value={busqueda}
              onChange={(evento) => {
                setBusqueda(evento.target.value);
                // Al editar el nombre ya no sabemos a qué cliente apuntaba.
                setClienteElegidoId(null);
                setListaAbierta(true);
              }}
              onFocus={() => setListaAbierta(true)}
              onBlur={() => setTimeout(() => setListaAbierta(false), 150)}
              disabled={pending}
            />
            <input type="hidden" name="cliente_id" value={clienteElegidoId ?? ""} />
            {listaAbierta && (
              <ul
                id="lista-clientes-buscador"
                className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
              >
                {clientesFiltrados.map((cliente) => (
                  <li key={cliente.id}>
                    <button
                      type="button"
                      onMouseDown={(evento) => evento.preventDefault()}
                      onTouchStart={(evento) => evento.preventDefault()}
                      onClick={() => elegirCliente(cliente)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <svg
                        className="size-4 shrink-0 text-zinc-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0"
                        />
                      </svg>
                      {cliente.nombre}
                    </button>
                  </li>
                ))}
                {clientesFiltrados.length === 0 && (
                  <li>
                    <button
                      type="button"
                      onMouseDown={(evento) => evento.preventDefault()}
                      onTouchStart={(evento) => evento.preventDefault()}
                      onClick={elegirNuevoCliente}
                      className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      + Crear cliente «{busqueda.trim()}»
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </Field>
        <Field label="Recibe" htmlFor="recibido_por">
          <Input
            id="recibido_por"
            name="recibido_por"
            placeholder="Ej: María Gómez"
            disabled={pending}
          />
        </Field>
        <Field
          label="Forma de pago"
          htmlFor="forma_pago"
          hint="Dejalo en «Por cobrar» si todavía no te lo pagan. Recién se elige cuando se cobra."
        >
          <Select
            id="forma_pago"
            name="forma_pago"
            defaultValue=""
            disabled={pending}
            className="text-zinc-500"
          >
            <option value="">— Por cobrar</option>
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
          (una o varias líneas con descripción, cantidad y valor).
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-700">
              Mercadería del reparto
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={agregarFila}
              disabled={pending}
            >
              + Agregar ítem
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Cargá una línea por ítem: una caja, una rueda, un teléfono… El valor
            se suma automáticamente.
          </p>

          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400">
              Todavía no hay ítems. Agregá al menos una línea.
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
                  htmlFor={`merc-desc-${fila.key}`}
                >
                  <Input
                    id={`merc-desc-${fila.key}`}
                    name="item_descripcion"
                    placeholder="Ej: Caja de botellas"
                    value={fila.descripcion}
                    onChange={(e) =>
                      actualizarFila(fila.key, "descripcion", e.target.value)
                    }
                    disabled={pending}
                  />
                </Field>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Field label="Cantidad" htmlFor={`merc-cant-${fila.key}`}>
                  <Input
                    id={`merc-cant-${fila.key}`}
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
                <Field label="Valor" htmlFor={`merc-prec-${fila.key}`}>
                  <Input
                    id={`merc-prec-${fila.key}`}
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
                  aria-label={`Quitar ítem ${indice + 1}`}
                  onClick={() => quitarFila(fila.key)}
                  disabled={pending}
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end gap-3 pt-1 text-sm">
            <span className="text-zinc-500">Valor del reparto</span>
            <span className="text-lg font-bold text-zinc-900">
              {formatPesos(totalItemsCentavos)}
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