let _token        = null;
let _refreshToken = null;  // solo en memoria; se pierde al cerrar pestaña → fuerza re-login
let _refreshing   = false;
let _refreshQueue = [];

export const setToken        = (t)  => { _token = t; };
export const setRefreshToken = (rt) => { _refreshToken = rt; };
export const getRefreshToken = ()   => _refreshToken;
export const clearToken      = ()   => { _token = null; _refreshToken = null; };

const intentarRefresh = async () => {
  if (!_refreshToken) throw new Error("Sin refresh token");

  // Si ya hay un refresh en curso, encolar y esperar en lugar de lanzar otro
  if (_refreshing) {
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    });
  }

  _refreshing = true;
  try {
    const res = await fetch("/api/auth/refresh", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ refreshToken: _refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Refresh fallido");

    _token        = data.token;
    _refreshToken = data.refreshToken;
    localStorage.setItem("tam_prod_token", data.token);

    _refreshQueue.forEach(p => p.resolve());
    _refreshQueue = [];
    return data.token;
  } catch (err) {
    _refreshQueue.forEach(p => p.reject(err));
    _refreshQueue = [];
    throw err;
  } finally {
    _refreshing = false;
  }
};

const request = async (method, path, body = null, _esRetry = false) => {
  const headers = { "Content-Type": "application/json" };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Interceptor de 401: intenta refresh una sola vez, nunca en rutas de auth
  if (res.status === 401 && !_esRetry && _refreshToken && !path.startsWith("/auth/")) {
    try {
      await intentarRefresh();
      return request(method, path, body, true);
    } catch {
      clearToken();
      localStorage.removeItem("tam_prod_token");
      window.location.href = "/";
      throw new Error("Sesión expirada");
    }
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("vnd.openxmlformats") || ct.includes("application/pdf")) {
    if (!res.ok) throw new Error("Error al descargar");
    return res.blob();
  }
  if (ct.includes("text/html")) {
    if (!res.ok) throw new Error("Error al obtener HTML");
    return res.text();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

export const apiGet    = (p)      => request("GET",    p);
export const apiPost   = (p, b)   => request("POST",   p, b);
export const apiPut    = (p, b)   => request("PUT",    p, b);
export const apiDelete = (p)      => request("DELETE", p);

const descargar = (blob, nombre) => {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: nombre }).click();
  URL.revokeObjectURL(url);
};
const limpiar = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));
const hoy = () => new Date().toISOString().slice(0, 10);

