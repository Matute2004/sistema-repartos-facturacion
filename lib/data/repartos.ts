import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type {
  EstadoReparto,
  FormaPago,
  Reparto,
  RepartoRemitoLigero,
} from "@/lib/types";

type Fila = Record<string, unknown>;

function mapearReparto(fila: Fila): Reparto {
  return {
    id: Number(fila.id),
    fecha: String(fila.fecha),
    estado: String(fila.estado) as EstadoReparto,
    clienteId: fila.cliente_id != null ? Number(fila.cliente_id) : null,
    clienteNombre: fila.cliente_nombre ? String(fila.cliente_nombre) : null,
    enviadoPor: fila.enviado_por ? String(fila.enviado_por) : null,
    recibidoPor: fila.recibido_por ? String(fila.recibido_por) : null,
    observaciones: fila.observaciones ? String(fila.observaciones) : null,
    llevaRemito: Number(fila.lleva_remito ?? 0) === 1,
    unidad: fila.unidad ? String(fila.unidad) : null,
    cantidad: fila.cantidad != null ? Number(fila.cantidad) : null,
    itemDescripcion: fila.item_descripcion ? String(fila.item_descripcion) : null,
    itemPrecioUnitarioCentavos:
      fila.item_precio_unitario_centavos != null
        ? Number(fila.item_precio_unitario_centavos)
        : null,
    formaPago: String(fila.forma_pago ?? "contado") as FormaPago,
    valorCentavos: Number(fila.valor_centavos ?? 0),
    creadoEn: String(fila.creado_en),
    remitos: [],
  };
}

/**
 * SQL en común entre la lista y el detalle: reparto + cliente + valor total.
 * El valor suma los items de los remitos asignados y, cuando el reparto no
 * lleva remito, la mercadería directa del reparto (cantidad × precio unitario).
 */
const SQL_SELECCION_REPARTO = `
  SELECT rp.id, rp.fecha, rp.estado,
         rp.cliente_id, c.nombre AS cliente_nombre,
         rp.chofer AS enviado_por, rp.vehiculo AS recibido_por,
         rp.notas AS observaciones, rp.creado_en,
         rp.lleva_remito, rp.unidad, rp.cantidad,
         rp.item_descripcion, rp.item_precio_unitario_centavos,
         rp.forma_pago,
         (
           COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0)
           + CASE
               WHEN rp.lleva_remito = 0
               THEN COALESCE(
                      rp.item_precio_unitario_centavos * COALESCE(rp.cantidad, 0),
                      0
                    )
               ELSE 0
             END
         ) AS valor_centavos
  FROM repartos rp
  LEFT JOIN clientes c ON c.id = rp.cliente_id
  LEFT JOIN remitos rt ON rt.reparto_id = rp.id
  LEFT JOIN remito_items ri ON ri.remito_id = rt.id
`;

/** Lista repartos ordenados por fecha (más reciente primero) con el valor
 *  total (remitos asignados + mercadería directa) y los remitos asociados
 *  (id + número) para mostrarlos en la columna "Remitos". */
export async function listarRepartos(): Promise<Reparto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `${SQL_SELECCION_REPARTO}
     GROUP BY rp.id
     ORDER BY rp.fecha DESC, rp.id DESC`,
  );
  const repartos = resultado.rows.map((fila) => mapearReparto(fila as Fila));

  const resRemitos = await db.execute(
    `SELECT reparto_id, id, numero
     FROM remitos
     WHERE reparto_id IS NOT NULL
     ORDER BY numero ASC`,
  );
  const remitosPorReparto = new Map<number, RepartoRemitoLigero[]>();
  for (const fila of resRemitos.rows) {
    const f = fila as Fila;
    const repartoId = Number(f.reparto_id);
    const lista = remitosPorReparto.get(repartoId) ?? [];
    lista.push({ id: Number(f.id), numero: Number(f.numero) });
    remitosPorReparto.set(repartoId, lista);
  }
  for (const reparto of repartos) {
    reparto.remitos = remitosPorReparto.get(reparto.id) ?? [];
  }

  return repartos;
}

export interface DatosNuevoReparto {
  fecha: string; // YYYY-MM-DD
  estado?: EstadoReparto;
  /** Cliente vinculado al reparto (campo "Envía"). */
  clienteId?: number;
  enviadoPor?: string;
  recibidoPor?: string;
  observaciones?: string;
  /** Si el reparto lleva remito, la mercadería queda en el remito y no en el reparto. */
  llevaRemito?: boolean;
  unidad?: string;
  cantidad?: number;
  itemDescripcion?: string;
  itemPrecioUnitarioCentavos?: number;
  formaPago?: FormaPago;
}

/** Crea un reparto y devuelve su id. */
export async function crearReparto(datos: DatosNuevoReparto): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO repartos (fecha, estado, cliente_id, chofer, vehiculo, notas,
                           lleva_remito, unidad, cantidad, item_descripcion,
                           item_precio_unitario_centavos, forma_pago)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.fecha,
      datos.estado ?? "pendiente",
      datos.clienteId ?? null,
      datos.enviadoPor ?? null,
      datos.recibidoPor ?? null,
      datos.observaciones ?? null,
      datos.llevaRemito ? 1 : 0,
      datos.llevaRemito ? null : datos.unidad ?? "caja",
      datos.llevaRemito ? null : datos.cantidad ?? 1,
      datos.llevaRemito ? null : datos.itemDescripcion ?? null,
      datos.llevaRemito ? null : datos.itemPrecioUnitarioCentavos ?? 0,
      datos.formaPago ?? "contado",
    ],
  );
  return Number(resultado.lastInsertRowid ?? 0);
}

/** Actualiza la forma de pago de un reparto. */
export async function actualizarFormaPagoReparto(
  id: number,
  formaPago: FormaPago,
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE repartos SET forma_pago = ? WHERE id = ?", [
    formaPago,
    id,
  ]);
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
 *  remitos asignados y de su mercadería directa (suma de items). */
export async function obtenerReparto(id: number): Promise<Reparto | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `${SQL_SELECCION_REPARTO}
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