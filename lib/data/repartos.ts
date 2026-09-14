import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type {
  EstadoReparto,
  FormaPago,
  Reparto,
  RepartoItem,
  RepartoRemitoLigero,
} from "@/lib/types";

type Fila = Record<string, unknown>;

function mapearReparto(fila: Fila): Reparto {
  const cobrado = Number(fila.cobrado ?? 0) === 1;
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
    items: [],
    formaPago: cobrado
      ? (String(fila.forma_pago ?? "contado") as FormaPago)
      : null,
    cobrado,
    valorCentavos: Number(fila.valor_centavos ?? 0),
    creadoEn: String(fila.creado_en),
    remitos: [],
  };
}

/**
 * SQL en común entre la lista y el detalle: reparto + cliente + valor total.
 * El valor suma los items de los remitos asignados y la mercadería directa
 * del reparto (`reparto_items`), que puede cargarse con o sin remito.
 */
const SQL_SELECCION_REPARTO = `
  SELECT rp.id, rp.fecha, rp.estado,
         rp.cliente_id, c.nombre AS cliente_nombre,
         rp.chofer AS enviado_por, rp.vehiculo AS recibido_por,
         rp.notas AS observaciones, rp.creado_en,
         rp.lleva_remito, rp.forma_pago, rp.cobrado,
         (
           (SELECT COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0)
            FROM remitos rt
            JOIN remito_items ri ON ri.remito_id = rt.id
            WHERE rt.reparto_id = rp.id)
           + (SELECT COALESCE(SUM(mi.cantidad * mi.precio_unitario_centavos), 0)
              FROM reparto_items mi
              WHERE mi.reparto_id = rp.id)
         ) AS valor_centavos
  FROM repartos rp
  LEFT JOIN clientes c ON c.id = rp.cliente_id
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
  await completarRepartos(db, repartos);
  return repartos;
}

/** Repartos de un cliente para su ficha, con la misma forma que el listado
 *  general: estado, valor, remitos asociados e items de mercadería. */
export async function listarRepartosDelCliente(
  clienteId: number,
): Promise<Reparto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `${SQL_SELECCION_REPARTO}
     WHERE rp.cliente_id = ?
     GROUP BY rp.id
     ORDER BY rp.fecha DESC, rp.id DESC`,
    [clienteId],
  );
  const repartos = resultado.rows.map((fila) => mapearReparto(fila as Fila));
  await completarRepartos(db, repartos);
  return repartos;
}

/** Asocia los remitos y los items de mercadería a repartos ya mapeados. */
async function completarRepartos(
  db: Awaited<ReturnType<typeof getDb>>,
  repartos: Reparto[],
): Promise<void> {
  if (repartos.length === 0) return;

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

  const resItems = await db.execute(
    `SELECT id, reparto_id, descripcion, cantidad, precio_unitario_centavos
     FROM reparto_items
     ORDER BY id ASC`,
  );
  const itemsPorReparto = new Map<number, RepartoItem[]>();
  for (const fila of resItems.rows) {
    const f = fila as Fila;
    const repartoId = Number(f.reparto_id);
    const lista = itemsPorReparto.get(repartoId) ?? [];
    lista.push({
      id: Number(f.id),
      repartoId,
      descripcion: String(f.descripcion),
      cantidad: Number(f.cantidad),
      precioUnitarioCentavos: Number(f.precio_unitario_centavos),
    });
    itemsPorReparto.set(repartoId, lista);
  }

  for (const reparto of repartos) {
    reparto.remitos = remitosPorReparto.get(reparto.id) ?? [];
    reparto.items = itemsPorReparto.get(reparto.id) ?? [];
  }
}

/** Un ítem de la mercadería directa al crear el reparto (cuando no lleva remito). */
export interface ItemMercaderiaNuevo {
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}

export interface DatosNuevoReparto {
  fecha: string; // YYYY-MM-DD
  estado?: EstadoReparto;
  /** Cliente vinculado al reparto (campo "Envía"). */
  clienteId?: number;
  enviadoPor?: string;
  recibidoPor?: string;
  observaciones?: string;
  /** Si el reparto lleva remito, se emite uno en el alta (además de la mercadería directa). */
  llevaRemito?: boolean;
  /** Líneas de mercadería directa (descripción, cantidad y valor). */
  itemsMercaderia?: ItemMercaderiaNuevo[];
  /** Forma de pago, o null si todavía no se cobró (queda "Por cobrar"). */
  formaPago?: FormaPago | null;
}

/** Crea un reparto (y sus líneas de mercadería directa) y devuelve su id. */
export async function crearReparto(datos: DatosNuevoReparto): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO repartos (fecha, estado, cliente_id, chofer, vehiculo, notas,
                           lleva_remito, forma_pago, cobrado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.fecha,
      datos.estado ?? "pendiente",
      datos.clienteId ?? null,
      datos.enviadoPor ?? null,
      datos.recibidoPor ?? null,
      datos.observaciones ?? null,
      datos.llevaRemito ? 1 : 0,
      datos.formaPago ?? "contado",
      datos.formaPago ? 1 : 0,
    ],
  );
  const id = Number(resultado.lastInsertRowid ?? 0);

  // La mercadería directa se guarda siempre (con o sin remito).
  const items = datos.itemsMercaderia ?? [];
  if (items.length > 0) {
    const statements: InStatement[] = items.map((item) => ({
      sql: `INSERT INTO reparto_items (reparto_id, descripcion, cantidad, precio_unitario_centavos)
            VALUES (?, ?, ?, ?)`,
      args: [
        id,
        item.descripcion,
        item.cantidad,
        item.precioUnitarioCentavos,
      ] as InArgs,
    }));
    await db.batch(statements);
  }

  return id;
}

/**
 * Guarda la forma de pago de un reparto y lo marca como cobrado. Si se pasa
 * null, el reparto vuelve a "Por cobrar" y la forma queda sin usar.
 */
export async function actualizarFormaPagoReparto(
  id: number,
  formaPago: FormaPago | null,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE repartos SET forma_pago = ?, cobrado = ? WHERE id = ?",
    [formaPago ?? "contado", formaPago ? 1 : 0, id],
  );
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
  const reparto = mapearReparto(resultado.rows[0] as Fila);
  await completarRepartos(db, [reparto]);
  return reparto;
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