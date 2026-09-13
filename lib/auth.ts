import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerUsuarioPorId } from "@/lib/data/usuarios";
import {
  NOMBRE_COOKIE_SESION,
  verificarCookieSesion,
} from "@/lib/sesion";
import type { Usuario, UsuarioSesion } from "@/lib/types";

/** Expone un usuario a partir de datos seguros de la DB (nunca el hash). */
function aSesion(usuario: Usuario): UsuarioSesion {
  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
}

/**
 * Devuelve el usuario autenticado de la request actual, o null si no hay
 * una cookie de sesión válida. Solo se usa del lado del servidor.
 */
export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const cookieStore = await cookies();
  const valor = cookieStore.get(NOMBRE_COOKIE_SESION)?.value;
  const sesion = verificarCookieSesion(valor);
  if (!sesion) return null;

  const usuario = await obtenerUsuarioPorId(sesion.usuarioId);
  if (!usuario) return null;
  return aSesion(usuario);
}

/**
 * Garantiza que haya una sesión activa; si no, redirige al login.
 * Pensado para Server Components/redirect() desde acciones.
 */
export async function exigirUsuario(): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    redirect("/login");
  }
  return usuario;
}