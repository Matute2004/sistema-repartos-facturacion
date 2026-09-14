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

  // El reparto ahora se vincula a un cliente (campo "Envía"), puede llevar
  // remito o una mercadería directa, y registra la forma de pago.
  await agregarColumna(db, "repartos", "cliente_id", "INTEGER REFERENCES clientes(id) ON DELETE SET NULL");
  await agregarColumna(db, "repartos", "lleva_remito", "INTEGER NOT NULL DEFAULT 0");
  await agregarColumna(db, "repartos", "unidad", "TEXT");
  await agregarColumna(db, "repartos", "cantidad", "REAL");
  await agregarColumna(db, "repartos", "item_descripcion", "TEXT");
  await agregarColumna(db, "repartos", "item_precio_unitario_centavos", "INTEGER NOT NULL DEFAULT 0");
  await agregarColumna(db, "repartos", "forma_pago", "TEXT NOT NULL DEFAULT 'contado' CHECK (forma_pago IN ('contado', 'cuenta_corriente', 'debito', 'cheque'))");

  // Índice sobre la nueva columna: se crea acá (y no en schema.sql) porque las
  // bases existentes todavía no tienen la columna cuando se ejecuta el schema.
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_repartos_cliente ON repartos(cliente_id)",
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