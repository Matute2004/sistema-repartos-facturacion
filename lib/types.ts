/**
 * Tipos de dominio del sistema y utilidades de formato.
 *
 * Convención de dinero: los montos se guardan SIEMPRE en centavos (INTEGER)
 * para evitar errores de redondeo de punto flotante.
 */

// ----------------------------------------------------------------------------
// Clientes
// ----------------------------------------------------------------------------
export interface Cliente {
  id: number;
  /** N° visible asignado automáticamente al cargar el cliente (puede ser null en clientes previos). */
  numero: number | null;
  nombre: string;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ----------------------------------------------------------------------------
// Gastos
// ----------------------------------------------------------------------------
export const CATEGORIAS_GASTO = [
  "combustible",
  "mecanico",
  "insumos",
  "otros",
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export const ETIQUETA_CATEGORIA: Record<CategoriaGasto, string> = {
  combustible: "Combustible",
  mecanico: "Mecánico",
  insumos: "Insumos",
  otros: "Otros",
};

export interface Gasto {
  id: number;
  fecha: string; // YYYY-MM-DD
  categoria: CategoriaGasto;
  descripcion: string;
  proveedor: string | null;
  montoCentavos: number;
  creadoEn: string;
}

// ----------------------------------------------------------------------------
// Repartos y remitos (base para el módulo de hojas de ruta)
// ----------------------------------------------------------------------------
export type EstadoReparto = "pendiente" | "en_curso" | "completado" | "cancelado";

export interface Reparto {
  id: number;
  fecha: string;
  estado: EstadoReparto;
  /** Quién envía / entrega el reparto (columna `chofer` en la DB). */
  enviadoPor: string | null;
  /** Quién recibe el reparto (columna `vehiculo` en la DB). */
  recibidoPor: string | null;
  /** Observaciones del reparto (columna `notas` en la DB). */
  observaciones: string | null;
  /** Suma del valor de todos los remitos asignados, en centavos. */
  valorCentavos: number;
  creadoEn: string;
}

export type EstadoRemito = "pendiente" | "entregado" | "cancelado";

export interface Remito {
  id: number;
  numero: number;
  clienteId: number;
  repartoId: number | null;
  fecha: string;
  estado: EstadoRemito;
  observaciones: string | null;
  /** Suma del valor de sus items, en centavos. */
  valorCentavos: number;
  creadoEn: string;
}

export interface RemitoItem {
  id: number;
  remitoId: number;
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
}

// ----------------------------------------------------------------------------
// Utilidades de dinero y fechas
// ----------------------------------------------------------------------------

/** Formatea un valor en centavos a pesos argentinos, ej: 12345 -> "$ 123,45". */
export function formatPesos(centavos: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(centavos / 100);
}

/** Convierte un string de pesos (ej: "123,45" o "123.45") a centavos. */
export function pesosACentavos(valor: string): number {
  const normalizado = valor.replace(/\./g, "").replace(",", ".");
  const numero = Number.parseFloat(normalizado);
  if (!Number.isFinite(numero) || numero < 0) return 0;
  return Math.round(numero * 100);
}

/** Formatea una fecha ISO (YYYY-MM-DD o ISO completo) a formato legible. */
export function formatFecha(iso: string): string {
  const fecha = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

/** Devuelve la fecha local de hoy en formato YYYY-MM-DD (uso en formularios). */
export function fechaHoyLocal(): string {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset();
  const local = new Date(ahora.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}