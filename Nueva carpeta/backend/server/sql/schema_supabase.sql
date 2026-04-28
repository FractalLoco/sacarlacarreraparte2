--
-- PostgreSQL database dump
--

\restrict ddbZmo68VZlr8HenLEnqlqVfYgWL53nr4PZY6BanhkgbRwwEXWwhnrlCL9BYUb4

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    usuario_id integer,
    accion character varying(100),
    tabla character varying(100),
    detalle text,
    ip character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: cajas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cajas (
    id integer NOT NULL,
    lote_id integer NOT NULL,
    pesaje_id integer,
    carro_id integer,
    numero_caja character varying(30) NOT NULL,
    producto_tipo_id integer NOT NULL,
    calibre_id integer,
    kilos_netos numeric(12,2) NOT NULL,
    fecha_elaboracion date DEFAULT CURRENT_DATE NOT NULL,
    en_inventario boolean DEFAULT false NOT NULL,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cajas_kilos_netos_check CHECK ((kilos_netos > (0)::numeric))
);


--
-- Name: cajas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cajas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cajas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cajas_id_seq OWNED BY public.cajas.id;


--
-- Name: calibres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibres (
    id integer NOT NULL,
    producto_tipo_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: calibres_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calibres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calibres_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calibres_id_seq OWNED BY public.calibres.id;


--
-- Name: carros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carros (
    id integer NOT NULL,
    lote_id integer,
    codigo_carro character varying(30) NOT NULL,
    niveles integer,
    estado character varying(20) DEFAULT 'cargando'::character varying NOT NULL,
    temp_pre_tunel_1 numeric(5,1),
    temp_pre_tunel_2 numeric(5,1),
    temp_pre_tunel_3 numeric(5,1),
    temp_pre_tunel_hora timestamp with time zone,
    observacion text,
    creado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT carros_estado_check CHECK (((estado)::text = ANY ((ARRAY['cargando'::character varying, 'listo'::character varying, 'en_tunel'::character varying, 'congelado'::character varying])::text[]))),
    CONSTRAINT carros_niveles_check CHECK (((niveles >= 1) AND (niveles <= 10)))
);


--
-- Name: carros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.carros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: carros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.carros_id_seq OWNED BY public.carros.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    rut character varying(20),
    nombre character varying(150) NOT NULL,
    contacto character varying(100),
    telefono character varying(30),
    email character varying(150),
    direccion text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: conductores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conductores (
    id integer NOT NULL,
    rut character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(30),
    empresa_transporte character varying(150),
    patente_habitual character varying(20),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conductores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conductores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conductores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conductores_id_seq OWNED BY public.conductores.id;


--
-- Name: despacho_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.despacho_items (
    id integer NOT NULL,
    despacho_id integer NOT NULL,
    inventario_id integer NOT NULL,
    lote_id integer,
    producto_tipo_id integer,
    calibre_id integer,
    nombre_item character varying(150),
    cantidad_kg numeric(12,2) DEFAULT 0 NOT NULL,
    cantidad_cajas integer DEFAULT 0 NOT NULL,
    precio_unitario numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT despacho_items_cantidad_cajas_check CHECK ((cantidad_cajas >= 0)),
    CONSTRAINT despacho_items_cantidad_kg_check CHECK ((cantidad_kg >= (0)::numeric))
);


--
-- Name: despacho_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.despacho_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: despacho_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.despacho_items_id_seq OWNED BY public.despacho_items.id;


--
-- Name: despachos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.despachos (
    id integer NOT NULL,
    numero_guia character varying(50) NOT NULL,
    fecha_despacho date DEFAULT CURRENT_DATE NOT NULL,
    cliente_id integer,
    cliente_nombre character varying(150),
    cliente_rut character varying(20),
    destino text,
    conductor_id integer,
    patente_camion character varying(20),
    empresa_transporte character varying(150),
    temperatura_despacho numeric(5,1),
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    observacion text,
    creado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT despachos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'despachado'::character varying, 'anulado'::character varying])::text[])))
);


--
-- Name: despachos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.despachos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: despachos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.despachos_id_seq OWNED BY public.despachos.id;


