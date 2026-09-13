import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash y verificación de passwords con scrypt de Node (sin dependencias).
 *
 * Formato guardado: `scrypt:<salt-hex>:<hash-hex>`.
 */

const HASH_LENGTH = 64;

export function hashearPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, HASH_LENGTH);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const partes = almacenado.split(":");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  const salt = Buffer.from(partes[1], "hex");
  const esperado = Buffer.from(partes[2], "hex");
  const calculado = scryptSync(password, salt, HASH_LENGTH);
  if (esperado.length !== calculado.length) return false;
  return timingSafeEqual(esperado, calculado);
}