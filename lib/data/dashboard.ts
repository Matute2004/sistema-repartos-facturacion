import { getDb } from "@/lib/db";
import { fechaHoyLocal } from "@/lib/types";

export interface MetricasDashboard {
  clientes: number;
  vehiculos: number;
  gastosMesCentavos: number;
  repartosHoy: number;
  /** Repartos de hoy que todavía no se cobraron (falta cobrar). */
  repartosHoySinCobrar: number;
  /** Repartos sin cobrar en total (todas las fechas). */
  repartosSinCobrarTotal: number;
  /** Remitos emitidos hoy. */
  remitosHoy: number;
  /** Remitos que todavía no tienen reparto asignado. */
  remitosPorAsignar: number;
}

/**
 * Métricas generales para el dashboard. Se calculan con la fecha de hoy en
 * Buenos Aires (`ZONA_HORARIA`) como referencia del "día" de trabajo.
 */
export async function getMetricasDashboard(): Promise<MetricasDashboard> {
  const db = await getDb();
  const hoy = fechaHoyLocal();
  const mes = hoy.slice(0, 7); // YYYY-MM

  // Batch en un solo request HTTP a Turso (en vez de 6 round-trips).
  // Todas son lecturas independientes; batch las ejecuta atómicamente.
  const resultados = await db.batch([
    "SELECT COUNT(*) AS total FROM clientes",
    "SELECT COUNT(*) AS total FROM vehiculos",
    {
      sql: "SELECT COALESCE(SUM(monto_centavos), 0) AS total FROM gastos WHERE substr(fecha, 1, 7) = ?",
      args: [mes],
    },
    {
      sql: "SELECT COUNT(*) AS total FROM repartos WHERE fecha = ?",
      args: [hoy],
    },
    {
      // Sin cobrar hoy: los repartos del día sin forma de pago elegida.
      sql: "SELECT COUNT(*) AS total FROM repartos WHERE fecha = ? AND cobrado = 0",
      args: [hoy],
    },
    {
      // Sin cobrar en total: acumula también las fechas anteriores.
      sql: "SELECT COUNT(*) AS total FROM repartos WHERE cobrado = 0",
    },
    {
      sql: "SELECT COUNT(*) AS total FROM remitos WHERE fecha = ?",
      args: [hoy],
    },
    "SELECT COUNT(*) AS total FROM remitos WHERE reparto_id IS NULL",
  ]);

  const numero = (fila: Record<string, unknown>) =>
    Number((fila as Record<string, unknown>).total);

  return {
    clientes: numero(resultados[0].rows[0]),
    vehiculos: numero(resultados[1].rows[0]),
    gastosMesCentavos: numero(resultados[2].rows[0]),
    repartosHoy: numero(resultados[3].rows[0]),
    repartosHoySinCobrar: numero(resultados[4].rows[0]),
    repartosSinCobrarTotal: numero(resultados[5].rows[0]),
    remitosHoy: numero(resultados[6].rows[0]),
    remitosPorAsignar: numero(resultados[7].rows[0]),
  };
}