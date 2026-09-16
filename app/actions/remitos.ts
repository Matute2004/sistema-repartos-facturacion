"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAction } from "@/app/actions/estado";
import { exigirAdmin } from "@/lib/auth";
import {
  crearRemito,
  eliminarRemito,
  proximoNumeroRemito,
} from "@/lib/data/remitos";
import { pesosACentavos } from "@/lib/types";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOpcional(formData: FormData, campo: string): string | undefined {
  const valor = texto(formData, campo);
  return valor.length > 0 ? valor : undefined;
}

/** Reconstruye los items a partir de los campos repetidos del formulario. */
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
// Alta de remito
// ----------------------------------------------------------------------------
export async function crearRemitoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const repartoId = Number(formData.get("reparto_id"));
  const fecha = texto(formData, "fecha");

  // El remito pertenece a un reparto: el cliente sale del reparto elegido.
  if (!Number.isInteger(repartoId) || repartoId <= 0) {
    return { error: "Seleccioná el reparto del remito." };
  }
  if (!fecha) {
    return { error: "La fecha del remito es obligatoria." };
  }

  const items = itemsDelFormulario(formData);
  if (items.length === 0) {
    return {
      error: "Cargá al menos una línea con descripción y cantidad mayor a 0.",
    };
  }

  let remitoId: number;
  try {
    // N° de remito: si se escribe a mano (`numero`) se usa ese; si se deja
    // vacío, sigue la correlativa automática (`proximoNumeroRemito`).
    const numeroManual = Number(texto(formData, "numero"));
    const numero =
      Number.isInteger(numeroManual) && numeroManual > 0
        ? numeroManual
        : await proximoNumeroRemito();
    remitoId = await crearRemito({
      numero,
      repartoId,
      fecha,
      observaciones: textoOpcional(formData, "observaciones"),
      items,
    });
  } catch (error) {
    console.error("[remitos] error al crear:", error);
    return { error: "No se pudo guardar el remito. Intentá de nuevo." };
  }

  revalidatePath("/remitos");
  revalidatePath("/repartos");
  updateTag("remitos");
  updateTag("repartos");
  updateTag("clientes");
  redirect(`/remitos/${remitoId}`);
}

// ----------------------------------------------------------------------------
// Eliminación de remito
// ----------------------------------------------------------------------------
export async function eliminarRemitoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  await exigirAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Remito inválido." };
  }

  try {
    await eliminarRemito(id);
  } catch (error) {
    console.error("[remitos] error al eliminar:", error);
    return { error: "No se pudo eliminar el remito." };
  }

  revalidatePath("/remitos");
  updateTag("remitos");
  updateTag("repartos");
  updateTag("clientes");
  redirect("/remitos");
}