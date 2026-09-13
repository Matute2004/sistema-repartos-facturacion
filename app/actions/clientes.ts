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

/** Lee el N° del cliente del form y lo valida como entero positivo. */
function leerNumero(formData: FormData): number | null {
  const textoNumero = texto(formData, "numero");
  if (!textoNumero) return null;
  const numero = Number(textoNumero.replace(/\D/g, ""));
  return Number.isInteger(numero) && numero > 0 ? numero : null;
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
  const numero = leerNumero(formData);
  if (numero == null) {
    return { error: "El N° del cliente es obligatorio y debe ser un número entero mayor a 0." };
  }

  try {
    await crearCliente({
      numero,
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
  revalidatePath("/");
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
  const numero = leerNumero(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Cliente inválido." };
  }
  if (!nombre) {
    return { error: "El nombre del cliente es obligatorio." };
  }
  if (numero == null) {
    return { error: "El N° del cliente es obligatorio y debe ser un número entero mayor a 0." };
  }

  try {
    await actualizarCliente(id, {
      numero,
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
  revalidatePath("/");
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
  revalidatePath("/");
  redirect("/");
}