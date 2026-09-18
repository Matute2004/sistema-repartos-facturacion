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

/** Normaliza el nombre del login: colapsa espacios y recorta. */
function normalizarNombre(nombre: string): string {
  return nombre.replace(/\s+/g, " ").trim();
}

/** Devuelve un usuario por su nombre exacto (case-insensitive).
 *  Optimización: usa batch() para ejecutar ambas búsquedas en una sola consulta HTTP
 *  (en lugar de 2 round-trips individuales que bloqueaban el login). */
export async function obtenerUsuarioPorNombre(
  nombre: string,
): Promise<Usuario | null> {
  const db = await getDb();
  const normalizado = normalizarNombre(nombre);
  if (!normalizado) return null;

  const primeraPalabra = normalizado.split(" ")[0];
  const haySegundaPalabra = primeraPalabra !== normalizado;

  // Ejecuta ambas búsquedas en una sola llamada HTTP con batch().
  // Si solo hay una palabra, batch ejecuta la misma consulta dos veces (seguro).
  const resultados = await db.batch([
    {
      sql: "SELECT * FROM usuarios WHERE nombre = ? COLLATE NOCASE LIMIT 1",
      args: [normalizado] as const,
    },
    haySegundaPalabra
      ? {
          sql: "SELECT * FROM usuarios WHERE nombre = ? COLLATE NOCASE LIMIT 1",
          args: [primeraPalabra] as const,
        }
      : {
          sql: "SELECT * FROM usuarios WHERE nombre = ? COLLATE NOCASE LIMIT 1",
          args: [normalizado] as const,
        },
  ]);

  // Primera búsqueda: nombre completo.
  if (resultados[0].rows.length > 0) {
    return mapearUsuario(resultados[0].rows[0] as FilaUsuario);
  }

  // Segunda búsqueda: primera palabra (solo si es distinta).
  if (haySegundaPalabra && resultados[1].rows.length > 0) {
    return mapearUsuario(resultados[1].rows[0] as FilaUsuario);
  }

  return null;
}

/** Actualiza el password de un usuario (guardado como scrypt `salt:hash`). */
export async function actualizarPassword(id: number, nuevoHash: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE usuarios SET password_hash = ?, actualizado_en = datetime('now') WHERE id = ?",
    [nuevoHash, id],
  );
}