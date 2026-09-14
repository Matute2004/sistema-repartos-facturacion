import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { crearCookieSesion, verificarCookieSesion } from "@/lib/sesion";

/**
 * Tests de la sesión firmada con HMAC-SHA256.
 * SESSION_SECRET viene del env de vitest (vitest.config.ts).
 */

describe("sesión (HMAC)", () => {
  it("crea una cookie y la valida", () => {
    const cookie = crearCookieSesion(42);
    expect(verificarCookieSesion(cookie)).toEqual({ usuarioId: 42 });
  });

  it("rechaza una cookie adulterada", () => {
    const cookie = crearCookieSesion(42);
    const adulterada =
      cookie.slice(0, -2) + (cookie.endsWith("aa") ? "bb" : "aa");
    expect(verificarCookieSesion(adulterada)).toBeNull();
  });

  it("rechaza cookies mal formadas", () => {
    expect(verificarCookieSesion(undefined)).toBeNull();
    expect(verificarCookieSesion("")).toBeNull();
    expect(verificarCookieSesion("abc")).toBeNull();
    expect(verificarCookieSesion("1.xyz.firma")).toBeNull();
  });

  it("rechaza un id de usuario inválido", () => {
    // crearCookieSesion con id 0 produce una cookie que el verificador rechaza.
    const cookie = crearCookieSesion(0);
    expect(verificarCookieSesion(cookie)).toBeNull();
  });

  it("rechaza cookies vencidas", () => {
    const expira = Date.now() - 60_000; // ya vencida
    const payload = `7.${expira}`;
    const firma = createHmac(
      "sha256",
      "test-secret-para-tests-0123456789abcdef",
    )
      .update(payload)
      .digest("hex");
    expect(verificarCookieSesion(`${payload}.${firma}`)).toBeNull();
  });
});