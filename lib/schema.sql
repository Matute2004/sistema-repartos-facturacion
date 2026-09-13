-- ============================================================================
-- Esquema inicial del sistema de repartos y facturación.
-- Migración idempotente (CREATE ... IF NOT EXISTS). Ejecutada por
-- `npm run db:migrate` (ver scripts/migrate.mjs).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Clientes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero          INTEGER, -- N° visible, cargado a mano al dar de alta
  nombre          TEXT NOT NULL,
  cuit            TEXT,
  direccion       TEXT,
  localidad       TEXT,
  telefono        TEXT,
  email           TEXT,
  notas           TEXT,
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Repartos (hojas de ruta diarias)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repartos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL DEFAULT (date('now')), -- YYYY-MM-DD
  estado      TEXT NOT NULL DEFAULT 'pendiente'
              CHECK (estado IN ('pendiente', 'en_curso', 'completado', 'cancelado')),
  chofer      TEXT,
  vehiculo    TEXT,
  notas       TEXT,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Remitos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remitos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  numero         INTEGER NOT NULL, -- correlativo por comercio
  cliente_id     INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  reparto_id     INTEGER REFERENCES repartos(id) ON DELETE SET NULL,
  fecha          TEXT NOT NULL DEFAULT (date('now')),
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
  observaciones  TEXT,
  creado_en      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (numero)
);

-- Items de remito (detalle de la mercadería entregada)
CREATE TABLE IF NOT EXISTS remito_items (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  remito_id               INTEGER NOT NULL REFERENCES remitos(id) ON DELETE CASCADE,
  descripcion             TEXT NOT NULL,
  cantidad                REAL NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario_centavos INTEGER NOT NULL DEFAULT 0 CHECK (precio_unitario_centavos >= 0)
);

-- ----------------------------------------------------------------------------
-- Gastos operativos (combustible, mecánico, insumos, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha           TEXT NOT NULL DEFAULT (date('now')),
  categoria       TEXT NOT NULL DEFAULT 'otros'
                  CHECK (categoria IN ('combustible', 'mecanico', 'insumos', 'otros')),
  descripcion     TEXT NOT NULL,
  proveedor       TEXT,
  monto_centavos  INTEGER NOT NULL CHECK (monto_centavos >= 0),
  creado_en       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- Índices de uso frecuente
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_nombre     ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_repartos_fecha      ON repartos(fecha);
CREATE INDEX IF NOT EXISTS idx_remitos_cliente     ON remitos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_remitos_reparto     ON remitos(reparto_id);
CREATE INDEX IF NOT EXISTS idx_remito_items_remito ON remito_items(remito_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha        ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria    ON gastos(categoria);

-- ----------------------------------------------------------------------------
-- Vehículos (flota propia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehiculos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre            TEXT NOT NULL,                   -- nombre / alias del vehículo
  patente           TEXT,                            -- patente / dominio
  marca             TEXT,                            -- marca
  modelo            TEXT,                            -- modelo
  anio              INTEGER,                         -- año de fabricación
  kilometros        INTEGER,                         -- odómetro actual
  km_proximo_service INTEGER,                        -- km para el próximo service
  fecha_ultimo_service TEXT,                         -- fecha del último service (YYYY-MM-DD)
  notas             TEXT,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_nombre     ON vehiculos(nombre);

-- ----------------------------------------------------------------------------
-- Usuarios del sistema (login con sesión)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT NOT NULL UNIQUE,          -- nombre visible (ej: Matute)
  password_hash   TEXT NOT NULL,                 -- scrypt: salt:hash
  rol             TEXT NOT NULL DEFAULT 'operador'
                  CHECK (rol IN ('admin', 'operador')),
  creado_en       TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_nombre    ON usuarios(nombre);