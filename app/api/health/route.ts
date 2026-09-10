import { getDb } from "@/lib/db";

/**
 * Endpoint de prueba de conexión a la base de datos.
 * GET /api/health
 */
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute("SELECT 1 AS ok");
    return Response.json({
      ok: true,
      db: process.env.TURSO_DATABASE_URL ? "turso" : "local",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("[health] error de base de datos:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}