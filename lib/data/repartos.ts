import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type { EstadoReparto, Reparto } from "@/lib/types";

type Fila = Record<string, unknown>;

function mapearReparto(fila: Fila): Reparto {
  return {
    id: Number(fila.id),
    fecha: String(fila.fecha),
    estado: String(fila.estado) as EstadoReparto,
    chofer: fila.chofer ? String(fila.chofer) : null,
    vehiculo: fila.vehiculo ? String(fila.vehiculo) : null,
    notas: fila.notas ? String(fila.notas) : null,
    creadoEn: String(fila.creado_en),
  };
}

/** Lista repartos ordenados por fecha (más reciente primero). */
export async function listarRepartos(): Promise<Reparto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, fecha, estado, chofer, vehiculo, notas, creado_en
     FROM repartos
     ORDER BY fecha DESC, id DESC`,
  );
  return resultado.rows.map((fila) => mapearReparto(fila as Fila));
}

export interface DatosNuevoReparto {
  fecha: string; // YYYY-MM-DD
  estado?: EstadoReparto;
  chofer?: string;
  vehiculo?: string;
  notas?: string;
}

/** Crea un reparto y devuelve su id. */
export async function crearReparto(datos: DatosNuevoReparto): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO repartos (fecha, estado, chofer, vehiculo, notas)
     VALUES (?, ?, ?, ?, ?)`,
    [
      datos.fecha,
      datos.estado ?? "pendiente",
      datos.chofer ?? null,
      datos.vehiculo ?? null,
      datos.notas ?? null,
    ],
  );
  return Number(resultado.lastInsertRowid ?? 0);
}

/** Actualiza el estado de un reparto. */
export async function actualizarEstadoReparto(
  id: number,
  estado: EstadoReparto,
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE repartos SET estado = ? WHERE id = ?", [estado, id]);
}

/** Devuelve un reparto por id (o null si no existe). */
export async function obtenerReparto(id: number): Promise<Reparto | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, fecha, estado, chofer, vehiculo, notas, creado_en
     FROM repartos
     WHERE id = ?`,
    [id],
  );
  if (resultado.rows.length === 0) return null;
  return mapearReparto(resultado.rows[0] as Fila);
}

/** Asigna remitos (pendientes) a un reparto. Los remitos ya asignados o
 *  en otro estado se ignoran silenciosamente. */
export async function asignarRemitosAReparto(
  repartoId: number,
  remitoIds: number[],
): Promise<void> {
  if (remitoIds.length === 0) return;
  const db = await getDb();
  const statements: Array<InStatement> = remitoIds.map((remitoId) => ({
    sql: `UPDATE remitos SET reparto_id = ?
          WHERE id = ? AND estado = 'pendiente' AND reparto_id IS NULL`,
    args: [repartoId, remitoId] as InArgs,
  }));
  await db.batch(statements);
}

/** Elimina un reparto. Los remitos asignados quedan sin reparto (ON DELETE SET NULL). */
export async function eliminarReparto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM repartos WHERE id = ?", [id]);
}