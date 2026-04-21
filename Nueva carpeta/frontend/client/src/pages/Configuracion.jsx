import { useState, useEffect } from "react";
import { Plus, Settings, Edit2, RefreshCw } from "lucide-react";
import { configuracionAPI } from "../api/client";
import { C, iS } from "../constants/theme";

/* ── helpers ────────────────────────────────────────────────── */
const F = ({label, children, req=false}) => (
  <div>
    <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,
      textTransform:"uppercase",letterSpacing:.5,marginBottom:5}}>
      {label}{req&&<span style={{color:"#ef4444",marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);

const Badge = ({activo}) => (
  <span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,
    background:activo?"#dcfce7":"#f1f5f9",color:activo?"#15803d":"#64748b"}}>
    {activo?"Activo":"Inactivo"}
  </span>
);

const btnPrimary = {padding:"8px 14px",background:C.blue900,border:"none",borderRadius:9,
  color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"};
const btnGhost = {padding:"8px 12px",background:"white",border:`1px solid ${C.border}`,
  borderRadius:9,color:C.textSub,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"};

export default function Configuracion({ onToast }) {
  const [tab,      setTab]    = useState("productos");
  const [productos, setProds] = useState([]);
  const [calibres,  setCalib] = useState([]);
  const [lineas,    setLin]   = useState([]);
  const [tuneles,   setTun]   = useState([]);
  const [editando,  setEdit]  = useState(null);
  const [showAdd,   setShowAdd]=useState(false);

  // forms
  const [fProd,  setFP] = useState({nombre:"",categoria:"jibia",es_desecho:false,orden:0});
  const [fCalib, setFC] = useState({producto_tipo_id:"",nombre:""});
  const [fLinea, setFL] = useState({nombre:""});
  const [fTunel, setFT] = useState({nombre:"",capacidad_max:32,observacion:""});

  const cargar = async () => {
    try {
      const [p,c,l,t] = await Promise.all([
        configuracionAPI.productos(),
        configuracionAPI.calibres(),
        configuracionAPI.lineas(),
        configuracionAPI.tuneles(),
      ]);
      setProds(p); setCalib(c); setLin(l); setTun(t);
    } catch(e){ onToast(e.message,"error"); }
  };

  useEffect(()=>{ cargar(); },[]);

  // Al cambiar tab, cerrar formularios
  const cambiarTab = (t) => { setTab(t); setShowAdd(false); setEdit(null); };

  /* ── acciones ─────────────────────────────────────────────── */
  const crear = async () => {
    try {
      if (tab==="productos") {
        if (!fProd.nombre.trim()) return onToast("El nombre es requerido","error");
        await configuracionAPI.crearProducto(fProd);
        setFP({nombre:"",categoria:"jibia",es_desecho:false,orden:0});
      } else if (tab==="calibres") {
        if (!fCalib.nombre.trim()||!fCalib.producto_tipo_id) return onToast("Completa todos los campos","error");
        await configuracionAPI.crearCalibre({...fCalib,producto_tipo_id:+fCalib.producto_tipo_id});
        setFC({producto_tipo_id:"",nombre:""});
      } else if (tab==="lineas") {
        if (!fLinea.nombre.trim()) return onToast("El nombre es requerido","error");
        await configuracionAPI.crearLinea(fLinea);
        setFL({nombre:""});
      } else if (tab==="tuneles") {
        if (!fTunel.nombre.trim()) return onToast("El nombre es requerido","error");
        await configuracionAPI.crearTunel({...fTunel,capacidad_max:+fTunel.capacidad_max});
        setFT({nombre:"",capacidad_max:32,observacion:""});
      }
      onToast("Creado ✓"); setShowAdd(false); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    try {
      if (editando._tipo==="producto") await configuracionAPI.editarProducto(editando.id, editando);
      else if (editando._tipo==="calibre") await configuracionAPI.editarCalibre(editando.id, editando);
      else if (editando._tipo==="linea")   await configuracionAPI.editarLinea(editando.id, editando);
      else if (editando._tipo==="tunel")   await configuracionAPI.editarTunel(editando.id, editando);
      onToast("Actualizado ✓"); setEdit(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const setE = (k,v) => setEdit(p=>({...p,[k]:v}));

  /* ── render helpers ──────────────────────────────────────── */
  const tabla = (headers, rows) => (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:C.blue900}}>
            {headers.map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );

  const tabItems = {
    productos: { label:"Productos", count:productos.length },
    calibres:  { label:"Calibres",  count:calibres.length },
    lineas:    { label:"Líneas",    count:lineas.length },
    tuneles:   { label:"Túneles",   count:tuneles.length },
  };

  return (
    <div style={{maxWidth:900,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,borderRadius:16,padding:"18px 22px",display:"flex",alignItems:"center",gap:12}}>
        <Settings size={22} color="white"/>
        <div>
          <p style={{color:"white",fontWeight:800,fontSize:17}}>Configuración del Sistema</p>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:12}}>Productos, calibres, líneas de producción y túneles</p>
        </div>
        <button onClick={cargar} style={{marginLeft:"auto",padding:"8px",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center"}}>
          <RefreshCw size={14} color="white"/>
        </button>
      </div>

      {/* Card principal */}
      <div style={{background:"white",borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        
        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:"#f8faff"}}>
          {Object.entries(tabItems).map(([id,{label,count}])=>(
            <button key={id} onClick={()=>cambiarTab(id)} style={{flex:1,padding:"12px 8px",border:"none",background:"none",borderBottom:`2px solid ${tab===id?C.blue600:"transparent"}`,color:tab===id?C.blue700:C.textMut,fontWeight:tab===id?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
              {label}
              <span style={{marginLeft:6,fontSize:10,background:tab===id?C.blue100:"#e2e8f0",color:tab===id?C.blue700:"#64748b",padding:"1px 7px",borderRadius:20,fontWeight:700}}>{count}</span>
            </button>
          ))}
        </div>

        {/* Aviso de uso */}
        <div style={{padding:"10px 16px",background:C.blue50,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <p style={{fontSize:11,color:C.textMut}}>Cambios visibles de inmediato en Pesajes, Inventario y Despachos.</p>
          <button onClick={()=>{setShowAdd(p=>!p);setEdit(null);}} style={{...btnPrimary,display:"flex",alignItems:"center",gap:5,fontSize:12}}>
            <Plus size={12}/> {showAdd?"Cancelar":"Nuevo"}
          </button>
        </div>

        {/* Formulario de creación */}
        {showAdd&&(
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.border}`,background:"#f0f5ff"}}>
            <p style={{fontWeight:700,fontSize:13,color:C.blue900,marginBottom:12}}>Nuevo registro</p>
            
            {/* PRODUCTOS */}
            {tab==="productos"&&(
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <F label="Nombre *"><input value={fProd.nombre} onChange={e=>setFP(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Filete Premium" style={{...iS,minWidth:160}}/></F>
                <F label="Categoría"><select value={fProd.categoria} onChange={e=>setFP(p=>({...p,categoria:e.target.value}))} style={iS}>
                  <option value="jibia">Jibia</option><option value="otro">Otro</option>
                </select></F>
                <F label="Orden"><input type="number" value={fProd.orden} onChange={e=>setFP(p=>({...p,orden:+e.target.value}))} style={{...iS,width:70}}/></F>
                <div style={{display:"flex",alignItems:"center",gap:7,paddingBottom:2}}>
                  <input type="checkbox" id="edes" checked={fProd.es_desecho} onChange={e=>setFP(p=>({...p,es_desecho:e.target.checked}))} style={{width:16,height:16}}/>
                  <label htmlFor="edes" style={{fontSize:12,color:C.text,fontWeight:600}}>Es desecho</label>
                </div>
                <button onClick={crear} style={btnPrimary}>Crear</button>
              </div>
            )}

            {/* CALIBRES */}
            {tab==="calibres"&&(
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <F label="Producto *"><select value={fCalib.producto_tipo_id} onChange={e=>setFC(p=>({...p,producto_tipo_id:e.target.value}))} style={{...iS,minWidth:160}}>
                  <option value="">— Seleccionar —</option>
                  {productos.filter(p=>!p.es_desecho).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select></F>
                <F label="Calibre *"><input value={fCalib.nombre} onChange={e=>setFC(p=>({...p,nombre:e.target.value}))} placeholder="Ej: 2UP Premium" style={{...iS,minWidth:140}}/></F>
                <button onClick={crear} style={btnPrimary}>Crear</button>
              </div>
            )}

            {/* LÍNEAS */}
            {tab==="lineas"&&(
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <F label="Nombre *"><input value={fLinea.nombre} onChange={e=>setFL(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Línea 4" style={{...iS,minWidth:200}}/></F>
                <button onClick={crear} style={btnPrimary}>Crear</button>
              </div>
            )}

            {/* TÚNELES */}
            {tab==="tuneles"&&(
              <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
                <F label="Nombre *"><input value={fTunel.nombre} onChange={e=>setFT(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Túnel 5" style={{...iS,minWidth:140}}/></F>
                <F label="Cap. Máx (carros)"><input type="number" value={fTunel.capacidad_max} onChange={e=>setFT(p=>({...p,capacidad_max:e.target.value}))} style={{...iS,width:90}}/></F>
                <F label="Observación"><input value={fTunel.observacion} onChange={e=>setFT(p=>({...p,observacion:e.target.value}))} style={{...iS,minWidth:160}}/></F>
                <button onClick={crear} style={btnPrimary}>Crear</button>
              </div>
            )}
          </div>
        )}

        {/* ─ TABLA PRODUCTOS ─ */}
        {tab==="productos"&&tabla(
          ["Nombre","Categoría","Tipo","Orden","Estado",""],
          productos.length===0
            ? [<tr key="e"><td colSpan={6} style={{padding:"40px",textAlign:"center",color:C.textMut}}>Sin productos configurados</td></tr>]
            : productos.map((item,i)=>(
              <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                {editando?.id===item.id&&editando._tipo==="producto" ? (
                  <>
                    <td style={{padding:"8px 14px"}}><input value={editando.nombre} onChange={e=>setE("nombre",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></td>
                    <td style={{padding:"8px 14px"}}><select value={editando.activo} onChange={e=>setE("activo",e.target.value==="true")} style={{...iS,padding:"5px 8px",fontSize:12}}>
                      <option value="true">Activo</option><option value="false">Inactivo</option>
                    </select></td>
                    <td colSpan={4} style={{padding:"8px 14px"}}>
                      <button onClick={guardarEdicion} style={{...btnPrimary,background:"#15803d",fontSize:11,marginRight:6}}>Guardar</button>
                      <button onClick={()=>setEdit(null)} style={{...btnGhost,fontSize:11}}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{padding:"10px 14px",fontWeight:700,color:C.blue900}}>{item.nombre}</td>
                    <td style={{padding:"10px 14px",color:C.textSub}}>{item.categoria}</td>
                    <td style={{padding:"10px 14px",color:C.textSub}}>{item.es_desecho?"Desecho":"Producto"}</td>
                    <td style={{padding:"10px 14px",color:C.textSub}}>{item.orden}</td>
                    <td style={{padding:"10px 14px"}}><Badge activo={item.activo}/></td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>setEdit({...item,_tipo:"producto"})} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        <Edit2 size={10}/>Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
        )}

        {/* ─ TABLA CALIBRES ─ */}
        {tab==="calibres"&&tabla(
          ["Producto","Calibre","Estado",""],
          calibres.length===0
            ? [<tr key="e"><td colSpan={4} style={{padding:"40px",textAlign:"center",color:C.textMut}}>Sin calibres configurados</td></tr>]
            : calibres.map((item,i)=>(
              <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                {editando?.id===item.id&&editando._tipo==="calibre" ? (
                  <>
                    <td style={{padding:"8px 14px",color:C.textSub}}>{item.producto_tipo_nombre}</td>
                    <td style={{padding:"8px 14px"}}><input value={editando.nombre} onChange={e=>setE("nombre",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></td>
                    <td style={{padding:"8px 14px"}}><select value={editando.activo} onChange={e=>setE("activo",e.target.value==="true")} style={{...iS,padding:"5px 8px",fontSize:12}}>
                      <option value="true">Activo</option><option value="false">Inactivo</option>
                    </select></td>
                    <td style={{padding:"8px 14px"}}>
                      <button onClick={guardarEdicion} style={{...btnPrimary,background:"#15803d",fontSize:11,marginRight:6}}>Guardar</button>
                      <button onClick={()=>setEdit(null)} style={{...btnGhost,fontSize:11}}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{padding:"10px 14px",fontWeight:600,color:C.blue700}}>{item.producto_tipo_nombre}</td>
                    <td style={{padding:"10px 14px",fontWeight:700,color:C.blue900}}>{item.nombre}</td>
                    <td style={{padding:"10px 14px"}}><Badge activo={item.activo}/></td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>setEdit({...item,_tipo:"calibre"})} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        <Edit2 size={10}/>Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
        )}

        {/* ─ TABLA LÍNEAS ─ */}
        {tab==="lineas"&&tabla(
          ["Nombre","Estado",""],
          lineas.length===0
            ? [<tr key="e"><td colSpan={3} style={{padding:"40px",textAlign:"center",color:C.textMut}}>Sin líneas configuradas</td></tr>]
            : lineas.map((item,i)=>(
              <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                {editando?.id===item.id&&editando._tipo==="linea" ? (
                  <>
                    <td style={{padding:"8px 14px"}}><input value={editando.nombre} onChange={e=>setE("nombre",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></td>
                    <td style={{padding:"8px 14px"}}><select value={editando.activa} onChange={e=>setE("activa",e.target.value==="true")} style={{...iS,padding:"5px 8px",fontSize:12}}>
                      <option value="true">Activa</option><option value="false">Inactiva</option>
                    </select></td>
                    <td style={{padding:"8px 14px"}}>
                      <button onClick={guardarEdicion} style={{...btnPrimary,background:"#15803d",fontSize:11,marginRight:6}}>Guardar</button>
                      <button onClick={()=>setEdit(null)} style={{...btnGhost,fontSize:11}}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{padding:"10px 14px",fontWeight:700,color:C.blue900}}>{item.nombre}</td>
                    <td style={{padding:"10px 14px"}}><Badge activo={item.activa}/></td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>setEdit({...item,_tipo:"linea"})} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        <Edit2 size={10}/>Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
        )}

        {/* ─ TABLA TÚNELES ─ */}
        {tab==="tuneles"&&tabla(
          ["Nombre","Cap. Máx","Observación","Estado",""],
          tuneles.length===0
            ? [<tr key="e"><td colSpan={5} style={{padding:"40px",textAlign:"center",color:C.textMut}}>Sin túneles configurados</td></tr>]
            : tuneles.map((item,i)=>(
              <tr key={item.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"white":C.blue50}}>
                {editando?.id===item.id&&editando._tipo==="tunel" ? (
                  <>
                    <td style={{padding:"8px 14px"}}><input value={editando.nombre} onChange={e=>setE("nombre",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></td>
                    <td style={{padding:"8px 14px"}}><input type="number" value={editando.capacidad_max} onChange={e=>setE("capacidad_max",+e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12,width:80}}/></td>
                    <td style={{padding:"8px 14px"}}><input value={editando.observacion||""} onChange={e=>setE("observacion",e.target.value)} style={{...iS,padding:"5px 8px",fontSize:12}}/></td>
                    <td style={{padding:"8px 14px"}}><select value={editando.activo} onChange={e=>setE("activo",e.target.value==="true")} style={{...iS,padding:"5px 8px",fontSize:12}}>
                      <option value="true">Activo</option><option value="false">Inactivo</option>
                    </select></td>
                    <td style={{padding:"8px 14px"}}>
                      <button onClick={guardarEdicion} style={{...btnPrimary,background:"#15803d",fontSize:11,marginRight:6}}>Guardar</button>
                      <button onClick={()=>setEdit(null)} style={{...btnGhost,fontSize:11}}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{padding:"10px 14px",fontWeight:700,color:C.blue900}}>{item.nombre}</td>
                    <td style={{padding:"10px 14px",color:C.textSub}}>{item.capacidad_max} carros</td>
                    <td style={{padding:"10px 14px",color:C.textMut}}>{item.observacion||"—"}</td>
                    <td style={{padding:"10px 14px"}}><Badge activo={item.activo}/></td>
                    <td style={{padding:"10px 14px"}}>
                      <button onClick={()=>setEdit({...item,_tipo:"tunel"})} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        <Edit2 size={10}/>Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))
        )}
      </div>
    </div>
  );
}
