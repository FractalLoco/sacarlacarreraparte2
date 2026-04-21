import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, setToken, clearToken } from "../api/client";

const Ctx = createContext(null);
const TOKEN_KEY = "tam_prod_token";

export const AuthProvider = ({ children }) => {
  const [usuario,  setUsuario]  = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      setToken(t);
      authAPI.me().then(setUsuario).catch(()=>{clearToken();localStorage.removeItem(TOKEN_KEY);}).finally(()=>setCargando(false));
    } else { setCargando(false); }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearToken();
    setUsuario(null);
  }, []);

  const esAdmin      = usuario?.nivel >= 4;
  const esJefe       = usuario?.nivel >= 3;
  const esSupervisor = usuario?.nivel >= 2;
  const esBodeguero  = ["bodeguero","supervisor_turno","jefe_planta","administrativo","admin"].includes(usuario?.rol);

  return (
    <Ctx.Provider value={{ usuario, cargando, login, logout, esAdmin, esJefe, esSupervisor, esBodeguero }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
