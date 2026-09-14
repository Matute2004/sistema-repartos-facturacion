import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "@/lib/db";

/** Agrega una columna si todavía no existe (idempotente, igual que en migrate.mjs). */
async function agregarColumna(
  db: Awaited<ReturnType<typeof getDb>>,
  tabla: string,
  columna: string,
  definicion: string,
): Promise<void> {
  try {
    await db.execute(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
  } catch (error) {
    const mensaje = String(error);
    if (
      !mensaje.includes("duplicate column") &&
      !mensaje.includes("already has column")
    ) {
      throw error;
    }
  }
}

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
  await agregarColumna(db, "clientes", "numero", "INTEGER");

  // El reparto se vincula a un cliente (campo "Envía"), puede llevar remito
  // o una mercadería directa, y registra la forma de pago. `cobrado` indica si
  // la mercadería ya se cobró: mientras es 0, la forma de pago queda vacía.
  await agregarColumna(db, "repartos", "cliente_id", "INTEGER REFERENCES clientes(id) ON DELETE SET NULL");
  await agregarColumna(db, "repartos", "lleva_remito", "INTEGER NOT NULL DEFAULT 0");
  await agregarColumna(db, "repartos", "forma_pago", "TEXT NOT NULL DEFAULT 'contado' CHECK (forma_pago IN ('contado', 'cuenta_corriente', 'debito', 'cheque'))");
  await agregarColumna(db, "repartos", "cobrado", "INTEGER NOT NULL DEFAULT 0");

  // Índice sobre la nueva columna: se crea acá (y no en schema.sql) porque las
  // bases existentes todavía no tienen la columna cuando se ejecuta el schema.
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_repartos_cliente ON repartos(cliente_id)",
  );

  // La mercadería directa pasó de ser una sola línea en `repartos` a varias
  // líneas en `reparto_items`. Si la tabla vieja todavía tiene las columnas
  // (de migraciones anteriores), se vuelcan a la tabla nueva una sola vez.
  try {
    await db.execute(
      `INSERT INTO reparto_items (reparto_id, descripcion, cantidad, precio_unitario_centavos)
       SELECT r.id, COALESCE(NULLIF(TRIM(r.item_descripcion), ''), 'Carga'),
              COALESCE(r.cantidad, 1), COALESCE(r.item_precio_unitario_centavos, 0)
       FROM repartos r
       WHERE r.lleva_remito = 0 AND r.cantidad IS NOT NULL AND r.cantidad > 0
         AND NOT EXISTS (SELECT 1 FROM reparto_items ri WHERE ri.reparto_id = r.id)`,
    );
  } catch (error) {
    // Bases nuevas no tienen las columnas viejas; no hay nada que migrar.
    const mensaje = String(error);
    if (!mensaje.includes("no such column") && !mensaje.includes("unknown column")) {
      throw error;
    }
  }

  // Los repartos que ya tenían una forma de pago elegida (distinta de la que
  // se preseleccionaba por defecto) se consideran cobrados.
  await db.execute(
    "UPDATE repartos SET cobrado = 1 WHERE forma_pago IN ('cuenta_corriente', 'debito', 'cheque')",
  );

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