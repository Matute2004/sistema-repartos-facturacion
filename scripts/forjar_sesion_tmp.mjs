// Script temporal de verificación: crea una cookie de sesión válida (misma
// firma HMAC que lib/sesion.ts) para un usuario admin real de la base, y
// consulta datos de repartos/gastos para el smoke test renderizado.
import { createClient } from "@libsql/client/http";
import { createHmac } from "node:crypto";

const url = process.env.TURSO_DATABASE_URLL;
const token = process.env.TURSO_AUTH_TOKENN;
const secreto = process.env.SESSION_SECRET;

if (!url || !token || !secreto) {
  console.error("FALTAN VARIABLES DE ENTORNO TURSO/SESSION_SECRET");
  process.exit(1);
}

const db = createClient({ url, authToken: token });
const res = await db.execute(
  "SELECT id, nombre, rol FROM usuarios ORDER BY id LIMIT 5",
);
const filas = res.rows.map((f) => ({
  id: Number(f.id),
  nombre: String(f.nombre),
  rol: String(f.rol),
}));
console.log("USUARIOS=" + JSON.stringify(filas));

const admin = filas.find((u) => u.rol === "admin") ?? filas[0];
if (!admin) {
  console.log("NO_HAY_ADMIN");
  process.exit(0);
}

const expira = Date.now() + 1000 * 60 * 60 * 24 * 30;
const payload = `${admin.id}.${expira}`;
const firma = createHmac("sha256", secreto).update(payload).digest("hex");
console.log(`COOKIE=ohana_sesion=${payload}.${firma}`);

// Datos de referencia para validar lo renderizado (repaso rápido).
const hoy = new Date();
const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
const diasConRepartos = await db.execute(
  "SELECT DISTINCT fecha FROM repartos WHERE substr(fecha,1,7) = ? ORDER BY fecha LIMIT 10",
  [mes],
);
console.log(
  "DIAS_CON_REPARTOS=" +
    JSON.stringify(diasConRepartos.rows.map((r) => String(r.fecha))),
);
process.exit(0);