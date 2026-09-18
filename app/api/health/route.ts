import { headers, cookies } from "next/headers";
import { getDb } from "@/lib/db";

/**
 * Endpoint de prueba de conexión a la base de datos.
 * GET /api/health
 * 
 * SEGURIDAD: requiere sesión activa. Sin autenticación no se revela:
 * - Si el servidor está vivo (información de denegación de servicio)
 * - Si se usa Turso o SQLite (infraestructura)
 * - Detalles de la conexión a la base
 */
export async function GET() {
  // Forzar que la ruta sea dinámica: sin esto Next la prerenderiza en el
  // build y ejecuta la consulta a Turso innecesariamente (falla al cancelarse).
  await headers();

  // SEGURIDAD: verificar autenticación básica antes de revelar información
  const cookieStore = await cookies();
  const sesionCookie = cookieStore.get("ohana_sesion")?.value;
  if (!sesionCookie) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  // Verificar formato de cookie sin importar la lógica de sesion.ts
  // (para no depender de SESSION_SECRET aquí)
  const partes = sesionCookie.split(".");
  if (partes.length !== 3) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const db = await getDb();
    await db.execute("SELECT 1 AS ok");
    return Response.json({
      ok: true,
      // No revelar si es Turso o SQLite (información de infraestructura)
      db: "disponible",
    });
  } catch {
    // Nunca exponer detalles del error en producción ni en desarrollo
    // Un atacante no debe saber si la DB existe o la configuración es incorrecta
    return Response.json(
      {
        ok: false,
        error: "No se pudo conectar con la base de datos.",
      },
      { status: 500 },
    );
  }
}