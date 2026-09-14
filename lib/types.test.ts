import { describe, expect, it } from "vitest";
import {
  fechaHoyLocal,
  formatFecha,
  formatKilometros,
  formatPesos,
  pesosACentavos,
} from "@/lib/types";

describe("pesosACentavos", () => {
  it("convierte '123,45' en 12345 centavos", () => {
    expect(pesosACentavos("123,45")).toBe(12345);
  });

  it("acepta el punto de miles argentino ('1.234,56' -> 123456)", () => {
    expect(pesosACentavos("1.234,56")).toBe(123456);
  });

  it("usa la coma como separador decimal ('12,50' -> 1250)", () => {
    expect(pesosACentavos("12,50")).toBe(1250);
  });

  it("interpreta los puntos como separador de miles ('2.500,00' -> 250000)", () => {
    expect(pesosACentavos("2.500,00")).toBe(250000);
  });

  it("acepta enteros ('500' -> 50000)", () => {
    expect(pesosACentavos("500")).toBe(50000);
  });

  it("redondea centavos", () => {
    expect(pesosACentavos("10,999")).toBe(1100);
  });

  it("devuelve 0 para vacíos, inválidos o negativos", () => {
    expect(pesosACentavos("")).toBe(0);
    expect(pesosACentavos("-5")).toBe(0);
    expect(pesosACentavos("abc")).toBe(0);
    expect(pesosACentavos("mil pesos")).toBe(0);
  });
});

describe("formatPesos", () => {
  it("formatea centavos como pesos argentinos", () => {
    expect(formatPesos(12345)).toContain("123,45");
  });

  it("formatea cero", () => {
    expect(formatPesos(0)).toContain("0");
  });
});

describe("formatFecha", () => {
  it("convierte YYYY-MM-DD a DD/MM/YYYY", () => {
    expect(formatFecha("2026-09-13")).toBe("13/09/2026");
  });

  it("devuelve el mismo string si la fecha es inválida", () => {
    expect(formatFecha("no-es-fecha")).toBe("no-es-fecha");
  });
});

describe("fechaHoyLocal", () => {
  it("devuelve la fecha local en formato YYYY-MM-DD", () => {
    expect(fechaHoyLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatKilometros", () => {
  it("formatea con separador de miles y sufijo km", () => {
    expect(formatKilometros(12345)).toContain("12.345");
    expect(formatKilometros(0)).toContain("0");
  });
});