import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type { EstadoReparto, Reparto } from "@/lib/types";

type Fila = Record<string, unknown>;

function mapearReparto(fila: Fila): Reparto {
  return {
    id: Number(fila.id),
    fecha: String(fila.fecha),
    estado: String(fila.estado) as EstadoReparto,
    enviadoPor: fila.enviado_por ? String(fila.enviado_por) : null,
    recibidoPor: fila.recibido_por ? String(fila.recibido_por) : null,
    observaciones: fila.observaciones ? String(fila.observaciones) : null,
    valorCentavos: Number(fila.valor_centavos ?? 0),
    creadoEn: String(fila.creado_en),
  };
}

/** Lista repartos ordenados por fecha (más reciente primero) con el valor
 *  total de los remitos asignados (suma de items). */
export async function listarRepartos(): Promise<Reparto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT rp.id, rp.fecha, rp.estado,
            rp.chofer AS enviado_por, rp.vehiculo AS recibido_por,
            rp.notas AS observaciones, rp.creado_en,
            COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0) AS valor_centavos
     FROM repartos rp
     LEFT JOIN remitos rt ON rt.reparto_id = rp.id
     LEFT JOIN remito_items ri ON ri.remito_id = rt.id
     GROUP BY rp.id
     ORDER BY rp.fecha DESC, rp.id DESC`,
  );
  return resultado.rows.map((fila) => mapearReparto(fila as Fila));
}

export interface DatosNuevoReparto {
  fecha: string; // YYYY-MM-DD
  estado?: EstadoReparto;
  enviadoPor?: string;
  recibidoPor?: string;
  observaciones?: string;
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
      datos.enviadoPor ?? null,
      datos.recibidoPor ?? null,
      datos.observaciones ?? null,
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

/** Devuelve un reparto por id (o null si no existe) con el valor total de los
 *  remitos asignados (suma de items). */
export async function obtenerReparto(id: number): Promise<Reparto | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT rp.id, rp.fecha, rp.estado,
            rp.chofer AS enviado_por, rp.vehiculo AS recibido_por,
            rp.notas AS observaciones, rp.creado_en,
            COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0) AS valor_centavos
     FROM repartos rp
     LEFT JOIN remitos rt ON rt.reparto_id = rp.id
     LEFT JOIN remito_items ri ON ri.remito_id = rt.id
     WHERE rp.id = ?
     GROUP BY rp.id`,
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