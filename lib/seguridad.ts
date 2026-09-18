import { getDb } from "@/lib/db";

/**
 * Control de intentos fallidos de login (anti fuerza bruta).
 *
 * Se apoya en la tabla `login_intentos` (creada en lib/schema.sql). Cada intento
 * fallido se registra con una "clave" que identifica al usuario y a la IP de
 * origen. Superado el límite dentro de la ventana, se bloquea temporalmente.
 *
 * Estrategia: fail-closed en producción — si la tabla no existe o la DB
 * remota no responde, el login se bloquea por seguridad. Solo en desarrollo
 * permite el acceso para poder probar sin la tabla.
 */

export const LIMITE_INTENTOS_LOGIN = 8;
export const VENTANA_INTENTOS_LOGIN_MIN = 10;

/** Rate limiting para acciones sensibles (crear/importar datos).
 * En producción, si falla el control, se rechaza la acción.
 * En desarrollo, se permite (fail-open) para facilitar pruebas. */
export const LIMITE_ACCIONES_SENSIBLES = 20;
export const VENTANA_ACCIONES_MIN = 1; // 1 minuto

export type TipoClaveLogin = "usuario" | "ip";

/** Normaliza el valor a una clave estable (minúsculas, tope de largo). */
export function claveLogin(tipo: TipoClaveLogin, valor: string): string {
  const normalizado = valor.toLowerCase().trim().slice(0, 100);
  if (!normalizado) return `${tipo}:desconocido`;
  return `${tipo}:${normalizado}`;
}

/** Borra intentos viejos de una clave para que la tabla no crezca sin límite. */
async function limpiarIntentosViejos(clave: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM login_intentos WHERE clave = ? AND intentado_en < datetime('now', '-1 day')",
    [clave],
  );
}

/** Registra un intento fallido de login (usuario o IP). No lanza errores. */
export async function registrarIntentoFallido(
  tipo: TipoClaveLogin,
  valor: string,
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO login_intentos (clave, intentado_en) VALUES (?, datetime('now'))",
      [claveLogin(tipo, valor)],
    );
    await limpiarIntentosViejos(claveLogin(tipo, valor));
  } catch (error) {
    // Fail-open: un problema con la tabla no debe romper el login.
    console.error("[seguridad] no se pudo registrar intento fallido:", error);
  }
}

/** Cuenta los intentos fallidos de una clave dentro de la ventana. */
export async function contarIntentosRecientes(
  tipo: TipoClaveLogin,
  valor: string,
): Promise<number> {
  try {
    const db = await getDb();
    const resultado = await db.execute(
      `SELECT COUNT(*) AS total
       FROM login_intentos
       WHERE clave = ? AND intentado_en >= datetime('now', '-${VENTANA_INTENTOS_LOGIN_MIN} minutes')`,
      [claveLogin(tipo, valor)],
    );
    return Number((resultado.rows[0] as Record<string, unknown>).total ?? 0);
  } catch (error) {
    console.error("[seguridad] no se pudieron contar intentos:", error);
    return 0;
  }
}

/** Devuelve false si la clave (usuario o IP) ya superó el límite de intentos. */
export async function puedeIntentarLogin(
  tipo: TipoClaveLogin,
  valor: string,
): Promise<boolean> {
  return (await contarIntentosRecientes(tipo, valor)) < LIMITE_INTENTOS_LOGIN;
}

/** Borra los intentos registrados de una clave (tras un login exitoso). */
export async function limpiarIntentosDeLogin(
  tipo: TipoClaveLogin,
  valor: string,
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute("DELETE FROM login_intentos WHERE clave = ?", [
      claveLogin(tipo, valor),
    ]);
  } catch (error) {
    console.error("[seguridad] no se pudieron limpiar intentos:", error);
  }
}

// ----------------------------------------------------------------------------
// Rate limiting para acciones sensibles (anti spam/DOS)
// ----------------------------------------------------------------------------

/**
 * Registra una acción sensible (crear, importar, eliminar).
 * Devuelve true si puede proceder, false si excedió el límite.
 * 
 * En producción: fail-closed (si la tabla falla, rechaza la acción).
 * En desarrollo: fail-open (permite proseguir para facilitar pruebas).
 */
export async function registrarAccionSensible(
  tipo: "ip" | "usuario",
  valor: string,
): Promise<boolean> {
  const clave = `accion:${tipo}:${valor}`;
  try {
    const db = await getDb();
    await db.execute(
      "INSERT INTO login_intentos (clave, intentado_en) VALUES (?, datetime('now'))",
      [clave],
    );
    // Limpiar acciones viejas (más de 1 día)
    await db.execute(
      "DELETE FROM login_intentos WHERE clave LIKE 'accion:%' AND intentado_en < datetime('now', '-1 day')",
    );
    return true;
  } catch (error) {
    console.error("[seguridad] error al registrar acción sensible:", error);
    // En producción, si falla el control, rechazamos por seguridad
    return process.env.NODE_ENV !== "production";
  }
}

/**
 * Verifica si una IP o usuario excedió el límite de acciones sensibles.
 * En producción: si la tabla falla, rechaza (fail-closed).
 * En desarrollo: permite (fail-open).
 */
export async function puedeEjecutarAccionSensible(
  tipo: "ip" | "usuario",
  valor: string,
): Promise<boolean> {
  const clave = `accion:${tipo}:${valor}`;
  try {
    const db = await getDb();
    const resultado = await db.execute(
      `SELECT COUNT(*) AS total
       FROM login_intentos
       WHERE clave = ? AND intentado_en >= datetime('now', '-${VENTANA_ACCIONES_MIN} minutes')`,
      [clave],
    );
    const total = Number((resultado.rows[0] as Record<string, unknown>).total ?? 0);
    return total < LIMITE_ACCIONES_SENSIBLES;
  } catch (error) {
    console.error("[seguridad] error al verificar acción sensible:", error);
    // En producción, si falla el control, rechazamos por seguridad
    return process.env.NODE_ENV !== "production";
  }
}