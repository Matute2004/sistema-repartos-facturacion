# Ohana Comisiones — Sistema de repartos y facturación

Sistema de gestión para un comercio: **clientes, repartos (hojas de ruta),
remitos con detalle de mercadería, vehículos (kilómetros y services), gastos
operativos y facturación**. Con login por usuario y sesión firmada.

Stack: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**,
base de datos **SQLite local (desarrollo) / Turso (libSQL) en producción**.

## Requisitos

- Node.js 20+ (el proyecto usa `--env-file-if-exists`, disponible desde Node 20.6)

## Puesta en marcha (local)

```bash
npm install
npm run db:migrate   # crea el esquema en local.db y siembra Matute / OhanaTeam
npm run dev          # http://localhost:3000
```

Credenciales iniciales (por defecto, la contraseña es el mismo nombre):

| Usuario    | Rol |
|------------|-----|
| `Matute`   | admin |
| `OhanaTeam`| admin |

> En producción cambialas desde el menú **Cuenta → Cambiar contraseña**.

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

| Variable | Descripción |
|----------|-------------|
| `TURSO_DATABASE_URLL` | URL de la base remota Turso (`libsql://…`). Si está vacía, cae a SQLite local. |
| `TURSO_AUTH_TOKENN` | Token de Turso (nombres históricos con doble letra, usalos igual en Vercel). |
| `SESSION_SECRET` | Secreto para firmar las cookies de sesión. Generalo con `openssl rand -hex 32`. |
| `LOCAL_DB_FILE` | (opcional) Ruta de la SQLite local. Solo para tests/desarrollo avanzado. |

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm test` | Suite de tests (Vitest) |
| `npm run db:migrate` | Migración idempotente del esquema + seed de usuarios |

## Arquitectura

- `lib/schema.sql` + `lib/migrate.ts` / `scripts/migrate.mjs`: esquema y migraciones idempotentes.
- `lib/data/*`: acceso a la base de datos (SQL parametrizado, mapeo tipado).
- `app/actions/*`: Server Actions con validación y **guard `exigirAdmin()`**
  (todo el sistema opera con un único rol: admin).
- `app/components/*`: componentes de UI (formularios, tablas, botones).
- `proxy.ts`: autenticación por cookie firmada (HMAC-SHA256) en el borde.

Convenciones del dominio:

- El dinero se guarda **siempre en centavos** (`INTEGER`) para evitar
  errores de punto flotante. Ver `lib/types.ts`.
- Los estados de reparto/remito están centralizados en `lib/estados.ts`.
- Las fechas se guardan como `TEXT` en formato `YYYY-MM-DD`.

## Tests

```bash
npm test            # una pasada
npm run test:watch  # modo watch
```

Cubren: utilidades de dinero/fechas, passwords (scrypt), sesión (HMAC),
lógica de Server Actions (validación, redirecciones) y flujos de la capa de
datos sobre una SQLite temporal aislada (`LOCAL_DB_FILE`).

## Deploy (Vercel)

Configurá en el proyecto: `TURSO_DATABASE_URLL`, `TURSO_AUTH_TOKENN` y
`SESSION_SECRET` (mismos nombres que en `.env.local`). El build es estándar
de Next.js. La migración corre con `npm run db:migrate` contra la base remota
(o se puede invocar `migrate()` desde un Route Handler si se quiere auto-migrar
en el primer deploy).
