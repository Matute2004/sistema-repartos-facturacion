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

// Nombres históricos del proyecto (con doble letra): usalos igual en Vercel.
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

  // El reparto ahora se vincula a un cliente (campo "Envía"), puede llevar
  // remito o una mercadería directa, y registra la forma de pago. `cobrado`
  // indica si ya se cobró: mientras es 0, la forma de pago queda vacía.
  // (Coincide con las columnas de lib/schema.sql y lib/migrate.ts.)
  const columnasRepartos = [
    ["cliente_id", "INTEGER REFERENCES clientes(id) ON DELETE SET NULL"],
    ["lleva_remito", "INTEGER NOT NULL DEFAULT 0"],
    [
      "forma_pago",
      "TEXT NOT NULL DEFAULT 'contado' CHECK (forma_pago IN ('contado', 'cuenta_corriente', 'debito', 'cheque'))",
    ],
    ["cobrado", "INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [columna, definicion] of columnasRepartos) {
    try {
      await db.execute(`ALTER TABLE repartos ADD COLUMN ${columna} ${definicion}`);
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

  // Índice sobre la nueva columna: se crea acá (y no en schema.sql) porque las
  // bases existentes todavía no tienen la columna cuando se ejecuta el schema.
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_repartos_cliente ON repartos(cliente_id)",
  );

  // La mercadería directa pasó de ser una sola línea en `repartos` a varias
  // líneas en `reparto_items` (tabla creada en lib/schema.sql). Si la tabla
  // vieja todavía tiene las columnas, se vuelcan a la tabla nueva una vez.
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
    const mensaje = String(error);
    if (!mensaje.includes("no such column") && !mensaje.includes("unknown column")) {
      throw error;
    }
  }

  // Los repartos con una forma de pago elegida (distinta de la que se
  // preseleccionaba por defecto) se consideran cobrados.
  await db.execute(
    "UPDATE repartos SET cobrado = 1 WHERE forma_pago IN ('cuenta_corriente', 'debito', 'cheque')",
  );

  // Rol único: el sistema opera solo con administradores. Si quedaron
  // usuarios con rol 'operador' de versiones previas, se los promueve.
  await db.execute("UPDATE usuarios SET rol = 'admin' WHERE rol = 'operador'");

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