--
-- Name: haccp_registros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.haccp_registros (
    id integer NOT NULL,
    tipo character varying(50) NOT NULL,
    lote_id integer,
    folio character varying(30),
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    hora_inicio time without time zone,
    hora_fin time without time zone,
    monitor_nombre character varying(100),
    id_termometro character varying(50),
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    estado character varying(20) DEFAULT 'borrador'::character varying NOT NULL,
    observaciones text,
    aprobado_por integer,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT haccp_registros_estado_check CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'completado'::character varying, 'aprobado'::character varying])::text[]))),
    CONSTRAINT haccp_registros_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['recepcion_mp'::character varying, 'monitoreo_temp'::character varying, 'empaque'::character varying, 'congelacion'::character varying, 'despacho'::character varying])::text[])))
);


--
-- Name: haccp_registros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.haccp_registros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: haccp_registros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.haccp_registros_id_seq OWNED BY public.haccp_registros.id;


--
-- Name: inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario (
    id integer NOT NULL,
    lote_id integer,
    producto_tipo_id integer,
    calibre_id integer,
    nombre_material character varying(150),
    unidad character varying(30) DEFAULT 'kg'::character varying NOT NULL,
    categoria_inv character varying(30) DEFAULT 'producto'::character varying NOT NULL,
    kilos_disponibles numeric(12,2) DEFAULT 0 NOT NULL,
    num_cajas integer DEFAULT 0 NOT NULL,
    ubicacion character varying(100),
    observacion text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventario_categoria_inv_check CHECK (((categoria_inv)::text = ANY ((ARRAY['producto'::character varying, 'material'::character varying])::text[]))),
    CONSTRAINT inventario_kilos_disponibles_check CHECK ((kilos_disponibles >= (0)::numeric)),
    CONSTRAINT inventario_num_cajas_check CHECK ((num_cajas >= 0))
);


--
-- Name: inventario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_id_seq OWNED BY public.inventario.id;


--
-- Name: inventario_movimientos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventario_movimientos (
    id integer NOT NULL,
    inventario_id integer NOT NULL,
    tipo character varying(10) NOT NULL,
    cantidad_kg numeric(12,2) DEFAULT 0 NOT NULL,
    cantidad_cajas integer DEFAULT 0 NOT NULL,
    motivo character varying(200),
    documento character varying(100),
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    registrado_por integer,
    despacho_id integer,
    carro_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventario_movimientos_cantidad_cajas_check CHECK ((cantidad_cajas >= 0)),
    CONSTRAINT inventario_movimientos_cantidad_kg_check CHECK ((cantidad_kg >= (0)::numeric)),
    CONSTRAINT inventario_movimientos_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['entrada'::character varying, 'salida'::character varying])::text[])))
);


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventario_movimientos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventario_movimientos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventario_movimientos_id_seq OWNED BY public.inventario_movimientos.id;


--
-- Name: lineas_produccion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lineas_produccion (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    activa boolean DEFAULT true NOT NULL
);


--
-- Name: lineas_produccion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lineas_produccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lineas_produccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lineas_produccion_id_seq OWNED BY public.lineas_produccion.id;


--
-- Name: lotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lotes (
    id integer NOT NULL,
    codigo character varying(20) NOT NULL,
    fecha_ingreso date DEFAULT CURRENT_DATE NOT NULL,
    kilos_brutos numeric(12,2) NOT NULL,
    guia_despacho character varying(100),
    proveedor_guia character varying(100),
    factura_numero character varying(100),
    proveedor_factura character varying(100),
    folio_abastecimiento character varying(50),
    folio_produccion character varying(50),
    proveedor_id integer,
    conductor_id integer,
    patente_camion character varying(20),
    patente_rampla character varying(20),
    empresa_transporte character varying(150),
    hora_llegada timestamp with time zone,
    hora_inicio_descarga timestamp with time zone,
    hora_fin_descarga timestamp with time zone,
    temperatura_carga numeric(5,1),
    estado_carga character varying(50),
    observacion_recepcion text,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    observacion text,
    creado_por integer,
    recibido_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    motivo_rechazo text,
    CONSTRAINT lotes_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'en_proceso'::character varying, 'cerrado'::character varying, 'rechazado'::character varying])::text[]))),
    CONSTRAINT lotes_kilos_brutos_check CHECK ((kilos_brutos >= (0)::numeric))
);


