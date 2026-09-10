"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAction } from "@/app/actions/estado";
import {
  actualizarCliente,
  crearCliente,
  eliminarCliente as eliminarClienteDb,
} from "@/lib/data/clientes";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOpcional(formData: FormData, campo: string): string | undefined {
  const valor = texto(formData, campo);
  return valor.length > 0 ? valor : undefined;
}

function normalizarCuit(cuit: string): string {
  return cuit.replace(/[^0-9-]/g, "").slice(0, 13);
}

// ----------------------------------------------------------------------------
// Alta de cliente
// ----------------------------------------------------------------------------
export async function crearClienteAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  const nombre = texto(formData, "nombre");
  if (!nombre) {
    return { error: "El nombre del cliente es obligatorio." };
  }

  try {
    await crearCliente({
      nombre,
      cuit: normalizarCuit(textoOpcional(formData, "cuit") ?? ""),
      direccion: textoOpcional(formData, "direccion"),
      localidad: textoOpcional(formData, "localidad"),
      telefono: textoOpcional(formData, "telefono"),
      email: textoOpcional(formData, "email"),
      notas: textoOpcional(formData, "notas"),
    });
  } catch (error) {
    console.error("[clientes] error al crear:", error);
    return {
      error: "No se pudo guardar el cliente. Revisá los datos e intentá de nuevo.",
    };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

// ----------------------------------------------------------------------------
// Modificación de cliente
// ----------------------------------------------------------------------------
export async function actualizarClienteAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  const id = Number(formData.get("id"));
  const nombre = texto(formData, "nombre");

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Cliente inválido." };
  }
  if (!nombre) {
    return { error: "El nombre del cliente es obligatorio." };
  }

  try {
    await actualizarCliente(id, {
      nombre,
      cuit: normalizarCuit(textoOpcional(formData, "cuit") ?? ""),
      direccion: textoOpcional(formData, "direccion"),
      localidad: textoOpcional(formData, "localidad"),
      telefono: textoOpcional(formData, "telefono"),
      email: textoOpcional(formData, "email"),
      notas: textoOpcional(formData, "notas"),
    });
  } catch (error) {
    console.error("[clientes] error al actualizar:", error);
    return {
      error: "No se pudo actualizar el cliente. Intentá de nuevo.",
    };
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

// ----------------------------------------------------------------------------
// Eliminación de cliente
// ----------------------------------------------------------------------------
export async function eliminarClienteAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Cliente inválido." };
  }

  try {
    await eliminarClienteDb(id);
  } catch (error) {
    console.error("[clientes] error al eliminar:", error);
    return {
      error: "No se pudo eliminar el cliente. Puede que tenga remitos asociados.",
    };
  }

  revalidatePath("/clientes");
  return { error: null };
}