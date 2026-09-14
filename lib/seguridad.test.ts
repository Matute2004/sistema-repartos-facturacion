import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { migrate } from "@/lib/migrate";
import {
  claveLogin,
  contarIntentosRecientes,
  LIMITE_INTENTOS_LOGIN,
  limpiarIntentosDeLogin,
  puedeIntentarLogin,
  registrarIntentoFallido,
} from "@/lib/seguridad";

/**
 * Tests del control de fuerza bruta del login sobre la SQLite temporal
 * (`LOCAL_DB_FILE=:memory:`). Verifica límites, ventana y limpieza.
 */
beforeAll(async () => {
  await migrate();
});

beforeEach(async () => {
  const db = await getDb();
  await db.execute("DELETE FROM login_intentos");
});

describe("claveLogin", () => {
  it("normaliza a minúsculas, recorta y encasilla por tipo", () => {
    expect(claveLogin("usuario", "  Matute  ")).toBe("usuario:matute");
    expect(claveLogin("ip", "200.1.2.3")).toBe("ip:200.1.2.3");
    expect(claveLogin("usuario", "x".repeat(500))).toHaveLength(
      "usuario:".length + 100,
    );
    expect(claveLogin("ip", "")).toBe("ip:desconocido");
  });
});

describe("control de intentos", () => {
  it("permite intentar cuando no se superó el límite", async () => {
    expect(await puedeIntentarLogin("usuario", "matute")).toBe(true);
  });

  it("bloquea después del límite de intentos fallidos", async () => {
    for (let i = 0; i < LIMITE_INTENTOS_LOGIN; i += 1) {
      await registrarIntentoFallido("usuario", "matute");
    }
    expect(await puedeIntentarLogin("usuario", "matute")).toBe(false);
    // Otro usuario no se ve afectado por los intentos ajenos.
    expect(await puedeIntentarLogin("usuario", "otro")).toBe(true);
  });

  it("cuenta intentos recientes por clave", async () => {
    await registrarIntentoFallido("ip", "10.0.0.1");
    await registrarIntentoFallido("ip", "10.0.0.1");
    expect(await contarIntentosRecientes("ip", "10.0.0.1")).toBe(2);
  });

  it("limpia los intentos de una clave tras un login exitoso", async () => {
    await registrarIntentoFallido("usuario", "matute");
    await limpiarIntentosDeLogin("usuario", "matute");
    expect(await contarIntentosRecientes("usuario", "matute")).toBe(0);
  });
});