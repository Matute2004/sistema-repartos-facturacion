import { getDb } from "@/lib/db";
import type { Vehiculo } from "@/lib/types";

type FilaVehiculo = Record<string, unknown>;

function mapearVehiculo(fila: FilaVehiculo): Vehiculo {
  return {
    id: Number(fila.id),
    nombre: String(fila.nombre),
    patente: fila.patente ? String(fila.patente) : null,
    marca: fila.marca ? String(fila.marca) : null,
    modelo: fila.modelo ? String(fila.modelo) : null,
    anio: fila.anio != null ? Number(fila.anio) : null,
    kilometros: fila.kilometros != null ? Number(fila.kilometros) : null,
    kmProximoService: fila.km_proximo_service != null ? Number(fila.km_proximo_service) : null,
    fechaUltimoService: fila.fecha_ultimo_service ? String(fila.fecha_ultimo_service) : null,
    notas: fila.notas ? String(fila.notas) : null,
    creadoEn: String(fila.creado_en),
    actualizadoEn: String(fila.actualizado_en),
  };
}

/** Lista todos los vehículos ordenados por nombre. */
export async function listarVehiculos(): Promise<Vehiculo[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, nombre, patente, marca, modelo, anio, kilometros,
            km_proximo_service, fecha_ultimo_service, notas, creado_en, actualizado_en
     FROM vehiculos
     ORDER BY nombre COLLATE NOCASE ASC`,
  );
  return resultado.rows.map((fila) => mapearVehiculo(fila as FilaVehiculo));
}

/** Devuelve un vehículo por id (o null si no existe). */
export async function obtenerVehiculo(id: number): Promise<Vehiculo | null> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, nombre, patente, marca, modelo, anio, kilometros,
            km_proximo_service, fecha_ultimo_service, notas, creado_en, actualizado_en
     FROM vehiculos
     WHERE id = ?`,
    [id],
  );
  if (resultado.rows.length === 0) return null;
  return mapearVehiculo(resultado.rows[0] as FilaVehiculo);
}

export interface DatosNuevoVehiculo {
  nombre: string;
  patente?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  kilometros?: number;
  kmProximoService?: number;
  fechaUltimoService?: string;
  notas?: string;
}

export type DatosEditarVehiculo = DatosNuevoVehiculo;

/** Crea un vehículo y devuelve su id. */
export async function crearVehiculo(datos: DatosNuevoVehiculo): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO vehiculos
       (nombre, patente, marca, modelo, anio, kilometros, km_proximo_service,
        fecha_ultimo_service, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.nombre,
      datos.patente ?? null,
      datos.marca ?? null,
      datos.modelo ?? null,
      datos.anio ?? null,
      datos.kilometros ?? null,
      datos.kmProximoService ?? null,
      datos.fechaUltimoService ?? null,
      datos.notas ?? null,
    ],
  );
  return Number(resultado.lastInsertRowid ?? 0);
}

/** Actualiza los datos de un vehículo. */
export async function actualizarVehiculo(
  id: number,
  datos: DatosEditarVehiculo,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE vehiculos
     SET nombre = ?, patente = ?, marca = ?, modelo = ?, anio = ?,
         kilometros = ?, km_proximo_service = ?, fecha_ultimo_service = ?,
         notas = ?, actualizado_en = datetime('now')
     WHERE id = ?`,
    [
      datos.nombre,
      datos.patente ?? null,
      datos.marca ?? null,
      datos.modelo ?? null,
      datos.anio ?? null,
      datos.kilometros ?? null,
      datos.kmProximoService ?? null,
      datos.fechaUltimoService ?? null,
      datos.notas ?? null,
      id,
    ],
  );
}

/** Elimina un vehículo por id. */
export async function eliminarVehiculo(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM vehiculos WHERE id = ?", [id]);
}
