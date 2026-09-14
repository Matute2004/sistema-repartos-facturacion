import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  listarClientes,
  obtenerCliente,
} from "@/lib/data/clientes";
import {
  crearGasto,
  listarGastos,
  totalGastos,
} from "@/lib/data/gastos";
import {
  actualizarEstadoReparto,
  asignarRemitosAReparto,
  crearReparto,
  listarRepartos,
  obtenerReparto,
} from "@/lib/data/repartos";
import {
  crearRemito,
  listarRemitosDelReparto,
  obtenerRemito,
  obtenerRemitoCompleto,
  proximoNumeroRemito,
} from "@/lib/data/remitos";

/**
 * Tests de integración de la capa de datos sobre la SQLite temporal
 * (`LOCAL_DB_FILE=:memory:`, configurado en vitest.config.ts).
 * Cada test arranca con las tablas vacías para ser determinista.
 */

beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  const db = await getDb();
  // Orden inverso de dependencias de FK.
  await db.execute("DELETE FROM remito_items");
  await db.execute("DELETE FROM remitos");
  await db.execute("DELETE FROM repartos");
  await db.execute("DELETE FROM gastos");
  await db.execute("DELETE FROM vehiculos");
  await db.execute("DELETE FROM clientes");
});

async function crearClienteBasico(numero: number): Promise<number> {
  return crearCliente({ nombre: `Cliente ${numero}`, numero });
}

describe("flujo clientes", () => {
  it("crea, consulta, actualiza, lista y elimina", async () => {
    const id = await crearClienteBasico(1);

    const creado = await obtenerCliente(id);
    expect(creado?.nombre).toBe("Cliente 1");
    expect(creado?.numero).toBe(1);

    await actualizarCliente(id, { nombre: "Cliente Uno SRL", numero: 1 });
    expect((await obtenerCliente(id))?.nombre).toBe("Cliente Uno SRL");

    const lista = await listarClientes();
    expect(lista).toHaveLength(1);

    await eliminarCliente(id);
    expect(await obtenerCliente(id)).toBeNull();
  });

  it("no permite eliminar un cliente que tiene remitos (FK RESTRICT)", async () => {
    const clienteId = await crearClienteBasico(2);
    await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "a", cantidad: 1, precioUnitarioCentavos: 100 }],
    });
    await expect(eliminarCliente(clienteId)).rejects.toThrow();
  });
});

describe("flujo remitos", () => {
  it("crea un remito con items y calcula su valor total", async () => {
    const clienteId = await crearClienteBasico(3);
    const numero = await proximoNumeroRemito();

    const remitoId = await crearRemito({
      numero,
      clienteId,
      fecha: "2026-09-13",
      observaciones: "Entregar antes de las 12",
      items: [
        { descripcion: "Caja de agua", cantidad: 2, precioUnitarioCentavos: 12000 },
        { descripcion: "Gaseosa x12", cantidad: 1, precioUnitarioCentavos: 2500 },
      ],
    });

    const completo = await obtenerRemitoCompleto(remitoId);
    expect(completo).not.toBeNull();
    expect(completo!.items).toHaveLength(2);
    expect(completo!.cliente.nombre).toBe("Cliente 3");
    // 2 * 12000 + 1 * 2500 = 26500 (antes el detalle daba $0)
    expect(completo!.remito.valorCentavos).toBe(26500);
    await expect(obtenerRemito(remitoId)).resolves.toMatchObject({
      valorCentavos: 26500,
    });
  });

  it("autoasigna números correlativos", async () => {
    const clienteId = await crearClienteBasico(4);
    const primero = await proximoNumeroRemito();
    const id1 = await crearRemito({
      numero: primero,
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "x", cantidad: 1, precioUnitarioCentavos: 10 }],
    });
    const id2 = await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "y", cantidad: 1, precioUnitarioCentavos: 20 }],
    });

    const r1 = await obtenerRemito(id1);
    const r2 = await obtenerRemito(id2);
    expect(r2!.numero).toBe(r1!.numero + 1);
  });
});

describe("flujo repartos y asignación de remitos", () => {
  it("calcula el valor total del reparto sumando los items (regresión $0)", async () => {
    const clienteId = await crearClienteBasico(5);

    const r1 = await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "a", cantidad: 3, precioUnitarioCentavos: 1000 }],
    });
    const r2 = await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "b", cantidad: 1, precioUnitarioCentavos: 5000 }],
    });

    const repartoId = await crearReparto({
      fecha: "2026-09-13",
      enviadoPor: "Jorge",
      recibidoPor: "F-100",
    });
    await asignarRemitosAReparto(repartoId, [r1, r2]);

    const reparto = await obtenerReparto(repartoId);
    // 3 * 1000 + 1 * 5000 = 8000. Antes este campo daba 0 siempre.
    expect(reparto?.valorCentavos).toBe(8000);
    expect(reparto?.enviadoPor).toBe("Jorge");

    const remitos = await listarRemitosDelReparto(repartoId);
    expect(remitos).toHaveLength(2);

    const lista = await listarRepartos();
    expect(lista).toHaveLength(1);
    expect(lista[0].valorCentavos).toBe(8000);

    await actualizarEstadoReparto(repartoId, "completado");
    expect((await obtenerReparto(repartoId))?.estado).toBe("completado");
  });

  it("no reasigna un remito que ya tiene reparto", async () => {
    const clienteId = await crearClienteBasico(6);
    const remitoId = await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-13",
      items: [{ descripcion: "a", cantidad: 1, precioUnitarioCentavos: 10 }],
    });

    const reparto1 = await crearReparto({ fecha: "2026-09-13" });
    await asignarRemitosAReparto(reparto1, [remitoId]);

    const reparto2 = await crearReparto({ fecha: "2026-09-13" });
    await asignarRemitosAReparto(reparto2, [remitoId]);

    expect(await listarRemitosDelReparto(reparto1)).toHaveLength(1);
    expect(await listarRemitosDelReparto(reparto2)).toHaveLength(0);
  });
});

describe("flujo gastos", () => {
  it("registra gastos y acumula el total", async () => {
    await crearGasto({
      fecha: "2026-09-13",
      categoria: "combustible",
      descripcion: "Nafta súper",
      montoCentavos: 15000,
    });
    await crearGasto({
      fecha: "2026-09-13",
      categoria: "mecanico",
      descripcion: "Cambio de aceite",
      montoCentavos: 2000,
    });

    expect(await totalGastos()).toBe(17000);
    expect(await listarGastos()).toHaveLength(2);
  });
});