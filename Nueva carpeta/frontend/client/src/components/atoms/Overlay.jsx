import { X } from "lucide-react";
import { C } from "../../constants/theme";
import { LOGO_SRC } from "../../constants/logo";

/* ──────────────────────────────────────────────────────────────
   Modal universal — se ve completo en cualquier pantalla
   El overlay hace scroll si el modal no cabe en la pantalla.
   El header siempre es visible (no queda cortado arriba).
   ────────────────────────────────────────────────────────────── */
export const Modal = ({ onClose, children, maxWidth = 560, zIndex = 200 }) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{
      position: "fixed", inset: 0, zIndex,
      overflowY: "auto",               /* scroll en el overlay, no en el modal */
      background: "rgba(10,26,74,.72)",
      backdropFilter: "blur(4px)",
      WebkitOverflowScrolling: "touch",
      padding: "16px",                 /* espacio alrededor en móvil */
      display: "flex",
      alignItems: "flex-start",        /* empieza desde arriba, no centra */
      justifyContent: "center",
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: "white",
        borderRadius: 18,
        width: "100%",
        maxWidth,
        boxShadow: "0 30px 80px rgba(0,0,0,.45)",
        display: "flex",
        flexDirection: "column",
        animation: "popIn .22s cubic-bezier(.34,1.56,.64,1) both",
        marginTop: "auto",
        marginBottom: "auto",
        /* Sin maxHeight fijo — el modal crece hasta su contenido
           y el scroll lo hace el overlay */
      }}
    >
      {children}
    </div>
    <style>{`
      @keyframes popIn {
        from { opacity:0; transform:scale(.93) translateY(10px); }
        to   { opacity:1; transform:scale(1)   translateY(0); }
      }
    `}</style>
  </div>
);

/* Header del modal con gradiente y logo */
export const MHdr = ({ title, sub, onClose }) => (
  <div style={{
    padding: "18px 22px",
    background: `linear-gradient(135deg,${C.blue900},${C.blue700})`,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    borderRadius: "18px 18px 0 0",
    flexShrink: 0,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, overflow: "hidden",
        background: "white", display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>
        <img src={LOGO_SRC} alt="TR3S AL MAR"
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3 }} />
      </div>
      <div>
        <p style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{title}</p>
        <p style={{ color: "rgba(255,255,255,.45)", fontSize: 11 }}>{sub}</p>
      </div>
    </div>
    <button onClick={onClose} style={{
      background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8,
      width: 32, height: 32, cursor: "pointer", color: "white",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <X size={16} />
    </button>
  </div>
);

/* Panel card para páginas (no modal) */
export const PanelCard = ({ title, icon, action, children }) => (
  <div style={{
    background: "white", borderRadius: 16,
    border: `1px solid ${C.border}`,
    overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.05)",
  }}>
    <div style={{
      padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: `linear-gradient(to right,${C.blue50},white)`,
    }}>
      <span style={{
        fontWeight: 700, fontSize: 14, color: C.blue900,
        display: "flex", alignItems: "center", gap: 7,
      }}>
        {icon}{title}
      </span>
      {action}
    </div>
    {children}
  </div>
);

/* Footer de modal con botones Cancelar / Guardar */
export const ModalFooter = ({ onClose, onSave, saveLabel = "Guardar", disabled = false }) => (
  <div style={{
    display: "flex", gap: 10,
    padding: "16px 24px",
    borderTop: `1px solid ${C.border}`,
    background: C.blue50,
    borderRadius: "0 0 18px 18px",
    flexShrink: 0,
  }}>
    <button onClick={onClose} style={{
      flex: 1, padding: "10px",
      background: "white", border: `1px solid ${C.border}`,
      borderRadius: 11, color: C.textSub, fontWeight: 600,
      cursor: "pointer", fontFamily: "inherit", fontSize: 13,
    }}>Cancelar</button>
    <button onClick={onSave} disabled={disabled} style={{
      flex: 2, padding: "10px",
      background: disabled ? "#e2e8f0" : `linear-gradient(135deg,${C.blue900},${C.blue600})`,
      border: "none", borderRadius: 11,
      color: disabled ? C.textMut : "white",
      fontWeight: 700, cursor: disabled ? "default" : "pointer",
      fontFamily: "inherit", fontSize: 13,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
    }}>
      {saveLabel}
    </button>
  </div>
);

/* Overlay legacy — para compatibilidad con código viejo */
export const Overlay = ({ children, onClose }) => (
  <Modal onClose={onClose}>{children}</Modal>
);
