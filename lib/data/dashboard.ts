import { getDb } from "@/lib/db";
import { fechaHoyLocal } from "@/lib/types";

export interface MetricasDashboard {
  clientes: number;
  gastosMesCentavos: number;
  repartosHoy: number;
  remitosHoyPendientes: number;
  remitosPorAsignar: number;
}

/**
 * Métricas generales para el dashboard. Se calculan con la fecha local del
 * servidor como referencia del "día" de trabajo.
 */
export async function getMetricasDashboard(): Promise<MetricasDashboard> {
  const db = await getDb();
  const hoy = fechaHoyLocal();
  const mes = hoy.slice(0, 7); // YYYY-MM

  const [clientes, gastosMes, repartosHoy, remitosPendientes, remitosPorAsignar] =
    await Promise.all([
      db.execute("SELECT COUNT(*) AS total FROM clientes"),
      db.execute(
        "SELECT COALESCE(SUM(monto_centavos), 0) AS total FROM gastos WHERE substr(fecha, 1, 7) = ?",
        [mes],
      ),
      db.execute("SELECT COUNT(*) AS total FROM repartos WHERE fecha = ?", [hoy]),
      db.execute(
        "SELECT COUNT(*) AS total FROM remitos WHERE fecha = ? AND estado = 'pendiente'",
        [hoy],
      ),
      db.execute(
        "SELECT COUNT(*) AS total FROM remitos WHERE estado = 'pendiente' AND reparto_id IS NULL",
      ),
    ]);

  const numero = (fila: Record<string, unknown>) =>
    Number((fila as Record<string, unknown>).total);

  return {
    clientes: numero(clientes.rows[0]),
    gastosMesCentavos: numero(gastosMes.rows[0]),
    repartosHoy: numero(repartosHoy.rows[0]),
    remitosHoyPendientes: numero(remitosPendientes.rows[0]),
    remitosPorAsignar: numero(remitosPorAsignar.rows[0]),
  };
}