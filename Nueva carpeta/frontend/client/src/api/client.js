let _token=null;
export const setToken=t=>{_token=t;};
export const clearToken=()=>{_token=null;};

const request=async(method,path,body=null)=>{
  const headers={"Content-Type":"application/json"};
  if(_token) headers["Authorization"]=`Bearer ${_token}`;
  const res=await fetch(`/api${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
  const ct=res.headers.get("content-type")||"";
  if(ct.includes("vnd.openxmlformats")||ct.includes("application/pdf")){
    if(!res.ok) throw new Error("Error al descargar");
    return res.blob();
  }
  if(ct.includes("text/html")){
    if(!res.ok) throw new Error("Error al obtener HTML");
    return res.text();
  }
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||`Error ${res.status}`);
  return data;
};

export const apiGet=(p)=>request("GET",p);
export const apiPost=(p,b)=>request("POST",p,b);
export const apiPut=(p,b)=>request("PUT",p,b);
export const apiDelete=p=>request("DELETE",p);

const descargar=(blob,nombre)=>{
  const url=URL.createObjectURL(blob);
  Object.assign(document.createElement("a"),{href:url,download:nombre}).click();
  URL.revokeObjectURL(url);
};
const limpiar=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==null&&v!==undefined&&v!==""));
const hoy=()=>new Date().toISOString().slice(0,10);

export const authAPI={
  login:(email,password)=>apiPost("/auth/login",{email,password}),
  me:()=>apiGet("/auth/me"),
  cambiarPassword:(d)=>apiPut("/auth/password",d),
};
export const usuariosAPI={
  listar:()=>apiGet("/usuarios"),
  roles:()=>apiGet("/usuarios/roles"),
  crear:d=>apiPost("/usuarios",d),
  actualizar:(id,d)=>apiPut(`/usuarios/${id}`,d),
  desactivar:id=>apiDelete(`/usuarios/${id}`),
};
export const proveedoresAPI={
  listar:(f={})=>apiGet("/proveedores?"+new URLSearchParams(limpiar(f))),
  obtener:id=>apiGet(`/proveedores/${id}`),
  crear:d=>apiPost("/proveedores",d),
  actualizar:(id,d)=>apiPut(`/proveedores/${id}`,d),
};
export const conductoresAPI={
  listar:(f={})=>apiGet("/conductores?"+new URLSearchParams(limpiar(f))),
  obtener:id=>apiGet(`/conductores/${id}`),
  crear:d=>apiPost("/conductores",d),
  actualizar:(id,d)=>apiPut(`/conductores/${id}`,d),
};
export const lotesAPI={
  listar:(f={})=>apiGet("/lotes?"+new URLSearchParams(limpiar(f))),
  activo:()=>apiGet("/lotes/activo"),
  obtener:id=>apiGet(`/lotes/${id}`),
  resumen:id=>apiGet(`/lotes/${id}/resumen`),
  crear:d=>apiPost("/lotes",d),
  actualizar:(id,d)=>apiPut(`/lotes/${id}`,d),
  cambiarEstado:(id,e)=>apiPut(`/lotes/${id}/estado`,{estado:e}),
};
export const pesajesAPI={
  listar:(f={})=>apiGet("/pesajes?"+new URLSearchParams(limpiar(f))),
  tipos:()=>apiGet("/pesajes/tipos"),
  calibres:tid=>apiGet("/pesajes/calibres"+(tid?`?producto_tipo_id=${tid}`:"")),
  lineas:()=>apiGet("/pesajes/lineas"),
  crear:d=>apiPost("/pesajes",d),
  actualizar:(id,d)=>apiPut(`/pesajes/${id}`,d),
  eliminar:id=>apiDelete(`/pesajes/${id}`),
};
export const cajasAPI={
  generarLote:(lote_id,d)=>apiPost(`/cajas/lote/${lote_id}/generar`,d),
  listarLote:lote_id=>apiGet(`/cajas/lote/${lote_id}`),
  listarCarro:carro_id=>apiGet(`/cajas/carro/${carro_id}`),
  validarCarro:(carro_id,lote_id_nuevo)=>apiPost("/cajas/validar-carro",{carro_id,lote_id_nuevo}),
};
export const turnosAPI={
  listar:(f={})=>apiGet("/turnos?"+new URLSearchParams(limpiar(f))),
  activo:()=>apiGet("/turnos/activo"),
  abrir:d=>apiPost("/turnos",d),
  cerrar:(id,d)=>apiPut(`/turnos/${id}/cerrar`,d),
};
export const tunelesAPI={
  listar:()=>apiGet("/tuneles"),
  carros:(f={})=>apiGet("/tuneles/carros?"+new URLSearchParams(limpiar(f))),
  cajas:(f={})=>apiGet("/tuneles/cajas?"+new URLSearchParams(limpiar(f))),
  carrosDeTunel:id=>apiGet(`/tuneles/${id}/carros`),
  estadoCarros:()=>apiGet("/tuneles/estado-carros"),
  crearCarro:d=>apiPost("/tuneles/carros",d),
  editarCarro:(id,d)=>apiPut(`/tuneles/carros/${id}`,d),
  marcarListo:(id,temps={})=>apiPut(`/tuneles/carros/${id}/listo`,temps),
  ingresarCarro:(id,d)=>apiPut(`/tuneles/carros/${id}/ingresar`,d),
  sacarCarro:(id,d)=>apiPut(`/tuneles/carros/${id}/salir`,d),
  asignarCaja:(id,d)=>apiPut(`/tuneles/cajas/${id}/asignar`,d),
  etiquetaCarro:id=>apiGet(`/tuneles/carros/${id}/etiqueta`),
  etiquetaZebra:id=>apiGet(`/tuneles/cajas/${id}/etiqueta-zebra`),
  // Flujo simplificado
  carrosVaciosDeTunel:tunel_id=>apiGet(`/tuneles/${tunel_id}/carros-vacios`),
  cajasLibresDeLote:lote_id=>apiGet(`/tuneles/lote/${lote_id}/cajas-libres`),
  asignarCajasAlCarro:(carro_id,d)=>apiPost(`/tuneles/carros/${carro_id}/asignar-cajas`,d),
  congelarCarro:(carro_id,d)=>apiPost(`/tuneles/carros/${carro_id}/congelar`,d),
  etiquetasZebraCarro:carro_id=>apiGet(`/tuneles/carros/${carro_id}/etiquetas-zebra`),
  etiquetasZebraLote:lote_id=>apiGet(`/tuneles/lotes/${lote_id}/etiquetas-zebra`),
  etiquetaCaja:id=>apiGet(`/tuneles/cajas/${id}/etiqueta`),
  exportarExcel:(f={})=>apiGet("/tuneles/exportar/carros?"+new URLSearchParams(limpiar(f))).then(b=>descargar(b,`carros-cajas-${hoy()}.xlsx`)),
};
export const inventarioAPI={
  resumenCarro:carro_id=>apiGet(`/inventario/carro/${carro_id}/resumen`),
  listar:(f={})=>apiGet("/inventario?"+new URLSearchParams(limpiar(f))),
  movimientos:(f={})=>apiGet("/inventario/movimientos?"+new URLSearchParams(limpiar(f))),
  crear:d=>apiPost("/inventario",d),
  registrarMovimiento:(id,d)=>apiPost(`/inventario/${id}/movimiento`,d),
  ajustar:(id,d)=>apiPut(`/inventario/${id}`,d),
};
export const configuracionAPI={
  productos:()=>apiGet("/configuracion/productos"),
  calibres:()=>apiGet("/configuracion/calibres"),
  lineas:()=>apiGet("/configuracion/lineas"),
  tuneles:()=>apiGet("/configuracion/tuneles"),
  crearProducto:d=>apiPost("/configuracion/productos",d),
  editarProducto:(id,d)=>apiPut(`/configuracion/productos/${id}`,d),
  crearCalibre:d=>apiPost("/configuracion/calibres",d),
  editarCalibre:(id,d)=>apiPut(`/configuracion/calibres/${id}`,d),
  crearLinea:d=>apiPost("/configuracion/lineas",d),
  editarLinea:(id,d)=>apiPut(`/configuracion/lineas/${id}`,d),
  crearTunel:d=>apiPost("/configuracion/tuneles",d),
  editarTunel:(id,d)=>apiPut(`/configuracion/tuneles/${id}`,d),
};
export const despachosAPI={
  listar:(f={})=>apiGet("/despachos?"+new URLSearchParams(limpiar(f))),
  obtener:id=>apiGet(`/despachos/${id}`),
  clientes:()=>apiGet("/despachos/clientes"),
  crearCliente:d=>apiPost("/despachos/clientes",d),
  crear:d=>apiPost("/despachos",d),
  guiaPDF:id=>apiGet(`/despachos/${id}/pdf`).then(b=>descargar(b,`Guia-Despacho-${hoy()}.pdf`)),
};
export const dashboardAPI={stats:()=>apiGet("/dashboard")};
export const reportesAPI={
  pdf:id=>apiGet(`/reportes/produccion/${id}`).then(b=>descargar(b,`Reporte-Lote-${hoy()}.pdf`)),
  excel:id=>apiGet(`/reportes/produccion/${id}/excel`).then(b=>descargar(b,`Reporte-Lote-${hoy()}.xlsx`)),
  comparacion:(ids)=>apiGet(`/reportes/comparacion?lotes=${ids.join(',')}`),
  porLinea:(f={})=>apiGet('/reportes/por-linea?'+new URLSearchParams(limpiar(f))),
  porTurno:(f={})=>apiGet('/reportes/por-turno?'+new URLSearchParams(limpiar(f))),
};
export const trazabilidadAPI={
  buscar:(f={})=>apiGet("/trazabilidad/lotes?"+new URLSearchParams(limpiar(f))),
  detalle:id=>apiGet(`/trazabilidad/lotes/${id}`),
};
export const auditAPI={listar:(f={})=>apiGet("/audit?"+new URLSearchParams(limpiar(f)))};
export const recepcionAPI={
  listarArchivos:lote_id=>apiGet(`/recepcion/${lote_id}/archivos`),
  subirArchivo:(lote_id,formData)=>{
    // Usar fetch directo porque es multipart
    const t=_token;
    return fetch(`/api/recepcion/${lote_id}/archivos`,{
      method:"POST",
      headers:t?{"Authorization":`Bearer ${t}`}:{},
      body:formData,
    }).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Error");return d;});
  },
  // Retorna una promesa con ObjectURL (incluye token de auth)
  verArchivo:id=>{
    const t=_token;
    return fetch(`/api/recepcion/archivos/${id}/ver`,{
      headers:t?{"Authorization":`Bearer ${t}`}:{},
    }).then(async r=>{
      if(!r.ok) throw new Error("Archivo no encontrado");
      const blob=await r.blob();
      return URL.createObjectURL(blob);
    });
  },
  descargarArchivo:id=>apiGet(`/recepcion/archivos/${id}/descargar`).then(b=>descargar(b,"archivo")),
  eliminarArchivo:id=>apiDelete(`/recepcion/archivos/${id}`),
  imprimir:lote_id=>apiGet(`/recepcion/${lote_id}/imprimir`),
};

export const haccpAPI={
  listar:(f={})=>apiGet("/haccp?"+new URLSearchParams(limpiar(f))),
  obtener:id=>apiGet(`/haccp/${id}`),
  crear:d=>apiPost("/haccp",d),
  actualizar:(id,d)=>apiPut(`/haccp/${id}`,d),
  eliminar:id=>apiDelete(`/haccp/${id}`),
  imprimir:id=>apiGet(`/haccp/${id}/imprimir`),
};
