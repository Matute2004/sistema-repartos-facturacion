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