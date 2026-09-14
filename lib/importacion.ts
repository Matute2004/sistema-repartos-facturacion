/**
 * Normalización de filas para la importación masiva de clientes.
 *
 * Toda entrada llega como JSON parseado en el navegador y vuelve a entrar por
 * la Server Action. Acá se vuelve a validar del lado del servidor: se recortan
 * los campos a un largo máximo razonable y se fija un tope de filas por lote
 * (defensa contra payloads gigantes).
 */

export const LIMITE_FILAS_IMPORTACION = 5000;

export const LIMITES_CAMPOS = {
  nombre: 200,
  cuit: 13, // formato 20-12345678-9
  direccion: 200,
  localidad: 120,
  telefono: 60,
  email: 120,
  notas: 2000,
} as const;

export interface FilaClienteImportada {
  numero: number | null;
  nombre: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  telefono?: string;
  email?: string;
  notas?: string;
}

/** Recorta un valor a texto de largo máximo (evita filas kilométricas). */
export function recortarTexto(valor: unknown, maximo: number): string {
  if (valor == null) return "";
  return String(valor).trim().slice(0, maximo);
}

/**
 * Normaliza una fila cruda de la planilla. Devuelve `null` si la fila no tiene
 * nombre (obligatorio). El N° inválido o ausente pasa como `null` (el esquema
 * lo permite y el alta manual es lo que lo exige).
 */
export function normalizarFilaImportacion(
  bruta: unknown,
): FilaClienteImportada | null {
  const fila = (bruta ?? {}) as Record<string, unknown>;

  const nombre = recortarTexto(fila.nombre, LIMITES_CAMPOS.nombre);
  if (!nombre) return null;

  const soloDigitos = recortarTexto(fila.numero, 9).replace(/\D/g, "");
  const numero = soloDigitos ? Number(soloDigitos) : null;

  const opcional = (valor: unknown, maximo: number): string | undefined => {
    const texto = recortarTexto(valor, maximo);
    return texto.length > 0 ? texto : undefined;
  };

  return {
    numero:
      numero && Number.isInteger(numero) && numero > 0 ? numero : null,
    nombre,
    cuit: opcional(fila.cuit, LIMITES_CAMPOS.cuit),
    direccion: opcional(fila.direccion, LIMITES_CAMPOS.direccion),
    localidad: opcional(fila.localidad, LIMITES_CAMPOS.localidad),
    telefono: opcional(fila.telefono, LIMITES_CAMPOS.telefono),
    email: opcional(fila.email, LIMITES_CAMPOS.email),
    notas: opcional(fila.notas, LIMITES_CAMPOS.notas),
  };
}