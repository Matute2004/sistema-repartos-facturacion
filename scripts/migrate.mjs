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
  // `numero` (N° visible de cliente) ya no se carga a mano: SIEMPRE es igual
  // al id. Acá se deja el backfill idempotente por si quedó des-sincronizado
  // (clientes viejos cargados con un N° manual).
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

  // Todos los clientes registrados operan en cuenta corriente (clientes fijos).
  // La columna se agrega con default 1: los clientes ya creados quedan así.
  try {
    await db.execute(
      "ALTER TABLE clientes ADD COLUMN es_cuenta_corriente INTEGER NOT NULL DEFAULT 1",
    );
  } catch (error) {
    const mensaje = String(error);
    if (
      !mensaje.includes("duplicate column") &&
      !mensaje.includes("already has column")
    ) {
      throw error;
    }
  }
  await db.execute(
    "UPDATE clientes SET numero = id WHERE numero IS NULL OR numero != id",
  );

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

  // Los remitos pasan a pertenecer al reparto (el cliente sale del reparto):
  // elimina la columna cliente_id de remitos conservando los datos. Debe
  // correrse después del schema para que las bases nuevas ya vengan sin la
  // columna y no haga nada.
  await reconstruirRepartosSinEstado(db);
  await reconstruirRemitosSinCliente(db);

  // El "estado" ya no existe (ni en repartos ni en remitos): cada día se abre
  // una hoja de ruta y solo importa si el reparto se cobró. Se eliminan las
  // columnas conservando los datos (mismo truco de RENAME que arriba).
  await reconstruirRemitosSinEstado(db);

  // Rol único: el sistema opera solo con administradores. Si quedaron
  // usuarios con rol 'operador' de versiones previas, se los promueve.
  await db.execute("UPDATE usuarios SET rol = 'admin' WHERE rol = 'operador'");

  // Las reconstrucciones de `repartos` (RENAME) pueden dejar a `reparto_items`
  // apuntando a la tabla vieja ya borrada; se corrige si pasó (idempotente).
  await repararRepartoItems(db);

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
// Migración de remitos: pasan a pertenecer al reparto
// ----------------------------------------------------------------------------

/**
 * Repara la clave foránea de `reparto_items` si quedó apuntando a una tabla
 * que ya no existe. Pasó en bases viejas: al reconstruir `repartos` con
 * RENAME (`repartos_viejo` → `repartos`), SQLite actualizó la referencia de
 * `reparto_items` apuntándola al nombre viejo, que después se borró. Desde
 * entonces cualquier INSERT de mercadería directa fallaba con
 * "no such table: main.repartos_viejo" (el guardado del reparto daba error).
 *
 * Idempotente: si la FK ya apunta a `repartos(id)`, no toca nada.
 */
async function repararRepartoItems(db) {
  const resultado = await db.execute(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reparto_items'",
  );
  if (resultado.rows.length === 0) return;
  const sql = String(resultado.rows[0].sql ?? "");

  const referencias = [...sql.matchAll(/REFERENCES\s+(?:"([^"]+)"|([\w]+))\(/g)];
  const tablasReferenciadas = referencias.map((m) => m[1] ?? m[2]);
  const apuntaMal = tablasReferenciadas.filter(
    (tabla) => tabla !== "repartos",
  );
  if (apuntaMal.length === 0) return;

  const statements = [
    { sql: "DROP TABLE IF EXISTS reparto_items_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS reparto_items_nuevo", args: [] },
    {
      sql: `CREATE TABLE reparto_items_nuevo (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        reparto_id              INTEGER NOT NULL REFERENCES repartos(id) ON DELETE CASCADE,
        descripcion             TEXT NOT NULL,
        cantidad                REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0),
        precio_unitario_centavos INTEGER NOT NULL DEFAULT 0 CHECK (precio_unitario_centavos >= 0)
      )`,
      args: [],
    },
    {
      sql: `INSERT INTO reparto_items_nuevo (id, reparto_id, descripcion, cantidad, precio_unitario_centavos)
            SELECT id, reparto_id, descripcion, cantidad, precio_unitario_centavos FROM reparto_items`,
      args: [],
    },
    { sql: "DROP INDEX IF EXISTS idx_reparto_items_reparto", args: [] },
    { sql: "ALTER TABLE reparto_items RENAME TO reparto_items_viejo", args: [] },
    { sql: "ALTER TABLE reparto_items_nuevo RENAME TO reparto_items", args: [] },
    { sql: "DROP TABLE reparto_items_viejo", args: [] },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_reparto_items_reparto ON reparto_items(reparto_id)",
      args: [],
    },
  ];
  await db.batch(statements);
}
/**
 * Reconstruye la tabla `remitos` sin la columna `cliente_id`.
 *
 * Antes el remito se emitía a nombre de un cliente (remitos.cliente_id NOT NULL
 * ON DELETE RESTRICT) y eso impedía borrar clientes con remitos. A partir de
 * acá el remito pertenece a un reparto y el cliente se resuelve a través del
 * reparto, así que la columna se elimina conservando los datos.
 *
 * Se hace con un intercambio de tablas (RENAME) y NO se desactiva foreign_keys
 * (Turso por HTTP no permite cambiarlo); funciona igual con las claves activadas.
 * Cada paso se ejecuta en un solo `batch` (atómico en libsql).
 */
