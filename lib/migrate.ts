import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "@/lib/db";

/**
 * Ejecuta el esquema inicial (lib/schema.sql) de forma idempotente.
 *
 * Pensado para correrse a mano con `npm run db:migrate` contra Turso o la
 * base local, pero también se puede invocar desde Route Handlers si se quiere
 * auto-migrar en el primer deploy.
 */
export async function migrate(): Promise<void> {
  const sql = readFileSync(join(process.cwd(), "lib", "schema.sql"), "utf8");

  // PRAGMA foreign_keys no se puede configurar por sesión remota de forma
  // persistente, pero Turso lo habilita por defecto. El pragma dentro del
  // schema sirve para la base local.
  const db = await getDb();
  await db.executeMultiple(sql);
}

/** Devuelve la lista de tablas existentes (auxiliar de diagnóstico). */
export async function listarTablas(): Promise<string[]> {
  const db = await getDb();
  const resultado = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return resultado.rows.map(
    (fila) => String((fila as Record<string, unknown>).name),
  );
}