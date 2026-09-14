import { getDb } from "@/lib/db";
import type { InArgs, InStatement } from "@libsql/core/api";
import type { Cliente } from "@/lib/types";

type FilaCliente = Record<string, unknown>;

function mapearCliente(fila: FilaCliente): Cliente {
  return {
    id: Number(fila.id),
    numero: fila.numero != null ? Number(fila.numero) : null,
    nombre: String(fila.nombre),
    cuit: fila.cuit ? String(fila.cuit) : null,
    direccion: fila.direccion ? String(fila.direccion) : null,
    localidad: fila.localidad ? String(fila.localidad) : null,
    telefono: fila.telefono ? String(fila.telefono) : null,
    email: fila.email ? String(fila.email) : null,
    notas: fila.notas ? String(fila.notas) : null,
    creadoEn: String(fila.creado_en),
    actualizadoEn: String(fila.actualizado_en),
  };
}

/** Vista liviana para tablas/pantallas que no necesitan notas ni fechas.
 *  Evita exponer PII innecesaria (notas internas) en el payload que viaja al
 *  navegador desde la lista de clientes. */
export interface ClienteResumen {
  id: number;
  numero: number | null;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
}

/** Vista mínima para `<select>` de clientes (solo id + nombre). */
export interface ClienteSeleccion {
  id: number;
  nombre: string;
}

/** Lista todos los clientes ordenados por nombre. */
export async function listarClientes(): Promise<Cliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, numero, nombre, cuit, direccion, localidad, telefono, email, notas,
            creado_en, actualizado_en
     FROM clientes
     ORDER BY COALESCE(numero, 999999) ASC, nombre COLLATE NOCASE ASC`,
  );
  return resultado.rows.map((fila) => mapearCliente(fila as FilaCliente));
}

/** Lista clientes en versión liviana (sin notas ni fechas) para la tabla.
 *  Reduce la cantidad de PII que viaja al navegador en el payload RSC. */
export async function listarClientesResumen(): Promise<ClienteResumen[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, numero, nombre, cuit, direccion, localidad, telefono, email
     FROM clientes
     ORDER BY COALESCE(numero, 999999) ASC, nombre COLLATE NOCASE ASC`,
  );
  return resultado.rows.map((fila) => {
    const f = fila as FilaCliente;
    return {
      id: Number(f.id),
      numero: f.numero != null ? Number(f.numero) : null,
      nombre: String(f.nombre),
      cuit: f.cuit ? String(f.cuit) : null,
      direccion: f.direccion ? String(f.direccion) : null,
      localidad: f.localidad ? String(f.localidad) : null,
      telefono: f.telefono ? String(f.telefono) : null,
      email: f.email ? String(f.email) : null,
    };
  });
}

/** Lista mínima (id + nombre) para los `<select>` de cliente (ej: nuevo remito). */
export async function listarClientesParaSeleccion(): Promise<ClienteSeleccion[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, nombre
     FROM clientes
     ORDER BY nombre COLLATE NOCASE ASC`,
  );
  return resultado.rows.map((fila) => {
    const f = fila as FilaCliente;
    return { id: Number(f.id), nombre: String(f.nombre) };
  });
}

/** Devuelve un cliente por id (o null si no existe). */
export async function obtenerCliente(id: number): Promise<Cliente | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, numero, nombre, cuit, direccion, localidad, telefono, email, notas,
            creado_en, actualizado_en
     FROM clientes
     WHERE id = ?`,
    [id],
  );
  if (resultado.rows.length === 0) return null;
  return mapearCliente(resultado.rows[0] as FilaCliente);
}

export interface DatosNuevoCliente {
  /** N° del cliente. En el alta manual es obligatorio; en importaciones puede
   *  venir null si la planilla no trae la columna. */
  numero: number | null;
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

export type DatosEditarCliente = DatosNuevoCliente;

/**
 * Crea un cliente y devuelve su id.
 * El N° se carga a mano en el formulario de alta (no se autoasigna).
 * (La data ya validada/recortada llega desde las Server Actions.)
 */
export async function crearCliente(datos: DatosNuevoCliente): Promise<number> {
  const db = await getDb();

  const resultado = await db.execute(
    `INSERT INTO clientes (numero, nombre, cuit, direccion, localidad, telefono, email, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.numero,
      datos.nombre,
      datos.cuit ?? null,
      datos.direccion ?? null,
      datos.localidad ?? null,
      datos.telefono ?? null,
      datos.email ?? null,
      datos.notas ?? null,
    ],
  );
  return Number(resultado.lastInsertRowid ?? 0);
}

export interface ResultadoLoteClientes {
  importados: number;
  errores: number;
}

/** Cantidad de filas que se envían juntas en cada `batch()` a la base. */
const TAMANO_LOTE_IMPORTACION = 100;

/**
 * Inserta muchos clientes en un único lote por chunks (la base remota Turso
 * optimiza mucho mejor los `batch` que N inserts individuales por HTTP).
 * Devuelve cuántos se insertaron y cuántos fallaron por lote.
 */
export async function crearClientesEnLote(
  filas: DatosNuevoCliente[],
): Promise<ResultadoLoteClientes> {
  const db = await getDb();
  let importados = 0;
  let errores = 0;

  for (let desde = 0; desde < filas.length; desde += TAMANO_LOTE_IMPORTACION) {
    const chunk = filas.slice(desde, desde + TAMANO_LOTE_IMPORTACION);
    const statements: InStatement[] = chunk.map((datos) => ({
      sql: `INSERT INTO clientes (numero, nombre, cuit, direccion, localidad, telefono, email, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        datos.numero,
        datos.nombre,
        datos.cuit ?? null,
        datos.direccion ?? null,
        datos.localidad ?? null,
        datos.telefono ?? null,
        datos.email ?? null,
        datos.notas ?? null,
      ] as InArgs,
    }));

    try {
      await db.batch(statements);
      importados += chunk.length;
    } catch (error) {
      console.error("[clientes] error al importar lote:", error);
      errores += chunk.length;
    }
  }

  return { importados, errores };
}

/** Actualiza los datos de un cliente (el N° también se puede editar). */
export async function actualizarCliente(
  id: number,
  datos: DatosEditarCliente,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clientes
     SET numero = ?, nombre = ?, cuit = ?, direccion = ?, localidad = ?, telefono = ?,
         email = ?, notas = ?, actualizado_en = datetime('now')
     WHERE id = ?`,
    [
      datos.numero,
      datos.nombre,
      datos.cuit ?? null,
      datos.direccion ?? null,
      datos.localidad ?? null,
      datos.telefono ?? null,
      datos.email ?? null,
      datos.notas ?? null,
      id,
    ],
  );
}

/** Elimina un cliente. Lanza si tiene remitos asociados (FK restrict). */
export async function eliminarCliente(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM clientes WHERE id = ?", [id]);
}