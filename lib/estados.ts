import type { EstadoRemito, EstadoReparto } from "@/lib/types";

/**
 * Catálogos de estados de repartos y remitos (etiquetas y tonos).
 * Centralizados para reutilizarlos en páginas, formularios y badges.
 */

// ----------------------------------------------------------------------------
// Repartos
// ----------------------------------------------------------------------------
export const ESTADOS_REPARTO = [
  "pendiente",
  "en_curso",
  "completado",
  "cancelado",
] as const;

export const ETIQUETA_ESTADO_REPARTO: Record<EstadoReparto, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const TONE_ESTADO_REPARTO: Record<
  EstadoReparto,
  "emerald" | "amber" | "sky" | "red" | "zinc"
> = {
  pendiente: "amber",
  en_curso: "sky",
  completado: "emerald",
  cancelado: "red",
};

// ----------------------------------------------------------------------------
// Remitos
// ----------------------------------------------------------------------------
export const ESTADOS_REMITO = ["pendiente", "entregado", "cancelado"] as const;

export const ETIQUETA_ESTADO_REMITO: Record<EstadoRemito, string> = {
  pendiente: "Pendiente",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const TONE_ESTADO_REMITO: Record<
  EstadoRemito,
  "emerald" | "amber" | "sky" | "red" | "zinc"
> = {
  pendiente: "amber",
  entregado: "emerald",
  cancelado: "red",
};