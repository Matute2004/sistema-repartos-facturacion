import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
const { obtenerUsuarioPorId } = vi.hoisted(() => ({
  obtenerUsuarioPorId: vi.fn(),
}));
const { cookieGet } = vi.hoisted(() => ({ cookieGet: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/data/usuarios", () => ({ obtenerUsuarioPorId }));

import { exigirAdmin, obtenerUsuarioActual } from "@/lib/auth";
import { crearCookieSesion } from "@/lib/sesion";
import type { Usuario } from "@/lib/types";

function usuarioConRol(rol: "admin" | "operador"): Usuario {
  return {
    id: 1,
    nombre: "Matute",
    rol,
    passwordHash: "scrypt:aa:bb",
    creadoEn: "",
    actualizadoEn: "",
  };
}

describe("obtenerUsuarioActual", () => {
  it("devuelve null sin cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    expect(await obtenerUsuarioActual()).toBeNull();
  });

  it("devuelve null si la cookie es inválida", async () => {
    cookieGet.mockReturnValue({ value: "firma-invalida" });
    expect(await obtenerUsuarioActual()).toBeNull();
  });
});

describe("exigirAdmin", () => {
  it("devuelve el usuario si el rol es admin", async () => {
    cookieGet.mockReturnValue({ value: crearCookieSesion(1) });
    obtenerUsuarioPorId.mockResolvedValue(usuarioConRol("admin"));
    await expect(exigirAdmin()).resolves.toMatchObject({ rol: "admin" });
  });

  it("redirige al login si el usuario no es admin", async () => {
    redirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
    cookieGet.mockReturnValue({ value: crearCookieSesion(1) });
    obtenerUsuarioPorId.mockResolvedValue(usuarioConRol("operador"));
    await expect(exigirAdmin()).rejects.toThrow("REDIRECT");
  });

  it("redirige al login si no hay sesión", async () => {
    redirect.mockImplementation(() => {
      throw new Error("REDIRECT");
    });
    cookieGet.mockReturnValue(undefined);
    await expect(exigirAdmin()).rejects.toThrow("REDIRECT");
  });
});