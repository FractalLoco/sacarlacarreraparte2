import { useState, useEffect, useRef } from "react";
import { lotesAPI, proveedoresAPI, conductoresAPI, recepcionAPI } from "../api/client";
import { C, iS, fmt, fmtFecha } from "../constants/theme";
import {
  Truck, FileText, Thermometer, CheckSquare, Square,
  ChevronRight, Save, Printer, AlertTriangle, CheckCircle,
  Upload, Download, Eye, Trash2, Image, File, RefreshCw,
  History, Package
} from "lucide-react";

const DOCS_CHECKLIST = [
  { id:"guia_despacho",    label:"Guía de despacho del proveedor" },
  { id:"guia_transporte",  label:"Guía de transporte / carta de porte" },
  { id:"certificado",      label:"Certificado de calidad / origen" },
  { id:"registro_sanidad", label:"Registro sanitario" },
  { id:"planilla_pesca",   label:"Planilla de pesca / declaración de desembarque" },
  { id:"factura",          label:"Factura o documento tributario" },
];

const ESTADO_CARGA = ["Óptimo","Bueno","Regular","Con observaciones","Rechazado"];
const CATEGORIAS   = ["documento","foto","guia","factura","otro"];

const CAMPO = ({label,children,req=false}) => (
  <div>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,
      textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>
      {label}{req&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);

export default function Recepcion({ onToast }) {
  const [proveedores, setProv] = useState([]);
  const [conductores, setCond] = useState([]);
  const [lotes,       setLotes]= useState([]);
  const [vistaActual, setVista]= useState("wizard"); // "wizard" | "historial"
  const [paso,        setPaso] = useState(1);
  const [loteSelHist, setLoteH]= useState(null);
  const [archivos,    setArch] = useState([]);
  const [subiendo,    setSub]  = useState(false);
  const fileRef = useRef();
  // Cola de fotos para el Paso 3 (antes de que exista el lote)
  const [fotasCola, setFotosCola] = useState([]);
  const [fotoTemp,  setFotoTemp]  = useState({archivo:null,descripcion:""});
  const fotoRef = useRef();

  const formInit = {
    lote_id:"", es_nuevo:true,
    codigo:"",kilos_brutos:"",guia_despacho:"",proveedor_id:"",factura_numero:"",
    conductor_id:"",patente_camion:"",patente_rampla:"",empresa_transporte:"",
    hora_llegada:new Date().toISOString().slice(0,16),
    temperatura_carga:"",estado_carga:"Bueno",
    hora_inicio_descarga:"",hora_fin_descarga:"",observacion_recepcion:"",
    docs:{},recibido_por_nombre:"",firma_conforme:false,
  };
  const [form, setForm]     = useState(formInit);
  const [archNuevo,setAN]   = useState({archivo:null,categoria:"documento",descripcion:""});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  useEffect(()=>{
    proveedoresAPI.listar().then(setProv).catch(()=>{});
    conductoresAPI.listar({activo:"true"}).then(setCond).catch(()=>{});
    lotesAPI.listar({}).then(setLotes).catch(()=>{});
  },[]);

  const cargarArchivos = async (lote_id) => {
    if (!lote_id) return;
    try { setArch(await recepcionAPI.listarArchivos(lote_id)); }
    catch(e){ onToast(e.message,"error"); }
  };

  const toggleDoc = (id) => setForm(p=>({...p,docs:{...p.docs,[id]:!p.docs[id]}}));
  const conductorSel = conductores.find(c=>c.id===+form.conductor_id);

  const agregarFotoACola = () => {
    if (!fotoTemp.archivo) return;
    setFotosCola(p=>[...p,{...fotoTemp,id:Date.now()}]);
    setFotoTemp({archivo:null,descripcion:""});
    if (fotoRef.current) fotoRef.current.value="";
  };
  const quitarFotoACola = (id) => setFotosCola(p=>p.filter(f=>f.id!==id));

  const guardar = async () => {
    try {
      let lote_id = form.lote_id;
      const payload = {
        conductor_id:      form.conductor_id||null,
        patente_camion:    form.patente_camion,
        patente_rampla:    form.patente_rampla||null,
        empresa_transporte:form.empresa_transporte||null,
        hora_llegada:      form.hora_llegada,
        hora_inicio_descarga:form.hora_inicio_descarga||null,
        hora_fin_descarga:   form.hora_fin_descarga||null,
        temperatura_carga: form.temperatura_carga?parseFloat(form.temperatura_carga):null,
        estado_carga:      form.estado_carga,
        observacion_recepcion:form.observacion_recepcion||null,
      };
      if (form.es_nuevo) {
        const nuevo = await lotesAPI.crear({
          ...payload,
          codigo:       form.codigo,
          kilos_brutos: parseFloat(form.kilos_brutos),
          guia_despacho:form.guia_despacho||null,
          factura_numero:form.factura_numero||null,
          proveedor_id: form.proveedor_id||null,
          estado:"pendiente",
        });
        lote_id = nuevo.id;
      } else {
        await lotesAPI.actualizar(form.lote_id, payload);
      }
      set("lote_id", lote_id);
      // Subir fotos que estaban en cola desde el Paso 3
      if (fotasCola.length > 0) {
        for (const foto of fotasCola) {
          try {
            const fd = new FormData();
            fd.append("archivo",    foto.archivo);
            fd.append("categoria",  "foto");
            fd.append("descripcion",foto.descripcion||"Foto recepción");
            await recepcionAPI.subirArchivo(lote_id, fd);
          } catch(err){ console.warn("Error subiendo foto:", err.message); }
        }
        setFotosCola([]);
      }
      onToast("Recepción guardada ✓");
      await cargarArchivos(lote_id);
      setPaso(5);
    } catch(e){ onToast(e.message,"error"); }
  };

  const subirArchivo = async (lote_id_override=null) => {
    const lid = lote_id_override || form.lote_id;
    if (!archNuevo.archivo || !lid) return onToast("Primero guarda la recepción","error");
    setSub(true);
    try {
      const fd = new FormData();
      fd.append("archivo",    archNuevo.archivo);
      fd.append("categoria",  archNuevo.categoria);
      fd.append("descripcion",archNuevo.descripcion);
      await recepcionAPI.subirArchivo(lid, fd);
      onToast("Archivo subido ✓");
      setAN({archivo:null,categoria:"documento",descripcion:""});
      if (fileRef.current) fileRef.current.value="";
      await cargarArchivos(lid);
    } catch(e){ onToast(e.message,"error"); }
    setSub(false);
  };

  const eliminarArchivo = async (id) => {
    try { await recepcionAPI.eliminarArchivo(id); onToast("Eliminado"); await cargarArchivos(form.lote_id||loteSelHist); }
    catch(e){ onToast(e.message,"error"); }
  };

  const imprimirRecepcion = async (lote_id) => {
    try {
      const html = await recepcionAPI.imprimir(lote_id||form.lote_id);
      const w = window.open("","_blank","width=900,height=700");
      w.document.write(html); w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  const verArchivo = async (id,nombre) => {
    try {
      const url = await recepcionAPI.verArchivo(id);
      window.open(url,"_blank");
    } catch(e){ onToast(e.message,"error"); }
  };

  const iconoArchivo = (mime) => {
    if (mime?.includes("image")) return <Image size={14} color={C.blue500}/>;
    return <File size={14} color={C.blue500}/>;
  };

  const pct = (paso/4)*100;

  // ─── HISTORIAL ──────────────────────────────────────────────
  if (vistaActual==="historial") {
    return (
      <div style={{maxWidth:900,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:12}}>
          <History size={20} color="white"/>
          <div style={{flex:1}}>
            <p style={{color:"white",fontWeight:800,fontSize:16}}>Historial de Recepciones</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:12}}>Camiones recepcionados, documentos y archivos adjuntos</p>
          </div>
          <button onClick={()=>{setVista("wizard");setLoteH(null);setArch([]);}}
            style={{padding:"8px 16px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,color:"white",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            + Nueva Recepción
          </button>
        </div>

        {lotes.length===0&&<p style={{textAlign:"center",color:C.textMut,padding:"40px 0"}}>Sin recepciones registradas</p>}

        {lotes.map(l=>(
          <div key={l.id} style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`}}>
            <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer",background:loteSelHist===l.id?C.blue50:"white",borderRadius:loteSelHist===l.id?"14px 14px 0 0":"14px"}}
              onClick={async()=>{
                if(loteSelHist===l.id){setLoteH(null);setArch([]);}
                else{setLoteH(l.id);await cargarArchivos(l.id);}
              }}>
              <Package size={16} color={C.blue600}/>
              <div style={{flex:1}}>
                <p style={{fontWeight:800,fontSize:14,color:C.blue900}}>{l.codigo}</p>
                <p style={{fontSize:11,color:C.textMut}}>{fmtFecha(l.fecha_ingreso)} · {fmt(l.kilos_brutos)} kg · {l.patente_camion||"Sin patente"}{l.patente_rampla?" / Rampla: "+l.patente_rampla:""}</p>
              </div>
              <span style={{padding:"2px 10px",borderRadius:20,fontSize:10,fontWeight:700,
                background:l.estado==="en_proceso"?"#dcfce7":l.estado==="cerrado"?"#f1f5f9":C.blue50,
                color:l.estado==="en_proceso"?"#15803d":l.estado==="cerrado"?"#64748b":C.blue700}}>
                {l.estado}
              </span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={e=>{e.stopPropagation();imprimirRecepcion(l.id);}}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  <Printer size={11}/> Imprimir
                </button>
              </div>
            </div>

            {loteSelHist===l.id&&(
              <div style={{padding:16,borderTop:`1px solid ${C.border}`}}>
                {/* Subir nuevo archivo */}
                <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:10}}>Archivos adjuntos</p>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12,padding:12,background:C.blue50,borderRadius:10,border:`1px solid ${C.blue100}`}}>
                  <input type="file" ref={fileRef}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx,.xls"
                    onChange={e=>setAN(p=>({...p,archivo:e.target.files[0]||null}))}
                    style={{flex:2,minWidth:0,...iS,padding:"6px 10px",fontSize:12}}/>
                  <select value={archNuevo.categoria} onChange={e=>setAN(p=>({...p,categoria:e.target.value}))}
                    style={{...iS,width:"auto",fontSize:12}}>
                    {CATEGORIAS.map(c=><option key={c} value={c} style={{textTransform:"capitalize"}}>{c}</option>)}
                  </select>
                  <input value={archNuevo.descripcion} onChange={e=>setAN(p=>({...p,descripcion:e.target.value}))}
                    placeholder="Descripción (opcional)" style={{...iS,flex:2,minWidth:120,fontSize:12}}/>
                  <button onClick={()=>subirArchivo(l.id)}
                    disabled={!archNuevo.archivo||subiendo}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",
                      background:archNuevo.archivo&&!subiendo?C.blue900:"#e2e8f0",
                      border:"none",borderRadius:9,color:"white",fontSize:12,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                    <Upload size={12}/>{subiendo?"Subiendo...":"Subir"}
                  </button>
                </div>

                {archivos.length===0&&<p style={{color:C.textMut,fontSize:12,textAlign:"center",padding:"20px 0"}}>Sin archivos adjuntos</p>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {archivos.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",
                      background:"white",border:`1px solid ${C.border}`,borderRadius:8}}>
                      {iconoArchivo(a.tipo_mime)}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontWeight:600,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre_original}</p>
                        <p style={{fontSize:10,color:C.textMut}}>{a.categoria} · {a.descripcion||"—"} · {fmtFecha(a.created_at)} · {a.subido_por_nombre||"—"}</p>
                      </div>
                      <div style={{display:"flex",gap:5}}>
                        {a.tipo_mime?.includes("image")&&(
                          <button onClick={()=>verArchivo(a.id,a.nombre_original)}
                            style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:6,color:"#15803d",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                            <Eye size={10}/> Ver
                          </button>
                        )}
                        <button onClick={()=>recepcionAPI.descargarArchivo(a.id).catch(e=>onToast(e.message,"error"))}
                          style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:6,color:C.blue700,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                          <Download size={10}/> Bajar
                        </button>
                        <button onClick={()=>eliminarArchivo(a.id)}
                          style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:6,color:"#dc2626",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                          <Trash2 size={10}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─── WIZARD DE NUEVA RECEPCIÓN ───────────────────────────────
  return (
    <div style={{maxWidth:800,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:16,padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <Truck size={20} color="white"/>
          <div style={{flex:1}}>
            <p style={{color:"white",fontWeight:800,fontSize:16}}>Recepción de Camión</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:12}}>Paso {Math.min(paso,4)} de 4</p>
          </div>
          <button onClick={()=>setVista("historial")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,color:"white",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            <History size={13}/> Historial
          </button>
        </div>
        <div style={{background:"rgba(255,255,255,.2)",borderRadius:8,height:5,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:"#4ade80",borderRadius:8,transition:"width .4s"}}/>
        </div>
      </div>

      {/* Indicadores de paso */}
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`}}>
          {[{n:1,l:"Lote"},{n:2,l:"Vehículo"},{n:3,l:"Recepción"},{n:4,l:"Confirmar + Archivos"}].map(({n,l})=>(
            <button key={n} onClick={()=>setPaso(n)} style={{flex:1,padding:"11px 4px",border:"none",background:paso===n?C.blue50:"white",
              borderBottom:`2px solid ${paso===n?C.blue600:"transparent"}`,
              color:paso===n?C.blue700:paso>n?"#15803d":C.textMut,
              fontWeight:paso===n?700:500,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {paso>n?"✅ ":""}{l}
            </button>
          ))}
        </div>

        {/* PASO 1 */}
        {paso===1&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <p style={{fontWeight:800,fontSize:15,color:C.blue900}}>1. Identificación del Lote</p>
            <div style={{display:"flex",gap:10,marginBottom:4}}>
              {[{v:true,l:"Lote nuevo"},{v:false,l:"Lote existente"}].map(({v,l})=>(
                <button key={String(v)} onClick={()=>set("es_nuevo",v)} style={{flex:1,padding:"10px",
                  border:`2px solid ${form.es_nuevo===v?C.blue600:C.border}`,borderRadius:10,
                  background:form.es_nuevo===v?C.blue50:"white",
                  color:form.es_nuevo===v?C.blue700:C.textSub,fontWeight:form.es_nuevo===v?700:500,
                  cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
            {form.es_nuevo?(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <CAMPO label="Código del Lote *"><input value={form.codigo} onChange={e=>set("codigo",e.target.value.toUpperCase())} placeholder="Ej: JIB20250410" style={{...iS,fontFamily:"monospace"}}/></CAMPO>
                  <CAMPO label="Kilos Brutos *"><input type="number" value={form.kilos_brutos} onChange={e=>set("kilos_brutos",e.target.value)} placeholder="8500" style={iS}/></CAMPO>
                  <CAMPO label="N° Guía Despacho"><input value={form.guia_despacho} onChange={e=>set("guia_despacho",e.target.value)} style={iS}/></CAMPO>
                  <CAMPO label="N° Factura"><input value={form.factura_numero} onChange={e=>set("factura_numero",e.target.value)} style={iS}/></CAMPO>
                </div>
                <CAMPO label="Proveedor">
                  <select value={form.proveedor_id} onChange={e=>set("proveedor_id",e.target.value)} style={iS}>
                    <option value="">— Seleccionar —</option>
                    {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.rut}</option>)}
                  </select>
                </CAMPO>
              </div>
            ):(
              <CAMPO label="Lote existente *">
                <select value={form.lote_id} onChange={e=>set("lote_id",e.target.value)} style={iS}>
                  <option value="">— Seleccionar lote —</option>
                  {lotes.map(l=><option key={l.id} value={l.id}>{l.codigo} — {fmt(l.kilos_brutos)} kg</option>)}
                </select>
              </CAMPO>
            )}
            <button onClick={()=>{
              if(form.es_nuevo&&(!form.codigo||!form.kilos_brutos))return onToast("Completa código y kilos","error");
              if(!form.es_nuevo&&!form.lote_id)return onToast("Selecciona un lote","error");
              setPaso(2);
            }} style={{marginTop:8,padding:"12px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              Siguiente: Datos del Vehículo <ChevronRight size={16}/>
            </button>
          </div>
        )}

        {/* PASO 2 */}
        {paso===2&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <p style={{fontWeight:800,fontSize:15,color:C.blue900}}>2. Vehículo y Conductor</p>
            <CAMPO label="Conductor">
              <select value={form.conductor_id} onChange={e=>{
                const c=conductores.find(x=>x.id===+e.target.value);
                set("conductor_id",e.target.value);
                if(c){set("patente_camion",c.patente_habitual||"");set("empresa_transporte",c.empresa_transporte||"");}
              }} style={iS}>
                <option value="">— Seleccionar conductor —</option>
                {conductores.map(c=><option key={c.id} value={c.id}>{c.nombre} · {c.rut}{c.empresa_transporte?" · "+c.empresa_transporte:""}</option>)}
              </select>
            </CAMPO>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <CAMPO label="Patente Camión *">
                <input value={form.patente_camion} onChange={e=>set("patente_camion",e.target.value.toUpperCase())} placeholder="ABCD12" style={{...iS,fontFamily:"monospace",letterSpacing:2}}/>
              </CAMPO>
              <CAMPO label="Patente Rampla">
                <input value={form.patente_rampla} onChange={e=>set("patente_rampla",e.target.value.toUpperCase())} placeholder="WXYZ34" style={{...iS,fontFamily:"monospace",letterSpacing:2}}/>
              </CAMPO>
              <CAMPO label="Empresa Transporte">
                <input value={form.empresa_transporte} onChange={e=>set("empresa_transporte",e.target.value)} style={iS}/>
              </CAMPO>
              <CAMPO label="Hora de Llegada *">
                <input type="datetime-local" value={form.hora_llegada} onChange={e=>set("hora_llegada",e.target.value)} style={iS}/>
              </CAMPO>
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setPaso(1)} style={{flex:1,padding:"11px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:11,color:C.blue700,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Atrás</button>
              <button onClick={()=>{if(!form.patente_camion)return onToast("Ingresa la patente","error");setPaso(3);}} style={{flex:2,padding:"11px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                Siguiente: Condiciones <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {paso===3&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <p style={{fontWeight:800,fontSize:15,color:C.blue900}}>3. Condiciones y Documentación</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <CAMPO label="Temperatura de Carga (°C) *">
                <input type="number" step="0.1" value={form.temperatura_carga} onChange={e=>set("temperatura_carga",e.target.value)} placeholder="-18.0" style={iS}/>
              </CAMPO>
              <CAMPO label="Estado de la Carga *">
                <select value={form.estado_carga} onChange={e=>set("estado_carga",e.target.value)} style={iS}>
                  {ESTADO_CARGA.map(e=><option key={e}>{e}</option>)}
                </select>
              </CAMPO>
              <CAMPO label="Inicio Descarga">
                <input type="datetime-local" value={form.hora_inicio_descarga} onChange={e=>set("hora_inicio_descarga",e.target.value)} style={iS}/>
              </CAMPO>
              <CAMPO label="Fin Descarga">
                <input type="datetime-local" value={form.hora_fin_descarga} onChange={e=>set("hora_fin_descarga",e.target.value)} style={iS}/>
              </CAMPO>
            </div>
            <div>
              <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:10}}>Documentación Recibida</p>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {DOCS_CHECKLIST.map(doc=>(
                  <div key={doc.id} onClick={()=>toggleDoc(doc.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                    background:form.docs[doc.id]?"#dcfce7":"#f8faff",
                    border:`1.5px solid ${form.docs[doc.id]?"#a7f3d0":C.border}`,
                    borderRadius:10,cursor:"pointer"}}>
                    {form.docs[doc.id]?<CheckSquare size={18} color="#15803d"/>:<Square size={18} color={C.textMut}/>}
                    <span style={{fontSize:13,fontWeight:form.docs[doc.id]?600:400,color:form.docs[doc.id]?"#15803d":C.text}}>{doc.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Fotos de la documentación — se suben automáticamente al guardar */}
            <div style={{background:"#f0fdf4",borderRadius:12,padding:14,border:"1.5px solid #a7f3d0"}}>
              <p style={{fontWeight:700,fontSize:13,color:"#15803d",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <Image size={14}/> Fotos de documentos recibidos
                <span style={{fontSize:11,fontWeight:400,color:"#166534",marginLeft:4}}>(se adjuntan automáticamente al guardar)</span>
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <input type="file" ref={fotoRef} accept=".jpg,.jpeg,.png,.webp"
                  onChange={e=>setFotoTemp(p=>({...p,archivo:e.target.files[0]||null}))}
                  style={{flex:2,minWidth:0,...iS,padding:"6px 10px",fontSize:12}}/>
                <input value={fotoTemp.descripcion} onChange={e=>setFotoTemp(p=>({...p,descripcion:e.target.value}))}
                  placeholder="Descripción (ej: Guía de despacho)" style={{...iS,flex:2,minWidth:120,fontSize:12}}/>
                <button onClick={agregarFotoACola} disabled={!fotoTemp.archivo}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",flexShrink:0,
                    background:fotoTemp.archivo?"#15803d":"#e2e8f0",border:"none",borderRadius:9,
                    color:"white",fontSize:12,fontWeight:700,cursor:fotoTemp.archivo?"pointer":"not-allowed",fontFamily:"inherit"}}>
                  + Agregar
                </button>
              </div>
              {fotasCola.length===0&&(
                <p style={{fontSize:11,color:"#166534",textAlign:"center",padding:"6px 0"}}>Sin fotos agregadas todavía</p>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {fotasCola.map(f=>(
                  <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                    background:"white",borderRadius:8,border:"1px solid #a7f3d0"}}>
                    <Image size={13} color="#15803d"/>
                    <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#166534"}}>{f.archivo.name}</span>
                    {f.descripcion&&<span style={{fontSize:11,color:"#166534",opacity:.8}}>{f.descripcion}</span>}
                    <button onClick={()=>quitarFotoACola(f.id)}
                      style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",padding:0,fontSize:14,lineHeight:1}}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <CAMPO label="Observaciones">
              <textarea rows={3} value={form.observacion_recepcion} onChange={e=>set("observacion_recepcion",e.target.value)} style={{...iS,resize:"none"}}/>
            </CAMPO>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setPaso(2)} style={{flex:1,padding:"11px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:11,color:C.blue700,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Atrás</button>
              <button onClick={()=>{if(!form.temperatura_carga)return onToast("Registra la temperatura","error");setPaso(4);}} style={{flex:2,padding:"11px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                Siguiente: Confirmar <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}

        {/* PASO 4 */}
        {paso===4&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <p style={{fontWeight:800,fontSize:15,color:C.blue900}}>4. Confirmación y Firma</p>
            <div style={{background:C.blue50,borderRadius:12,padding:14,border:`1px solid ${C.blue100}`}}>
              <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:8}}>Resumen</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                <div><span style={{color:C.textMut}}>Lote: </span><strong>{form.codigo||"Existente"}</strong></div>
                <div><span style={{color:C.textMut}}>Kg: </span><strong>{form.kilos_brutos||"—"}</strong></div>
                <div><span style={{color:C.textMut}}>Patente: </span><strong style={{fontFamily:"monospace"}}>{form.patente_camion}</strong></div>
                {form.patente_rampla&&<div><span style={{color:C.textMut}}>Rampla: </span><strong style={{fontFamily:"monospace"}}>{form.patente_rampla}</strong></div>}
                <div><span style={{color:C.textMut}}>T°: </span><strong>{form.temperatura_carga}°C</strong></div>
                <div><span style={{color:C.textMut}}>Estado: </span><strong>{form.estado_carga}</strong></div>
                <div><span style={{color:C.textMut}}>Docs: </span><strong>{Object.values(form.docs).filter(Boolean).length}/{DOCS_CHECKLIST.length}</strong></div>
              </div>
            </div>
            <CAMPO label="Recibido por (nombre) *">
              <input value={form.recibido_por_nombre} onChange={e=>set("recibido_por_nombre",e.target.value)} placeholder="Nombre del operario que recibe" style={iS}/>
            </CAMPO>
            <div onClick={()=>set("firma_conforme",!form.firma_conforme)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px",
              background:form.firma_conforme?"#dcfce7":"#f8faff",
              border:`2px solid ${form.firma_conforme?"#15803d":C.border}`,borderRadius:12,cursor:"pointer"}}>
              {form.firma_conforme?<CheckSquare size={22} color="#15803d"/>:<Square size={22} color={C.textMut}/>}
              <div>
                <p style={{fontWeight:700,fontSize:13,color:form.firma_conforme?"#15803d":C.text}}>Conforme con la recepción</p>
                <p style={{fontSize:11,color:C.textMut}}>Declaro que los datos ingresados son correctos</p>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setPaso(3)} style={{flex:1,padding:"11px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:11,color:C.blue700,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Atrás</button>
              <button onClick={()=>{if(!form.recibido_por_nombre)return onToast("Ingresa quien recibe","error");if(!form.firma_conforme)return onToast("Confirma la conformidad","error");guardar();}} style={{flex:2,padding:"11px",background:form.firma_conforme?"#15803d":"#e2e8f0",border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Save size={14}/> Guardar Recepción
              </button>
            </div>
          </div>
        )}

        {/* PASO 5 — ÉXITO + SUBIR ARCHIVOS */}
        {paso===5&&(
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
            <div style={{textAlign:"center",padding:"16px 0 8px"}}>
              <CheckCircle size={44} color="#15803d" style={{margin:"0 auto 10px"}}/>
              <p style={{fontWeight:800,fontSize:17,color:"#15803d"}}>Recepción Registrada ✓</p>
            </div>

            {/* Subir archivos */}
            <div style={{background:"#f0fdf4",borderRadius:12,padding:14,border:"1.5px solid #a7f3d0"}}>
              <p style={{fontWeight:700,fontSize:13,color:"#15803d",marginBottom:10}}>Adjuntar Documentos y Fotos</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                <input type="file" ref={fileRef} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx"
                  onChange={e=>setAN(p=>({...p,archivo:e.target.files[0]||null}))}
                  style={{flex:2,minWidth:0,...iS,padding:"7px 10px",fontSize:12}}/>
                <select value={archNuevo.categoria} onChange={e=>setAN(p=>({...p,categoria:e.target.value}))}
                  style={{...iS,width:"auto",fontSize:12}}>
                  {CATEGORIAS.map(c=><option key={c} value={c} style={{textTransform:"capitalize"}}>{c}</option>)}
                </select>
                <input value={archNuevo.descripcion} onChange={e=>setAN(p=>({...p,descripcion:e.target.value}))}
                  placeholder="Descripción..." style={{...iS,flex:2,minWidth:120,fontSize:12}}/>
                <button onClick={subirArchivo} disabled={!archNuevo.archivo||subiendo}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",
                    background:archNuevo.archivo&&!subiendo?C.blue900:"#e2e8f0",
                    border:"none",borderRadius:9,color:"white",fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                  <Upload size={12}/> {subiendo?"Subiendo...":"Subir"}
                </button>
              </div>
              {archivos.length>0&&(
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {archivos.map(a=>(
                    <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"white",borderRadius:8,border:`1px solid ${C.border}`}}>
                      {iconoArchivo(a.tipo_mime)}
                      <span style={{flex:1,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.nombre_original}</span>
                      <span style={{fontSize:10,color:C.textMut,textTransform:"capitalize"}}>{a.categoria}</span>
                      <button onClick={()=>recepcionAPI.descargarArchivo(a.id).catch(e=>onToast(e.message,"error"))} style={{background:"none",border:"none",color:C.blue700,cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}><Download size={12}/></button>
                      <button onClick={()=>eliminarArchivo(a.id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",padding:0}}><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>imprimirRecepcion()}
                style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"11px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:11,color:C.blue700,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                <Printer size={14}/> Imprimir Ficha
              </button>
              <button onClick={()=>{setPaso(1);setForm(formInit);setArch([]);setFotosCola([]);setFotoTemp({archivo:null,descripcion:""});}}
                style={{flex:1,padding:"11px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                Nueva Recepción
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
