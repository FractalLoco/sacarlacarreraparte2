import { useState } from "react";
import { Printer, PackageX, AlertCircle, Download, Zap } from "lucide-react";
import { cajasAPI, lotesAPI } from "../api/client";
import { C, iS } from "../constants/theme";

export default function ImprimirEtiquetas({ onToast }) {
  const [lotes, setLotes] = useState([]);
  const [lote_id, setLoteId] = useState(null);
  const [cantidad, setCantidad] = useState(10);
  const [calibre_id, setCalibreId] = useState(null);
  const [producto_tipo_id, setProductoTipoId] = useState(null);
  const [cajas, setCajas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);

  // Cargar lotes sin cajas aún (para generar etiquetas)
  const cargarLotes = async () => {
    try {
      setCargando(true);
      const l = await lotesAPI.listar();
      setLotes(l);
    } catch (e) {
      onToast(e.message, "error");
    }
    setCargando(false);
  };

  // Generar cajas para este lote
  const generarCajas = async () => {
    if (!lote_id || !cantidad || cantidad < 1)
      return onToast("Completa los datos", "error");

    setCargando(true);
    try {
      const res = await cajasAPI.generarLote(lote_id, {
        cantidad_cajas: parseInt(cantidad),
        calibre_id: calibre_id || null,
        producto_tipo_id: producto_tipo_id || null,
      });

      setCajas(res.cajas);
      setGenerado(true);
      onToast(`✓ ${res.cantidad_cajas} etiquetas generadas`, "success");
    } catch (e) {
      onToast(e.message, "error");
    }
    setCargando(false);
  };

  const imprimirEtiquetas = () => {
    window.print();
  };

  const loteSeleccionado = lotes.find((l) => l.id === parseInt(lote_id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.blue900, marginBottom: 4 }}>
          Imprimir Etiquetas en Lote
        </h1>
        <p style={{ fontSize: 12, color: C.textSub }}>
          Genera múltiples etiquetas (10x10cm) de una sola vez para pegar en cajas
        </p>
      </div>

      {!generado ? (
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          {/* Paso 1: Seleccionar lote */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.blue700, marginBottom: 8 }}>
              1. SELECCIONA UN LOTE *
            </label>
            <select
              value={lote_id || ""}
              onChange={(e) => {
                setLoteId(e.target.value ? parseInt(e.target.value) : null);
              }}
              onFocus={cargarLotes}
              style={{ ...iS, width: "100%" }}
            >
              <option value="">— Buscar lote —</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.kilos_brutos} kg
                </option>
              ))}
            </select>
          </div>

          {/* Información del lote */}
          {loteSeleccionado && (
            <div style={{ background: C.blue50, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${C.blue100}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.textMut, textTransform: "uppercase" }}>Código</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.blue900 }}>{loteSeleccionado.codigo}</p>
                </div>
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: C.textMut, textTransform: "uppercase" }}>Kg Brutos</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: C.blue900 }}>{loteSeleccionado.kilos_brutos}</p>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Cantidad de etiquetas */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.blue700, marginBottom: 8 }}>
              2. ¿CUÁNTAS CAJAS NECESITAS? *
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: "white",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                −
              </button>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                style={{ ...iS, flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700 }}
              />
              <button
                onClick={() => setCantidad(cantidad + 1)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: "white",
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Botón generar */}
          <button
            onClick={generarCajas}
            disabled={!lote_id || cargando}
            style={{
              width: "100%",
              padding: 12,
              background: !lote_id ? C.textMut : `linear-gradient(135deg, ${C.blue900}, ${C.blue600})`,
              border: "none",
              borderRadius: 10,
              color: "white",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Zap size={16} /> {cargando ? "Generando..." : "Generar Etiquetas"}
          </button>
        </div>
      ) : (
        <>
          {/* Etiquetas generadas */}
          <div style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <PackageX size={18} color={C.green600} />
              <span style={{ fontWeight: 800, color: C.green600 }}>✓ {cajas.length} etiquetas generadas</span>
            </div>
            <button
              onClick={imprimirEtiquetas}
              style={{
                width: "100%",
                padding: 12,
                background: `linear-gradient(135deg, ${C.blue900}, ${C.blue600})`,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Printer size={16} /> Imprimir Ahora
            </button>

            <button
              onClick={() => setGenerado(false)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 10,
                background: "white",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.textSub,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              ← Generar otras etiquetas
            </button>
          </div>

          {/* Vista previa imprimible */}
          <div style={{ display: "none" }} className="print-area">
            <PrintableLabels cajas={cajas} />
          </div>

          {/* Aviso de impresión */}
          <div
            style={{
              background: "#fef3c7",
              border: `1px solid #fcd34d`,
              borderRadius: 10,
              padding: 12,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} color="#92400e" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: "#92400e" }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Instrucciones para imprimir:</p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>Usa papel adhesivo 10x10cm</li>
                <li>Configura márgenes a 0</li>
                <li>Imprime en escala 100% (sin ajustar)</li>
                <li>Recorta y pega en cajas</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          * { display: none; }
          .print-area { display: block !important; }
          .print-area * { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function PrintableLabels({ cajas }) {
  return (
    <div style={{ width: "210mm", height: "297mm", padding: "10mm", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: "5mm", pageBreakInside: "avoid" }}>
      {cajas.map((c) => (
        <div
          key={c.id}
          style={{
            width: "65mm",
            height: "45mm",
            border: "2px solid #000",
            padding: "4mm",
            boxSizing: "border-box",
            fontFamily: "monospace",
            fontSize: "8pt",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            pageBreakInside: "avoid",
          }}
        >
          <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "10pt", paddingBottom: "2mm", borderBottom: "1px solid #000" }}>
            TR3S AL MAR
          </div>
          <div>
            <div>
              <strong>LOTE:</strong> {c.lote_codigo || "—"}
            </div>
            <div>
              <strong>CAJA:</strong> {c.numero_caja}
            </div>
            <div>
              <strong>KG:</strong> {parseFloat(c.kilos_netos).toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: "7pt", paddingTop: "2mm", borderTop: "1px solid #000" }}>
            {new Date().toLocaleDateString("es-CL")}
          </div>
        </div>
      ))}
    </div>
  );
}
