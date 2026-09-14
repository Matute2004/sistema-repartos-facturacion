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
  /** N° del cliente, cargado a mano al dar de alta. */
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

// ----------------------------------------------------------------------------
// Formas de pago de los repartos
// ----------------------------------------------------------------------------
export const FORMAS_PAGO = [
  "contado",
  "cuenta_corriente",
  "debito",
  "cheque",
] as const;

export type FormaPago = (typeof FORMAS_PAGO)[number];

export const ETIQUETA_FORMA_PAGO: Record<FormaPago, string> = {
  contado: "Contado",
  cuenta_corriente: "Cuenta corriente",
  debito: "Débito",
  cheque: "Cheque",
};

/** Remito resumido que se muestra dentro de un reparto (columna "Remitos"). */
export interface RepartoRemitoLigero {
  id: number;
  numero: number;
}

export interface Reparto {
  id: number;
  fecha: string;
  estado: EstadoReparto;
  /** Cliente vinculado al reparto (el "Envía"), o null si es un reparto viejo. */
  clienteId: number | null;
  /** Nombre del cliente vinculado, para mostrar directo en listas. */
  clienteNombre: string | null;
  /** Quién envía / entrega el reparto (columna `chofer` en la DB). */
  enviadoPor: string | null;
  /** Quién recibe el reparto (columna `vehiculo` en la DB). */
  recibidoPor: string | null;
  /** Observaciones del reparto (columna `notas` en la DB). */
  observaciones: string | null;
  /** Indica si el reparto lleva remito (se emite al darlo de alta). */
  llevaRemito: boolean;
  /** Ítems de la mercadería directa cuando NO lleva remito (puede ser uno o varios). */
  items: RepartoItem[];
  /**
   * Forma de pago elegida, o null si el reparto todavía no se cobró
   * (columna `forma_pago` más `cobrado` en la DB).
   */
  formaPago: FormaPago | null;
  /** True si el reparto ya se cobró (se eligió una forma de pago). */
  cobrado: boolean;
  /**
   * Valor total en centavos: suma de los remitos asignados + la mercadería
   * directa (cuando el reparto no lleva remito).
   */
  valorCentavos: number;
  creadoEn: string;
  /** Remitos asociados (solo id + número), poblados en `listarRepartos`. */
  remitos: RepartoRemitoLigero[];
}

/** Ítem de la mercadería directa de un reparto (una línea de `reparto_items`). */
export interface RepartoItem {
  id: number;
  repartoId: number;
  descripcion: string;
  cantidad: number;
  precioUnitarioCentavos: number;
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

/**
 * Formatea un entero como kilometraje argentino: 12345 → "12.345 km".
 */
export function formatKilometros(km: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(km) + " km";
}

// ----------------------------------------------------------------------------
// Vehículos (flota propia)
// ----------------------------------------------------------------------------
export interface Vehiculo {
  id: number;
  nombre: string;
  patente: string | null;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  kilometros: number | null;
  kmProximoService: number | null;
  fechaUltimoService: string | null;
  notas: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

// ----------------------------------------------------------------------------
// Usuarios y sesión
// ----------------------------------------------------------------------------
export type RolUsuario = "admin" | "operador";

export interface Usuario {
  id: number;
  nombre: string;
  passwordHash: string;
  rol: RolUsuario;
  creadoEn: string;
  actualizadoEn: string;
}

/** Datos de sesión visibles para la UI (nunca el password). */
export interface UsuarioSesion {
  id: number;
  nombre: string;
  rol: RolUsuario;
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

/**
 * Convierte un string de pesos a centavos. Formato esperado argentino:
 * la coma es el separador decimal y los puntos actúan como separador de
 * miles (se eliminan), ej: "1.234,56" -> 123456.
 * Devuelve 0 si el valor está vacío, es inválido o negativo.
 */
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