import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import {
  actualizarCliente,
  crearCliente,
  crearClientesEnLote,
  eliminarCliente,
  listarClientes,
  listarClientesParaSeleccion,
  listarClientesResumen,
  obtenerCliente,
  obtenerOCrearClientePorNombre,
} from "@/lib/data/clientes";
import {
  crearGasto,
  listarGastos,
  listarGastosDelMes,
  totalGastos,
  totalGastosDelMes,
} from "@/lib/data/gastos";
import {
  actualizarEstadoReparto,
  actualizarFormaPagoReparto,
  asignarRemitosAReparto,
  crearReparto,
  listarRepartos,
  listarRepartosDelCliente,
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
  await db.execute("DELETE FROM reparto_items");
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

  it("inserta clientes en lote y las vistas livianas no exponen notas", async () => {
    const resultado = await crearClientesEnLote([
      { numero: 10, nombre: "Cliente Diez", notas: "Nota interna secreta" },
      { numero: 11, nombre: "Cliente Once" },
    ]);
    expect(resultado.importados).toBe(2);
    expect(resultado.errores).toBe(0);

    // La vista resumen (tabla) no incluye notas ni fechas.
    const resumen = await listarClientesResumen();
    expect(resumen).toHaveLength(2);
    expect(resumen[0]).not.toHaveProperty("notas");
    expect(resumen[0]).not.toHaveProperty("creadoEn");

    // La vista de selección solo trae id y nombre.
    const seleccion = await listarClientesParaSeleccion();
    expect(seleccion).toHaveLength(2);
    expect(Object.keys(seleccion[0]).sort()).toEqual(["id", "nombre"]);

    // El detalle sí conserva las notas.
    const detalle = await obtenerCliente(resumen[0].id);
    expect(detalle?.notas).toBe("Nota interna secreta");
  });

  it("obtiene o crea un cliente por nombre sin duplicar (envía del reparto)", async () => {
    const idCreado = await obtenerOCrearClientePorNombre("Peluquería Nuevo Sur");
    const cliente = await obtenerCliente(idCreado);
    expect(cliente?.nombre).toBe("Peluquería Nuevo Sur");
    // Se crea solo con el nombre: el resto de los campos queda vacío.
    expect(cliente?.numero).toBeNull();
    expect(cliente?.cuit).toBeNull();

    // El mismo nombre (sin distinguir mayúsculas) reutiliza el cliente.
    const idExistente = await obtenerOCrearClientePorNombre("peluquería nuevo sur");
    expect(idExistente).toBe(idCreado);
    expect(await listarClientes()).toHaveLength(1);
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

  it("crea un reparto con cliente y mercadería directa (varias líneas) y calcula su valor", async () => {
    const clienteId = await crearClienteBasico(7);
    const repartoId = await crearReparto({
      fecha: "2026-09-13",
      clienteId,
      enviadoPor: "Cliente 7",
      llevaRemito: false,
      itemsMercaderia: [
        {
          descripcion: "Caja de agua",
          cantidad: 3,
          precioUnitarioCentavos: 2500,
        },
        {
          descripcion: "Rueda 175/70",
          cantidad: 2,
          precioUnitarioCentavos: 15000,
        },
      ],
      formaPago: "cuenta_corriente",
    });

    const reparto = await obtenerReparto(repartoId);
    expect(reparto?.clienteId).toBe(clienteId);
    expect(reparto?.clienteNombre).toBe("Cliente 7");
    expect(reparto?.llevaRemito).toBe(false);
    expect(reparto?.items).toHaveLength(2);
    expect(reparto?.items[0]).toMatchObject({
      descripcion: "Caja de agua",
      cantidad: 3,
      precioUnitarioCentavos: 2500,
    });
    expect(reparto?.formaPago).toBe("cuenta_corriente");
    expect(reparto?.cobrado).toBe(true);
    // 3 × $2.500 + 2 × $15.000 = $37.500 (la mercadería directa suma al valor)
    expect(reparto?.valorCentavos).toBe(37500);
  });

  it("lista los repartos de un cliente para su ficha (con items y total)", async () => {
    const clienteA = await crearClienteBasico(9);
    const clienteB = await crearClienteBasico(10);

    const r1 = await crearReparto({
      fecha: "2026-09-15",
      clienteId: clienteA,
      itemsMercaderia: [
        { descripcion: "Caja", cantidad: 1, precioUnitarioCentavos: 1000 },
      ],
    });
    await crearReparto({ fecha: "2026-09-16", clienteId: clienteB });

    const repartosA = await listarRepartosDelCliente(clienteA);
    expect(repartosA).toHaveLength(1);
    expect(repartosA[0].id).toBe(r1);
    expect(repartosA[0].items).toHaveLength(1);
    expect(repartosA[0].items[0].descripcion).toBe("Caja");
    expect(repartosA[0].valorCentavos).toBe(1000);
    expect(repartosA[0].formaPago).toBeNull();
  });

  it("crea un remito ya asignado a un reparto y lo lista en listarRepartos().remitos", async () => {
    const clienteId = await crearClienteBasico(8);
    const repartoId = await crearReparto({ fecha: "2026-09-14", clienteId });
    const remitoId = await crearRemito({
      numero: await proximoNumeroRemito(),
      clienteId,
      fecha: "2026-09-14",
      repartoId,
      items: [{ descripcion: "a", cantidad: 1, precioUnitarioCentavos: 100 }],
    });

    const lista = await listarRepartos();
    const reparto = lista.find((r) => r.id === repartoId);
    expect(reparto?.remitos).toHaveLength(1);
    expect(reparto?.remitos[0].id).toBe(remitoId);
    expect(reparto?.remitos[0].numero).toBeGreaterThan(0);
    expect(reparto?.valorCentavos).toBe(100);
  });

  it("actualiza la forma de pago de un reparto (por cobrar hasta que se elige)", async () => {
    const repartoId = await crearReparto({ fecha: "2026-09-14" });
    const sinCobrar = await obtenerReparto(repartoId);
    expect(sinCobrar?.formaPago).toBeNull();
    expect(sinCobrar?.cobrado).toBe(false);

    await actualizarFormaPagoReparto(repartoId, "cheque");
    const cobrado = await obtenerReparto(repartoId);
    expect(cobrado?.formaPago).toBe("cheque");
    expect(cobrado?.cobrado).toBe(true);

    // La opción "Por cobrar" (null) vuelve a dejar el reparto sin cobrar.
    await actualizarFormaPagoReparto(repartoId, null);
    const porCobrar = await obtenerReparto(repartoId);
    expect(porCobrar?.formaPago).toBeNull();
    expect(porCobrar?.cobrado).toBe(false);
  });

  it("calcula la deuda por cliente (repartos sin cobrar y no cancelados)", async () => {
    const clienteA = await crearClienteBasico(11);
    const clienteB = await crearClienteBasico(12);

    // A debe: 2 repartos sin cobrar (500 + 300 = 800).
    await crearReparto({
      fecha: "2026-09-14",
      clienteId: clienteA,
      itemsMercaderia: [
        { descripcion: "Caja", cantidad: 1, precioUnitarioCentavos: 500 },
      ],
    });
    await crearReparto({
      fecha: "2026-09-15",
      clienteId: clienteA,
      itemsMercaderia: [
        { descripcion: "Bolsa", cantidad: 1, precioUnitarioCentavos: 300 },
      ],
    });

    // A tiene un reparto cobrado y otro cancelado que no suman a la deuda.
    const cobrado = await crearReparto({
      fecha: "2026-09-16",
      clienteId: clienteA,
      itemsMercaderia: [
        { descripcion: "Caja", cantidad: 1, precioUnitarioCentavos: 900 },
      ],
      formaPago: "contado",
    });
    await actualizarFormaPagoReparto(cobrado, "contado");
    const cancelado = await crearReparto({
      fecha: "2026-09-17",
      clienteId: clienteA,
      itemsMercaderia: [
        { descripcion: "Paquete", cantidad: 1, precioUnitarioCentavos: 700 },
      ],
    });
    await actualizarEstadoReparto(cancelado, "cancelado");

    // B debe $100 (sin cobrar).
    await crearReparto({
      fecha: "2026-09-14",
      clienteId: clienteB,
      itemsMercaderia: [
        { descripcion: "Sobre", cantidad: 1, precioUnitarioCentavos: 100 },
      ],
    });
    // Cliente sin repartos no figura con deuda.
    await crearClienteBasico(13);

    const resumen = await listarClientesResumen();
    const deudaA = resumen.find((c) => c.id === clienteA)?.deudaCentavos;
    const deudaB = resumen.find((c) => c.id === clienteB)?.deudaCentavos;
    const deudaSinRepartos = resumen.find((c) => c.numero === 13)?.deudaCentavos;
    expect(deudaA).toBe(800);
    expect(deudaB).toBe(100);
    expect(deudaSinRepartos).toBe(0);
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

  it("filtra gastos por mes (YYYY-MM)", async () => {
    await crearGasto({
      fecha: "2026-09-10",
      categoria: "combustible",
      descripcion: "Septiembre 1",
      montoCentavos: 1000,
    });
    await crearGasto({
      fecha: "2026-09-01",
      categoria: "combustible",
      descripcion: "Septiembre 2",
      montoCentavos: 3000,
    });
    await crearGasto({
      fecha: "2026-08-25",
      categoria: "mecanico",
      descripcion: "Agosto 1",
      montoCentavos: 2000,
    });

    expect(await totalGastosDelMes("2026-09")).toBe(4000);
    expect(await totalGastosDelMes("2026-08")).toBe(2000);
    expect(await totalGastosDelMes("2026-07")).toBe(0);

    const septiembre = await listarGastosDelMes("2026-09");
    expect(septiembre).toHaveLength(2);
    // Los más recientes primero.
    expect(septiembre[0].descripcion).toBe("Septiembre 1");
    expect(septiembre[1].descripcion).toBe("Septiembre 2");
    expect(await listarGastosDelMes("2026-07")).toHaveLength(0);
  });
});