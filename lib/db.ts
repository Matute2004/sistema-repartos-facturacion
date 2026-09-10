import { createClient, type Client } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;

/**
 * Cliente de base de datos Turso (libSQL).
 *
 * - Si `TURSO_DATABASE_URL` está definida (en `.env.local`), se conecta a la
 *   base remota de Turso usando el token de autenticación.
 * - Si no está definida, usa una base SQLite local (`file:local.db`) como
 *   fallback para desarrollo sin credenciales. Ese archivo está ignorado en
 *   `.gitignore`.
 *
 * Ejemplo de uso (solo del lado del servidor: Server Components, Route
 * Handlers o Server Actions):
 *
 *   const result = await db.execute("SELECT * FROM usuarios");
 */
export const db: Client = createClient(
  url
    ? {
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: "file:local.db" },
);