"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAction } from "@/app/actions/estado";
import { ESTADOS_REPARTO } from "@/lib/estados";
import {
  actualizarEstadoReparto,
  asignarRemitosAReparto,
  crearReparto,
  eliminarReparto,
} from "@/lib/data/repartos";
import type { EstadoReparto } from "@/lib/types";

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

// ----------------------------------------------------------------------------
// Alta de reparto
// ----------------------------------------------------------------------------
export async function crearRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  const fecha = texto(formData, "fecha");
  if (!fecha) {
    return { error: "La fecha del reparto es obligatoria." };
  }

  try {
    const repartoId = await crearReparto({
      fecha,
      estado: "pendiente",
      chofer: textoOpcional(formData, "chofer"),
      vehiculo: textoOpcional(formData, "vehiculo"),
      notas: textoOpcional(formData, "notas"),
    });

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
  redirect("/repartos");
}

// ----------------------------------------------------------------------------
// Cambio de estado de reparto
// ----------------------------------------------------------------------------
export async function actualizarEstadoRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
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
  return { error: null };
}

// ----------------------------------------------------------------------------
// Asignación de remitos a un reparto
// ----------------------------------------------------------------------------
export async function asignarRemitosAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
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
  return { error: null };
}

// ----------------------------------------------------------------------------
// Eliminación de reparto
// ----------------------------------------------------------------------------
export async function eliminarRepartoAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
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
  redirect("/repartos");
}