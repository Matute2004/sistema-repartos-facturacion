import { getDb } from "@/lib/db";
import type { Usuario } from "@/lib/types";

type FilaUsuario = Record<string, unknown>;

function mapearUsuario(fila: FilaUsuario): Usuario {
  return {
    id: Number(fila.id),
    nombre: String(fila.nombre),
    passwordHash: String(fila.password_hash),
    rol: (fila.rol as Usuario["rol"]) ?? "operador",
    creadoEn: String(fila.creado_en),
    actualizadoEn: String(fila.actualizado_en),
  };
}

/** Devuelve un usuario por su id (o null si no existe). */
export async function obtenerUsuarioPorId(id: number): Promise<Usuario | null> {
  const db = await getDb();
  const resultado = await db.execute("SELECT * FROM usuarios WHERE id = ?", [id]);
  if (resultado.rows.length === 0) return null;
  return mapearUsuario(resultado.rows[0] as FilaUsuario);
}

/** Devuelve un usuario por su nombre exacto (case-insensitive). */
export async function obtenerUsuarioPorNombre(
  nombre: string,
): Promise<Usuario | null> {
  const db = await getDb();
  const resultado = await db.execute(
    "SELECT * FROM usuarios WHERE nombre = ? COLLATE NOCASE LIMIT 1",
    [nombre.trim()],
  );
  if (resultado.rows.length === 0) return null;
  return mapearUsuario(resultado.rows[0] as FilaUsuario);
}

/** Actualiza el password de un usuario (guardado como scrypt `salt:hash`). */
export async function actualizarPassword(id: number, nuevoHash: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE usuarios SET password_hash = ?, actualizado_en = datetime('now') WHERE id = ?",
    [nuevoHash, id],
  );
}