--
-- Name: lotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lotes_id_seq OWNED BY public.lotes.id;


--
-- Name: pesajes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pesajes (
    id integer NOT NULL,
    lote_id integer NOT NULL,
    linea_id integer NOT NULL,
    producto_tipo_id integer NOT NULL,
    calibre_id integer,
    kilos numeric(12,2) NOT NULL,
    cajas integer DEFAULT 0 NOT NULL,
    bandejas integer,
    kilos_por_caja numeric(10,4),
    fecha_elaboracion date DEFAULT CURRENT_DATE NOT NULL,
    turno_id integer,
    observacion text,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pesajes_bandejas_check CHECK (((bandejas IS NULL) OR (bandejas >= 0))),
    CONSTRAINT pesajes_cajas_check CHECK ((cajas >= 0)),
    CONSTRAINT pesajes_kilos_check CHECK ((kilos > (0)::numeric))
);


--
-- Name: pesajes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pesajes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pesajes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pesajes_id_seq OWNED BY public.pesajes.id;


--
-- Name: productos_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos_tipo (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    es_desecho boolean DEFAULT false NOT NULL,
    categoria character varying(30) DEFAULT 'jibia'::character varying NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: productos_tipo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_tipo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_tipo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_tipo_id_seq OWNED BY public.productos_tipo.id;


--
-- Name: proveedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proveedores (
    id integer NOT NULL,
    rut character varying(20) NOT NULL,
    nombre character varying(150) NOT NULL,
    contacto character varying(100),
    telefono character varying(30),
    email character varying(150),
    direccion text,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proveedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proveedores_id_seq OWNED BY public.proveedores.id;


--
-- Name: recepcion_archivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recepcion_archivos (
    id integer NOT NULL,
    lote_id integer NOT NULL,
    nombre_original character varying(255) NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    tipo_mime character varying(100),
    tamanio_bytes integer,
    categoria character varying(50) DEFAULT 'documento'::character varying,
    descripcion text,
    subido_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recepcion_archivos_categoria_check CHECK (((categoria)::text = ANY ((ARRAY['documento'::character varying, 'foto'::character varying, 'guia'::character varying, 'factura'::character varying, 'otro'::character varying])::text[])))
);


--
-- Name: recepcion_archivos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.recepcion_archivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: recepcion_archivos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.recepcion_archivos_id_seq OWNED BY public.recepcion_archivos.id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revocado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    nivel integer DEFAULT 1 NOT NULL,
    descripcion text
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: tuneles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tuneles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    capacidad_max integer DEFAULT 32 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    observacion text
);


--
-- Name: tuneles_carros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tuneles_carros (
    id integer NOT NULL,
    tunel_id integer NOT NULL,
    carro_id integer NOT NULL,
    fecha_ingreso timestamp with time zone DEFAULT now() NOT NULL,
    fecha_salida timestamp with time zone,
    temperatura_ingreso numeric(5,1),
    temperatura_salida numeric(5,1),
    estado character varying(20) DEFAULT 'en_tunel'::character varying NOT NULL,
    observacion text,
    registrado_por integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tuneles_carros_estado_check CHECK (((estado)::text = ANY ((ARRAY['en_tunel'::character varying, 'completado'::character varying])::text[])))
);


--
-- Name: tuneles_carros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tuneles_carros_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tuneles_carros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tuneles_carros_id_seq OWNED BY public.tuneles_carros.id;


--
-- Name: tuneles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tuneles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tuneles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tuneles_id_seq OWNED BY public.tuneles.id;


--
-- Name: turnos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos (
    id integer NOT NULL,
    lote_id integer NOT NULL,
    supervisor_id integer,
    nombre character varying(100),
    hora_inicio timestamp with time zone DEFAULT now() NOT NULL,
    hora_fin timestamp with time zone,
    estado character varying(20) DEFAULT 'abierto'::character varying NOT NULL,
    observacion text,
    observacion_cierre text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT turnos_estado_check CHECK (((estado)::text = ANY ((ARRAY['abierto'::character varying, 'cerrado'::character varying])::text[])))
);


--
-- Name: turnos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.turnos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: turnos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.turnos_id_seq OWNED BY public.turnos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    rol_id integer DEFAULT 5 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    token_version integer DEFAULT 1 NOT NULL
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: cajas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas ALTER COLUMN id SET DEFAULT nextval('public.cajas_id_seq'::regclass);


--
-- Name: calibres id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibres ALTER COLUMN id SET DEFAULT nextval('public.calibres_id_seq'::regclass);


--
-- Name: carros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carros ALTER COLUMN id SET DEFAULT nextval('public.carros_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: conductores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conductores ALTER COLUMN id SET DEFAULT nextval('public.conductores_id_seq'::regclass);


--
-- Name: despacho_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items ALTER COLUMN id SET DEFAULT nextval('public.despacho_items_id_seq'::regclass);


--
-- Name: despachos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos ALTER COLUMN id SET DEFAULT nextval('public.despachos_id_seq'::regclass);


--
-- Name: haccp_registros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.haccp_registros ALTER COLUMN id SET DEFAULT nextval('public.haccp_registros_id_seq'::regclass);


--
-- Name: inventario id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario ALTER COLUMN id SET DEFAULT nextval('public.inventario_id_seq'::regclass);


--
-- Name: inventario_movimientos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos ALTER COLUMN id SET DEFAULT nextval('public.inventario_movimientos_id_seq'::regclass);


--
-- Name: lineas_produccion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_produccion ALTER COLUMN id SET DEFAULT nextval('public.lineas_produccion_id_seq'::regclass);


--
-- Name: lotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes ALTER COLUMN id SET DEFAULT nextval('public.lotes_id_seq'::regclass);


--
-- Name: pesajes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes ALTER COLUMN id SET DEFAULT nextval('public.pesajes_id_seq'::regclass);


--
-- Name: productos_tipo id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_tipo ALTER COLUMN id SET DEFAULT nextval('public.productos_tipo_id_seq'::regclass);


--
-- Name: proveedores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores ALTER COLUMN id SET DEFAULT nextval('public.proveedores_id_seq'::regclass);


--
-- Name: recepcion_archivos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_archivos ALTER COLUMN id SET DEFAULT nextval('public.recepcion_archivos_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: tuneles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles ALTER COLUMN id SET DEFAULT nextval('public.tuneles_id_seq'::regclass);


--
-- Name: tuneles_carros id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles_carros ALTER COLUMN id SET DEFAULT nextval('public.tuneles_carros_id_seq'::regclass);


--
-- Name: turnos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos ALTER COLUMN id SET DEFAULT nextval('public.turnos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: cajas cajas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pkey PRIMARY KEY (id);


--
-- Name: calibres calibres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibres
    ADD CONSTRAINT calibres_pkey PRIMARY KEY (id);


--
-- Name: carros carros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carros
    ADD CONSTRAINT carros_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_rut_key UNIQUE (rut);


--
-- Name: conductores conductores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conductores
    ADD CONSTRAINT conductores_pkey PRIMARY KEY (id);


--
-- Name: conductores conductores_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conductores
    ADD CONSTRAINT conductores_rut_key UNIQUE (rut);


--
-- Name: despacho_items despacho_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_pkey PRIMARY KEY (id);


--
-- Name: despachos despachos_numero_guia_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_numero_guia_key UNIQUE (numero_guia);


--
-- Name: despachos despachos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_pkey PRIMARY KEY (id);


--
-- Name: haccp_registros haccp_registros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.haccp_registros
    ADD CONSTRAINT haccp_registros_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_lote_id_producto_tipo_id_calibre_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_lote_id_producto_tipo_id_calibre_id_key UNIQUE (lote_id, producto_tipo_id, calibre_id);


--
-- Name: inventario_movimientos inventario_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_pkey PRIMARY KEY (id);


--
-- Name: inventario inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_pkey PRIMARY KEY (id);


--
-- Name: lineas_produccion lineas_produccion_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_produccion
    ADD CONSTRAINT lineas_produccion_nombre_key UNIQUE (nombre);


--
-- Name: lineas_produccion lineas_produccion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lineas_produccion
    ADD CONSTRAINT lineas_produccion_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_codigo_key UNIQUE (codigo);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: pesajes pesajes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_pkey PRIMARY KEY (id);


--
-- Name: productos_tipo productos_tipo_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_tipo
    ADD CONSTRAINT productos_tipo_nombre_key UNIQUE (nombre);


--
-- Name: productos_tipo productos_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos_tipo
    ADD CONSTRAINT productos_tipo_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_rut_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proveedores
    ADD CONSTRAINT proveedores_rut_key UNIQUE (rut);


--
-- Name: recepcion_archivos recepcion_archivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_archivos
    ADD CONSTRAINT recepcion_archivos_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tuneles_carros tuneles_carros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles_carros
    ADD CONSTRAINT tuneles_carros_pkey PRIMARY KEY (id);


--
-- Name: tuneles tuneles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles
    ADD CONSTRAINT tuneles_nombre_key UNIQUE (nombre);


--
-- Name: tuneles tuneles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles
    ADD CONSTRAINT tuneles_pkey PRIMARY KEY (id);


--
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_cajas_carro; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cajas_carro ON public.cajas USING btree (carro_id);


--
-- Name: idx_cajas_inventario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cajas_inventario ON public.cajas USING btree (en_inventario);


--
-- Name: idx_cajas_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cajas_lote ON public.cajas USING btree (lote_id);


--
-- Name: idx_cajas_pesaje; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cajas_pesaje ON public.cajas USING btree (pesaje_id);


--
-- Name: idx_carros_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carros_estado ON public.carros USING btree (estado);


--
-- Name: idx_despachos_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_despachos_fecha ON public.despachos USING btree (fecha_despacho);


--
-- Name: idx_haccp_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_haccp_fecha ON public.haccp_registros USING btree (fecha);


--
-- Name: idx_haccp_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_haccp_lote ON public.haccp_registros USING btree (lote_id);


--
-- Name: idx_haccp_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_haccp_tipo ON public.haccp_registros USING btree (tipo);


--
-- Name: idx_inventario_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_cat ON public.inventario USING btree (categoria_inv);


--
-- Name: idx_inventario_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventario_lote ON public.inventario USING btree (lote_id);


--
-- Name: idx_lotes_conductor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_conductor ON public.lotes USING btree (conductor_id);


--
-- Name: idx_lotes_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_estado ON public.lotes USING btree (estado);


--
-- Name: idx_lotes_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_fecha ON public.lotes USING btree (fecha_ingreso);


--
-- Name: idx_lotes_proveedor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lotes_proveedor ON public.lotes USING btree (proveedor_id);


--
-- Name: idx_pesajes_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pesajes_lote ON public.pesajes USING btree (lote_id);


--
-- Name: idx_recepcion_archivos_lote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recepcion_archivos_lote ON public.recepcion_archivos USING btree (lote_id);


--
-- Name: idx_rt_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_expires ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_rt_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_rt_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_usuario ON public.refresh_tokens USING btree (usuario_id);


--
-- Name: idx_tuneles_carros_tunel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tuneles_carros_tunel ON public.tuneles_carros USING btree (tunel_id);


--
-- Name: audit_log audit_log_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: cajas cajas_calibre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_calibre_id_fkey FOREIGN KEY (calibre_id) REFERENCES public.calibres(id);


--
-- Name: cajas cajas_carro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_carro_id_fkey FOREIGN KEY (carro_id) REFERENCES public.carros(id);


--
-- Name: cajas cajas_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: cajas cajas_pesaje_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_pesaje_id_fkey FOREIGN KEY (pesaje_id) REFERENCES public.pesajes(id);


--
-- Name: cajas cajas_producto_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_producto_tipo_id_fkey FOREIGN KEY (producto_tipo_id) REFERENCES public.productos_tipo(id);


--
-- Name: cajas cajas_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cajas
    ADD CONSTRAINT cajas_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: calibres calibres_producto_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibres
    ADD CONSTRAINT calibres_producto_tipo_id_fkey FOREIGN KEY (producto_tipo_id) REFERENCES public.productos_tipo(id);


--
-- Name: carros carros_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carros
    ADD CONSTRAINT carros_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: carros carros_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carros
    ADD CONSTRAINT carros_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: despacho_items despacho_items_calibre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_calibre_id_fkey FOREIGN KEY (calibre_id) REFERENCES public.calibres(id);


--
-- Name: despacho_items despacho_items_despacho_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_despacho_id_fkey FOREIGN KEY (despacho_id) REFERENCES public.despachos(id) ON DELETE CASCADE;


--
-- Name: despacho_items despacho_items_inventario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);


--
-- Name: despacho_items despacho_items_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: despacho_items despacho_items_producto_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despacho_items
    ADD CONSTRAINT despacho_items_producto_tipo_id_fkey FOREIGN KEY (producto_tipo_id) REFERENCES public.productos_tipo(id);


--
-- Name: despachos despachos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: despachos despachos_conductor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_conductor_id_fkey FOREIGN KEY (conductor_id) REFERENCES public.conductores(id);


--
-- Name: despachos despachos_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despachos
    ADD CONSTRAINT despachos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: haccp_registros haccp_registros_aprobado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.haccp_registros
    ADD CONSTRAINT haccp_registros_aprobado_por_fkey FOREIGN KEY (aprobado_por) REFERENCES public.usuarios(id);


--
-- Name: haccp_registros haccp_registros_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.haccp_registros
    ADD CONSTRAINT haccp_registros_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: haccp_registros haccp_registros_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.haccp_registros
    ADD CONSTRAINT haccp_registros_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: inventario inventario_calibre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_calibre_id_fkey FOREIGN KEY (calibre_id) REFERENCES public.calibres(id);


--
-- Name: inventario inventario_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: inventario_movimientos inventario_movimientos_carro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_carro_id_fkey FOREIGN KEY (carro_id) REFERENCES public.carros(id);


--
-- Name: inventario_movimientos inventario_movimientos_inventario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_inventario_id_fkey FOREIGN KEY (inventario_id) REFERENCES public.inventario(id);


--
-- Name: inventario_movimientos inventario_movimientos_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario_movimientos
    ADD CONSTRAINT inventario_movimientos_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: inventario inventario_producto_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventario
    ADD CONSTRAINT inventario_producto_tipo_id_fkey FOREIGN KEY (producto_tipo_id) REFERENCES public.productos_tipo(id);


--
-- Name: lotes lotes_conductor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_conductor_id_fkey FOREIGN KEY (conductor_id) REFERENCES public.conductores(id);


--
-- Name: lotes lotes_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id);


--
-- Name: lotes lotes_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.proveedores(id);


--
-- Name: lotes lotes_recibido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lotes
    ADD CONSTRAINT lotes_recibido_por_fkey FOREIGN KEY (recibido_por) REFERENCES public.usuarios(id);


--
-- Name: pesajes pesajes_calibre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_calibre_id_fkey FOREIGN KEY (calibre_id) REFERENCES public.calibres(id);


--
-- Name: pesajes pesajes_linea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_linea_id_fkey FOREIGN KEY (linea_id) REFERENCES public.lineas_produccion(id);


--
-- Name: pesajes pesajes_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: pesajes pesajes_producto_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_producto_tipo_id_fkey FOREIGN KEY (producto_tipo_id) REFERENCES public.productos_tipo(id);


--
-- Name: pesajes pesajes_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: pesajes pesajes_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pesajes
    ADD CONSTRAINT pesajes_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id);


--
-- Name: recepcion_archivos recepcion_archivos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_archivos
    ADD CONSTRAINT recepcion_archivos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE CASCADE;


--
-- Name: recepcion_archivos recepcion_archivos_subido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recepcion_archivos
    ADD CONSTRAINT recepcion_archivos_subido_por_fkey FOREIGN KEY (subido_por) REFERENCES public.usuarios(id);


--
-- Name: refresh_tokens refresh_tokens_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: tuneles_carros tuneles_carros_carro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles_carros
    ADD CONSTRAINT tuneles_carros_carro_id_fkey FOREIGN KEY (carro_id) REFERENCES public.carros(id);


--
-- Name: tuneles_carros tuneles_carros_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles_carros
    ADD CONSTRAINT tuneles_carros_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: tuneles_carros tuneles_carros_tunel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tuneles_carros
    ADD CONSTRAINT tuneles_carros_tunel_id_fkey FOREIGN KEY (tunel_id) REFERENCES public.tuneles(id);


--
-- Name: turnos turnos_lote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES public.lotes(id);


--
-- Name: turnos turnos_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos
    ADD CONSTRAINT turnos_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ddbZmo68VZlr8HenLEnqlqVfYgWL53nr4PZY6BanhkgbRwwEXWwhnrlCL9BYUb4

