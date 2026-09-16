import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests de Server Actions de repartos con los módulos de Next y la capa de
 * datos mockeados: se enfocan en la lógica de la acción (validación + datos
 * que delega), igual que el test de acciones de remitos.
 */

const {
  revalidatePath,
  updateTag,
  redirect,
  exigirAdminMock,
  obtenerClientePorNombre,
  obtenerOCrearClientePorNombre,
  crearReparto,
  asignarRemitosAReparto,
  crearRemito,
  proximoNumeroRemito,
  actualizarFormaPagoReparto,
  obtenerPartesReparto,
} = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  redirect: vi.fn(),
  exigirAdminMock: vi.fn(),
  obtenerClientePorNombre: vi.fn(),
  obtenerOCrearClientePorNombre: vi.fn(),
  crearReparto: vi.fn(),
  asignarRemitosAReparto: vi.fn(),
  crearRemito: vi.fn(),
  proximoNumeroRemito: vi.fn(),
  actualizarFormaPagoReparto: vi.fn(),
  obtenerPartesReparto: vi.fn(),
}));

const SENAL_REDIRECT = "NEXT_REDIRECT";

vi.mock("next/cache", () => ({ revalidatePath, updateTag }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth", () => ({ exigirAdmin: exigirAdminMock }));
vi.mock("@/lib/data/clientes", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data/clientes")>();
  return { ...original, obtenerClientePorNombre, obtenerOCrearClientePorNombre };
});
vi.mock("@/lib/data/repartos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/data/repartos")>();
  return {
    ...original,
    crearReparto,
    asignarRemitosAReparto,
    actualizarFormaPagoReparto,
    obtenerPartesReparto,
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
  obtenerClientePorNombre.mockResolvedValue(42);
  obtenerOCrearClientePorNombre.mockResolvedValue(43);
  obtenerPartesReparto.mockResolvedValue({
    clienteId: null,
    enviadoPor: "Comercio Nuevo",
    recibidoPor: "Chofer",
  });
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

  it("resuelve el cliente por nombre (sin crearlo) y guarda la mercadería directa (varias líneas) cuando NO lleva remito", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Comercio Nuevo");
    formData.set("recibido_por", "Chofer");
    formData.set("forma_pago", "debito");
    formData.append("reparto_item_descripcion", "Caja de galletitas");
    formData.append("reparto_item_cantidad", "2");
    formData.append("reparto_item_precio", "1.200,00");
    formData.append("reparto_item_descripcion", "Rueda 175/70");
    formData.append("reparto_item_cantidad", "4");
    formData.append("reparto_item_precio", "45.000,00");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(obtenerClientePorNombre).toHaveBeenCalledWith("Comercio Nuevo");
    expect(crearReparto).toHaveBeenCalledWith({
      fecha: "2026-09-13",
      clienteId: 42,
      enviadoPor: "Comercio Nuevo",
      recibidoPor: "Chofer",
      observaciones: undefined,
      llevaRemito: false,
      formaPago: "debito",
      itemsMercaderia: [
        {
          descripcion: "Caja de galletitas",
          cantidad: 2,
          precioUnitarioCentavos: 120000,
        },
        {
          descripcion: "Rueda 175/70",
          cantidad: 4,
          precioUnitarioCentavos: 4500000,
        },
      ],
    });
    // Sin remito: no emite ningún remito.
    expect(crearRemito).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/repartos");
  });

  it("con «cuenta corriente» crea/vincula el cliente del Envía automáticamente", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Comercio Nuevo");
    formData.set("forma_pago", "cuenta_corriente");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    // El cliente se registra (o reutiliza) siempre: no queda en texto libre.
    expect(obtenerOCrearClientePorNombre).toHaveBeenCalledWith("Comercio Nuevo");
    expect(obtenerClientePorNombre).not.toHaveBeenCalled();
    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 43,
        formaPago: "cuenta_corriente",
      }),
    );
  });

  it("con «cuenta corriente» y el lado «Flete Destino» registra el cliente del Destino", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Expreso Norte");
    formData.set("recibido_por", "Distribuidora Sur");
    formData.set("forma_pago", "cuenta_corriente");
    formData.set("cliente_cc_lado", "destino");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    // El cliente que se registra/reutiliza es el del Flete Destino.
    expect(obtenerOCrearClientePorNombre).toHaveBeenCalledWith(
      "Distribuidora Sur",
    );
    expect(obtenerClientePorNombre).not.toHaveBeenCalled();
    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 43,
        recibidoPor: "Distribuidora Sur",
        formaPago: "cuenta_corriente",
      }),
    );
  });

  it("con «cuenta corriente» y lado «Flete Destino» pide completar el Destino", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Expreso Norte");
    formData.set("forma_pago", "cuenta_corriente");
    formData.set("cliente_cc_lado", "destino");

    const resultado = await crearRepartoAction(estadoInicial, formData);
    expect(resultado.error).toContain("Flete");
    expect(obtenerOCrearClientePorNombre).not.toHaveBeenCalled();
    expect(crearReparto).not.toHaveBeenCalled();
  });

  it("deja la forma de pago vacía (por cobrar) cuando no se elige", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente Nuevo");
    formData.append("reparto_item_descripcion", "Caja surtida");
    formData.append("reparto_item_cantidad", "1");
    formData.append("reparto_item_precio", "500");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({ formaPago: null }),
    );
  });

  it("usa el cliente elegido con la lupa (cliente_id) sin crearlo de nuevo", async () => {
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente Existente");
    formData.set("cliente_id", "15");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(obtenerClientePorNombre).not.toHaveBeenCalled();
    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: 15 }),
    );
  });

  it("emite el remito asociado al reparto cuando lleva remito", async () => {
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
        itemsMercaderia: [],
        formaPago: "contado",
      }),
    );
    expect(crearRemito).toHaveBeenCalledWith({
      numero: 12,
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

  it("guarda el reparto sin vincular ni crear cliente cuando el nombre no está en la lista", async () => {
    obtenerClientePorNombre.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente No Cargado");
    formData.append("reparto_item_descripcion", "Caja surtida");
    formData.append("reparto_item_cantidad", "1");
    formData.append("reparto_item_precio", "500");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: null,
        enviadoPor: "Cliente No Cargado",
        llevaRemito: false,
      }),
    );
    expect(crearRemito).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/repartos");
  });

  it("emite el remito asociado al reparto aunque el cliente (Envía) no esté en la lista", async () => {
    obtenerClientePorNombre.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("fecha", "2026-09-13");
    formData.set("enviado_por", "Cliente No Cargado");
    formData.set("lleva_remito", "on");
    formData.append("item_descripcion", "Caja de vino");
    formData.append("item_cantidad", "1");
    formData.append("item_precio", "100");

    await expect(crearRepartoAction(estadoInicial, formData)).rejects.toThrow(
      SENAL_REDIRECT,
    );

    // El remito queda asociado al reparto y el cliente se resuelve por el
    // reparto: ya no se exige que el cliente esté en la lista.
    expect(crearReparto).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: null, llevaRemito: true }),
    );
    expect(crearRemito).toHaveBeenCalledWith({
      numero: 12,
      fecha: "2026-09-13",
      repartoId: 9,
      observaciones: undefined,
      items: [
        { descripcion: "Caja de vino", cantidad: 1, precioUnitarioCentavos: 10000 },
      ],
    });
    expect(redirect).toHaveBeenCalledWith("/repartos");
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

  it("la opción «Por cobrar» deja el reparto sin cobrar", async () => {
    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "");

    const resultado = await actualizarFormaPagoRepartoAction(
      estadoInicial,
      formData,
    );
    expect(resultado.error).toBeNull();
    expect(actualizarFormaPagoReparto).toHaveBeenCalledWith(3, null);
    expect(revalidatePath).toHaveBeenCalledWith("/repartos");
  });

  it("«cuenta corriente» registra y vincula el cliente del Envía del reparto", async () => {
    obtenerPartesReparto.mockResolvedValue({
      clienteId: null,
      enviadoPor: "Almacén Don José",
      recibidoPor: null,
    });

    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cuenta_corriente");

    const resultado = await actualizarFormaPagoRepartoAction(
      estadoInicial,
      formData,
    );
    expect(resultado.error).toBeNull();
    expect(obtenerPartesReparto).toHaveBeenCalledWith(3);
    expect(obtenerOCrearClientePorNombre).toHaveBeenCalledWith(
      "Almacén Don José",
    );
    expect(actualizarFormaPagoReparto).toHaveBeenCalledWith(
      3,
      "cuenta_corriente",
      43,
    );
  });

  it("«cuenta corriente» usa el Flete Destino si el reparto no tiene Flete Origen", async () => {
    obtenerPartesReparto.mockResolvedValue({
      clienteId: null,
      enviadoPor: null,
      recibidoPor: "Distribuidora Sur",
    });

    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cuenta_corriente");

    const resultado = await actualizarFormaPagoRepartoAction(
      estadoInicial,
      formData,
    );
    expect(resultado.error).toBeNull();
    expect(obtenerOCrearClientePorNombre).toHaveBeenCalledWith(
      "Distribuidora Sur",
    );
    expect(actualizarFormaPagoReparto).toHaveBeenCalledWith(
      3,
      "cuenta_corriente",
      43,
    );
  });

  it("«cuenta corriente» conserva el cliente ya vinculado al reparto", async () => {
    obtenerPartesReparto.mockResolvedValue({
      clienteId: 88,
      enviadoPor: "Comercio Nuevo",
      recibidoPor: null,
    });

    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cuenta_corriente");

    const resultado = await actualizarFormaPagoRepartoAction(
      estadoInicial,
      formData,
    );
    expect(resultado.error).toBeNull();
    expect(obtenerOCrearClientePorNombre).not.toHaveBeenCalled();
    expect(actualizarFormaPagoReparto).toHaveBeenCalledWith(
      3,
      "cuenta_corriente",
      88,
    );
  });

  it("rechaza «cuenta corriente» si el reparto no tiene Flete Origen ni Destino", async () => {
    obtenerPartesReparto.mockResolvedValue({
      clienteId: null,
      enviadoPor: null,
      recibidoPor: null,
    });

    const formData = new FormData();
    formData.set("id", "3");
    formData.set("forma_pago", "cuenta_corriente");

    const resultado = await actualizarFormaPagoRepartoAction(
      estadoInicial,
      formData,
    );
    expect(resultado.error).toContain("Flete");
    expect(obtenerOCrearClientePorNombre).not.toHaveBeenCalled();
    expect(actualizarFormaPagoReparto).not.toHaveBeenCalled();
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