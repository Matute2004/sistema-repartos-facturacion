import { getDb } from "@/lib/db";
import type { Cliente } from "@/lib/types";

type FilaCliente = Record<string, unknown>;

function mapearCliente(fila: FilaCliente): Cliente {
  return {
    id: Number(fila.id),
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

/** Lista todos los clientes ordenados por nombre. */
export async function listarClientes(): Promise<Cliente[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, nombre, cuit, direccion, localidad, telefono, email, notas,
            creado_en, actualizado_en
     FROM clientes
     ORDER BY nombre COLLATE NOCASE ASC`,
  );
  return resultado.rows.map((fila) => mapearCliente(fila as FilaCliente));
}

/** Devuelve un cliente por id (o null si no existe). */
export async function obtenerCliente(id: number): Promise<Cliente | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, nombre, cuit, direccion, localidad, telefono, email, notas,
            creado_en, actualizado_en
     FROM clientes
     WHERE id = ?`,
    [id],
  );
  if (resultado.rows.length === 0) return null;
  return mapearCliente(resultado.rows[0] as FilaCliente);
}

export interface DatosNuevoCliente {
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
 * (La data ya validada/recortada llega desde las Server Actions.)
 */
export async function crearCliente(datos: DatosNuevoCliente): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO clientes (nombre, cuit, direccion, localidad, telefono, email, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
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

/** Actualiza los datos de un cliente. */
export async function actualizarCliente(
  id: number,
  datos: DatosEditarCliente,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE clientes
     SET nombre = ?, cuit = ?, direccion = ?, localidad = ?, telefono = ?,
         email = ?, notas = ?, actualizado_en = datetime('now')
     WHERE id = ?`,
    [
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