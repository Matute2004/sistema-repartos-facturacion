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
import { randomBytes, scryptSync } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Acepta también las viejas variantes con typo (TURSO_DATABASE_URLL /
// TURSO_AUTH_TOKENN) por compatibilidad con configs ya existentes.
const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URLL;
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKENN;

let createClient;
if (url) {
  if (!authToken) {
    console.error("TURSO_DATABASE_URL definida pero falta TURSO_AUTH_TOKEN.");
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

  const resultado = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  const tablas = resultado.rows.map((fila) => fila.name);

  console.log("Migración completada. Tablas presentes:");
  tablas.forEach((t) => console.log(`  - ${t}`));

  // Semilla de usuarios: Matute (admin) y OhanaTeam (admin).
  // Las contraseñas iniciales son iguales al nombre del usuario.
  await sembrarUsuarios(db);
} catch (error) {
  console.error("Error durante la migración:", error);
  process.exit(1);
} finally {
  db.close();
}

// ----------------------------------------------------------------------------
// Usuarios iniciales
// ----------------------------------------------------------------------------

/**
 * Hash scrypt con el mismo formato que `lib/passwords.ts` (scrypt:salt:hash).
 * Se duplica acá porque migrate.mjs es un script Node sin TS; nunca debe
 * divergir del formato de la aplicación.
 */
function hashear(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Inserta los usuarios iniciales si la tabla está vacía. Idempotente:
 * no toca usuarios ya existentes (p. ej. si Matute cambió su contraseña).
 */
async function sembrarUsuarios(db) {
  const existentes = await db.execute("SELECT COUNT(*) AS n FROM usuarios");
  if (Number(existentes.rows[0].n) > 0) return;

  const usuarios = [
    { nombre: "Matute", rol: "admin" },
    { nombre: "OhanaTeam", rol: "admin" },
  ];

  for (const usuario of usuarios) {
    await db.execute(
      `INSERT INTO usuarios (nombre, password_hash, rol)
       VALUES (?, ?, ?)
       ON CONFLICT (nombre) DO NOTHING`,
      [usuario.nombre, hashear(usuario.nombre), usuario.rol],
    );
    console.log(`  - Usuario creado: ${usuario.nombre} (rol: ${usuario.rol})`);
  }
}