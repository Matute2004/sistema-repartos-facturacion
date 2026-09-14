import { describe, expect, it } from "vitest";
import {
  LIMITES_CAMPOS,
  LIMITE_FILAS_IMPORTACION,
  normalizarFilaImportacion,
  recortarTexto,
} from "@/lib/importacion";

/**
 * Tests de la normalización de filas para la importación masiva de clientes.
 * Son funciones puras: no tocan la DB.
 */
describe("recortarTexto", () => {
  it("trata null/undefined como texto vacío y recorta al máximo", () => {
    expect(recortarTexto(null, 5)).toBe("");
    expect(recortarTexto(undefined, 5)).toBe("");
    expect(recortarTexto("Hola", 5)).toBe("Hola");
    expect(recortarTexto("Hola mundo", 5)).toBe("Hola ");
  });
});

describe("normalizarFilaImportacion", () => {
  it("devuelve null si la fila no tiene nombre", () => {
    expect(normalizarFilaImportacion({ cuit: "20-123" })).toBeNull();
    expect(normalizarFilaImportacion({ nombre: "   " })).toBeNull();
    expect(normalizarFilaImportacion(null)).toBeNull();
  });

  it("normaliza número, recorta campos y deja los opcionales como undefined", () => {
    const fila = normalizarFilaImportacion({
      numero: "0123",
      nombre: "  Ferretería  ",
      cuit: "20-12345678-912345", // se recorta a 13
      direccion: "",
      notas: "x".repeat(3000), // se recorta a 2000
    });

    expect(fila).not.toBeNull();
    expect(fila!.nombre).toBe("Ferretería");
    expect(fila!.numero).toBe(123);
    expect(fila!.cuit).toBe("20-12345678-9");
    expect(fila!.direccion).toBeUndefined();
    expect(fila!.notas).toHaveLength(LIMITES_CAMPOS.notas);
  });

  it("convierte números inválidos o ausentes a null", () => {
    expect(
      normalizarFilaImportacion({ numero: "abc", nombre: "A" })!.numero,
    ).toBeNull();
    expect(
      normalizarFilaImportacion({ nombre: "B" })!.numero,
    ).toBeNull();
    // "0" no es mayor a 0 → null. Los signos se descartan igual que en el
    // alta manual ("-5" quedaría como 5, consistente con la planilla).
    expect(
      normalizarFilaImportacion({ numero: "0", nombre: "C" })!.numero,
    ).toBeNull();
    expect(
      normalizarFilaImportacion({ numero: "-5", nombre: "D" })!.numero,
    ).toBe(5);
  });
});

describe("límites de importación", () => {
  it("expone un tope razonable de filas por lote", () => {
    expect(LIMITE_FILAS_IMPORTACION).toBeGreaterThan(0);
    expect(LIMITE_FILAS_IMPORTACION).toBeLessThanOrEqual(10000);
  });
});