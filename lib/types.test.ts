import { describe, expect, it, vi } from "vitest";
import {
  fechaHoyLocal,
  formatCuit,
  formatFecha,
  formatKilometros,
  formatPesos,
  mesLegible,
  normalizarMes,
  pesosACentavos,
  sumarMeses,
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

describe("formatCuit", () => {
  it("formatea 11 dígitos como XX-XXXXXXXX-X", () => {
    expect(formatCuit("33714403309")).toBe("33-71440330-9");
  });

  it("tolera guiones, espacios y puntos previos", () => {
    expect(formatCuit("33-71440330-9")).toBe("33-71440330-9");
    expect(formatCuit(" 33 71440330 9 ")).toBe("33-71440330-9");
    expect(formatCuit("33.71440330.9")).toBe("33-71440330-9");
  });

  it("no altera valores sin 11 dígitos", () => {
    expect(formatCuit("3371440330")).toBe("3371440330");
    expect(formatCuit("abc")).toBe("abc");
    expect(formatCuit("")).toBe("");
  });
});

describe("fechaHoyLocal", () => {
  it("devuelve la fecha local en formato YYYY-MM-DD", () => {
    expect(fechaHoyLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("usa la zona horaria de Buenos Aires, no la del servidor", () => {
    vi.useFakeTimers();
    try {
      // 01:30 UTC del 14 = 22:30 del 13 en Buenos Aires (-03:00): para la app
      // todavía es el día 13 aunque el servidor (UTC) ya esté en el 14.
      vi.setSystemTime(new Date("2026-09-14T01:30:00Z"));
      expect(fechaHoyLocal()).toBe("2026-09-13");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("formatKilometros", () => {
  it("formatea con separador de miles y sufijo km", () => {
    expect(formatKilometros(12345)).toContain("12.345");
    expect(formatKilometros(0)).toContain("0");
  });
});

describe("sumarMeses", () => {
  it("suma meses dentro del mismo año", () => {
    expect(sumarMeses("2026-09", 1)).toBe("2026-10");
    expect(sumarMeses("2026-09", -1)).toBe("2026-08");
  });

  it("cruza de año hacia adelante y hacia atrás", () => {
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
  });
});

describe("normalizarMes", () => {
  it("devuelve el mes actual ante valores vacíos o inválidos", () => {
    const actual = fechaHoyLocal().slice(0, 7);
    expect(normalizarMes(undefined)).toBe(actual);
    expect(normalizarMes(null)).toBe(actual);
    expect(normalizarMes("septiembre")).toBe(actual);
    expect(normalizarMes("2026/09")).toBe(actual);
  });

  it("acepta un mes válido YYYY-MM", () => {
    expect(normalizarMes("2026-08")).toBe("2026-08");
  });
});

describe("mesLegible", () => {
  it("formatea un mes YYYY-MM en es-AR", () => {
    expect(mesLegible("2026-09")).toContain("septiembre");
    expect(mesLegible("2026-09")).toContain("2026");
  });
});