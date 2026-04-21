import { useState } from "react";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { PanelCard } from "../components/atoms/Overlay";
import { usuariosAPI } from "../api/client";
import { C, iS, ROL_COLORS, fmtFecha } from "../constants/theme";

export default function Usuarios({ usuarios, roles, onRecargar, onToast }) {
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({});
  const [show,  setShow]  = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const abrirNuevo = () => {
    setForm({nombre:"",email:"",password:"",rol_id:5,activo:true});
    setModal("nuevo");
  };
  const abrirEditar = (u) => { setForm({...u}); setModal("editar"); };

  const guardar = async () => {
    try {
      if (modal==="nuevo") await usuariosAPI.crear(form);
      else await usuariosAPI.actualizar(form.id, form);
      onToast(modal==="nuevo"?"Usuario creado correctamente":"Usuario actualizado");
      setModal(null); onRecargar();
    } catch(e) { onToast(e.message,"error"); }
  };

  const desactivar = async (id) => {
    try { await usuariosAPI.desactivar(id); onToast("Usuario desactivado","warning"); onRecargar(); }
    catch(e) { onToast(e.message,"error"); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <PanelCard title="Usuarios del Sistema" icon={<Users size={15} color={C.blue500}/>}
        action={
          <button onClick={abrirNuevo} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:C.blue900,border:"none",borderRadius:9,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            <Plus size={13}/> Nuevo Usuario
          </button>
        }>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.blue900}}>
                {["Nombre","Email","Rol","Estado","Creado","Acciones"].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontSize:11,fontWeight:700,color:C.blue300,letterSpacing:.4}}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u=>(
                <tr key={u.id} className="row" style={{borderBottom:`1px solid ${C.border}`}}>
                  <td style={{padding:"11px 13px",fontWeight:700,color:C.text}}>{u.nombre}</td>
                  <td style={{padding:"11px 13px",color:C.textSub,fontSize:12}}>{u.email}</td>
                  <td style={{padding:"11px 13px"}}>
                    <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${ROL_COLORS[u.rol]||C.blue600}20`,color:ROL_COLORS[u.rol]||C.blue600}}>
                      {u.rol}
                    </span>
                  </td>
                  <td style={{padding:"11px 13px"}}>
                    <span style={{padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:u.activo?"#dcfce7":"#f1f5f9",color:u.activo?"#15803d":"#64748b"}}>
                      {u.activo?"Activo":"Inactivo"}
                    </span>
                  </td>
                  <td style={{padding:"11px 13px",color:C.textMut,fontSize:12}}>{fmtFecha(u.created_at)}</td>
                  <td style={{padding:"11px 13px"}}>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>abrirEditar(u)} style={{padding:"5px 10px",background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:7,color:C.blue700,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}><Edit size={11}/> Editar</button>
                      <button onClick={()=>desactivar(u.id)} style={{padding:"5px 10px",background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:7,color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}><Trash2 size={11}/> Desactivar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {/* Modal */}
      {modal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setModal(null);}} style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(10,26,74,.65)",backdropFilter:"blur(3px)"}}>
          <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:460,overflow:"hidden",boxShadow:"0 25px 60px rgba(0,0,0,.3)"}}>
            <div style={{padding:"18px 22px",background:`linear-gradient(135deg,${C.blue900},${C.blue700})`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"white",fontWeight:800,fontSize:16}}>{modal==="nuevo"?"Nuevo Usuario":"Editar Usuario"}</span>
              <button onClick={()=>setModal(null)} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"white",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:24,display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Nombre Completo</label>
                <input value={form.nombre||""} onChange={e=>set("nombre",e.target.value)} style={iS}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Correo Electrónico</label>
                <input type="email" value={form.email||""} onChange={e=>set("email",e.target.value)} style={iS}/>
              </div>
              {modal==="nuevo"&&(
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Contraseña</label>
                  <div style={{position:"relative"}}>
                    <input type={show?"text":"password"} value={form.password||""} onChange={e=>set("password",e.target.value)} style={{...iS,paddingRight:44}}/>
                    <button type="button" onClick={()=>setShow(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.textMut,fontSize:12}}>
                      {show?"Ocultar":"Ver"}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:C.blue700,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Rol</label>
                <select value={form.rol_id||""} onChange={e=>set("rol_id",+e.target.value)} style={iS}>
                  {roles.map(r=><option key={r.id} value={r.id}>{r.nombre} — {r.descripcion}</option>)}
                </select>
              </div>
              {modal==="editar"&&(
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.blue50,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.blue100}`}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>Usuario activo</span>
                  <button onClick={()=>set("activo",!form.activo)} style={{width:40,height:22,borderRadius:11,background:form.activo?C.blue600:C.border,border:"none",cursor:"pointer",position:"relative"}}>
                    <span style={{position:"absolute",top:3,left:form.activo?20:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
                  </button>
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10,padding:"16px 24px",borderTop:`1px solid ${C.border}`,background:C.blue50}}>
              <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px",background:"white",border:`1px solid ${C.border}`,borderRadius:11,color:C.textSub,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancelar</button>
              <button onClick={guardar} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${C.blue900},${C.blue600})`,border:"none",borderRadius:11,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>
                {modal==="nuevo"?"Crear Usuario":"Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}