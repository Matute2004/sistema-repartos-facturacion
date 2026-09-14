import { obtenerUsuarioActual } from "@/lib/auth";
import { obtenerRemitoCompleto } from "@/lib/data/remitos";

/**
 * Devuelve el detalle completo de un remito (remito + cliente + items) en JSON.
 * Lo consume el modal de remitos del listado de repartos.
 *
 * El route handler no lleva `dynamic = "force-dynamic"`: con Cache Components
 * ese config no se permite, y además sobra porque al leer la cookie de sesión
 * (obtenerUsuarioActual) este GET ya es dinámico y no se cachea.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario || usuario.rol !== "admin") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const completo = await obtenerRemitoCompleto(Number(id));
  if (!completo) {
    return Response.json({ error: "Remito no encontrado." }, { status: 404 });
  }

  return Response.json({
    remito: completo.remito,
    cliente: completo.cliente,
    items: completo.items,
  });
}