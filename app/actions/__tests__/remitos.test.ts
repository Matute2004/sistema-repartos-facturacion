import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests de Server Actions con los módulos de Next y la capa de datos mockeados:
 * se enfocan en la lógica de la acción (validación + datos que delega).
 */

const {
  revalidatePath,
  updateTag,
  redirect,
  exigirAdminMock,
  crearRemito,
  proximoNumeroRemito,
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
  exigirAdminMock: vi.fn(),
  crearRemito: vi.fn(),
  proximoNumeroRemito: vi.fn(),
}));

const SENAL_REDIRECT = "NEXT_REDIRECT";

vi.mock("next/cache", () => ({ revalidatePath, updateTag }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ exigirAdmin: exigirAdminMock }));
vi.mock("@/lib/data/remitos", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/data/remitos")
  >();
  return { ...original, crearRemito, proximoNumeroRemito };
});

import {
  actualizarEstadoRemitoAction,
  crearRemitoAction,
} from "@/app/actions/remitos";
import { estadoInicial } from "@/app/actions/estado";

beforeEach(() => {
  vi.clearAllMocks();
  exigirAdminMock.mockResolvedValue({ id: 1, nombre: "Matute", rol: "admin" });
  redirect.mockImplementation(() => {
    throw new Error(SENAL_REDIRECT);
  });
  crearRemito.mockResolvedValue(100);
  proximoNumeroRemito.mockResolvedValue(7);
});

function formConItems(): FormData {
  const formData = new FormData();
  formData.set("reparto_id", "5");
  formData.set("fecha", "2026-09-13");
  // append() acumula valores repetidos para que getAll() devuelva ambos.
  formData.append("item_descripcion", "Caja de agua");
  formData.append("item_cantidad", "2");
  formData.append("item_precio", "1.200,00");
  formData.append("item_descripcion", "Línea vacía");
  formData.append("item_cantidad", "0");
  formData.append("item_precio", "");
  return formData;
}

describe("crearRemitoAction", () => {
  it("exige sesión admin antes de validar (defensa en profundidad)", async () => {
    const resultado = await crearRemitoAction(estadoInicial, new FormData());
    expect(exigirAdminMock).toHaveBeenCalledTimes(1);
    expect(resultado.error).toContain("reparto");
  });

  it("filtra líneas inválidas, calcula el N° y delega en la capa de datos", async () => {
    await expect(
      crearRemitoAction(estadoInicial, formConItems()),
    ).rejects.toThrow(SENAL_REDIRECT);

    expect(proximoNumeroRemito).toHaveBeenCalledTimes(1);
    expect(crearRemito).toHaveBeenCalledTimes(1);
    expect(crearRemito).toHaveBeenCalledWith({
      numero: 7,
      repartoId: 5,
      fecha: "2026-09-13",
      observaciones: undefined,
      // La línea con cantidad 0 se descarta.
      items: [
        { descripcion: "Caja de agua", cantidad: 2, precioUnitarioCentavos: 120000 },
      ],
    });
    expect(redirect).toHaveBeenCalledWith("/remitos/100");
    expect(revalidatePath).toHaveBeenCalledWith("/remitos");
    expect(revalidatePath).toHaveBeenCalledWith("/repartos");
  });

  it("valida que exista el reparto", async () => {
    const formData = formConItems();
    formData.set("reparto_id", "0");

    const resultado = await crearRemitoAction(estadoInicial, formData);
    expect(resultado.error).toContain("reparto");
    expect(crearRemito).not.toHaveBeenCalled();
  });

  it("valida que haya al menos una línea con cantidad > 0", async () => {
    const formData = new FormData();
    formData.set("reparto_id", "5");
    formData.set("fecha", "2026-09-13");
    formData.set("item_descripcion", "");
    formData.set("item_cantidad", "1");
    formData.set("item_precio", "10");

    const resultado = await crearRemitoAction(estadoInicial, formData);
    expect(resultado.error).toContain("línea");
    expect(crearRemito).not.toHaveBeenCalled();
  });
});

describe("actualizarEstadoRemitoAction", () => {
  it("rechaza un estado que no es de la lista", async () => {
    const formData = new FormData();
    formData.set("id", "3");
    formData.set("estado", "no-existe");

    const resultado = await actualizarEstadoRemitoAction(estadoInicial, formData);
    expect(resultado.error).toBe("Estado inválido.");
  });
});