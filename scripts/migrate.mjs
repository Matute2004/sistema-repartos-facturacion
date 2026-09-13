// ============================================================================
// Script de migración de base de datos.
//
// Uso:
//   node --env-file-if-exists=.env.local scripts/migrate.mjs
//
// - Si hay TURSO_DATABASE_URLL/TURSO_AUTH_TOKENN usa la base remota de Turso.
// - Si no, crea/usar la SQLite local `file:local.db`.
// Idempotente: se puede correr las veces que hagan falta.
// ============================================================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.TURSO_DATABASE_URLL;
const authToken = process.env.TURSO_AUTH_TOKENN;

let createClient;
if (url) {
  if (!authToken) {
    console.error("TURSO_DATABASE_URLL definida pero falta TURSO_AUTH_TOKENN.");
    process.exit(1);
  }
  const http = await import("@libsql/client/http");
  createClient = http.createClient;
} else {
  const full = await import("@libsql/client");
  createClient = full.createClient;
}

const db = createClient(
  url
    ? { url, authToken }
    : { url: `file:${join(root, "local.db")}` },
);

try {
  const schemaPath = join(root, "lib", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");

  console.log(`Migrando base de datos (${url ? "Turso" : "local.db"})...`);
  await db.executeMultiple(sql);

  // Columnas agregadas en versiones posteriores al esquema inicial.
  // `numero` (N° visible de cliente) se asigna automáticamente al dar de alta.
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

  const resultado = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  const tablas = resultado.rows.map((fila) => fila.name);

  console.log("Migración completada. Tablas presentes:");
  tablas.forEach((t) => console.log(`  - ${t}`));
} catch (error) {
  console.error("Error durante la migración:", error);
  process.exit(1);
} finally {
  db.close();
}