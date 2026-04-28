import { useState, useEffect } from "react";
import { Plus, Edit, ChevronRight, FileText, Download, Package, CheckCircle, Clock,
         Truck, Building2, Thermometer, AlertCircle, Image, File, Eye, Paperclip,
         XCircle, AlertOctagon, Calendar, Filter } from "lucide-react";
import { lotesAPI, tunelesAPI, reportesAPI, proveedoresAPI, conductoresAPI, recepcionAPI } from "../api/client";
import { C, iS, fmt, fmtFecha } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";

const ESTADOS = {
  pendiente:  {label:"Pendiente",  bg:"#f1f5f9",text:"#64748b"},
  en_proceso: {label:"En Proceso", bg:"#dcfce7",text:"#15803d"},
  cerrado:    {label:"Cerrado",    bg:"#dbeafe",text:"#1d4ed8"},
  rechazado:  {label:"Rechazado",  bg:"#fef2f2",text:"#dc2626"},
};

const ESTADOS_CARGA = ["Fresco","Con hielo","Congelado","Descongelado","Otro"];

// Modal con overlay correcto
const ModalLote = ({ form, set, onClose, onGuardar, esNuevo }) => {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,26,74,.72)",backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:"white",borderRadius:16,width:"100%",maxWidth:500,padding:0,boxShadow:"0 20px 60px rgba(0,0,0,.3)",overflow:"hidden",animation:"popIn .22s cubic-bezier(.34,1.56,.64,1)"}}>
        
        <div style={{padding:"16px 20px",background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:"white",fontWeight:800,fontSize:14}}>Registrar Lote</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>CÓDIGO LOTE *</label>
            <input value={form.codigo||""} onChange={e=>set("codigo",e.target.value)} placeholder="JIB7524" style={iS}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>FECHA *</label>
            <input type="date" value={form.fecha_ingreso||""} onChange={e=>set("fecha_ingreso",e.target.value)} style={iS}/>
          </div>
          <div style={{gridColumn:"span 2"}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>KILOS BRUTOS *</label>
            <input type="number" value={form.kilos_brutos||""} onChange={e=>set("kilos_brutos",e.target.value)} placeholder="1500" style={iS}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>TEMPERATURA °C</label>
            <input type="number" step="0.1" value={form.temperatura_carga||""} onChange={e=>set("temperatura_carga",e.target.value)} placeholder="-2.5" style={iS}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>ESTADO CARGA</label>
            <select value={form.estado_carga||""} onChange={e=>set("estado_carga",e.target.value)} style={iS}>
              <option value="">Seleccionar</option>
              {["Fresco","Con hielo","Congelado","Descongelado","Otro"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"span 2"}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,marginBottom:4}}>OBSERVACIÓN</label>
            <textarea rows={2} value={form.observacion||""} onChange={e=>set("observacion",e.target.value)} style={{...iS,resize:"none"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:10,padding:"12px 20px",borderTop:`1px solid ${C.border}`,background:C.blue50}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:8,color:C.textSub,fontWeight:600,cursor:"pointer",fontSize:12}}>Cancelar</button>
          <button onClick={onGuardar} disabled={!form.codigo||!form.kilos_brutos} style={{flex:1,padding:"10px",background:(!form.codigo||!form.kilos_brutos)?C.textMut:C.green600,border:"none",borderRadius:8,color:"white",fontWeight:700,cursor:"pointer",fontSize:12}}>Registrar</button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

