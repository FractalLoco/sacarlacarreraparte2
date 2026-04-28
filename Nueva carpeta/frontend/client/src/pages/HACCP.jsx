import { useState, useEffect } from "react";
import { haccpAPI, lotesAPI } from "../api/client";
import { C, iS, hoy, fmtFecha } from "../constants/theme";
import { Plus, FileText, Printer, Trash2, CheckCircle, Clock, ChevronDown, ChevronRight, Save } from "lucide-react";

/* ─── constantes ─────────────────────────────────────────── */
const TIPOS = {
  recepcion_mp:   { label:"PCC1 Recepción MP",          color:"#1e3a6e", short:"RMP" },
  monitoreo_temp: { label:"Monitoreo de Temperatura",   color:"#0369a1", short:"MON" },
  empaque:        { label:"Empaque y Reempaque",         color:"#059669", short:"EMP" },
  congelacion:    { label:"Congelación y Enfriado",      color:"#7c3aed", short:"CON" },
  despacho:       { label:"Control de Despacho",         color:"#c2410c", short:"DSP" },
};

const AR_OPTS = ["","A","R"];
const F = ({label,children,req=false,col=1}) => (
  <div style={{gridColumn:`span ${col}`}}>
    <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>
      {label}{req&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);
const inp = {...iS,padding:"6px 10px",fontSize:12};
const sel = {...iS,padding:"6px 10px",fontSize:12};

/* ─── Formulario Recepción MP ─────────────────────────────── */
const FormRecepcionMP = ({datos,onChange}) => {
  const filas = datos.muestras||Array(5).fill(null).map(()=>({hora:"",aspecto_externo:"",olor:"",temperatura:"",carne:"",tentaculos:"",contaminacion:"",ar:"",ac:""}));
  const setFila=(i,k,v)=>{const m=[...filas];m[i]={...m[i],[k]:v};onChange({...datos,muestras:m});};
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr style={{background:"#1e3a6e"}}>
          {["Hora","Aspecto externo","Olor","T° (°C)","Carne","Tentáculos","Contam. Q.","A/R","A.C."].map(h=>(
            <th key={h} style={{padding:"6px 8px",color:"white",fontWeight:700,textAlign:"center",fontSize:10}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {filas.map((f,i)=>(
            <tr key={i} style={{background:i%2===0?"white":C.blue50}}>
              <td style={{padding:"3px"}}><input value={f.hora||""} onChange={e=>setFila(i,"hora",e.target.value)} type="time" style={{...inp,width:80}}/></td>
              <td style={{padding:"3px"}}><select value={f.aspecto_externo||""} onChange={e=>setFila(i,"aspecto_externo",e.target.value)} style={{...sel,width:70}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"3px"}}><select value={f.olor||""} onChange={e=>setFila(i,"olor",e.target.value)} style={{...sel,width:70}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"3px"}}><input value={f.temperatura||""} onChange={e=>setFila(i,"temperatura",e.target.value)} type="number" step="0.1" style={{...inp,width:70,textAlign:"center"}}/></td>
              <td style={{padding:"3px"}}><select value={f.carne||""} onChange={e=>setFila(i,"carne",e.target.value)} style={{...sel,width:70}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"3px"}}><select value={f.tentaculos||""} onChange={e=>setFila(i,"tentaculos",e.target.value)} style={{...sel,width:70}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"3px"}}><select value={f.contaminacion||""} onChange={e=>setFila(i,"contaminacion",e.target.value)} style={{...sel,width:70}}><option value="">—</option><option value="A">A</option><option value="P">P</option></select></td>
              <td style={{padding:"3px"}}><select value={f.ar||""} onChange={e=>setFila(i,"ar",e.target.value)} style={{...sel,width:60,fontWeight:700,color:f.ar==="R"?"#dc2626":f.ar==="A"?"#15803d":"inherit"}}>{AR_OPTS.map(o=><option key={o}>{o}</option>)}</select></td>
              <td style={{padding:"3px"}}><input value={f.ac||""} onChange={e=>setFila(i,"ac",e.target.value)} style={{...inp,width:80}}/></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{fontSize:10,color:C.textMut,marginTop:6}}>C: cumple · NC: no cumple · A: ausencia/acepto · P: presencia · R: rechazo</p>
    </div>
  );
};

/* ─── Formulario Monitoreo Temperatura ───────────────────── */
const FormMonitoreoTemp = ({datos,onChange}) => {
  const filas = datos.registros||Array(10).fill(null).map(()=>({hora:"",etapa:"",producto:"",lote:"",m1:"",m2:"",m3:"",id_termometro:"",ar:"",ac:""}));
  const setF=(i,k,v)=>{const m=[...filas];m[i]={...m[i],[k]:v};onChange({...datos,registros:m});};
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead>
          <tr style={{background:"#0369a1"}}>
            {["Hora","Etapa","Producto","Lote","M1 (°C)","M2 (°C)","M3 (°C)","ID Termómetro","A/R","A.C."].map(h=>(
              <th key={h} style={{padding:"6px 8px",color:"white",fontWeight:700,fontSize:10}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f,i)=>(
            <tr key={i} style={{background:i%2===0?"white":C.blue50}}>
              <td style={{padding:"3px"}}><input value={f.hora||""} onChange={e=>setF(i,"hora",e.target.value)} type="time" style={{...inp,width:80}}/></td>
              <td style={{padding:"3px"}}><input value={f.etapa||""} onChange={e=>setF(i,"etapa",e.target.value)} style={{...inp,width:90}}/></td>
              <td style={{padding:"3px"}}><input value={f.producto||""} onChange={e=>setF(i,"producto",e.target.value)} style={{...inp,width:90}}/></td>
              <td style={{padding:"3px"}}><input value={f.lote||""} onChange={e=>setF(i,"lote",e.target.value)} style={{...inp,width:90}}/></td>
              <td style={{padding:"3px"}}><input value={f.m1||""} onChange={e=>setF(i,"m1",e.target.value)} type="number" step="0.1" style={{...inp,width:65,textAlign:"center"}}/></td>
              <td style={{padding:"3px"}}><input value={f.m2||""} onChange={e=>setF(i,"m2",e.target.value)} type="number" step="0.1" style={{...inp,width:65,textAlign:"center"}}/></td>
              <td style={{padding:"3px"}}><input value={f.m3||""} onChange={e=>setF(i,"m3",e.target.value)} type="number" step="0.1" style={{...inp,width:65,textAlign:"center"}}/></td>
              <td style={{padding:"3px"}}><input value={f.id_termometro||""} onChange={e=>setF(i,"id_termometro",e.target.value)} style={{...inp,width:90}}/></td>
              <td style={{padding:"3px"}}><select value={f.ar||""} onChange={e=>setF(i,"ar",e.target.value)} style={{...sel,width:60,fontWeight:700,color:f.ar==="R"?"#dc2626":f.ar==="A"?"#15803d":"inherit"}}>{AR_OPTS.map(o=><option key={o}>{o}</option>)}</select></td>
              <td style={{padding:"3px"}}><input value={f.ac||""} onChange={e=>setF(i,"ac",e.target.value)} style={{...inp,width:80}}/></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop:10,padding:"8px 12px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,fontSize:12,color:"#0369a1",display:"flex",flexWrap:"wrap",gap:"6px 20px"}}>
        <span><strong>n=3</strong> — tamaño de muestra</span>
        <span><strong>A=0</strong> — aceptar si ninguna muestra falla</span>
        <span><strong>R=1</strong> — rechazar si 1 o más muestras fallan</span>
        <span style={{color:C.textMut}}>Monitoreo cada 2 horas</span>
      </div>
    </div>
  );
};

/* ─── Formulario Empaque ──────────────────────────────────── */
const FormEmpaque = ({datos,onChange}) => {
  const filas = datos.registros||Array(12).fill(null).map(()=>({hora:"",num_cajas:"",peso:"",lote:"",fecha_elaboracion:"",fecha_vencimiento:"",palabra_chile:"",num_planta:"",forma_consumo:"",t_mantencion:"",ar:""}));
  const setF=(i,k,v)=>{const m=[...filas];m[i]={...m[i],[k]:v};onChange({...datos,registros:m});};
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"flex",gap:12,marginBottom:10}}>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><input type="checkbox" checked={datos.tipo_empaque||false} onChange={e=>onChange({...datos,tipo_empaque:e.target.checked})}/> Empaque</label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><input type="checkbox" checked={datos.tipo_reempaque||false} onChange={e=>onChange({...datos,tipo_reempaque:e.target.checked})}/> Reempaque</label>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
        <thead><tr style={{background:"#059669"}}>
          {["Hora","N° Cajas","Peso (kg)","Lote","F. Elaboración","F. Vencimiento","CHILE","N° Planta","Forma consumo","T° Mant.","A/R"].map(h=>(
            <th key={h} style={{padding:"5px 6px",color:"white",fontWeight:700,fontSize:9.5}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {filas.map((f,i)=>(
            <tr key={i} style={{background:i%2===0?"white":C.blue50}}>
              <td style={{padding:"2px"}}><input value={f.hora||""} onChange={e=>setF(i,"hora",e.target.value)} type="time" style={{...inp,width:75,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.num_cajas||""} onChange={e=>setF(i,"num_cajas",e.target.value)} type="number" style={{...inp,width:65,textAlign:"center",fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.peso||""} onChange={e=>setF(i,"peso",e.target.value)} type="number" step="0.1" style={{...inp,width:65,textAlign:"center",fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.lote||""} onChange={e=>setF(i,"lote",e.target.value)} style={{...inp,width:80,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.fecha_elaboracion||""} onChange={e=>setF(i,"fecha_elaboracion",e.target.value)} type="date" style={{...inp,width:100,fontSize:10}}/></td>
              <td style={{padding:"2px"}}><input value={f.fecha_vencimiento||""} onChange={e=>setF(i,"fecha_vencimiento",e.target.value)} type="date" style={{...inp,width:100,fontSize:10}}/></td>
              <td style={{padding:"2px"}}><select value={f.palabra_chile||""} onChange={e=>setF(i,"palabra_chile",e.target.value)} style={{...sel,width:65,fontSize:10}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"2px"}}><select value={f.num_planta||""} onChange={e=>setF(i,"num_planta",e.target.value)} style={{...sel,width:65,fontSize:10}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"2px"}}><select value={f.forma_consumo||""} onChange={e=>setF(i,"forma_consumo",e.target.value)} style={{...sel,width:65,fontSize:10}}><option value="">—</option><option value="C">C</option><option value="NC">NC</option></select></td>
              <td style={{padding:"2px"}}><input value={f.t_mantencion||""} onChange={e=>setF(i,"t_mantencion",e.target.value)} style={{...inp,width:65,textAlign:"center",fontSize:11}}/></td>
              <td style={{padding:"2px"}}><select value={f.ar||""} onChange={e=>setF(i,"ar",e.target.value)} style={{...sel,width:55,fontWeight:700,fontSize:11,color:f.ar==="R"?"#dc2626":f.ar==="A"?"#15803d":"inherit"}}>{AR_OPTS.map(o=><option key={o}>{o}</option>)}</select></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{fontSize:10,color:C.textMut,marginTop:6}}>A: Acepta · R: Rechaza · Frecuencia: Al inicio y cada 1 hora</p>
    </div>
  );
};

/* ─── Formulario Congelación ──────────────────────────────── */
const FormCongelacion = ({datos,onChange}) => {
  const filas = datos.registros||Array(6).fill(null).map(()=>({tunel:"",producto:"",calibre:"",lote:"",hora_inicio:"",fecha_termino:"",hora_termino:"",t1:"",t2:"",t3:"",t4:"",t5:"",ar:""}));
  const setF=(i,k,v)=>{const m=[...filas];m[i]={...m[i],[k]:v};onChange({...datos,registros:m});};
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"flex",gap:12,marginBottom:10}}>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><input type="checkbox" checked={datos.tipo_congelacion||false} onChange={e=>onChange({...datos,tipo_congelacion:e.target.checked})}/> Congelación</label>
        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12}}><input type="checkbox" checked={datos.tipo_refrigeracion||false} onChange={e=>onChange({...datos,tipo_refrigeracion:e.target.checked})}/> Refrigeración</label>
      </div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr style={{background:"#7c3aed"}}>
          {["Túnel","Producto","Calibre","Lote","H. Inicio","F. Término","H. Término","T1","T2","T3","T4","T5","A/R"].map(h=>(
            <th key={h} style={{padding:"6px 6px",color:"white",fontWeight:700,fontSize:10}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {filas.map((f,i)=>(
            <tr key={i} style={{background:i%2===0?"white":C.blue50}}>
              <td style={{padding:"2px"}}><input value={f.tunel||""} onChange={e=>setF(i,"tunel",e.target.value)} style={{...inp,width:65,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.producto||""} onChange={e=>setF(i,"producto",e.target.value)} style={{...inp,width:80,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.calibre||""} onChange={e=>setF(i,"calibre",e.target.value)} style={{...inp,width:75,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.lote||""} onChange={e=>setF(i,"lote",e.target.value)} style={{...inp,width:80,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.hora_inicio||""} onChange={e=>setF(i,"hora_inicio",e.target.value)} type="time" style={{...inp,width:75,fontSize:11}}/></td>
              <td style={{padding:"2px"}}><input value={f.fecha_termino||""} onChange={e=>setF(i,"fecha_termino",e.target.value)} type="date" style={{...inp,width:100,fontSize:10}}/></td>
              <td style={{padding:"2px"}}><input value={f.hora_termino||""} onChange={e=>setF(i,"hora_termino",e.target.value)} type="time" style={{...inp,width:75,fontSize:11}}/></td>
              {["t1","t2","t3","t4","t5"].map(t=>(
                <td key={t} style={{padding:"2px"}}><input value={f[t]||""} onChange={e=>setF(i,t,e.target.value)} type="number" step="0.1" style={{...inp,width:55,textAlign:"center",fontSize:11}}/></td>
              ))}
              <td style={{padding:"2px"}}><select value={f.ar||""} onChange={e=>setF(i,"ar",e.target.value)} style={{...sel,width:55,fontWeight:700,fontSize:11,color:f.ar==="R"?"#dc2626":f.ar==="A"?"#15803d":"inherit"}}>{AR_OPTS.map(o=><option key={o}>{o}</option>)}</select></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop:10,padding:"8px 12px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:8,fontSize:12,color:"#0369a1",display:"flex",flexWrap:"wrap",gap:"6px 20px"}}>
        <span><strong>L.C.</strong> — Límite Crítico: T° mínima -18°C · Permanencia máx. 36 h</span>
        <span><strong>n=5</strong> — tamaño de muestra</span>
        <span><strong>A=0</strong> — aceptar si ninguna muestra falla</span>
        <span><strong>R=1</strong> — rechazar si 1 o más muestras fallan</span>
        <span style={{color:C.textMut}}>Plan NCh44 Of. 78 S1</span>
      </div>
    </div>
  );
};

/* ─── Formulario Despacho ─────────────────────────────────── */
const FormDespacho = ({datos,onChange}) => {
  const filas = datos.pallets||Array(10).fill(null).map(()=>({hora:"",num_pallet:"",num_cajas:"",lote:"",clave_elaboracion:"",t1:"",t2:"",t3:""}));
  const setF=(i,k,v)=>{const m=[...filas];m[i]={...m[i],[k]:v};onChange({...datos,pallets:m});};
  const sd=(k,v)=>onChange({...datos,[k]:v});
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        {[["cliente","Cliente"],["destino","Destino"],["num_guia","N° Guía"],["num_contenedor","N° Contenedor"],
          ["nombre_chofer","Nombre Chofer"],["rut_chofer","RUT Chofer"],
          ["patente_camion","Patente Camión"],["patente_rampla","Patente Rampla"],
          ["sello_cliente","N° Sello Cliente"],["sello_interno","N° Sello Interno"]].map(([k,l])=>(
          <div key={k}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:3}}>{l}</label>
            <input value={datos[k]||""} onChange={e=>sd(k,e.target.value)} style={inp}/>
          </div>
        ))}
        <div style={{gridColumn:"span 2"}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:3}}>Limpieza y condición del transporte (C/NC)</label>
          <select value={datos.limpieza_condicion||""} onChange={e=>sd("limpieza_condicion",e.target.value)} style={sel}>
            <option value="">—</option><option value="C">C — Cumple</option><option value="NC">NC — No Cumple</option>
          </select>
        </div>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#c2410c"}}>
            {["Hora","N° Pallet","N° Cajas","Lote","Clave Elaboración","T°1","T°2","T°3"].map(h=>(
              <th key={h} style={{padding:"6px 8px",color:"white",fontWeight:700,fontSize:10}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filas.map((f,i)=>(
              <tr key={i} style={{background:i%2===0?"white":C.blue50}}>
                <td style={{padding:"3px"}}><input value={f.hora||""} onChange={e=>setF(i,"hora",e.target.value)} type="time" style={{...inp,width:75,fontSize:11}}/></td>
                <td style={{padding:"3px"}}><input value={f.num_pallet||""} onChange={e=>setF(i,"num_pallet",e.target.value)} style={{...inp,width:75,textAlign:"center",fontSize:11}}/></td>
                <td style={{padding:"3px"}}><input value={f.num_cajas||""} onChange={e=>setF(i,"num_cajas",e.target.value)} type="number" style={{...inp,width:65,textAlign:"center",fontSize:11}}/></td>
                <td style={{padding:"3px"}}><input value={f.lote||""} onChange={e=>setF(i,"lote",e.target.value)} style={{...inp,width:85,fontSize:11}}/></td>
                <td style={{padding:"3px"}}><input value={f.clave_elaboracion||""} onChange={e=>setF(i,"clave_elaboracion",e.target.value)} style={{...inp,width:110,fontSize:11}}/></td>
                {["t1","t2","t3"].map(t=>(
                  <td key={t} style={{padding:"3px"}}><input value={f[t]||""} onChange={e=>setF(i,t,e.target.value)} type="number" step="0.1" style={{...inp,width:65,textAlign:"center",fontSize:11}}/></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FORM_MAP = {recepcion_mp:FormRecepcionMP,monitoreo_temp:FormMonitoreoTemp,empaque:FormEmpaque,congelacion:FormCongelacion,despacho:FormDespacho};

/* ─── PÁGINA PRINCIPAL ────────────────────────────────────── */
export default function HACCP({ onToast }) {
  const [registros, setReg]  = useState([]);
  const [lotes,     setLotes]= useState([]);
  const [filtTipo,  setFT]   = useState("");
  const [editando,  setEdit] = useState(null);  // null | {tipo, datos, meta}
  const [guardando, setGrd]  = useState(false);
  const [expandido, setExp]  = useState(null);

  const cargar = async () => {
    try {
      const [r,l] = await Promise.all([
        haccpAPI.listar(filtTipo?{tipo:filtTipo}:{}),
        lotesAPI.listar({}),
      ]);
      setReg(r); setLotes(l);
    } catch(e){ onToast(e.message,"error"); }
  };

  useEffect(()=>{ cargar(); },[filtTipo]);

  const nuevoRegistro = (tipo) => {
    setEdit({
      isNew:true, tipo,
      meta:{ tipo,lote_id:"",fecha:hoy(),hora_inicio:"",hora_fin:"",
             monitor_nombre:"",id_termometro:"",estado:"borrador",observaciones:"" },
      datos:{},
    });
  };

  const guardar = async () => {
    if (!editando) return;
    setGrd(true);
    try {
      const payload = {
        tipo:        editando.tipo,
        lote_id:     editando.meta.lote_id||null,
        fecha:       editando.meta.fecha,
        hora_inicio: editando.meta.hora_inicio||null,
        hora_fin:    editando.meta.hora_fin||null,
        monitor_nombre: editando.meta.monitor_nombre||null,
        id_termometro:  editando.meta.id_termometro||null,
        estado:      editando.meta.estado||"borrador",
        observaciones:  editando.meta.observaciones||null,
        datos:       editando.datos,
      };
      if (editando.isNew) await haccpAPI.crear(payload);
      else await haccpAPI.actualizar(editando.id, payload);
      onToast("Formulario guardado ✓");
      setEdit(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
    setGrd(false);
  };

  const imprimir = async (id) => {
    try {
      const html = await haccpAPI.imprimir(id);
      const w = window.open("","_blank","width=1100,height=750");
      w.document.write(html); w.document.close();
    } catch(e){ onToast(e.message,"error"); }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar este registro HACCP?")) return;
    try { await haccpAPI.eliminar(id); onToast("Eliminado"); cargar(); }
    catch(e){ onToast(e.message,"error"); }
  };

  const abrirEditar = async (r) => {
    setEdit({isNew:false,id:r.id,tipo:r.tipo,
      meta:{tipo:r.tipo,lote_id:r.lote_id||"",fecha:r.fecha?.slice(0,10)||hoy(),
            hora_inicio:r.hora_inicio||"",hora_fin:r.hora_fin||"",
            monitor_nombre:r.monitor_nombre||"",id_termometro:r.id_termometro||"",
            estado:r.estado,observaciones:r.observaciones||""},
      datos:r.datos||{}});
  };

  // Si hay formulario abierto, mostrar formulario
  if (editando) {
    const FormComp = FORM_MAP[editando.tipo];
    const info = TIPOS[editando.tipo]||{label:editando.tipo,color:C.blue900};
    return (
      <div style={{maxWidth:1200,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${info.color},${info.color}cc)`,borderRadius:14,padding:"14px 20px",display:"flex",alignItems:"center",gap:12}}>
          <FileText size={20} color="white"/>
          <div style={{flex:1}}>
            <p style={{color:"white",fontWeight:800,fontSize:15}}>{info.label}</p>
            <p style={{color:"rgba(255,255,255,.6)",fontSize:11}}>Programa HACCP — TR3S AL MAR LTDA</p>
          </div>
          <button onClick={()=>setEdit(null)} style={{padding:"7px 14px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,color:"white",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Volver</button>
        </div>

        {/* Datos del encabezado */}
        <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:16}}>
          <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:12}}>Datos del Registro</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Lote</label>
              <select value={editando.meta.lote_id} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,lote_id:e.target.value}}))} style={inp}>
                <option value="">— Sin lote —</option>
                {lotes.map(l=><option key={l.id} value={l.id}>{l.codigo}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Fecha</label>
              <input type="date" value={editando.meta.fecha} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,fecha:e.target.value}}))} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Hora Inicio</label>
              <input type="time" value={editando.meta.hora_inicio} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,hora_inicio:e.target.value}}))} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Hora Término</label>
              <input type="time" value={editando.meta.hora_fin} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,hora_fin:e.target.value}}))} style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Nombre Monitor</label>
              <input value={editando.meta.monitor_nombre} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,monitor_nombre:e.target.value}}))} placeholder="Nombre del monitor de calidad" style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>ID Termómetro</label>
              <input value={editando.meta.id_termometro} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,id_termometro:e.target.value}}))} placeholder="Código del termómetro" style={inp}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Estado</label>
              <select value={editando.meta.estado} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,estado:e.target.value}}))} style={inp}>
                <option value="borrador">Borrador</option>
                <option value="completado">Completado</option>
                <option value="aprobado">Aprobado</option>
              </select>
            </div>
          </div>
          <div style={{marginTop:10}}>
            <label style={{display:"block",fontSize:10,fontWeight:700,color:C.blue700,textTransform:"uppercase",marginBottom:4}}>Observaciones / Acciones Correctivas</label>
            <textarea rows={2} value={editando.meta.observaciones} onChange={e=>setEdit(p=>({...p,meta:{...p.meta,observaciones:e.target.value}}))} style={{...inp,resize:"none",width:"100%"}}/>
          </div>
        </div>

        {/* Tabla de mediciones */}
        <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:16,overflowX:"auto"}}>
          <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:12}}>Registros de Medición</p>
          {FormComp&&<FormComp datos={editando.datos} onChange={d=>setEdit(p=>({...p,datos:d}))}/>}
        </div>

        {/* Botones */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>setEdit(null)} style={{flex:1,padding:"12px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:11,color:C.blue700,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{flex:2,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"12px",background:guardando?"#e2e8f0":`linear-gradient(135deg,${info.color},${info.color}aa)`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:guardando?"not-allowed":"pointer",fontFamily:"inherit"}}>
            <Save size={14}/>{guardando?"Guardando...":"Guardar Formulario"}
          </button>
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div style={{maxWidth:1100,margin:"0 auto",display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:14,padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <FileText size={20} color="white"/>
          <div style={{flex:1}}>
            <p style={{color:"white",fontWeight:800,fontSize:16}}>Formularios HACCP</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:12}}>Control de calidad — Programa de Aseguramiento</p>
          </div>
        </div>
        {/* Botones para crear cada tipo */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
          {Object.entries(TIPOS).map(([tipo,info])=>(
            <button key={tipo} onClick={()=>nuevoRegistro(tipo)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",
                background:`rgba(255,255,255,.1)`,border:`1px solid rgba(255,255,255,.25)`,
                borderRadius:9,color:"white",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              <Plus size={11}/>{info.short}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro por tipo */}
      <div style={{background:"white",borderRadius:12,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:700,color:C.blue900}}>Filtrar:</span>
        <button onClick={()=>setFT("")} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${!filtTipo?C.blue600:C.border}`,background:!filtTipo?C.blue50:"white",color:!filtTipo?C.blue700:C.textMut,fontSize:11,fontWeight:!filtTipo?700:400,cursor:"pointer",fontFamily:"inherit"}}>Todos</button>
        {Object.entries(TIPOS).map(([tipo,info])=>(
          <button key={tipo} onClick={()=>setFT(tipo)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filtTipo===tipo?info.color:C.border}`,background:filtTipo===tipo?"white":"white",color:filtTipo===tipo?info.color:C.textMut,fontSize:11,fontWeight:filtTipo===tipo?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {info.short}
          </button>
        ))}
        <button onClick={cargar} style={{marginLeft:"auto",padding:"6px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:8,cursor:"pointer",color:C.blue600,fontSize:11,fontWeight:600,fontFamily:"inherit"}}>↻ Actualizar</button>
      </div>

      {/* Lista */}
      {registros.length===0&&(
        <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"60px 20px",textAlign:"center"}}>
          <FileText size={32} color={C.textMut} style={{margin:"0 auto 10px"}}/>
          <p style={{fontWeight:700,color:C.textSub}}>Sin formularios registrados</p>
          <p style={{fontSize:12,color:C.textMut,marginTop:6}}>Usa los botones arriba para crear un nuevo formulario HACCP</p>
        </div>
      )}

      {registros.map(r=>{
        const info = TIPOS[r.tipo]||{label:r.tipo,color:C.blue900};
        const ESTADO_COLOR = {borrador:{bg:"#f1f5f9",c:"#64748b"},completado:{bg:"#dcfce7",c:"#15803d"},aprobado:{bg:"#dbeafe",c:"#1d4ed8"}};
        const ec = ESTADO_COLOR[r.estado]||ESTADO_COLOR.borrador;
        return (
          <div key={r.id} style={{background:"white",borderRadius:14,border:`1.5px solid ${expandido===r.id?info.color:C.border}`,overflow:"hidden"}}>
            <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}
              onClick={()=>setExp(expandido===r.id?null:r.id)}>
              <div style={{width:36,height:36,borderRadius:10,background:info.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{color:"white",fontWeight:900,fontSize:10}}>{info.short}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:13,color:C.blue900}}>{info.label}</p>
                <p style={{fontSize:11,color:C.textMut}}>
                  Folio: <strong>{r.folio||"—"}</strong> · {fmtFecha(r.fecha)}
                  {r.lote_codigo&&<> · Lote: <strong>{r.lote_codigo}</strong></>}
                  {r.monitor_nombre&&<> · <span>{r.monitor_nombre}</span></>}
                </p>
              </div>
              <span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:ec.bg,color:ec.c}}>{r.estado}</span>
              <div style={{display:"flex",gap:5}}>
                <button onClick={e=>{e.stopPropagation();imprimir(r.id);}} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:7,color:"#dc2626",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  <Printer size={10}/> Imprimir
                </button>
                <button onClick={e=>{e.stopPropagation();abrirEditar(r);}} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  ✏️ Editar
                </button>
                <button onClick={e=>{e.stopPropagation();eliminar(r.id);}} style={{display:"flex",alignItems:"center",gap:3,padding:"5px 8px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:7,color:"#dc2626",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                  <Trash2 size={10}/>
                </button>
              </div>
              {expandido===r.id?<ChevronDown size={14} color={C.textMut}/>:<ChevronRight size={14} color={C.textMut}/>}
            </div>
            {expandido===r.id&&r.observaciones&&(
              <div style={{padding:"8px 16px 12px",borderTop:`1px solid ${C.border}`,background:C.blue50}}>
                <p style={{fontSize:11,color:C.textSub}}><strong>Observaciones:</strong> {r.observaciones}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
