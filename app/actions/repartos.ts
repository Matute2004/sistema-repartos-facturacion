"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAction } from "@/app/actions/estado";
import { exigirAdmin } from "@/lib/auth";
import { obtenerClientePorNombre } from "@/lib/data/clientes";
import { ESTADOS_REPARTO } from "@/lib/estados";
import {
  actualizarEstadoReparto,
  actualizarFormaPagoReparto,
  asignarRemitosAReparto,
  crearReparto,
  eliminarReparto,
} from "@/lib/data/repartos";
import { crearRemito, proximoNumeroRemito } from "@/lib/data/remitos";
import { FORMAS_PAGO, pesosACentavos } from "@/lib/types";
import type { EstadoReparto, FormaPago } from "@/lib/types";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOpcional(formData: FormData, campo: string): string | undefined {
  const valor = texto(formData, campo);
  return valor.length > 0 ? valor : undefined;
}

function esEstadoReparto(valor: string): valor is EstadoReparto {
  return (ESTADOS_REPARTO as readonly string[]).includes(valor);
}

function esFormaPago(valor: string): valor is FormaPago {
  return (FORMAS_PAGO as readonly string[]).includes(valor);
}

/** Reconstruye los items del remito a partir de los campos repetidos del formulario. */
function itemsDelFormulario(formData: FormData): Array<{
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}> {
  const descripciones = formData
    .getAll("item_descripcion")
    .map((valor) => String(valor).trim());
  const cantidades = formData
    .getAll("item_cantidad")
    .map((valor) => Number(String(valor).replace(",", ".")));
  const precios = formData.getAll("item_precio").map((valor) =>
    pesosACentavos(String(valor)),
  );

  return itemsDesdeCampos(descripciones, cantidades, precios);
}

/** Reconstruye la mercadería directa del reparto (campos `reparto_item_*`). */
function itemsRepartoDelFormulario(formData: FormData): Array<{
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}> {
  const descripciones = formData
    .getAll("reparto_item_descripcion")
    .map((valor) => String(valor).trim());
  const cantidades = formData
    .getAll("reparto_item_cantidad")
    .map((valor) => Number(String(valor).replace(",", ".")));
  const precios = formData.getAll("reparto_item_precio").map((valor) =>
    pesosACentavos(String(valor)),
  );

  return itemsDesdeCampos(descripciones, cantidades, precios);
}

/** Arma los items descartando las líneas sin descripción o con cantidad inválida. */
function itemsDesdeCampos(
  descripciones: string[],
  cantidades: number[],
  precios: number[],
): Array<{
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}> {
  const items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitarioCentavos: number;
  }> = [];

  for (let i = 0; i < descripciones.length; i += 1) {
    const descripcion = descripciones[i];
    const cantidad = cantidades[i] ?? 0;
    if (!descripcion || !Number.isFinite(cantidad) || cantidad <= 0) continue;
    items.push({
      descripcion,
      cantidad,
      precioUnitarioCentavos: Math.max(0, precios[i] ?? 0),
    });
  }

  return items;
}

// ----------------------------------------------------------------------------
// Alta de reparto
// ----------------------------------------------------------------------------
export async function crearRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();

  const fecha = texto(formData, "fecha");
  if (!fecha) {
    return { error: "La fecha del reparto es obligatoria." };
  }

  const nombreEnvia = texto(formData, "enviado_por");
  if (!nombreEnvia) {
    return { error: "Completá quién envía (el cliente del reparto)." };
  }

  const llevaRemito = formData.get("lleva_remito") !== null;
  // Dejá la forma de pago vacía si el reparto todavía no se cobró: recién se
  // elige cuando efectivamente se cobra.
  const formaPagoValor = texto(formData, "forma_pago");
  const formaPago: FormaPago | null =
    formaPagoValor && esFormaPago(formaPagoValor) ? formaPagoValor : null;
  if (formaPagoValor && !esFormaPago(formaPagoValor)) {
    return { error: "Forma de pago inválida." };
  }

  // Si el reparto lleva remito, validamos los items antes de crear cualquier cosa.
  const itemsRemito = llevaRemito ? itemsDelFormulario(formData) : [];
  if (llevaRemito && itemsRemito.length === 0) {
    return {
      error:
        "Si el reparto lleva remito, cargá al menos una línea con descripción y cantidad mayor a 0.",
    };
  }

  try {
    // "Envía" se elige con el buscador de clientes (trae `cliente_id`) o por
    // nombre. El cliente tiene que estar en la lista de clientes: si no está
    // registrado, no se crea ni el cliente ni el reparto.
    const clienteIdEnviado = Number(formData.get("cliente_id"));
    let clienteId: number;
    if (Number.isInteger(clienteIdEnviado) && clienteIdEnviado > 0) {
      clienteId = clienteIdEnviado;
    } else {
      const clienteEncontrado = await obtenerClientePorNombre(nombreEnvia);
      if (clienteEncontrado == null) {
        return {
          error: `El cliente «${nombreEnvia}» no está registrado en la lista de clientes. Creálo primero en la sección Clientes.`,
        };
      }
      clienteId = clienteEncontrado;
    }

    const repartoId = await crearReparto({
      fecha,
      estado: "pendiente",
      clienteId,
      enviadoPor: nombreEnvia,
      recibidoPor: textoOpcional(formData, "recibido_por"),
      observaciones: textoOpcional(formData, "observaciones"),
      llevaRemito,
      formaPago,
      // Mercadería directa: varias líneas (descripción, cantidad y valor).
      // Se guarda siempre en reparto_items, incluso si el reparto lleva remito.
      itemsMercaderia: itemsRepartoDelFormulario(formData),
    });

    // Si lleva remito, lo emitimos en el mismo alta y queda asociado al cliente.
    if (llevaRemito && repartoId) {
      const numero = await proximoNumeroRemito();
      await crearRemito({
        numero,
        clienteId,
        fecha,
        repartoId,
        observaciones: textoOpcional(formData, "remito_observaciones"),
        items: itemsRemito,
      });
    }

    // Remitos pendientes ya existentes seleccionados en el formulario.
    const remitosSeleccionados = formData
      .getAll("remito_id")
      .map((valor) => Number(valor))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (repartoId && remitosSeleccionados.length > 0) {
      await asignarRemitosAReparto(repartoId, remitosSeleccionados);
    }
  } catch (error) {
    console.error("[repartos] error al crear:", error);
    return { error: "No se pudo guardar el reparto. Intentá de nuevo." };
  }

  revalidatePath("/repartos");
  updateTag("repartos");
  updateTag("remitos");
  updateTag("clientes");
  redirect("/repartos");
}

