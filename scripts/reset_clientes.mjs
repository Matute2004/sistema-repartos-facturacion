// ============================================================================
// Reinicia la secuencia de clientes para que el próximo cliente sea el N° 1.
//
// Uso:
//   node --env-file-if-exists=.env.local scripts/reset_clientes.mjs
//
// - Si hay TURSO_DATABASE_URLL/TURSO_AUTH_TOKENN usa la base remota de Turso.
// - Si no, usa la SQLite local `file:local.db`.
//
// Qué hace:
//   1. Borra los clientes cargados (los definitivos se cargan de nuevo).
//   2. Resetea sqlite_sequence de `clientes` a 0, así el próximo INSERT de
//      cliente recibe id = 1 (y la app sincroniza numero = id).
//
// Seguridad: repartos.cliente_id usa ON DELETE SET NULL y ya está en NULL,
// así que no rompe ningún dato referencial.
// ============================================================================
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  const local = await import("@libsql/client");
  createClient = local.createClient;
}

const client = createClient({
  url: url || "file:local.db",
  ...(authToken ? { authToken } : {}),
});

console.log("1) Borrando clientes existentes...");
await client.execute("DELETE FROM clientes");
const quedan = await client.execute("SELECT COUNT(*) as n FROM clientes");
console.log(`   clientes restantes: ${quedan.rows[0].n}`);

console.log("2) Reseteando contador AUTOINCREMENT de clientes a 0...");
await client.execute(
  "UPDATE sqlite_sequence SET seq = 0 WHERE name = 'clientes'",
);

const seq = await client.execute(
  "SELECT seq FROM sqlite_sequence WHERE name = 'clientes'",
);
console.log(`   secuencia de clientes ahora: ${seq.rows[0]?.seq ?? "sin fila"}`);

console.log("NEXT: el próximo cliente será el N° 1.");