export const authAPI = {
  login:           (email, password) => apiPost("/auth/login",    { email, password }),
  me:              ()                => apiGet("/auth/me"),
  cambiarPassword: (d)               => apiPut("/auth/password",  d),
  logout:          (refreshToken)    => apiPost("/auth/logout",   { refreshToken }),
  refresh:         (refreshToken)    => apiPost("/auth/refresh",  { refreshToken }),
};
export const usuariosAPI = {
  listar:     ()         => apiGet("/usuarios"),
  roles:      ()         => apiGet("/usuarios/roles"),
  crear:      (d)        => apiPost("/usuarios", d),
  actualizar: (id, d)    => apiPut(`/usuarios/${id}`, d),
  desactivar: (id)       => apiDelete(`/usuarios/${id}`),
};
export const proveedoresAPI = {
  listar:     (f = {})   => apiGet("/proveedores?" + new URLSearchParams(limpiar(f))),
  obtener:    (id)       => apiGet(`/proveedores/${id}`),
  crear:      (d)        => apiPost("/proveedores", d),
  actualizar: (id, d)    => apiPut(`/proveedores/${id}`, d),
};
export const conductoresAPI = {
  listar:     (f = {})   => apiGet("/conductores?" + new URLSearchParams(limpiar(f))),
  obtener:    (id)       => apiGet(`/conductores/${id}`),
  crear:      (d)        => apiPost("/conductores", d),
  actualizar: (id, d)    => apiPut(`/conductores/${id}`, d),
};
export const lotesAPI = {
  listar:       (f = {}) => apiGet("/lotes?" + new URLSearchParams(limpiar(f))),
  activo:       ()       => apiGet("/lotes/activo"),
  obtener:      (id)     => apiGet(`/lotes/${id}`),
  resumen:      (id)     => apiGet(`/lotes/${id}/resumen`),
  crear:        (d)      => apiPost("/lotes", d),
  actualizar:   (id, d)  => apiPut(`/lotes/${id}`, d),
  cambiarEstado:(id, e, motivo_rechazo) => apiPut(`/lotes/${id}/estado`, { estado: e, motivo_rechazo: motivo_rechazo||null }),
  rechazar:     (id, motivo) => apiPut(`/lotes/${id}/estado`, { estado: 'rechazado', motivo_rechazo: motivo }),
};
export const pesajesAPI = {
  listar:     (f = {})   => apiGet("/pesajes?" + new URLSearchParams(limpiar(f))),
  tipos:      ()         => apiGet("/pesajes/tipos"),
  calibres:   (tid)      => apiGet("/pesajes/calibres" + (tid ? `?producto_tipo_id=${tid}` : "")),
  lineas:     ()         => apiGet("/pesajes/lineas"),
  crear:      (d)        => apiPost("/pesajes", d),
  actualizar: (id, d)    => apiPut(`/pesajes/${id}`, d),
  eliminar:   (id)       => apiDelete(`/pesajes/${id}`),
};
export const cajasAPI = {
  generarLote:  (lote_id, d)              => apiPost(`/cajas/lote/${lote_id}/generar`, d),
  listarLote:   (lote_id)                 => apiGet(`/cajas/lote/${lote_id}`),
  listarCarro:  (carro_id)                => apiGet(`/cajas/carro/${carro_id}`),
  validarCarro: (carro_id, lote_id_nuevo) => apiPost("/cajas/validar-carro", { carro_id, lote_id_nuevo }),
};
export const turnosAPI = {
  listar:  (f = {}) => apiGet("/turnos?" + new URLSearchParams(limpiar(f))),
  activo:  ()       => apiGet("/turnos/activo"),
  abrir:   (d)      => apiPost("/turnos", d),
  cerrar:  (id, d)  => apiPut(`/turnos/${id}/cerrar`, d),
};
export const tunelesAPI = {
  listar:              ()                   => apiGet("/tuneles"),
  carros:              (f = {})             => apiGet("/tuneles/carros?" + new URLSearchParams(limpiar(f))),
  cajas:               (f = {})             => apiGet("/tuneles/cajas?" + new URLSearchParams(limpiar(f))),
  carrosDeTunel:       (id)                 => apiGet(`/tuneles/${id}/carros`),
  estadoCarros:        ()                   => apiGet("/tuneles/estado-carros"),
  crearCarro:          (d)                  => apiPost("/tuneles/carros", d),
  editarCarro:         (id, d)              => apiPut(`/tuneles/carros/${id}`, d),
  eliminarCarro:       (id)                 => apiDelete(`/tuneles/carros/${id}`),
  marcarListo:         (id, temps = {})     => apiPut(`/tuneles/carros/${id}/listo`, temps),
  ingresarCarro:       (id, d)              => apiPut(`/tuneles/carros/${id}/ingresar`, d),
  sacarCarro:          (id, d)              => apiPut(`/tuneles/carros/${id}/salir`, d),
  asignarCaja:         (id, d)              => apiPut(`/tuneles/cajas/${id}/asignar`, d),
  etiquetaCarro:       (id)                 => apiGet(`/tuneles/carros/${id}/etiqueta`),
  etiquetaZebra:       (id)                 => apiGet(`/tuneles/cajas/${id}/etiqueta-zebra`),
  carrosVaciosDeTunel: (tunel_id)           => apiGet(`/tuneles/${tunel_id}/carros-vacios`),
  cajasLibresDeLote:   (lote_id)            => apiGet(`/tuneles/lote/${lote_id}/cajas-libres`),
  asignarCajasAlCarro: (carro_id, d)        => apiPost(`/tuneles/carros/${carro_id}/asignar-cajas`, d),
  congelarCarro:       (carro_id, d)        => apiPost(`/tuneles/carros/${carro_id}/congelar`, d),
  etiquetasZebraCarro: (carro_id, cliente)  => apiGet(`/tuneles/carros/${carro_id}/etiquetas-zebra${cliente ? `?cliente=${encodeURIComponent(cliente)}` : ""}`),
  etiquetasZebraLote:  (lote_id, cliente)   => apiGet(`/tuneles/lotes/${lote_id}/etiquetas-zebra${cliente ? `?cliente=${encodeURIComponent(cliente)}` : ""}`),
  descargarZplLote: (lote_id, cliente) => {
    const t  = _token;
    const qs = cliente ? `?cliente=${encodeURIComponent(cliente)}` : "";
    return fetch(`/api/tuneles/lotes/${lote_id}/etiquetas-zpl${qs}`, {
      headers: t ? { "Authorization": `Bearer ${t}` } : {},
    }).then(async r => {
      if (!r.ok) throw new Error("Error al generar ZPL");
      const b = await r.blob();
      descargar(b, `etiquetas-${lote_id}.zpl`);
    });
  },
  etiquetaCaja:  (id)       => apiGet(`/tuneles/cajas/${id}/etiqueta`),
  exportarExcel: (f = {})   => apiGet("/tuneles/exportar/carros?" + new URLSearchParams(limpiar(f))).then(b => descargar(b, `carros-cajas-${hoy()}.xlsx`)),
};
export const inventarioAPI = {
  resumenCarro:       (carro_id) => apiGet(`/inventario/carro/${carro_id}/resumen`),
  listar:             (f = {})   => apiGet("/inventario?" + new URLSearchParams(limpiar(f))),
  movimientos:        (f = {})   => apiGet("/inventario/movimientos?" + new URLSearchParams(limpiar(f))),
  crear:              (d)        => apiPost("/inventario", d),
  registrarMovimiento:(id, d)    => apiPost(`/inventario/${id}/movimiento`, d),
  ajustar:            (id, d)    => apiPut(`/inventario/${id}`, d),
};
export const configuracionAPI = {
  productos:     ()       => apiGet("/configuracion/productos"),
  calibres:      ()       => apiGet("/configuracion/calibres"),
  lineas:        ()       => apiGet("/configuracion/lineas"),
  tuneles:       ()       => apiGet("/configuracion/tuneles"),
  crearProducto: (d)      => apiPost("/configuracion/productos", d),
  editarProducto:(id, d)  => apiPut(`/configuracion/productos/${id}`, d),
  crearCalibre:  (d)      => apiPost("/configuracion/calibres", d),
  editarCalibre: (id, d)  => apiPut(`/configuracion/calibres/${id}`, d),
  crearLinea:    (d)      => apiPost("/configuracion/lineas", d),
  editarLinea:   (id, d)  => apiPut(`/configuracion/lineas/${id}`, d),
  crearTunel:    (d)      => apiPost("/configuracion/tuneles", d),
  editarTunel:   (id, d)  => apiPut(`/configuracion/tuneles/${id}`, d),
};
export const despachosAPI = {
  listar:       (f = {}) => apiGet("/despachos?" + new URLSearchParams(limpiar(f))),
  obtener:      (id)     => apiGet(`/despachos/${id}`),
  clientes:     ()       => apiGet("/despachos/clientes"),
  crearCliente: (d)      => apiPost("/despachos/clientes", d),
  crear:        (d)      => apiPost("/despachos", d),
  guiaPDF:      (id)     => apiGet(`/despachos/${id}/pdf`).then(b => descargar(b, `Guia-Despacho-${hoy()}.pdf`)),
};
export const dashboardAPI = { stats: () => apiGet("/dashboard") };
export const reportesAPI = {
  pdf:        (id)     => apiGet(`/reportes/produccion/${id}`).then(b => descargar(b, `Reporte-Lote-${hoy()}.pdf`)),
  excel:      (id)     => apiGet(`/reportes/produccion/${id}/excel`).then(b => descargar(b, `Reporte-Lote-${hoy()}.xlsx`)),
  comparacion:(ids)    => apiGet(`/reportes/comparacion?lotes=${ids.join(",")}`),
  porLinea:   (f = {}) => apiGet("/reportes/por-linea?" + new URLSearchParams(limpiar(f))),
  porTurno:   (f = {}) => apiGet("/reportes/por-turno?" + new URLSearchParams(limpiar(f))),
};
export const trazabilidadAPI = {
  buscar:  (f = {}) => apiGet("/trazabilidad/lotes?" + new URLSearchParams(limpiar(f))),
  detalle: (id)     => apiGet(`/trazabilidad/lotes/${id}`),
};
export const auditAPI = { listar: (f = {}) => apiGet("/audit?" + new URLSearchParams(limpiar(f))) };
export const recepcionAPI = {
  listarArchivos: (lote_id) => apiGet(`/recepcion/${lote_id}/archivos`),
  subirArchivo: (lote_id, formData) => {
    const t = _token;
    return fetch(`/api/recepcion/${lote_id}/archivos`, {
      method:  "POST",
      headers: t ? { "Authorization": `Bearer ${t}` } : {},
      body:    formData,
    }).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      return d;
    });
  },
  verArchivo: (id) => {
    const t = _token;
    return fetch(`/api/recepcion/archivos/${id}/ver`, {
      headers: t ? { "Authorization": `Bearer ${t}` } : {},
    }).then(async r => {
      if (!r.ok) throw new Error("Archivo no encontrado");
      const blob = await r.blob();
      return URL.createObjectURL(blob);
    });
  },
  descargarArchivo: (id)      => apiGet(`/recepcion/archivos/${id}/descargar`).then(b => descargar(b, "archivo")),
  eliminarArchivo:  (id)      => apiDelete(`/recepcion/archivos/${id}`),
  imprimir:         (lote_id) => apiGet(`/recepcion/${lote_id}/imprimir`),
};
export const haccpAPI = {
  listar:     (f = {}) => apiGet("/haccp?" + new URLSearchParams(limpiar(f))),
  obtener:    (id)     => apiGet(`/haccp/${id}`),
  crear:      (d)      => apiPost("/haccp", d),
  actualizar: (id, d)  => apiPut(`/haccp/${id}`, d),
  eliminar:   (id)     => apiDelete(`/haccp/${id}`),
  imprimir:   (id)     => apiGet(`/haccp/${id}/imprimir`),
};