// ----------------------------------------------------------------------------
// Forma de pago (desplegable inline en el listado)
// ----------------------------------------------------------------------------
export async function actualizarFormaPagoRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const id = Number(formData.get("id"));
  const formaPagoValor = texto(formData, "forma_pago");

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Reparto inválido." };
  }
  if (formaPagoValor && !esFormaPago(formaPagoValor)) {
    return { error: "Forma de pago inválida." };
  }

  try {
    // La opción vacía ("Por cobrar") vuelve a dejar el reparto sin cobrar.
    const formaPago: FormaPago | null =
      formaPagoValor && esFormaPago(formaPagoValor) ? formaPagoValor : null;
    await actualizarFormaPagoReparto(id, formaPago);
  } catch (error) {
    console.error("[repartos] error al actualizar forma de pago:", error);
    return { error: "No se pudo actualizar la forma de pago." };
  }

  revalidatePath(`/repartos/${id}`);
  revalidatePath("/repartos");
  updateTag("repartos");
  updateTag("remitos");
  updateTag("clientes");
  return { error: null };
}

// ----------------------------------------------------------------------------
// Cambio de estado de reparto
// ----------------------------------------------------------------------------
export async function actualizarEstadoRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const id = Number(formData.get("id"));
  const nuevoEstado = texto(formData, "estado");

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Reparto inválido." };
  }
  if (!esEstadoReparto(nuevoEstado)) {
    return { error: "Estado inválido." };
  }

  try {
    await actualizarEstadoReparto(id, nuevoEstado);
  } catch (error) {
    console.error("[repartos] error al actualizar estado:", error);
    return { error: "No se pudo actualizar el estado del reparto." };
  }

  revalidatePath(`/repartos/${id}`);
  revalidatePath("/repartos");
  updateTag("repartos");
  updateTag("remitos");
  updateTag("clientes");
  return { error: null };
}

// ----------------------------------------------------------------------------
// Asignación de remitos a un reparto
// ----------------------------------------------------------------------------
export async function asignarRemitosAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const repartoId = Number(formData.get("reparto_id"));
  if (!Number.isInteger(repartoId) || repartoId <= 0) {
    return { error: "Reparto inválido." };
  }

  const remitosSeleccionados = formData
    .getAll("remito_id")
    .map((valor) => Number(valor))
    .filter((id) => Number.isInteger(id) && id > 0);

  try {
    await asignarRemitosAReparto(repartoId, remitosSeleccionados);
  } catch (error) {
    console.error("[repartos] error al asignar remitos:", error);
    return { error: "No se pudieron asignar los remitos." };
  }

  revalidatePath(`/repartos/${repartoId}`);
  revalidatePath("/repartos");
  updateTag("repartos");
  updateTag("remitos");
  updateTag("clientes");
  return { error: null };
}

// ----------------------------------------------------------------------------
// Eliminación de reparto
// ----------------------------------------------------------------------------
export async function eliminarRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Reparto inválido." };
  }

  try {
    await eliminarReparto(id);
  } catch (error) {
    console.error("[repartos] error al eliminar:", error);
    return { error: "No se pudo eliminar el reparto." };
  }

  revalidatePath("/repartos");
  updateTag("repartos");
  updateTag("remitos");
  updateTag("clientes");
  redirect("/repartos");
}