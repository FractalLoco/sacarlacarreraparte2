import { useState, useEffect } from "react";
import { Printer, PackageX, AlertCircle, Zap, Download } from "lucide-react";
import { cajasAPI, lotesAPI, tunelesAPI, despachosAPI } from "../api/client";
import { C, iS } from "../constants/theme";

export default function ImprimirEtiquetas({ onToast }) {
  const [lotes, setLotes] = useState([]);
  const [lote_id, setLoteId] = useState(null);
  const [cantidad, setCantidad] = useState(10);
  const [cajas, setCajas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [cliente, setCliente] = useState("");
  const [clientes, setClientes] = useState([]);
  const [abriendo, setAbriendo] = useState(false);
  const [descargando, setDescargando] = useState(false);

  // Para impresión directa de lote existente
  const [loteExistente, setLoteExistente] = useState(null);
  const [clienteDirecto, setClienteDirecto] = useState("");

  useEffect(() => {
    despachosAPI.clientes().then(setClientes).catch(() => {});
  }, []);

  const cargarLotes = async () => {
    if (lotes.length) return;
    try {
      const l = await lotesAPI.listar();
      setLotes(l);
    } catch (e) {
      onToast(e.message, "error");
    }
  };

  const generarCajas = async () => {
    if (!lote_id || !cantidad || cantidad < 1)
      return onToast("Completa los datos", "error");
    setCargando(true);
    try {
      const res = await cajasAPI.generarLote(lote_id, {
        cantidad_cajas: parseInt(cantidad),
      });
      setCajas(res.cajas);
      setGenerado(true);
      onToast(`${res.cantidad_cajas} etiquetas generadas`, "success");
    } catch (e) {
      onToast(e.message, "error");
    }
    setCargando(false);
  };

  const abrirEtiquetasZebra = async (id, nombreCliente) => {
    setAbriendo(true);
    try {
      const html = await tunelesAPI.etiquetasZebraLote(id, nombreCliente || null);
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const ventana = window.open(url, "_blank");
      if (!ventana) onToast("Permite las ventanas emergentes del navegador", "warning");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      onToast(e.message, "error");
    }
    setAbriendo(false);
  };

  const descargarZpl = async (id, nombreCliente) => {
    setDescargando(true);
    try {
      await tunelesAPI.descargarZplLote(id, nombreCliente || null);
      onToast("Archivo ZPL descargado — envíalo a la Zebra ZT411", "success");
    } catch (e) {
      onToast(e.message, "error");
    }
    setDescargando(false);
  };

  const loteSeleccionado = lotes.find((l) => l.id === parseInt(lote_id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 40px" }}>
      {/* Header */}
      <div style={{ background: "white", borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.blue900, marginBottom: 4 }}>
          Imprimir Etiquetas Zebra ZT411
        </h1>
        <p style={{ fontSize: 12, color: C.textSub }}>
          Etiquetas 10x10cm bilingüe (ES/EN) · TR3S AL MAR LTDA
        </p>
      </div>

      {/* ── Sección 1: Imprimir lote que ya tiene cajas ── */}
      <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.blue700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Imprimir etiquetas de lote existente
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <select
            value={loteExistente || ""}
            onChange={(e) => setLoteExistente(e.target.value ? parseInt(e.target.value) : null)}
            onFocus={cargarLotes}
            style={{ ...iS }}
          >
            <option value="">— Seleccionar lote —</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.codigo} · {l.kilos_brutos} kg
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Cliente (opcional)"
            value={clienteDirecto}
            onChange={(e) => setClienteDirecto(e.target.value)}
            list="lista-clientes"
            style={{ ...iS }}
          />
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => loteExistente
                ? descargarZpl(loteExistente, clienteDirecto)
                : onToast("Selecciona un lote", "error")
              }
              disabled={!loteExistente || descargando}
              style={{
                flex: 1,
                padding: "11px 0",
                background: !loteExistente ? C.textMut : `linear-gradient(135deg, #059669, #047857)`,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 800,
                fontSize: 12,
                cursor: !loteExistente ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Download size={14} />
              {descargando ? "Generando..." : "Descargar ZPL"}
            </button>
            <button
              onClick={() => loteExistente
                ? abrirEtiquetasZebra(loteExistente, clienteDirecto)
                : onToast("Selecciona un lote", "error")
              }
              disabled={!loteExistente || abriendo}
              style={{
                flex: 1,
                padding: "11px 0",
                background: !loteExistente ? C.textMut : `linear-gradient(135deg, ${C.blue900}, ${C.blue600})`,
                border: "none",
                borderRadius: 10,
                color: "white",
                fontWeight: 800,
                fontSize: 12,
                cursor: !loteExistente ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Printer size={14} />
              {abriendo ? "Preparando..." : "Ver HTML"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 11, color: C.textMut, fontWeight: 700 }}>O GENERA NUEVAS CAJAS</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* ── Sección 2: Generar cajas nuevas ── */}
      {!generado ? (
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.blue700, marginBottom: 8 }}>
              1. SELECCIONA UN LOTE *
            </label>
            <select
              value={lote_id || ""}
              onChange={(e) => setLoteId(e.target.value ? parseInt(e.target.value) : null)}
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.blue700, marginBottom: 8 }}>
              2. CANTIDAD DE CAJAS *
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: "white", fontSize: 18, cursor: "pointer" }}
              >−</button>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                style={{ ...iS, flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700 }}
              />
              <button
                onClick={() => setCantidad(cantidad + 1)}
                style={{ width: 40, height: 40, borderRadius: 8, border: `1px solid ${C.border}`, background: "white", fontSize: 18, cursor: "pointer" }}
              >+</button>
            </div>
          </div>

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
              cursor: !lote_id ? "default" : "pointer",
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
          <div style={{ background: "white", borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <PackageX size={18} color={C.success} />
              <span style={{ fontWeight: 800, color: C.success }}>{cajas.length} etiquetas generadas para el lote</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.blue700, marginBottom: 8 }}>
                CLIENTE (OPCIONAL)
              </label>
              <input
                type="text"
                placeholder="Nombre del cliente..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                list="lista-clientes-gen"
                style={{ ...iS, width: "100%" }}
              />
              <datalist id="lista-clientes-gen">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
              <p style={{ fontSize: 10, color: C.textMut, marginTop: 4 }}>
                Si se ingresa, aparecerá en todas las etiquetas como "Cliente / Customer"
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => descargarZpl(lote_id, cliente)}
                disabled={descargando}
                style={{
                  flex: 1,
                  padding: 13,
                  background: `linear-gradient(135deg, #059669, #047857)`,
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Download size={15} />
                {descargando ? "Generando..." : `Descargar ZPL (${cajas.length})`}
              </button>
              <button
                onClick={() => abrirEtiquetasZebra(lote_id, cliente)}
                disabled={abriendo}
                style={{
                  flex: 1,
                  padding: 13,
                  background: `linear-gradient(135deg, ${C.blue900}, ${C.blue600})`,
                  border: "none",
                  borderRadius: 10,
                  color: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Printer size={15} />
                {abriendo ? "Preparando..." : "Ver HTML"}
              </button>
            </div>

            <button
              onClick={() => { setGenerado(false); setCajas([]); setCliente(""); }}
              style={{
                width: "100%",
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
              Generar otras etiquetas
            </button>
          </div>

          <div style={{ background: "#f0fdf4", border: `1px solid #86efac`, borderRadius: 10, padding: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={16} color="#166534" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12, color: "#166534" }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Cómo imprimir en Zebra ZT411 (recomendado):</p>
              <ol style={{ margin: 0, paddingLeft: 16 }}>
                <li>Haz clic en <strong>Descargar ZPL</strong> — se descarga un archivo .zpl</li>
                <li>Abre <strong>Zebra Setup Utilities</strong> → pestaña "Tools"</li>
                <li>Clic en "Send File" y selecciona el .zpl descargado</li>
                <li>La impresora imprimirá cada etiqueta separada automáticamente</li>
              </ol>
              <p style={{ marginTop: 6, fontSize: 11 }}>Alternativa por red: <code>copy etiquetas.zpl \\nombrePC\ZebraZT411</code></p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
