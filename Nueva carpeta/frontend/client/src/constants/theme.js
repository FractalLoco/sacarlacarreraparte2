// TEMA CENTRAL TR3S AL MAR — v3
export const C={
  blue900:"#0a1a4a",blue800:"#0d2260",blue700:"#1a3a8f",
  blue600:"#1f4de0",blue500:"#2563ff",blue400:"#4b7fff",
  blue300:"#93b4fd",blue200:"#bfcffe",blue100:"#dce8ff",blue50:"#f0f5ff",
  slate:"#f0f4f8",success:"#059669",warning:"#d97706",danger:"#dc2626",
  text:"#0d1b3e",textSub:"#3d5080",textMut:"#8898c0",border:"#dce8ff",
};

export const ROL_COLORS={
  admin:"#0d2260",jefe_planta:"#1f4de0",administrativo:"#2563ff",
  supervisor_turno:"#059669",pesador_tunel:"#d97706",bodeguero:"#6366f1",
};

export const iS={
  width:"100%",padding:"10px 14px",background:"#f0f5ff",
  border:"1.5px solid #bfcffe",borderRadius:10,fontSize:13,
  color:"#0d1b3e",outline:"none",fontFamily:"inherit",
};

// Input numérico que evita negativos
export const iSNum={
  ...({width:"100%",padding:"10px 14px",background:"#f0f5ff",
  border:"1.5px solid #bfcffe",borderRadius:10,fontSize:13,
  color:"#0d1b3e",outline:"none",fontFamily:"inherit"}),
  min:0,
};

export const hoy=()=>new Date().toISOString().slice(0,10);
export const fmt=n=>new Intl.NumberFormat("es-CL").format(Math.round(n||0));
export const fmtFecha=d=>d?new Date(d).toLocaleDateString("es-CL",{day:"2-digit",month:"short",year:"numeric"}):"—";
export const fmtDecimal=n=>parseFloat(n||0).toLocaleString("es-CL",{minimumFractionDigits:2,maximumFractionDigits:2});

// Validación anti-negativo para forms
export const validarNum=(v,campo)=>{
  const n=parseFloat(v);
  if(v===""||v===null||v===undefined) return null;
  if(isNaN(n)||n<0) throw new Error(`${campo} no puede ser negativo`);
  return n;
};

// Breakpoints responsive
export const BP={
  mobile: "(max-width: 640px)",
  tablet: "(max-width: 1024px)",
};
