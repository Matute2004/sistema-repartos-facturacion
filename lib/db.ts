import { createClient as createRemoteClient, type Client } from "@libsql/client/http";

let cached: Client | null = null;

/**
 * Cliente de base de datos Turso (libSQL), seguro para entornos serverless.
 *
 * - En producción usa `@libsql/client/http`: cliente HTTP puro (protocolo
 *   hrana) que NO depende de bindings nativos, por lo que funciona en las
 *   funciones serverless de Vercel.
 * - En desarrollo sin credenciales cae a una base SQLite local
 *   (`file:local.db`) mediante import dinámico (el archivo está ignorado en
 *   `.gitignore`).
 *
 * Ejemplo de uso (solo del lado del servidor: Server Components, Route
 * Handlers o Server Actions):
 *
 *   const db = await getDb();
 *   const result = await db.execute("SELECT * FROM usuarios");
 */
export async function getDb(): Promise<Client> {
  if (cached) return cached;

  const url = process.env.TURSO_DATABASE_URL;

  if (url) {
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!authToken) {
      throw new Error(
        "TURSO_DATABASE_URL está definida pero falta TURSO_AUTH_TOKEN. " +
          "Revisá .env.local o las variables de tu plataforma de deploy.",
      );
    }
    cached = createRemoteClient({ url, authToken });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TURSO_DATABASE_URL no está definida en el entorno de producción.",
    );
  }

  // Solo desarrollo sin credenciales: base SQLite local embebida.
  const { createClient: createLocalClient } = await import("@libsql/client");
  cached = createLocalClient({ url: "file:local.db" }) as Client;
  return cached;
}