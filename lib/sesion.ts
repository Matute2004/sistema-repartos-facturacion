import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesión firmada con HMAC-SHA256 (sin estado en el servidor).
 *
 * La cookie guarda: `usuarioId.expiraAt` + el HMAC del payload firmado con
 * SESSION_SECRET. Permite validar una sesión desde `proxy.ts` sin tocar la DB.
 */

export const NOMBRE_COOKIE_SESION = "ohana_sesion";
const DURACION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

/** Secreto para firmar sesiones. En producción debe venir de SESSION_SECRET. */
function obtenerSecreto(): string {
  const secreto = process.env.SESSION_SECRET;
  if (secreto && secreto.trim().length > 0) return secreto;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET no está definida. Configurala en .env.local (o en el entorno de deploy).",
    );
  }
  // Solo desarrollo: secreto estable para que las sesiones sobrevivan
  // reinicios del `next dev` local.
  return "dev-only-ohana-session-secret-no-usar-en-produccion";
}

function firmar(payload: string): string {
  return createHmac("sha256", obtenerSecreto()).update(payload).digest("hex");
}

/** Crea el valor de la cookie de sesión para un usuario. */
export function crearCookieSesion(usuarioId: number): string {
  const expira = Date.now() + DURACION_MS;
  const payload = `${usuarioId}.${expira}`;
  return `${payload}.${firmar(payload)}`;
}

/**
 * Valida una cookie de sesión. Devuelve `{ usuarioId }` si es válida y vigente,
 * o `null` si está adulterada, vencida o mal formada.
 */
export function verificarCookieSesion(
  valorCookie: string | undefined,
): { usuarioId: number } | null {
  if (!valorCookie) return null;
  const partes = valorCookie.split(".");
  if (partes.length !== 3) return null;
  const [usuarioIdTexto, expiraTexto, firma] = partes;

  const usuarioId = Number(usuarioIdTexto);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) return null;

  const expira = Number(expiraTexto);
  if (!Number.isFinite(expira)) return null;
  if (expira < Date.now()) return null;

  const payload = `${usuarioIdTexto}.${expiraTexto}`;
  const firmaEsperada = firmar(payload);
  const a = Buffer.from(firma, "hex");
  const b = Buffer.from(firmaEsperada, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { usuarioId };
}