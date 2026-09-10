/**
 * Estado y helpers compartidos por los formularios con `useActionState`.
 */
export interface EstadoAction {
  error: string | null;
}

export const estadoInicial: EstadoAction = { error: null };