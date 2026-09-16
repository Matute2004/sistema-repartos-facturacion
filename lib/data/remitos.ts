import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type { Cliente, Remito, RemitoItem } from "@/lib/types";

type Fila = Record<string, unknown>;

export type RemitoConCliente = Remito & { clienteNombre: string | null };

function mapearRemito(fila: Fila): Remito {
  return {
    id: Number(fila.id),
    numero: Number(fila.numero),
    repartoId: fila.reparto_id ? Number(fila.reparto_id) : null,
    fecha: String(fila.fecha),
    observaciones: fila.observaciones ? String(fila.observaciones) : null,
    valorCentavos: Number(fila.valor_centavos ?? 0),
    creadoEn: String(fila.creado_en),
  };
}

/**
 * SQL en común: remito + nombre del cliente resuelto a través del reparto.
 * El remito NO tiene cliente propio: el cliente es el del reparto
 * (repartos.cliente_id -> clientes), o en su defecto el texto "Envía"
 * (repartos.enviado_por).
 */
const SQL_SELECCION_REMITO = `
  SELECT r.id, r.numero, r.reparto_id, r.fecha,
         r.observaciones, r.creado_en,
         COALESCE(c.nombre, rp.chofer) AS cliente_nombre,
         COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0) AS valor_centavos
  FROM remitos r
  LEFT JOIN repartos rp ON rp.id = r.reparto_id
  LEFT JOIN clientes c ON c.id = rp.cliente_id
  LEFT JOIN remito_items ri ON ri.remito_id = r.id
`;

/** Lista remitos con el nombre del cliente, los más recientes primero. */
export async function listarRemitos(): Promise<RemitoConCliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `${SQL_SELECCION_REMITO}
     GROUP BY r.id
     ORDER BY r.fecha DESC, r.id DESC`,
  );
  return resultado.rows.map((fila) => {
    const filaComoRemito = fila as Fila;
    return {
      ...mapearRemito(filaComoRemito),
      clienteNombre: filaComoRemito.cliente_nombre
        ? String(filaComoRemito.cliente_nombre)
        : null,
    };
  });
}

/** Devuelve un remito por id (o null si no existe) con su valor total.
 *  La suma se calcula igual que en `listarRemitos` para que el detalle nunca
 *  muestre $0 por error de mapeo. */
export async function obtenerRemito(id: number): Promise<Remito | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT r.id, r.numero, r.reparto_id, r.fecha,
            r.observaciones, r.creado_en,
            COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0) AS valor_centavos
     FROM remitos r
     LEFT JOIN remito_items ri ON ri.remito_id = r.id
     WHERE r.id = ?
     GROUP BY r.id`,
    [id],
  );
  if (resultado.rows.length === 0) return null;
  return mapearRemito(resultado.rows[0] as Fila);
}

/** Devuelve los items de un remito. */
export async function listarItemsDelRemito(
  remitoId: number,
): Promise<RemitoItem[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, remito_id, descripcion, cantidad, precio_unitario_centavos
     FROM remito_items
     WHERE remito_id = ?
     ORDER BY id ASC`,
    [remitoId],
  );
  return resultado.rows.map((fila) => {
    const f = fila as Fila;
    return {
      id: Number(f.id),
      remitoId: Number(f.remito_id),
      descripcion: String(f.descripcion),
      cantidad: Number(f.cantidad),
      precioUnitarioCentavos: Number(f.precio_unitario_centavos),
    };
  });
}

/**
 * Devuelve el próximo número correlativo de remito.
 * Usa el máximo fragmento de `numero` si existe, o empieza en 1.
 */
export async function proximoNumeroRemito(): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    "SELECT COALESCE(MAX(numero), 0) AS maximo FROM remitos",
  );
  return Number((resultado.rows[0] as Fila).maximo) + 1;
}

export interface DatosNuevoRemito {
  numero: number;
  /** Reparto al que pertenece el remito. El cliente se resuelve a través del reparto. */
  repartoId: number;
  fecha: string;
  observaciones?: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitarioCentavos: number;
  }>;
}

/** Crea un remito con sus items. Devuelve el id del remito. */
export async function crearRemito(datos: DatosNuevoRemito): Promise<number> {
  const db = await getDb();

  const insertRemito: InStatement = {
    sql: `INSERT INTO remitos (numero, reparto_id, fecha, observaciones)
          VALUES (?, ?, ?, ?)`,
    args: [
      datos.numero,
      datos.repartoId,
      datos.fecha,
      datos.observaciones ?? null,
    ],
  };

  const [resultado] = await db.batch([insertRemito]);
  const remitoId = Number(resultado.lastInsertRowid ?? 0);

  if (remitoId && datos.items.length > 0) {
    const insertsItems: Array<InStatement> = datos.items.map((item) => ({
      sql: `INSERT INTO remito_items (remito_id, descripcion, cantidad, precio_unitario_centavos)
            VALUES (?, ?, ?, ?)`,
      args: [
        remitoId,
        item.descripcion,
        item.cantidad,
        item.precioUnitarioCentavos,
      ] as InArgs,
    }));
    await db.batch(insertsItems);
  }

  return remitoId;
}

/** Elimina un remito (los items se borran en cascada). */
export async function eliminarRemito(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM remitos WHERE id = ?", [id]);
}

export interface RemitoDisponible {
  id: number;
  numero: number;
  fecha: string;
  /** Nombre del cliente del reparto; null si el remito todavía no tiene reparto. */
  clienteNombre: string | null;
}

