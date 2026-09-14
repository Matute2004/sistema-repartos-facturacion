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

  // Columnas agregadas en versiones posteriores al esquema inicial.
  // `numero` (N° visible de cliente) se carga a mano al dar de alta.
  try {
    await db.execute("ALTER TABLE clientes ADD COLUMN numero INTEGER");
  } catch (error) {
    const mensaje = String(error);
    if (
      !mensaje.includes("duplicate column") &&
      !mensaje.includes("already has column")
    ) {
      throw error;
    }
  }

  // Rol único: el sistema opera solo con administradores. Si quedaron
  // usuarios con rol 'operador' de versiones previas, se los promueve.
  await db.execute("UPDATE usuarios SET rol = 'admin' WHERE rol = 'operador'");
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