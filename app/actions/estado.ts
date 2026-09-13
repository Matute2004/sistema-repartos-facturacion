/**
 * Estado y helpers compartidos por los formularios con `useActionState`.
 */
export interface EstadoAction {
  error: string | null;
}

export const estadoInicial: EstadoAction = { error: null };

/** Estado del formulario de importación masiva de clientes. */
export interface EstadoImportacion {
  error: string | null;
  resumen: string | null;
}

export const estadoInicialImportacion: EstadoImportacion = {
  error: null,
  resumen: null,
};

/** Estado del formulario de cambio de contraseña (cuenta). */
export interface EstadoCuenta {
  error: string | null;
  ok: boolean;
}

export const estadoInicialCuenta: EstadoCuenta = { error: null, ok: false };