async function reconstruirRemitosSinCliente(db) {
  const info = await db.execute(
    "SELECT name FROM pragma_table_info('remitos') WHERE name = 'cliente_id'",
  );
  if (info.rows.length === 0) {
    // Ya reconstruida. Si un run anterior quedó a medias, limpiamos restos.
    await db.execute("DROP TABLE IF EXISTS remito_items_viejo");
    await db.execute("DROP TABLE IF EXISTS remitos_viejo");
    return;
  }

  const statements = [
    { sql: "DROP TABLE IF EXISTS remito_items_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS remitos_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS remito_items_nuevo", args: [] },
    { sql: "DROP TABLE IF EXISTS remitos_nuevo", args: [] },

    {
      sql: `CREATE TABLE remitos_nuevo (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        numero         INTEGER NOT NULL,
        reparto_id     INTEGER REFERENCES repartos(id) ON DELETE SET NULL,
        fecha          TEXT NOT NULL DEFAULT (date('now')),
        estado         TEXT NOT NULL DEFAULT 'pendiente'
                       CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
        observaciones  TEXT,
        creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (numero)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE remito_items_nuevo (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        remito_id                INTEGER NOT NULL REFERENCES remitos_nuevo(id) ON DELETE CASCADE,
        descripcion              TEXT NOT NULL,
        cantidad                 REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0),
        precio_unitario_centavos INTEGER NOT NULL DEFAULT 0 CHECK (precio_unitario_centavos >= 0)
      )`,
      args: [],
    },

    // Copiamos los datos antes de borrar nada (una falla a mitad no pierde nada).
    {
      sql: `INSERT INTO remitos_nuevo (id, numero, reparto_id, fecha, estado, observaciones, creado_en)
            SELECT id, numero, reparto_id, fecha, estado, observaciones, creado_en FROM remitos`,
      args: [],
    },
    {
      sql: `INSERT INTO remito_items_nuevo (id, remito_id, descripcion, cantidad, precio_unitario_centavos)
            SELECT id, remito_id, descripcion, cantidad, precio_unitario_centavos FROM remito_items`,
      args: [],
    },

    { sql: "DROP INDEX IF EXISTS idx_remitos_cliente", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_reparto", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_estado_reparto", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_fecha_estado", args: [] },

    { sql: "ALTER TABLE remitos RENAME TO remitos_viejo", args: [] },
    { sql: "ALTER TABLE remito_items RENAME TO remito_items_viejo", args: [] },
    { sql: "ALTER TABLE remitos_nuevo RENAME TO remitos", args: [] },
    { sql: "ALTER TABLE remito_items_nuevo RENAME TO remito_items", args: [] },

    { sql: "DROP TABLE remito_items_viejo", args: [] },
    { sql: "DROP TABLE remitos_viejo", args: [] },

    { sql: "CREATE INDEX IF NOT EXISTS idx_remitos_reparto ON remitos(reparto_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_remitos_estado_reparto ON remitos(estado, reparto_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_remitos_fecha_estado ON remitos(fecha, estado)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_remito_items_remito ON remito_items(remito_id)", args: [] },
  ];

  await db.batch(statements);
  console.log("  - remitos reconstruidos sin cliente_id (el cliente sale del reparto)");
}

// ----------------------------------------------------------------------------
// Eliminación del "estado" (repartos y remitos)
// ----------------------------------------------------------------------------

/**
 * Reconstruye la tabla `repartos` sin la columna `estado`.
 *
 * El "estado" del reparto (pendiente/en curso/completado/cancelado) ya no
 * existe: cada día tiene su hoja de ruta y lo único que se registra es si el
 * reparto se cobró (`cobrado` + `forma_pago`). Mismo intercambio de tablas
 * (RENAME) que `reconstruirRemitosSinCliente`.
 */
async function reconstruirRepartosSinEstado(db) {
  const info = await db.execute(
    "SELECT name FROM pragma_table_info('repartos') WHERE name = 'estado'",
  );
  if (info.rows.length === 0) {
    await db.execute("DROP TABLE IF EXISTS repartos_viejo");
    return;
  }

  const statements = [
    { sql: "DROP TABLE IF EXISTS repartos_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS repartos_nuevo", args: [] },

    {
      sql: `CREATE TABLE repartos_nuevo (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha         TEXT NOT NULL DEFAULT (date('now')),
        cliente_id    INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
        lleva_remito  INTEGER NOT NULL DEFAULT 0,
        forma_pago    TEXT NOT NULL DEFAULT 'contado'
                      CHECK (forma_pago IN ('contado', 'cuenta_corriente', 'debito', 'cheque')),
        cobrado       INTEGER NOT NULL DEFAULT 0,
        chofer        TEXT,
        vehiculo      TEXT,
        notas         TEXT,
        creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },

    {
      sql: `INSERT INTO repartos_nuevo (id, fecha, cliente_id, lleva_remito, forma_pago,
                                        cobrado, chofer, vehiculo, notas, creado_en)
            SELECT id, fecha, cliente_id, lleva_remito, forma_pago,
                   cobrado, chofer, vehiculo, notas, creado_en FROM repartos`,
      args: [],
    },

    { sql: "DROP INDEX IF EXISTS idx_repartos_fecha", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_repartos_cliente", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_repartos_cliente_cobrado_estado", args: [] },

    { sql: "ALTER TABLE repartos RENAME TO repartos_viejo", args: [] },
    { sql: "ALTER TABLE repartos_nuevo RENAME TO repartos", args: [] },

    { sql: "DROP TABLE repartos_viejo", args: [] },

    { sql: "CREATE INDEX IF NOT EXISTS idx_repartos_fecha ON repartos(fecha)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_repartos_cliente ON repartos(cliente_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_repartos_cliente_cobrado ON repartos(cliente_id, cobrado)", args: [] },
  ];

  await db.batch(statements);
  console.log(
    "  - repartos reconstruidos sin estado (hoja de ruta por día, sin completado)",
  );
}

/**
 * Reconstruye la tabla `remitos` sin la columna `estado`.
 *
 * El remito ya no tiene "entregado / no entregado". Se copian los datos
 * (remitos + remito_items) y se vuelve a armar la tabla sin la columna.
 */
async function reconstruirRemitosSinEstado(db) {
  const info = await db.execute(
    "SELECT name FROM pragma_table_info('remitos') WHERE name = 'estado'",
  );
  if (info.rows.length === 0) {
    await db.execute("DROP TABLE IF EXISTS remito_items_viejo");
    await db.execute("DROP TABLE IF EXISTS remitos_viejo");
    return;
  }

  const statements = [
    { sql: "DROP TABLE IF EXISTS remito_items_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS remitos_viejo", args: [] },
    { sql: "DROP TABLE IF EXISTS remito_items_nuevo", args: [] },
    { sql: "DROP TABLE IF EXISTS remitos_nuevo", args: [] },

    {
      sql: `CREATE TABLE remitos_nuevo (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        numero         INTEGER NOT NULL,
        reparto_id     INTEGER REFERENCES repartos(id) ON DELETE SET NULL,
        fecha          TEXT NOT NULL DEFAULT (date('now')),
        observaciones  TEXT,
        creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (numero)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE remito_items_nuevo (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        remito_id                INTEGER NOT NULL REFERENCES remitos_nuevo(id) ON DELETE CASCADE,
        descripcion              TEXT NOT NULL,
        cantidad                 REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0),
        precio_unitario_centavos INTEGER NOT NULL DEFAULT 0 CHECK (precio_unitario_centavos >= 0)
      )`,
      args: [],
    },

    {
      sql: `INSERT INTO remitos_nuevo (id, numero, reparto_id, fecha, observaciones, creado_en)
            SELECT id, numero, reparto_id, fecha, observaciones, creado_en FROM remitos`,
      args: [],
    },
    {
      sql: `INSERT INTO remito_items_nuevo (id, remito_id, descripcion, cantidad, precio_unitario_centavos)
            SELECT id, remito_id, descripcion, cantidad, precio_unitario_centavos FROM remito_items`,
      args: [],
    },

    { sql: "DROP INDEX IF EXISTS idx_remitos_reparto", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_estado_reparto", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_fecha_estado", args: [] },
    { sql: "DROP INDEX IF EXISTS idx_remitos_fecha", args: [] },

    { sql: "ALTER TABLE remitos RENAME TO remitos_viejo", args: [] },
    { sql: "ALTER TABLE remito_items RENAME TO remito_items_viejo", args: [] },
    { sql: "ALTER TABLE remitos_nuevo RENAME TO remitos", args: [] },
    { sql: "ALTER TABLE remito_items_nuevo RENAME TO remito_items", args: [] },

    { sql: "DROP TABLE remito_items_viejo", args: [] },
    { sql: "DROP TABLE remitos_viejo", args: [] },

    { sql: "CREATE INDEX IF NOT EXISTS idx_remitos_reparto ON remitos(reparto_id)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_remitos_fecha ON remitos(fecha)", args: [] },
    { sql: "CREATE INDEX IF NOT EXISTS idx_remito_items_remito ON remito_items(remito_id)", args: [] },
  ];

  await db.batch(statements);
  console.log(
    "  - remitos reconstruidos sin estado (ya no existe entregado / no entregado)",
  );
}

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