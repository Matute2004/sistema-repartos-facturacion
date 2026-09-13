import { createClient as createRemoteClient, type Client } from "@libsql/client/http";

let cached: Client | null = null;

/**
 * Lee una variable de entorno recortando espacios.
 *
 * Los nombres que usa este proyecto son los históricos con doble letra:
 *   TURSO_DATABASE_URLL y TURSO_AUTH_TOKENN
 * Configuralos con ese mismo nombre en Vercel.
 */
function valorEnv(nombre: string): string | undefined {
  const valor = process.env[nombre];
  return valor && valor.trim().length > 0 ? valor : undefined;
}

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

  const url = valorEnv("TURSO_DATABASE_URLL");

  if (url) {
    const authToken = valorEnv("TURSO_AUTH_TOKENN");
    if (!authToken) {
      throw new Error(
        "TURSO_DATABASE_URLL está definida pero falta TURSO_AUTH_TOKENN. " +
          "Revisá .env.local o las variables del entorno de deploy (Vercel).",
      );
    }
    cached = createRemoteClient({ url, authToken });
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TURSO_DATABASE_URLL no está definida en el entorno de producción. " +
        "Configurala en el proyecto de Vercel junto con TURSO_AUTH_TOKENN y SESSION_SECRET.",
    );
  }

  // Solo desarrollo sin credenciales: base SQLite local embebida.
  const { createClient: createLocalClient } = await import("@libsql/client");
  cached = createLocalClient({ url: "file:local.db" }) as Client;
  return cached;
}