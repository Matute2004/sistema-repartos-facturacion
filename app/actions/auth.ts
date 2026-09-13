"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { EstadoAction, EstadoCuenta } from "@/app/actions/estado";
import { obtenerUsuarioActual } from "@/lib/auth";
import { obtenerUsuarioPorNombre, actualizarPassword } from "@/lib/data/usuarios";
import {
  crearCookieSesion,
  NOMBRE_COOKIE_SESION,
} from "@/lib/sesion";
import { hashearPassword, verificarPassword } from "@/lib/passwords";

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * La cookie de sesión debe marcarse `Secure` solo cuando la conexión es
 * realmente HTTPS (ej: Vercel). Si se hostea con `next start` por http
 * (localhost o red local) y la marcamos Secure, el navegador no la guarda y
 * el login "no encuentra la página" tras entrar.
 */
async function esConexionSegura(): Promise<boolean> {
  const encabezados = await headers();
  const proto = (encabezados.get("x-forwarded-proto") ?? "").toLowerCase();
  const ssl = (encabezados.get("x-forwarded-ssl") ?? "").toLowerCase();
  return proto === "https" || ssl === "on";
}

// ----------------------------------------------------------------------------
// Iniciar sesión
// ----------------------------------------------------------------------------
export async function iniciarSesionAction(
  _estado: EstadoAction,
  formData: FormData,
): Promise<EstadoAction> {
  const nombre = texto(formData, "nombre");
  const password = texto(formData, "password");

  if (!nombre || !password) {
    return { error: "Ingresá tu usuario y contraseña." };
  }

  const usuario = await obtenerUsuarioPorNombre(nombre);
  if (!usuario || !verificarPassword(password, usuario.passwordHash)) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(NOMBRE_COOKIE_SESION, crearCookieSesion(usuario.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production" && (await esConexionSegura()),
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  redirect("/");
}

// ----------------------------------------------------------------------------
// Cerrar sesión
// ----------------------------------------------------------------------------
export async function cerrarSesionAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(NOMBRE_COOKIE_SESION);
  redirect("/login");
}

// ----------------------------------------------------------------------------
// Cambiar contraseña (anterior + nueva)
// ----------------------------------------------------------------------------
export async function cambiarPasswordAction(
  _estado: EstadoCuenta,
  formData: FormData,
): Promise<EstadoCuenta> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    redirect("/login");
  }

  const anterior = texto(formData, "password_anterior");
  const nueva = texto(formData, "password_nueva");

  if (!anterior || !nueva) {
    return { error: "Completá la contraseña anterior y la nueva.", ok: false };
  }
  if (nueva.length < 4) {
    return { error: "La contraseña nueva debe tener al menos 4 caracteres.", ok: false };
  }
  if (nueva === anterior) {
    return { error: "La contraseña nueva debe ser distinta a la anterior.", ok: false };
  }

  const enDB = await obtenerUsuarioPorNombre(usuario.nombre);
  if (!enDB || !verificarPassword(anterior, enDB.passwordHash)) {
    return { error: "La contraseña anterior no es correcta.", ok: false };
  }

  try {
    await actualizarPassword(usuario.id, hashearPassword(nueva));
  } catch (error) {
    console.error("[auth] error al cambiar password:", error);
    return { error: "No se pudo actualizar la contraseña. Intentá de nuevo.", ok: false };
  }

  return { error: null, ok: true };
}