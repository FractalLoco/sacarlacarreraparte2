-- PROCESADORA TR3S AL MAR LTDA - Schema v5 FINAL
-- Flujo: Pesajes → auto-cajas → asignar a carro → tunel → inventario manual → despacho
-- EJECUTAR: psql -U postgres -d tresalmar_produccion -f sql/schema.sql

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL,
  nivel INT NOT NULL DEFAULT 1, descripcion TEXT
);
INSERT INTO roles(nombre,nivel,descripcion) VALUES
  ('admin',4,'Acceso total'),('jefe_planta',3,'Aprueba lotes, reportes'),
  ('administrativo',3,'Documentos e informes'),('supervisor_turno',2,'Supervisa produccion'),
  ('pesador_tunel',1,'Pesajes y tuneles'),('bodeguero',1,'Inventario')
ON CONFLICT(nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  rol_id INT NOT NULL REFERENCES roles(id) DEFAULT 5,
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO usuarios(nombre,email,password_hash,rol_id) VALUES
  ('Administrador',    'admin@tresalmar.cl',     '$2a$12$placeholder',1),
  ('Juan Perez',       'jplanta@tresalmar.cl',   '$2a$12$placeholder',2),
  ('Maria Gonzalez',   'mgonzalez@tresalmar.cl', '$2a$12$placeholder',3),
  ('Carlos Soto',      'csoto@tresalmar.cl',     '$2a$12$placeholder',4),
  ('Pedro Rojas',      'projas@tresalmar.cl',    '$2a$12$placeholder',5),
  ('Ana Perez',        'aperez@tresalmar.cl',    '$2a$12$placeholder',6)
ON CONFLICT(email) DO NOTHING;

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY, rut VARCHAR(20) UNIQUE NOT NULL, nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(100), telefono VARCHAR(30), email VARCHAR(150), direccion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conductores (
  id SERIAL PRIMARY KEY, rut VARCHAR(20) UNIQUE NOT NULL, nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30), empresa_transporte VARCHAR(150), patente_habitual VARCHAR(20),
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY, rut VARCHAR(20) UNIQUE, nombre VARCHAR(150) NOT NULL,
  contacto VARCHAR(100), telefono VARCHAR(30), email VARCHAR(150), direccion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos_tipo (
  id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL,
  es_desecho BOOLEAN NOT NULL DEFAULT false, categoria VARCHAR(30) NOT NULL DEFAULT 'jibia',
  orden INT NOT NULL DEFAULT 0, activo BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO productos_tipo(nombre,es_desecho,categoria,orden) VALUES
  ('Filete',false,'jibia',1),('Aleta',false,'jibia',2),
  ('Tentaculo',false,'jibia',3),('Reproductor',false,'jibia',4),
  ('Desecho',true,'jibia',5)
ON CONFLICT(nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS calibres (
  id SERIAL PRIMARY KEY, producto_tipo_id INT NOT NULL REFERENCES productos_tipo(id),
  nombre VARCHAR(50) NOT NULL, activo BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO calibres(producto_tipo_id,nombre) VALUES
  (1,'2UP Premium'),(1,'2UP B'),(2,'1UP'),(3,'500-1000'),(3,'1000-2000'),(3,'2UP')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS lineas_produccion (
  id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL, activa BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO lineas_produccion(nombre) VALUES('Linea 1'),('Linea 2'),('Linea 3')
ON CONFLICT(nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS tuneles (
  id SERIAL PRIMARY KEY, nombre VARCHAR(50) UNIQUE NOT NULL,
  capacidad_max INT NOT NULL DEFAULT 32, activo BOOLEAN NOT NULL DEFAULT true, observacion TEXT
);
INSERT INTO tuneles(nombre,capacidad_max) VALUES
  ('Tunel 1',32),('Tunel 2',32),('Tunel 3',30),('Tunel 4',30)
ON CONFLICT(nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS lotes (
  id SERIAL PRIMARY KEY, codigo VARCHAR(20) UNIQUE NOT NULL,
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  kilos_brutos NUMERIC(12,2) NOT NULL CHECK(kilos_brutos >= 0),
  guia_despacho VARCHAR(100), proveedor_guia VARCHAR(100),
  factura_numero VARCHAR(100), proveedor_factura VARCHAR(100),
  folio_abastecimiento VARCHAR(50), folio_produccion VARCHAR(50),
  proveedor_id INT REFERENCES proveedores(id),
  conductor_id INT REFERENCES conductores(id),
  patente_camion VARCHAR(20), patente_rampla VARCHAR(20), empresa_transporte VARCHAR(150),
  hora_llegada TIMESTAMPTZ, hora_inicio_descarga TIMESTAMPTZ, hora_fin_descarga TIMESTAMPTZ,
  temperatura_carga NUMERIC(5,1), estado_carga VARCHAR(50), observacion_recepcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK(estado IN('pendiente','en_proceso','cerrado')),
  observacion TEXT,
  creado_por INT REFERENCES usuarios(id),
  recibido_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS turnos (
  id SERIAL PRIMARY KEY, lote_id INT NOT NULL REFERENCES lotes(id),
  supervisor_id INT REFERENCES usuarios(id), nombre VARCHAR(100),
  hora_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(), hora_fin TIMESTAMPTZ,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK(estado IN('abierto','cerrado')),
  observacion TEXT, observacion_cierre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PESAJES: genera cajas automáticamente ───────────────────
-- "cajas" aquí es la cantidad de cajas que produjo este pesaje
CREATE TABLE IF NOT EXISTS pesajes (
  id SERIAL PRIMARY KEY,
  lote_id INT NOT NULL REFERENCES lotes(id),
  linea_id INT NOT NULL REFERENCES lineas_produccion(id),
  producto_tipo_id INT NOT NULL REFERENCES productos_tipo(id),
  calibre_id INT REFERENCES calibres(id),
  kilos NUMERIC(12,2) NOT NULL CHECK(kilos > 0),
  cajas INT NOT NULL DEFAULT 0 CHECK(cajas >= 0),   -- cajas producidas en este pesaje
  bandejas INT CHECK(bandejas IS NULL OR bandejas >= 0),
  kilos_por_caja NUMERIC(10,4),                     -- calculado: kilos/cajas
  fecha_elaboracion DATE NOT NULL DEFAULT CURRENT_DATE,
  turno_id INT REFERENCES turnos(id),
  observacion TEXT,
  registrado_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CARROS: contenedores físicos para el túnel ───────────────
CREATE TABLE IF NOT EXISTS carros (
  id SERIAL PRIMARY KEY,
  lote_id INT NOT NULL REFERENCES lotes(id),
  codigo_carro VARCHAR(30) NOT NULL,          -- ej: "C-001", auto-generado si no se especifica
  niveles INT CHECK(niveles BETWEEN 1 AND 10),
  estado VARCHAR(20) NOT NULL DEFAULT 'cargando'
    CHECK(estado IN('cargando','listo','en_tunel','congelado')),
  -- Temperaturas de muestra ANTES de entrar al túnel (obligatorio x3)
  temp_pre_tunel_1     NUMERIC(5,1),
  temp_pre_tunel_2     NUMERIC(5,1),
  temp_pre_tunel_3     NUMERIC(5,1),
  temp_pre_tunel_hora  TIMESTAMPTZ,
  observacion TEXT,
  creado_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lote_id, codigo_carro)
);

-- ── CAJAS: unidades físicas de producto ─────────────────────
-- Se generan automáticamente al registrar un pesaje (si cajas > 0)
-- El operador luego asigna cada caja a un carro
CREATE TABLE IF NOT EXISTS cajas (
  id SERIAL PRIMARY KEY,
  lote_id INT NOT NULL REFERENCES lotes(id),
  pesaje_id INT REFERENCES pesajes(id),       -- de qué pesaje proviene
  carro_id INT REFERENCES carros(id),         -- null hasta que se asigne a un carro
  numero_caja VARCHAR(30) NOT NULL,           -- "JIB7524-F-001"  (lote-prod-seq)
  producto_tipo_id INT NOT NULL REFERENCES productos_tipo(id),
  calibre_id INT REFERENCES calibres(id),
  kilos_netos NUMERIC(12,2) NOT NULL CHECK(kilos_netos > 0),
  fecha_elaboracion DATE NOT NULL DEFAULT CURRENT_DATE,
  en_inventario BOOLEAN NOT NULL DEFAULT false,  -- true cuando el operador lo registra
  registrado_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tuneles_carros (
  id SERIAL PRIMARY KEY,
  tunel_id INT NOT NULL REFERENCES tuneles(id),
  carro_id INT NOT NULL REFERENCES carros(id),
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_salida TIMESTAMPTZ,
  temperatura_ingreso NUMERIC(5,1),
  temperatura_salida NUMERIC(5,1),
  estado VARCHAR(20) NOT NULL DEFAULT 'en_tunel'
    CHECK(estado IN('en_tunel','completado')),
  observacion TEXT,
  registrado_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INVENTARIO: stock por producto/calibre/lote ──────────────
-- kilos_disponibles = kg | num_cajas = unidades enteras
CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  lote_id INT REFERENCES lotes(id),
  producto_tipo_id INT REFERENCES productos_tipo(id),
  calibre_id INT REFERENCES calibres(id),
  nombre_material VARCHAR(150),               -- para materiales que no son producto
  unidad VARCHAR(30) NOT NULL DEFAULT 'kg',   -- 'kg' para producto, 'unid'/'litros'/etc para materiales
  categoria_inv VARCHAR(30) NOT NULL DEFAULT 'producto'
    CHECK(categoria_inv IN('producto','material')),
  kilos_disponibles NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(kilos_disponibles >= 0),
  num_cajas INT NOT NULL DEFAULT 0 CHECK(num_cajas >= 0),
  ubicacion VARCHAR(100),
  observacion TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lote_id, producto_tipo_id, calibre_id)
);

-- ── MOVIMIENTOS DE INVENTARIO ────────────────────────────────
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id SERIAL PRIMARY KEY,
  inventario_id INT NOT NULL REFERENCES inventario(id),
  tipo VARCHAR(10) NOT NULL CHECK(tipo IN('entrada','salida')),
  cantidad_kg NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(cantidad_kg >= 0),
  cantidad_cajas INT NOT NULL DEFAULT 0 CHECK(cantidad_cajas >= 0),
  motivo VARCHAR(200),
  documento VARCHAR(100),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por INT REFERENCES usuarios(id),
  despacho_id INT,       -- FK agregada post-creacion de despachos
  carro_id INT REFERENCES carros(id),  -- traza de qué carro vino
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DESPACHOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS despachos (
  id SERIAL PRIMARY KEY,
  numero_guia VARCHAR(50) UNIQUE NOT NULL,
  fecha_despacho DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id INT REFERENCES clientes(id),
  cliente_nombre VARCHAR(150),              -- si no está en tabla clientes
  cliente_rut VARCHAR(20),
  destino TEXT,
  conductor_id INT REFERENCES conductores(id),
  patente_camion VARCHAR(20),
  empresa_transporte VARCHAR(150),
  temperatura_despacho NUMERIC(5,1),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK(estado IN('pendiente','despachado','anulado')),
  observacion TEXT,
  creado_por INT REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS despacho_items (
  id SERIAL PRIMARY KEY,
  despacho_id INT NOT NULL REFERENCES despachos(id) ON DELETE CASCADE,
  inventario_id INT NOT NULL REFERENCES inventario(id),
  lote_id INT REFERENCES lotes(id),
  producto_tipo_id INT REFERENCES productos_tipo(id),
  calibre_id INT REFERENCES calibres(id),
  nombre_item VARCHAR(150),
  cantidad_kg NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(cantidad_kg >= 0),
  cantidad_cajas INT NOT NULL DEFAULT 0 CHECK(cantidad_cajas >= 0),
  precio_unitario NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventario_movimientos
  ADD CONSTRAINT IF NOT EXISTS fk_mov_despacho
  FOREIGN KEY (despacho_id) REFERENCES despachos(id);


-- ── ARCHIVOS ADJUNTOS DE RECEPCIÓN (fotos, documentos del camión) ──
CREATE TABLE IF NOT EXISTS recepcion_archivos (
  id SERIAL PRIMARY KEY,
  lote_id INT NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  nombre_original VARCHAR(255) NOT NULL,
  nombre_archivo  VARCHAR(255) NOT NULL,  -- nombre guardado en disco
  tipo_mime       VARCHAR(100),
  tamanio_bytes   INT,
  categoria       VARCHAR(50) DEFAULT 'documento'
    CHECK(categoria IN('documento','foto','guia','factura','otro')),
  descripcion     TEXT,
  subido_por      INT REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recepcion_archivos_lote ON recepcion_archivos(lote_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, usuario_id INT REFERENCES usuarios(id),
  accion VARCHAR(100), tabla VARCHAR(100), detalle TEXT, ip VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lotes_estado          ON lotes(estado);
CREATE INDEX IF NOT EXISTS idx_lotes_fecha           ON lotes(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_lotes_proveedor       ON lotes(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_lotes_conductor       ON lotes(conductor_id);
CREATE INDEX IF NOT EXISTS idx_pesajes_lote          ON pesajes(lote_id);
CREATE INDEX IF NOT EXISTS idx_cajas_lote            ON cajas(lote_id);
CREATE INDEX IF NOT EXISTS idx_cajas_carro           ON cajas(carro_id);
CREATE INDEX IF NOT EXISTS idx_cajas_pesaje          ON cajas(pesaje_id);
CREATE INDEX IF NOT EXISTS idx_cajas_inventario      ON cajas(en_inventario);
CREATE INDEX IF NOT EXISTS idx_carros_lote           ON carros(lote_id);
CREATE INDEX IF NOT EXISTS idx_carros_estado         ON carros(estado);
CREATE INDEX IF NOT EXISTS idx_tuneles_carros_tunel  ON tuneles_carros(tunel_id);
CREATE INDEX IF NOT EXISTS idx_inventario_lote       ON inventario(lote_id);
CREATE INDEX IF NOT EXISTS idx_inventario_cat        ON inventario(categoria_inv);
CREATE INDEX IF NOT EXISTS idx_despachos_fecha       ON despachos(fecha_despacho);

SELECT 'Schema TR3S AL MAR v5 FINAL OK' AS resultado;

-- ── MIGRACIÓN: columnas de temperatura pre-túnel (agregar si ya existe la BD)
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_1    NUMERIC(5,1);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_2    NUMERIC(5,1);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_3    NUMERIC(5,1);

-- ── FORMULARIOS HACCP (planillas digitales de control) ──────────────
CREATE TABLE IF NOT EXISTS haccp_registros (
  id          SERIAL PRIMARY KEY,
  tipo        VARCHAR(50) NOT NULL
    CHECK(tipo IN('recepcion_mp','monitoreo_temp','empaque','congelacion','despacho')),
  lote_id     INT REFERENCES lotes(id),
  folio       VARCHAR(30),
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio TIME,
  hora_fin    TIME,
  monitor_nombre VARCHAR(100),
  id_termometro  VARCHAR(50),
  datos       JSONB NOT NULL DEFAULT '{}',  -- contenido flexible por tipo
  estado      VARCHAR(20) NOT NULL DEFAULT 'borrador'
    CHECK(estado IN('borrador','completado','aprobado')),
  observaciones TEXT,
  aprobado_por INT REFERENCES usuarios(id),
  registrado_por INT REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_haccp_tipo  ON haccp_registros(tipo);
CREATE INDEX IF NOT EXISTS idx_haccp_lote  ON haccp_registros(lote_id);
CREATE INDEX IF NOT EXISTS idx_haccp_fecha ON haccp_registros(fecha);

-- ── MIGRACIONES (para BD ya existente) ──────────────────────────────
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS patente_rampla VARCHAR(20);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_1    NUMERIC(5,1);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_2    NUMERIC(5,1);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_3    NUMERIC(5,1);
ALTER TABLE carros ADD COLUMN IF NOT EXISTS temp_pre_tunel_hora TIMESTAMPTZ;

ALTER TABLE haccp_registros ADD COLUMN IF NOT EXISTS folio VARCHAR(30);

-- v6: carros multi-lote (un carro puede tener cajas de distintos lotes)
ALTER TABLE carros ALTER COLUMN lote_id DROP NOT NULL;
ALTER TABLE carros DROP CONSTRAINT IF EXISTS carros_lote_id_codigo_carro_key;
DROP INDEX IF EXISTS idx_carros_lote;

-- v5.1: seguridad de autenticación (token_version + refresh_tokens)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revocado    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_hash    ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rt_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);