import { describe, expect, it } from "vitest";
import { hashearPassword, verificarPassword } from "@/lib/passwords";

describe("passwords (scrypt)", () => {
  it("genera un hash con formato scrypt:salt:hash", () => {
    const hash = hashearPassword("secreto");
    const partes = hash.split(":");
    expect(partes).toHaveLength(3);
    expect(partes[0]).toBe("scrypt");
  });

  it("verifica la contraseña correcta", () => {
    const hash = hashearPassword("ohana123");
    expect(verificarPassword("ohana123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const hash = hashearPassword("ohana123");
    expect(verificarPassword("otra-password", hash)).toBe(false);
  });

  it("rechaza formatos de hash inválidos", () => {
    expect(verificarPassword("x", "")).toBe(false);
    expect(verificarPassword("x", "md5:aa:bb")).toBe(false);
    expect(verificarPassword("x", "scrypt:aa")).toBe(false);
    expect(verificarPassword("x", "scrypt:zz:zz")).toBe(false);
  });
});