export default function Lotes({ onToast, onVerPesajes }) {
  const { esJefe } = useAuth();
  const { isMobile } = useResponsive();
  const [lotes,       setLotes]       = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [modal,       setModal]       = useState(null);
  const [esNuevo,     setEsNuevo]     = useState(true);
  const [form,        setForm]        = useState({});
  const [filtros,     setFiltros]     = useState({estado:"",codigo:"",fecha_desde:"",fecha_hasta:""});
  const [modalRechazo, setModalRechazo] = useState(null); // lote object
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [archivosPanel, setArchivosPanel] = useState(null); // lote_id expandido
  const [archivosLote,  setArchivosLote]  = useState([]);
  const [loadingArch,   setLoadingArch]   = useState(false);

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const cargar = () => {
    setCargando(true);
    lotesAPI.listar(filtros).then(setLotes).catch(e=>onToast(e.message,"error")).finally(()=>setCargando(false));
  };

  useEffect(()=>{
    cargar();
    proveedoresAPI.listar({activo:"true"}).then(setProveedores).catch(()=>{});
    conductoresAPI.listar({activo:"true"}).then(setConductores).catch(()=>{});
  },[filtros]);

  const abrirNuevo = () => {
    setEsNuevo(true);
    setForm({
      codigo:"", fecha_ingreso:new Date().toISOString().slice(0,10),
      kilos_brutos:"", guia_despacho:"", proveedor_guia:"",
      factura_numero:"", proveedor_factura:"", folio_abastecimiento:"", folio_produccion:"",
      proveedor_id:"", conductor_id:"", patente_camion:"", empresa_transporte:"",
      hora_llegada:"", hora_inicio_descarga:"", hora_fin_descarga:"",
      temperatura_carga:"", estado_carga:"", observacion_recepcion:"", observacion:""
    });
    setModal("form");
  };

  const abrirEditar = (l) => {
    setEsNuevo(false);
    setForm({
      ...l,
      fecha_ingreso: l.fecha_ingreso?.slice(0,10)||"",
      hora_llegada: l.hora_llegada ? new Date(l.hora_llegada).toISOString().slice(0,16) : "",
      hora_inicio_descarga: l.hora_inicio_descarga ? new Date(l.hora_inicio_descarga).toISOString().slice(0,16) : "",
      hora_fin_descarga: l.hora_fin_descarga ? new Date(l.hora_fin_descarga).toISOString().slice(0,16) : "",
    });
    setModal("form");
  };

  const guardar = async () => {
    try {
      if (esNuevo) await lotesAPI.crear(form);
      else         await lotesAPI.actualizar(form.id, form);
      onToast(esNuevo?"Lote registrado correctamente":"Lote actualizado");
      setModal(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const imprimirEtiquetasLote = async (lote_id, codigo) => {
    try {
      onToast("Generando etiquetas...");
      const resultado = await tunelesAPI.etiquetasZebraLote(lote_id);
      if (typeof resultado === "string") {
        const w = window.open("","_blank","width=900,height=700");
        w.document.write(resultado); w.document.close();
      }
    } catch(e){ onToast(e.message,"error"); }
  };

  const toggleArchivosLote = async (lote_id) => {
    if (archivosPanel === lote_id) { setArchivosPanel(null); return; }
    setLoadingArch(true);
    setArchivosPanel(lote_id);
    try {
      const data = await recepcionAPI.listarArchivos(lote_id);
      setArchivosLote(data);
    } catch(e){ onToast(e.message,"error"); setArchivosPanel(null); }
    setLoadingArch(false);
  };

  const verArchivoLote = async (id) => {
    try {
      const url = await recepcionAPI.verArchivo(id);
      window.open(url,"_blank");
    } catch(e){ onToast(e.message,"error"); }
  };

  const rechazarLote = async () => {
    if (!motivoRechazo.trim()) return onToast("Ingresa el motivo de rechazo","error");
    try {
      await lotesAPI.rechazar(modalRechazo.id, motivoRechazo.trim());
      onToast("Lote rechazado");
      setModalRechazo(null); setMotivoRechazo(""); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const cambiarEstado = async (lote,estado) => {
    try {
      await lotesAPI.cambiarEstado(lote.id,estado);
      onToast(estado==="en_proceso"?"Lote iniciado":"Lote cerrado");
      cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Filtros */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtros.codigo} onChange={e=>setFiltros(p=>({...p,codigo:e.target.value}))} placeholder="Buscar lote..." style={{...iS,flex:1,minWidth:140}}/>
        <select value={filtros.estado} onChange={e=>setFiltros(p=>({...p,estado:e.target.value}))} style={{...iS,width:"auto",cursor:"pointer"}}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En Proceso</option>
          <option value="cerrado">Cerrado</option>
          <option value="rechazado">⛔ Rechazado</option>
        </select>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <Calendar size={14} color={C.textMut}/>
          <input type="date" value={filtros.fecha_desde} onChange={e=>setFiltros(p=>({...p,fecha_desde:e.target.value}))}
            title="Desde" style={{...iS,width:140,fontSize:12}} placeholder="Desde"/>
          <span style={{color:C.textMut,fontSize:12}}>—</span>
          <input type="date" value={filtros.fecha_hasta} onChange={e=>setFiltros(p=>({...p,fecha_hasta:e.target.value}))}
            title="Hasta" style={{...iS,width:140,fontSize:12}} placeholder="Hasta"/>
          {(filtros.fecha_desde||filtros.fecha_hasta)&&(
            <button onClick={()=>setFiltros(p=>({...p,fecha_desde:"",fecha_hasta:""}))}
              title="Limpiar fechas"
              style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",padding:"2px",display:"flex",alignItems:"center"}}>
              <XCircle size={14}/>
            </button>
          )}
        </div>
        {esJefe&&<button onClick={abrirNuevo} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
          <Plus size={14}/> Nuevo Lote
        </button>}
      </div>

      {/* Lista */}
      {cargando ? <p style={{textAlign:"center",color:C.textMut,padding:40}}>Cargando...</p>
      : lotes.length===0 ? <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:60,textAlign:"center"}}><Package size={36} color={C.textMut} style={{margin:"0 auto 10px"}}/><p style={{fontWeight:700,color:C.textSub}}>Sin lotes registrados</p></div>
      : lotes.map((l,idx)=>{
        const e=ESTADOS[l.estado]||ESTADOS.pendiente;
        const kb=parseFloat(l.kilos_brutos||0);
        const kp=parseFloat(l.kilos_producidos||0);
        return (
          <div key={l.id} style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.05)",animation:`fadeUp .3s ease ${idx*40}ms both`}}>
            {/* Cabecera */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:46,height:46,borderRadius:13,background:C.blue50,border:`1px solid ${C.blue100}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Package size={20} color={C.blue600}/>
                </div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <h3 style={{fontWeight:800,fontSize:17,color:C.blue900}}>{l.codigo}</h3>
                    <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:e.bg,color:e.text}}>{e.label}</span>
                  </div>
                  <p style={{fontSize:12,color:C.textMut}}>{fmtFecha(l.fecha_ingreso)}</p>
                </div>
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {[{lb:"Kg Brutos",v:`${fmt(l.kilos_brutos)} kg`},{lb:"Producidos",v:`${fmt(l.kilos_producidos)} kg`},{lb:"Rend.",v:kb>0?`${((kp/kb)*100).toFixed(1)}%`:"—"},{lb:"Cajas",v:l.total_cajas||0}].map(({lb,v})=>(
                  <div key={lb} style={{textAlign:"center",minWidth:60}}>
                    <p style={{fontSize:9,color:C.textMut,fontWeight:700,textTransform:"uppercase"}}>{lb}</p>
                    <p style={{fontSize:15,fontWeight:800,color:C.blue900,marginTop:1}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Motivo de rechazo */}
            {l.estado==="rechazado"&&l.motivo_rechazo&&(
              <div style={{background:"#fef2f2",borderRadius:10,padding:"10px 14px",border:"1.5px solid #fca5a5",marginBottom:8,display:"flex",gap:8,alignItems:"flex-start"}}>
                <AlertOctagon size={14} color="#dc2626" style={{flexShrink:0,marginTop:1}}/>
                <div>
                  <p style={{fontSize:10,fontWeight:700,color:"#dc2626",textTransform:"uppercase",marginBottom:2}}>Motivo de Rechazo</p>
                  <p style={{fontSize:12,color:"#7f1d1d"}}>{l.motivo_rechazo}</p>
                </div>
              </div>
            )}
            {/* Info proveedor/conductor */}
            <div style={{display:"flex",gap:14,flexWrap:"wrap",padding:"8px 0",borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,marginBottom:10}}>
              {l.proveedor_nombre&&(
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSub}}>
                  <Building2 size={12} color={C.blue500}/>
                  <span style={{fontWeight:600,color:C.text}}>{l.proveedor_nombre}</span>
                  <span style={{color:C.textMut}}>·</span>
                  <span style={{fontFamily:"monospace",fontSize:11}}>{l.proveedor_rut}</span>
                </div>
              )}
              {l.conductor_nombre&&(
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textSub}}>
                  <Truck size={12} color={C.blue500}/>
                  <span style={{fontWeight:600,color:C.text}}>{l.conductor_nombre}</span>
                  {l.patente_camion&&<span style={{background:C.blue900,color:"white",borderRadius:5,padding:"1px 7px",fontFamily:"monospace",fontSize:11,fontWeight:700}}>{l.patente_camion}</span>}
                </div>
              )}
              {l.guia_despacho&&<span style={{fontSize:11,color:C.textMut}}>Guía: <strong style={{color:C.text}}>{l.guia_despacho}</strong></span>}
              {l.factura_numero&&<span style={{fontSize:11,color:C.textMut}}>Factura: <strong style={{color:C.text}}>{l.factura_numero}</strong></span>}
            </div>

            {/* Acciones */}
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <button onClick={()=>toggleArchivosLote(l.id)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",
                  background:archivosPanel===l.id?"#ede9fe":"#f5f3ff",
                  border:`1px solid ${archivosPanel===l.id?"#a78bfa":"#ddd6fe"}`,
                  borderRadius:9,color:"#7c3aed",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <Paperclip size={12}/> Archivos
              </button>
              <button onClick={()=>imprimirEtiquetasLote(l.id, l.codigo)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",
                background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:9,
                color:"#92400e",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
              title="Imprimir todas las etiquetas Zebra de este lote">
              🦓 Etiquetas
            </button>
            <button onClick={()=>onVerPesajes(l)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:9,color:C.blue700,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <ChevronRight size={12}/> Ver Pesajes
              </button>
              {esJefe&&l.estado!=="cerrado"&&l.estado!=="rechazado"&&<button onClick={()=>abrirEditar(l)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:9,color:C.blue700,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Edit size={11}/> Editar</button>}
              {esJefe&&l.estado==="pendiente"  &&<button onClick={()=>cambiarEstado(l,"en_proceso")} style={{padding:"7px 12px",background:"#dcfce7",border:"1px solid #a7f3d0",borderRadius:9,color:"#15803d",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><CheckCircle size={11}/>Iniciar</button>}
              {esJefe&&l.estado==="en_proceso" &&<button onClick={()=>cambiarEstado(l,"cerrado")}    style={{padding:"7px 12px",background:"#dbeafe",border:"1px solid #93c5fd",borderRadius:9,color:"#1d4ed8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><Clock size={11}/>Cerrar</button>}
              {esJefe&&(l.estado==="pendiente"||l.estado==="en_proceso")&&(
                <button onClick={()=>{setModalRechazo(l);setMotivoRechazo("");}}
                  style={{padding:"7px 12px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:9,color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  <XCircle size={11}/>Rechazar
                </button>
              )}
              {l.estado==="cerrado"&&<>
                <button onClick={async()=>{try{onToast("Generando PDF...","info");await reportesAPI.pdf(l.id);onToast("PDF descargado");}catch(e){onToast(e.message,"error");}}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:9,color:"#dc2626",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}><FileText size={11}/> PDF</button>
                <button onClick={async()=>{try{onToast("Generando Excel...","info");await reportesAPI.excel(l.id);onToast("Excel descargado");}catch(e){onToast(e.message,"error");}}} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:9,color:"#15803d",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}><Download size={11}/> Excel</button>
              </>}
            </div>

            {/* Panel de archivos adjuntos */}
            {archivosPanel===l.id&&(
              <div style={{marginTop:12,borderTop:`1px solid #ede9fe`,paddingTop:12}}>
                <p style={{fontWeight:700,fontSize:12,color:"#7c3aed",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  <Paperclip size={13}/> Archivos adjuntos a este lote
                </p>
                {loadingArch&&<p style={{fontSize:12,color:C.textMut,textAlign:"center",padding:"12px 0"}}>Cargando...</p>}
                {!loadingArch&&archivosLote.length===0&&(
                  <p style={{fontSize:12,color:C.textMut,textAlign:"center",padding:"12px 0"}}>Sin archivos adjuntos</p>
                )}
                {!loadingArch&&archivosLote.length>0&&(
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {archivosLote.map(a=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",
                        background:"#faf5ff",border:"1px solid #ede9fe",borderRadius:8}}>
                        {a.tipo_mime?.includes("image")
                          ? <Image size={14} color="#7c3aed"/>
                          : <File size={14} color="#7c3aed"/>}
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontWeight:600,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre_original}</p>
                          <p style={{fontSize:10,color:C.textMut,textTransform:"capitalize"}}>{a.categoria}{a.descripcion?" · "+a.descripcion:""} · {a.subido_por_nombre||"—"}</p>
                        </div>
                        <div style={{display:"flex",gap:5,flexShrink:0}}>
                          {a.tipo_mime?.includes("image")&&(
                            <button onClick={()=>verArchivoLote(a.id)}
                              style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",
                                background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:6,
                                color:"#15803d",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                              <Eye size={10}/> Ver
                            </button>
                          )}
                          <button onClick={()=>recepcionAPI.descargarArchivo(a.id).catch(e=>onToast(e.message,"error"))}
                            style={{display:"flex",alignItems:"center",gap:3,padding:"4px 8px",
                              background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,
                              color:"#1d4ed8",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                            <Download size={10}/> Bajar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal formulario */}
      {modal==="form"&&(
        <ModalLote
          form={form} set={set} onClose={()=>setModal(null)}
          onGuardar={guardar} esNuevo={esNuevo}
          proveedores={proveedores} conductores={conductores}
        />
      )}

      {/* Modal rechazo de lote */}
      {modalRechazo&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setModalRechazo(null);setMotivoRechazo("");}}}
          style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(10,26,74,.72)",backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"white",borderRadius:16,width:"100%",maxWidth:460,padding:0,
              boxShadow:"0 20px 60px rgba(0,0,0,.3)",overflow:"hidden",animation:"popIn .22s cubic-bezier(.34,1.56,.64,1)"}}>
            <div style={{padding:"16px 20px",background:"linear-gradient(135deg,#dc2626,#b91c1c)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <AlertOctagon size={16} color="white"/>
                <div>
                  <p style={{color:"white",fontWeight:800,fontSize:14}}>Rechazar Lote</p>
                  <p style={{color:"rgba(255,255,255,.7)",fontSize:11}}>{modalRechazo.codigo} · {modalRechazo.estado}</p>
                </div>
              </div>
              <button onClick={()=>{setModalRechazo(null);setMotivoRechazo("");}} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer",padding:0}}>✕</button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#fef2f2",borderRadius:10,padding:12,border:"1px solid #fca5a5"}}>
                <p style={{fontSize:12,color:"#dc2626",fontWeight:600}}>⚠ Se registrará el lote como RECHAZADO. Queda en el sistema con su motivo.</p>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>
                  Motivo de Rechazo *
                </label>
                <textarea rows={4} value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)}
                  placeholder="Describe el motivo (ej: temperatura fuera de rango, documentación incompleta, producto en mal estado...)"
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #fca5a5",fontSize:13,
                    resize:"none",fontFamily:"inherit",outline:"none",boxSizing:"border-box",background:"#fff5f5"}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setModalRechazo(null);setMotivoRechazo("");}}
                  style={{flex:1,padding:"10px",background:"white",border:"1px solid #e2e8f0",borderRadius:8,color:"#64748b",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  Cancelar
                </button>
                <button onClick={rechazarLote} disabled={!motivoRechazo.trim()}
                  style={{flex:2,padding:"10px",background:motivoRechazo.trim()?"#dc2626":"#e2e8f0",border:"none",borderRadius:8,
                    color:"white",fontWeight:700,cursor:motivoRechazo.trim()?"pointer":"not-allowed",fontFamily:"inherit",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <XCircle size={13}/> Confirmar Rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}