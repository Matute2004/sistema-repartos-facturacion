import { headers } from "next/headers";
import { getDb } from "@/lib/db";

/**
 * Endpoint de prueba de conexión a la base de datos.
 * GET /api/health
 */
export async function GET() {
  // Forzar que la ruta sea dinámica: sin esto Next la prerenderiza en el
  // build y ejecuta la consulta a Turso innecesariamente (falla al cancelarse).
  await headers();

  try {
    const db = await getDb();
    const result = await db.execute("SELECT 1 AS ok");
    return Response.json({
      ok: true,
      db: process.env.TURSO_DATABASE_URLL ? "turso" : "local",
      result: result.rows[0],
    });
  } catch (error) {
    console.error("[health] error de base de datos:", error);
    // En producción no se exponen detalles internos del error (pueden revelar
    // infraestructura). Solo se indica que la conexión falló.
    const mensaje =
      process.env.NODE_ENV === "production"
        ? "No se pudo conectar con la base de datos."
        : error instanceof Error
          ? error.message
          : String(error);
    return Response.json(
      {
        ok: false,
        error: mensaje,
      },
      { status: 500 },
    );
  }
}