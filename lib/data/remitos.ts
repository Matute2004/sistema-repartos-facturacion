import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type { Cliente, EstadoRemito, Remito, RemitoItem } from "@/lib/types";

type Fila = Record<string, unknown>;

export type RemitoConCliente = Remito & { clienteNombre: string };

function mapearRemito(fila: Fila): Remito {
  return {
    id: Number(fila.id),
    numero: Number(fila.numero),
    clienteId: Number(fila.cliente_id),
    repartoId: fila.reparto_id ? Number(fila.reparto_id) : null,
    fecha: String(fila.fecha),
    estado: String(fila.estado) as EstadoRemito,
    observaciones: fila.observaciones ? String(fila.observaciones) : null,
    creadoEn: String(fila.creado_en),
  };
}

/** Lista remitos con el nombre del cliente, los más recientes primero. */
export async function listarRemitos(): Promise<RemitoConCliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT r.id, r.numero, r.cliente_id, r.reparto_id, r.fecha, r.estado,
            r.observaciones, r.creado_en, c.nombre AS cliente_nombre
     FROM remitos r
     JOIN clientes c ON c.id = r.cliente_id
     ORDER BY r.fecha DESC, r.id DESC`,
  );
  return resultado.rows.map((fila) => {
    const filaComoRemito = fila as Fila;
    return {
      ...mapearRemito(filaComoRemito),
      clienteNombre: String(filaComoRemito.cliente_nombre),
    };
  });
}

/** Devuelve un remito por id (o null si no existe). */
export async function obtenerRemito(id: number): Promise<Remito | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, numero, cliente_id, reparto_id, fecha, estado, observaciones, creado_en
     FROM remitos
     WHERE id = ?`,
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
  clienteId: number;
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
    sql: `INSERT INTO remitos (numero, cliente_id, fecha, estado, observaciones)
          VALUES (?, ?, ?, 'pendiente', ?)`,
    args: [datos.numero, datos.clienteId, datos.fecha, datos.observaciones ?? null],
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
  clienteNombre: string;
}

/** Remitos pendientes que todavía no están asignados a ningún reparto. */
export async function listarRemitosPendientesSinAsignar(): Promise<
  RemitoDisponible[]
> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT r.id, r.numero, r.fecha, c.nombre AS cliente_nombre
     FROM remitos r
     JOIN clientes c ON c.id = r.cliente_id
     WHERE r.estado = 'pendiente' AND r.reparto_id IS NULL
     ORDER BY r.numero ASC`,
  );
  return resultado.rows.map((fila) => {
    const f = fila as Fila;
    return {
      id: Number(f.id),
      numero: Number(f.numero),
      fecha: String(f.fecha),
      clienteNombre: String(f.cliente_nombre),
    };
  });
}

/** Remitos asignados a un reparto, con nombre de cliente. */
export async function listarRemitosDelReparto(
  repartoId: number,
): Promise<RemitoConCliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT r.id, r.numero, r.cliente_id, r.reparto_id, r.fecha, r.estado,
            r.observaciones, r.creado_en, c.nombre AS cliente_nombre
     FROM remitos r
     JOIN clientes c ON c.id = r.cliente_id
     WHERE r.reparto_id = ?
     ORDER BY r.numero ASC`,
    [repartoId],
  );
  return resultado.rows.map((fila) => {
    const f = fila as Fila;
    return { ...mapearRemito(f), clienteNombre: String(f.cliente_nombre) };
  });
}

/** Actualiza el estado de un remito (pendiente | entregado | cancelado). */
export async function actualizarEstadoRemito(
  id: number,
  estado: EstadoRemito,
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE remitos SET estado = ? WHERE id = ?", [estado, id]);
}

export interface RemitoCompleto {
  remito: Remito;
  cliente: Cliente;
  items: RemitoItem[];
}

/** Devuelve el remito con los datos del cliente y sus items (o null). */
export async function obtenerRemitoCompleto(
  id: number,
): Promise<RemitoCompleto | null> {
  const remito = await obtenerRemito(id);
  if (!remito) return null;

  const db = await getDb();
  const resCliente = await db.execute("SELECT * FROM clientes WHERE id = ?", [
    remito.clienteId,
  ]);
  if (resCliente.rows.length === 0) return null;

  const resItems = await db.execute(
    `SELECT id, remito_id, descripcion, cantidad, precio_unitario_centavos
     FROM remito_items
     WHERE remito_id = ?
     ORDER BY id ASC`,
    [id],
  );

  const clienteFila = resCliente.rows[0] as Fila;
  const cliente: Cliente = {
    id: Number(clienteFila.id),
    nombre: String(clienteFila.nombre),
    cuit: clienteFila.cuit ? String(clienteFila.cuit) : null,
    direccion: clienteFila.direccion ? String(clienteFila.direccion) : null,
    localidad: clienteFila.localidad ? String(clienteFila.localidad) : null,
    telefono: clienteFila.telefono ? String(clienteFila.telefono) : null,
    email: clienteFila.email ? String(clienteFila.email) : null,
    notas: clienteFila.notas ? String(clienteFila.notas) : null,
    creadoEn: String(clienteFila.creado_en),
    actualizadoEn: String(clienteFila.actualizado_en),
  };

  const items: RemitoItem[] = resItems.rows.map((fila) => {
    const f = fila as Fila;
    return {
      id: Number(f.id),
      remitoId: Number(f.remito_id),
      descripcion: String(f.descripcion),
      cantidad: Number(f.cantidad),
      precioUnitarioCentavos: Number(f.precio_unitario_centavos),
    };
  });

  return { remito, cliente, items };
}