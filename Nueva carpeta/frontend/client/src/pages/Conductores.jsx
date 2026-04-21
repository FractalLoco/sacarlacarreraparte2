import { useState, useEffect } from "react";
import { Plus, Edit, Truck, Phone, User } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { conductoresAPI } from "../api/client";
import { C, iS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";

const Modal = ({titulo,onClose,children}) => (
  <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
    style={{
      position:"fixed",inset:0,zIndex:200,
      overflowY:"auto",
      display:"flex",alignItems:"flex-start",
      justifyContent:"center",
      padding:"20px 12px",
      background:"rgba(10,26,74,.72)",
      backdropFilter:"blur(4px)",
      WebkitOverflowScrolling:"touch",
    }}>
    <div onClick={e=>e.stopPropagation()} style={{
      background:"white",borderRadius:18,width:"100%",maxWidth:540,
      boxShadow:"0 30px 80px rgba(0,0,0,.45)",
      display:"flex",flexDirection:"column",
      animation:"popIn .22s cubic-bezier(.34,1.56,.64,1) both",
      margin:"auto 0",
    }}>
      <div style={{
        padding:"14px 20px",
        background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderRadius:"18px 18px 0 0",flexShrink:0,
      }}>
        <span style={{color:"white",fontWeight:800,fontSize:14}}>{titulo}</span>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",
          borderRadius:8,width:30,height:30,cursor:"pointer",color:"white",fontSize:16,
          display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      <div>{children}</div>
    </div>
    <style>{"@keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}"}</style>
  </div>
);
const CAMPOS = [
  {k:"rut",               l:"RUT Conductor",          ph:"12.345.678-9", req:true},
  {k:"nombre",            l:"Nombre Completo",         ph:"Pedro González", req:true},
  {k:"telefono",          l:"Teléfono",                ph:"+56 9 8765 4321"},
  {k:"empresa_transporte",l:"Empresa Transportista",   ph:"Transportes Norte Ltda."},
  {k:"patente_habitual",  l:"Patente Habitual del Camión", ph:"ABCD12"},
];

export default function Conductores({ onToast }) {
  const { esJefe } = useAuth();
  const { isMobile } = useResponsive();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [sel,   setSel]   = useState(null);
  const [form,  setForm]  = useState({});
  const [busca, setBusca] = useState("");
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const cargar = () => conductoresAPI.listar({q:busca}).then(setItems).catch(e=>onToast(e.message,"error"));
  useEffect(()=>{ cargar(); },[busca]);

  const abrir = (item=null) => {
    setSel(item);
    setForm(item ? {...item} : {rut:"",nombre:"",telefono:"",empresa_transporte:"",patente_habitual:"",activo:true});
    setModal("form");
  };

  const guardar = async () => {
    try {
      if (sel) await conductoresAPI.actualizar(sel.id, form);
      else     await conductoresAPI.crear(form);
      onToast(sel?"Conductor actualizado":"Conductor creado ✓");
      setModal(null); setSel(null); cargar();
    } catch(e){ onToast(e.message,"error"); }
  };

  const filtrados = items.filter(i=>
    !busca || i.nombre.toLowerCase().includes(busca.toLowerCase()) || i.rut.includes(busca) || (i.patente_habitual||"").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"white",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <Truck size={18} color={C.blue600}/>
        <span style={{fontWeight:800,fontSize:16,color:C.blue900,flex:1}}>Conductores / Transportistas</span>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar nombre, RUT o patente..." style={{...iS,flex:2,minWidth:180}}/>
        {esJefe&&<button onClick={()=>abrir()} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:C.blue900,border:"none",borderRadius:10,color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          <Plus size={14}/> Nuevo Conductor
        </button>}
      </div>

      <PanelCard title={`${filtrados.length} conductores`} icon={<Truck size={15} color={C.blue500}/>}>
        {isMobile ? (
          <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
            {filtrados.map(c=>(
              <div key={c.id} style={{background:C.blue50,borderRadius:12,border:`1px solid ${C.blue100}`,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <p style={{fontWeight:800,fontSize:15,color:C.blue900}}>{c.nombre}</p>
                    <p style={{fontSize:12,color:C.textMut,fontFamily:"monospace"}}>{c.rut}</p>
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:c.activo?"#dcfce7":"#f1f5f9",color:c.activo?"#15803d":"#64748b"}}>{c.activo?"Activo":"Inactivo"}</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:10}}>
                  {c.empresa_transporte&&<p style={{fontSize:12,color:C.textSub,display:"flex",alignItems:"center",gap:5}}><Truck size={11}/> {c.empresa_transporte}</p>}
                  {c.telefono&&<p style={{fontSize:12,color:C.textSub,display:"flex",alignItems:"center",gap:5}}><Phone size={11}/> {c.telefono}</p>}
                  {c.patente_habitual&&<p style={{fontSize:12,color:C.textSub,display:"flex",alignItems:"center",gap:5}}><span style={{background:C.blue900,color:"white",borderRadius:5,padding:"1px 7px",fontFamily:"monospace",fontSize:11,fontWeight:700}}>{c.patente_habitual}</span></p>}
                </div>
                {esJefe&&<button onClick={()=>abrir(c)} style={{width:"100%",padding:"8px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:8,color:C.blue700,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Edit size={12}/>Editar</button>}
              </div>
            ))}
            {filtrados.length===0&&<p style={{textAlign:"center",color:C.textMut,padding:"32px 0"}}>Sin conductores registrados</p>}
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:C.blue900}}>
                {["RUT","Nombre","Empresa","Teléfono","Patente Habitual","Estado",""].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:10,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtrados.length===0&&<tr><td colSpan={7} style={{padding:"40px 0",textAlign:"center",color:C.textMut}}>Sin conductores</td></tr>}
                {filtrados.map(c=>(
                  <tr key={c.id} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:"10px 13px",fontFamily:"monospace",fontSize:12,color:C.textSub}}>{c.rut}</td>
                    <td style={{padding:"10px 13px",fontWeight:700,color:C.text}}>{c.nombre}</td>
                    <td style={{padding:"10px 13px",color:C.textSub,fontSize:12}}>{c.empresa_transporte||"—"}</td>
                    <td style={{padding:"10px 13px",color:C.textSub,fontSize:12}}>{c.telefono||"—"}</td>
                    <td style={{padding:"10px 13px"}}>
                      {c.patente_habitual
                        ? <span style={{background:C.blue900,color:"white",borderRadius:6,padding:"2px 10px",fontFamily:"monospace",fontSize:12,fontWeight:700}}>{c.patente_habitual}</span>
                        : <span style={{color:C.border}}>—</span>}
                    </td>
                    <td style={{padding:"10px 13px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:700,background:c.activo?"#dcfce7":"#f1f5f9",color:c.activo?"#15803d":"#64748b"}}>{c.activo?"Activo":"Inactivo"}</span></td>
                    <td style={{padding:"10px 13px"}}>{esJefe&&<button onClick={()=>abrir(c)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}><Edit size={11}/>Editar</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {modal&&(
        <Modal titulo={sel?"Editar Conductor":"Nuevo Conductor"} onClose={()=>{setModal(null);setSel(null);}}>
          <div style={{padding:22,display:"flex",flexDirection:"column",gap:14}}>
            {CAMPOS.map(({k,l,ph,req})=>(
              <div key={k}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>{l}{req&&<span style={{color:C.danger}}> *</span>}</label>
                <input value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph} style={iS}/>
              </div>
            ))}
            {sel&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.blue50,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.blue100}`}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>Conductor activo</span>
                <button onClick={()=>set("activo",!form.activo)} style={{width:40,height:22,borderRadius:11,background:form.activo?C.blue600:C.border,border:"none",cursor:"pointer",position:"relative"}}>
                  <span style={{position:"absolute",top:3,left:form.activo?20:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s"}}/>
                </button>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:10,padding:"14px 22px",borderTop:`1px solid ${C.border}`,background:C.blue50}}>
            <button onClick={()=>{setModal(null);setSel(null);}} style={{flex:1,padding:"11px",background:"white",border:`1px solid ${C.border}`,borderRadius:11,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancelar</button>
            <button onClick={guardar} disabled={!form.rut||!form.nombre} style={{flex:2,padding:"11px",background:(!form.rut||!form.nombre)?"#e2e8f0":`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:(!form.rut||!form.nombre)?C.textMut:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
              {sel?"Guardar Cambios":"Crear Conductor"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}