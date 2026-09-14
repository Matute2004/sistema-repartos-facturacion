import { getDb } from "@/lib/db";
import type { CategoriaGasto, Gasto } from "@/lib/types";

type FilaGasto = Record<string, unknown>;

function mapearGasto(fila: FilaGasto): Gasto {
  return {
    id: Number(fila.id),
    fecha: String(fila.fecha),
    categoria: String(fila.categoria) as CategoriaGasto,
    descripcion: String(fila.descripcion),
    proveedor: fila.proveedor ? String(fila.proveedor) : null,
    montoCentavos: Number(fila.monto_centavos),
    creadoEn: String(fila.creado_en),
  };
}

/** Lista gastos, los más recientes primero. */
export async function listarGastos(): Promise<Gasto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, fecha, categoria, descripcion, proveedor, monto_centavos, creado_en
     FROM gastos
     ORDER BY fecha DESC, id DESC`,
  );
  return resultado.rows.map((fila) => mapearGasto(fila as FilaGasto));
}

/** Total acumulado en centavos (útil para el resumen). */
export async function totalGastos(): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    "SELECT COALESCE(SUM(monto_centavos), 0) AS total FROM gastos",
  );
  return Number((resultado.rows[0] as FilaGasto).total);
}

/** Lista los gastos de un mes (YYYY-MM), los más recientes primero. */
export async function listarGastosDelMes(mes: string): Promise<Gasto[]> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, fecha, categoria, descripcion, proveedor, monto_centavos, creado_en
     FROM gastos
     WHERE substr(fecha, 1, 7) = ?
     ORDER BY fecha DESC, id DESC`,
    [mes],
  );
  return resultado.rows.map((fila) => mapearGasto(fila as FilaGasto));
}

export interface GastosDelMes {
  gastos: Gasto[];
  totalCentavos: number;
}

/**
 * Lista los gastos de un mes y su total en UNA sola consulta (en vez de dos
 * round-trips a Turso). Usa una window function para repetir el total en cada
 * fila sin subconsulta correlacionada.
 */
export async function listarGastosDelMesConTotal(
  mes: string,
): Promise<GastosDelMes> {
  const db = await getDb();
  const resultado = await db.execute(
    `SELECT id, fecha, categoria, descripcion, proveedor, monto_centavos, creado_en,
            SUM(monto_centavos) OVER () AS total_centavos
     FROM gastos
     WHERE substr(fecha, 1, 7) = ?
     ORDER BY fecha DESC, id DESC`,
    [mes],
  );
  const filas = resultado.rows as FilaGasto[];
  const totalCentavos =
    filas.length > 0 ? Number(filas[0].total_centavos ?? 0) : 0;
  return {
    gastos: filas.map((fila) => mapearGasto(fila)),
    totalCentavos,
  };
}

/** Total en centavos de los gastos de un mes (YYYY-MM). */
export async function totalGastosDelMes(mes: string): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    "SELECT COALESCE(SUM(monto_centavos), 0) AS total FROM gastos WHERE substr(fecha, 1, 7) = ?",
    [mes],
  );
  return Number((resultado.rows[0] as FilaGasto).total);
}

export interface DatosNuevoGasto {
  fecha: string; // YYYY-MM-DD
  categoria: CategoriaGasto;
  descripcion: string;
  proveedor?: string;
  montoCentavos: number;
}

/** Crea un gasto y devuelve su id. */
export async function crearGasto(datos: DatosNuevoGasto): Promise<number> {
  const db = await getDb();
  const resultado = await db.execute(
    `INSERT INTO gastos (fecha, categoria, descripcion, proveedor, monto_centavos)
     VALUES (?, ?, ?, ?, ?)`,
    [
      datos.fecha,
      datos.categoria,
      datos.descripcion,
      datos.proveedor ?? null,
      datos.montoCentavos,
    ],
  );
  return Number(resultado.lastInsertRowid ?? 0);
}

/** Elimina un gasto por id. */
export async function eliminarGasto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM gastos WHERE id = ?", [id]);
}