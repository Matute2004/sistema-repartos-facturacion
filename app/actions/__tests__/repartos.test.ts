import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests de Server Actions de repartos con los módulos de Next y la capa de
 * datos mockeados: se enfocan en la lógica de la acción (validación + datos
 * que delega), igual que el test de acciones de remitos.
 */

const {
  revalidatePath,
  redirect,
  exigirAdminMock,
  obtenerOCrearClientePorNombre,
  crearReparto,
  asignarRemitosAReparto,
  crearRemito,
  proximoNumeroRemito,
  actualizarFormaPagoReparto,
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  exigirAdminMock: vi.fn(),
  obtenerOCrearClientePorNombre: vi.fn(),
  crearReparto: vi.fn(),
  asignarRemitosAReparto: vi.fn(),
  crearRemito: vi.fn(),
  proximoNumeroRemito: vi.fn(),
  actualizarFormaPagoReparto: vi.fn(),
}));

const SENAL_REDIRECT = "NEXT_REDIRECT";

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ exigirAdmin: exigirAdminMock }));
vi.mock("@/lib/data/clientes", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data/clientes")>();
  return { ...original, obtenerOCrearClientePorNombre };
});
vi.mock("@/lib/data/repartos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data/repartos")>();
  return {
    ...original,
    crearReparto,
    asignarRemitosAReparto,
    actualizarFormaPagoReparto,
  };
});
vi.mock("@/lib/data/remitos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data/remitos")>();
  return { ...original, crearRemito, proximoNumeroRemito };
});

import {
  actualizarFormaPagoRepartoAction,
  crearRepartoAction,
} from "@/app/actions/repartos";
import { estadoInicial } from "@/app/actions/estado";

beforeEach(() => {
  vi.clearAllMocks();
  exigirAdminMock.mockResolvedValue({ id: 1, nombre: "Matute", rol: "admin" });
  redirect.mockImplementation(() => {
    throw new Error(SENAL_REDIRECT);
  });
  obtenerOCrearClientePorNombre.mockResolvedValue(42);
  crearReparto.mockResolvedValue(9);
  proximoNumeroRemito.mockResolvedValue(12);
  crearRemito.mockResolvedValue(99);
});
describe("crearRepartoAction", () => {
  it("exige sesión admin antes de validar (defensa en profundidad)", async () => {
    const resultado = await crearRepartoAction(estadoInicial, new FormData());
    expect(exigirAdminMock).toHaveBeenCalledTimes(1);
    expect(resultado.error).toContain("fecha");
  });

  it("crea el cliente al vuelo y guarda la mercadería directa cuando NO lleva remito", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Comercio Nuevo");
    formData.set("recibido_por", "Chofer");
    formData.set("forma_pago", "debito");
    formData.set("cantidad", "2");
    formData.set("unidad", "caja");
    formData.set("item_descripcion", "Caja de galletitas");
    formData.set("item_precio", "1.200,00");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(obtenerOCrearClientePorNombre).toHaveBeenCalledWith("Comercio Nuevo");
    expect(crearReparto).toHaveBeenCalledWith({
      fecha: "2026-09-13",
      estado: "pendiente",
      clienteId: 42,
      enviadoPor: "Comercio Nuevo",
      recibidoPor: "Chofer",
      observaciones: undefined,
      llevaRemito: false,
      formaPago: "debito",
      unidad: "caja",
      cantidad: 2,
      itemDescripcion: "Caja de galletitas",
      itemPrecioUnitarioCentavos: 120000,
    });
    // Sin remito: no emite ningún remito.
    expect(crearRemito).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/repartos");
  });

  it("emite un remito asociado al cliente y al reparto cuando lleva remito", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente Existe");
    formData.set("forma_pago", "contado");
    formData.set("lleva_remito", "on");
    formData.append("item_descripcion", "Caja de vino");
    formData.append("item_cantidad", "4");
    formData.append("item_precio", "3.000,00");
    formData.append("item_descripcion", "línea vacía");
    formData.append("item_cantidad", "0");
    formData.append("item_precio", "");
    formData.set("remito_observaciones", "Frágil");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({
        llevaRemito: true,
        unidad: undefined,
        cantidad: undefined,
        itemDescripcion: undefined,
      }),
    );
    expect(crearRemito).toHaveBeenCalledWith({
      numero: 12,
      clienteId: 42,
      fecha: "2026-09-13",
      repartoId: 9,
      observaciones: "Frágil",
      // La línea con cantidad 0 se descarta.
      items: [
        {
          descripcion: "Caja de vino",
          cantidad: 4,
          precioUnitarioCentavos: 300000,
        },
      ],
    });
  });

  it("pide el cliente (Envía) antes de crear el reparto", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");

    const resultado = await crearRepartoAction(estadoInicial, formData);
    expect(resultado.error).toContain("envía");
    expect(crearReparto).not.toHaveBeenCalled();
  });

  it("rechaza un reparto con remito sin líneas válidas", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente");
    formData.set("lleva_remito", "on");
    formData.set("item_descripcion", "");
    formData.set("item_cantidad", "0");
    formData.set("item_precio", "");

    const resultado = await crearRepartoAction(estadoInicial, formData);
    expect(resultado.error).toContain("remito");
    expect(crearReparto).not.toHaveBeenCalled();
  });

  it("rechaza una forma de pago que no está en el catálogo", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente");
    formData.set("forma_pago", "tarjeta");

    const resultado = await crearRepartoAction(estadoInicial, formData);
    expect(resultado.error).toContain("pago");
    expect(crearReparto).not.toHaveBeenCalled();
  });
});
describe("actualizarFormaPagoRepartoAction", () => {
  it("actualiza la forma de pago cuando es válida", async () => {
    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cheque");

    const resultado = await actualizarFormaPagoRepartoAction(estadoInicial, formData);
    expect(resultado.error).toBeNull();
    expect(actualizarFormaPagoReparto).toHaveBeenCalledWith(3, "cheque");
    expect(revalidatePath).toHaveBeenCalledWith("/repartos");
  });

  it("rechaza una forma de pago que no está en el catálogo", async () => {
    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cripto");

    const resultado = await actualizarFormaPagoRepartoAction(estadoInicial, formData);
    expect(resultado.error).toBe("Forma de pago inválida.");
    expect(actualizarFormaPagoReparto).not.toHaveBeenCalled();
  });
});