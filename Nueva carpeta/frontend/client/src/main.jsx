import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import App   from "./App";
import Login from "./pages/Login";

const Spinner = () => (
  <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a1a4a"}}>
    <div style={{textAlign:"center",color:"white",fontFamily:"Plus Jakarta Sans,system-ui"}}>
      <div style={{width:40,height:40,border:"3px solid rgba(255,255,255,.15)",borderTopColor:"white",borderRadius:"50%",margin:"0 auto 14px",animation:"spin .7s linear infinite"}}/>
      <p style={{fontSize:12,opacity:.4}}>Verificando sesión...</p>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Root = () => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Spinner/>;
  if (!usuario) return <Login/>;
  return <App/>;
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider><Root/></AuthProvider>
  </React.StrictMode>
);
