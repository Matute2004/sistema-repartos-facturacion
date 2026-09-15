import { getDb } from "@/lib/db";
import { fechaHoyLocal } from "@/lib/types";

export interface MetricasDashboard {
  clientes: number;
  vehiculos: number;
  gastosMesCentavos: number;
  repartosHoy: number;
  repartosHoyPendientes: number;
  remitosHoyPendientes: number;
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
      sql: "SELECT COUNT(*) AS total FROM repartos WHERE fecha = ? AND estado IN ('pendiente', 'en_curso')",
      args: [hoy],
    },
    {
      sql: "SELECT COUNT(*) AS total FROM remitos WHERE fecha = ? AND estado = 'pendiente'",
      args: [hoy],
    },
    "SELECT COUNT(*) AS total FROM remitos WHERE estado = 'pendiente' AND reparto_id IS NULL",
  ]);

  const numero = (fila: Record<string, unknown>) =>
    Number((fila as Record<string, unknown>).total);

  return {
    clientes: numero(resultados[0].rows[0]),
    vehiculos: numero(resultados[1].rows[0]),
    gastosMesCentavos: numero(resultados[2].rows[0]),
    repartosHoy: numero(resultados[3].rows[0]),
    repartosHoyPendientes: numero(resultados[4].rows[0]),
    remitosHoyPendientes: numero(resultados[5].rows[0]),
    remitosPorAsignar: numero(resultados[6].rows[0]),
  };
}