/** Remitos que todavía no están asignados a ningún reparto (para agregarlos a la hoja de ruta). */
export async function listarRemitosSinAsignar(): Promise<RemitoDisponible[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT r.id, r.numero, r.fecha,
            COALESCE(c.nombre, rp.chofer) AS cliente_nombre
     FROM remitos r
     LEFT JOIN repartos rp ON rp.id = r.reparto_id
     LEFT JOIN clientes c ON c.id = rp.cliente_id
     WHERE r.reparto_id IS NULL
     ORDER BY r.numero ASC`,
  );
  return resultado.rows.map((fila) => {
    const f = fila as Fila;
    return {
      id: Number(f.id),
      numero: Number(f.numero),
      fecha: String(f.fecha),
      clienteNombre: f.cliente_nombre ? String(f.cliente_nombre) : null,
    };
  });
}

/** Remitos asignados a un reparto, con nombre de cliente. */
export async function listarRemitosDelReparto(
  repartoId: number,
): Promise<RemitoConCliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `${SQL_SELECCION_REMITO}
     WHERE r.reparto_id = ?
     GROUP BY r.id
     ORDER BY r.numero ASC`,
    [repartoId],
  );
  return resultado.rows.map((fila) => {
    const f = fila as Fila;
    return {
      ...mapearRemito(f),
      clienteNombre: f.cliente_nombre ? String(f.cliente_nombre) : null,
    };
  });
}

/** Contexto del reparto al que pertenece un remito (de dónde sale el cliente). */
export interface RepartoRemitoContext {
  id: number;
  fecha: string;
  enviadoPor: string | null;
}

export interface RemitoCompleto {
  remito: Remito;
  reparto: RepartoRemitoContext | null;
  /** Cliente registrado del reparto; null si el reparto no tiene cliente vinculado. */
  cliente: Cliente | null;
  /** Nombre visible: el del cliente vinculado o el texto "Envía" del reparto. */
  clienteNombre: string | null;
  items: RemitoItem[];
}

/** Devuelve el remito con el contexto del reparto, los datos del cliente
 *  (resueltos a través del reparto) y sus items (o null). */
export async function obtenerRemitoCompleto(
  id: number,
): Promise<RemitoCompleto | null> {
  const db = await getDb();

  // Remito + contexto del reparto + cliente (via reparto) + items en un solo
  // batch: un único round-trip HTTP a Turso.
  const [resRemito, resItems] = await db.batch([
    {
      sql: `SELECT r.id, r.numero, r.reparto_id, r.fecha,
                  r.observaciones, r.creado_en,
                  rp.id AS reparto_id_v, rp.fecha AS reparto_fecha,
                  rp.chofer AS enviado_por,
                  c.id AS cliente_id_v, c.numero AS cliente_numero,
                  c.nombre AS cliente_nombre, c.cuit AS cliente_cuit,
                  c.direccion AS cliente_direccion, c.localidad AS cliente_localidad,
                  c.telefono AS cliente_telefono, c.email AS cliente_email,
                  c.notas AS cliente_notas,
                  c.es_cuenta_corriente AS cliente_es_cuenta_corriente,
                  c.creado_en AS cliente_creado_en,
                  c.actualizado_en AS cliente_actualizado_en,
                  COALESCE(SUM(ri.cantidad * ri.precio_unitario_centavos), 0) AS valor_centavos
           FROM remitos r
           LEFT JOIN repartos rp ON rp.id = r.reparto_id
           LEFT JOIN clientes c ON c.id = rp.cliente_id
           LEFT JOIN remito_items ri ON ri.remito_id = r.id
           WHERE r.id = ?
           GROUP BY r.id`,
      args: [id],
    },
    {
      sql: `SELECT id, remito_id, descripcion, cantidad, precio_unitario_centavos
            FROM remito_items
            WHERE remito_id = ?
            ORDER BY id ASC`,
      args: [id],
    },
  ]);
  if (resRemito.rows.length === 0) return null;

  const fila = resRemito.rows[0] as Fila;
  const remito = mapearRemito(fila);

  const reparto: RepartoRemitoContext | null =
    fila.reparto_id_v != null
      ? {
          id: Number(fila.reparto_id_v),
          fecha: String(fila.reparto_fecha),
          enviadoPor: fila.enviado_por ? String(fila.enviado_por) : null,
        }
      : null;

  // El cliente se resuelve a través del reparto: solo existe si el reparto
  // tiene uno vinculado (repartos.cliente_id).
  const cliente: Cliente | null =
    fila.cliente_id_v != null
      ? {
          id: Number(fila.cliente_id_v),
          numero:
            fila.cliente_numero != null ? Number(fila.cliente_numero) : null,
          nombre: String(fila.cliente_nombre),
          cuit: fila.cliente_cuit ? String(fila.cliente_cuit) : null,
          direccion: fila.cliente_direccion
            ? String(fila.cliente_direccion)
            : null,
          localidad: fila.cliente_localidad
            ? String(fila.cliente_localidad)
            : null,
          telefono: fila.cliente_telefono
            ? String(fila.cliente_telefono)
            : null,
          email: fila.cliente_email ? String(fila.cliente_email) : null,
          notas: fila.cliente_notas ? String(fila.cliente_notas) : null,
          esCuentaCorriente: Number(fila.cliente_es_cuenta_corriente ?? 1) === 1,
          creadoEn: String(fila.cliente_creado_en),
          actualizadoEn: String(fila.cliente_actualizado_en),
        }
      : null;

  const clienteNombre = fila.cliente_nombre
    ? String(fila.cliente_nombre)
    : reparto?.enviadoPor ?? null;

  const items: RemitoItem[] = resItems.rows.map((filaItem) => {
    const f = filaItem as Fila;
    return {
      id: Number(f.id),
      remitoId: Number(f.remito_id),
      descripcion: String(f.descripcion),
      cantidad: Number(f.cantidad),
      precioUnitarioCentavos: Number(f.precio_unitario_centavos),
    };
  });

  return { remito, reparto, cliente, clienteNombre, items };
}