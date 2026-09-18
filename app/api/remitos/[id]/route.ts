import { obtenerUsuarioActual } from "@/lib/auth";
import { obtenerRemitoCompleto } from "@/lib/data/remitos";

/**
 * Devuelve datos resumidos de un remito para el modal de visualización.
 * SOLO devuelve información necesaria para mostrar, nunca datos sensibles
 * como CUIT, dirección completa, email, teléfono o notas del cliente.
 * 
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

  // SEGURIDAD: NO exponer datos sensibles del cliente
  // Solo devolver información necesaria para mostrar en el modal
  return Response.json({
    remito: completo.remito,
    reparto: completo.reparto,
    // Cliente resumido: solo nombre (sin CUIT, dirección, email, teléfono, notas)
    cliente: completo.cliente
      ? {
          id: completo.cliente.id,
          numero: completo.cliente.numero,
          nombre: completo.cliente.nombre,
        }
      : null,
    clienteNombre: completo.clienteNombre,
    items: completo.items,
  });
}