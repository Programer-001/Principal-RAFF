import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../../firebase/config";
import {
  generarPDFPagoBandaProveedor,
  type OrdenBandaProveedor,
} from "../../plantillas/plantila_pago_banda_proveedor";

type Orden = {
  id: string;
  ot?: string;
  descripcion?: string;
  total?: number;
  datos?: { cantidad?: number; [clave: string]: unknown };
  [clave: string]: unknown;
};

type RegistroFirebase = {
  fecha?: string;
  partidas?: Orden[] | Record<string, Orden>;
  total?: number;
  subtotal?: number;
};

export type PedidoGuardado = {
  id: string;
  fecha: string;
  partidas: Orden[];
  total: number;
};

type Fila = Orden & { registroId: string; fecha: string };

type Props = {

};

const moneda = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fechaCorta = (valor: string) => {
  if (!valor) return "—";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "—"
    : fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fechaCompleta = (valor: string) => {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? "Sin fecha"
    : fecha.toLocaleString("es-MX", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
      });
};

const estiloBoton: React.CSSProperties = {
  padding: "9px 13px", borderRadius: 6, border: "1px solid #cbd5e1",
  background: "#fff", cursor: "pointer", fontWeight: 600,
};

const ConsultaPagos: React.FC = () => {
  const [pedidos, setPedidos] = useState<PedidoGuardado[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const snapshot = await get(ref(db, "cotizaciones_banda_proovedor"));
      const registros = (snapshot.val() || {}) as Record<string, RegistroFirebase>;
      const resultado: PedidoGuardado[] = Object.entries(registros).map(([id, registro]) => {
        const partidas = (Array.isArray(registro.partidas)
          ? registro.partidas
          : Object.values(registro.partidas || {})).map((orden, index) => ({
          ...orden,
          id: orden.id || `${id}_${index}`,
        }));
        return {
          id,
          fecha: registro.fecha || "",
          partidas,
          total: Number.isFinite(Number(registro.total)) && registro.total !== undefined
            ? Number(registro.total)
            : partidas.reduce((s, p) => s + (Number(p.total) || 0), 0),
        };
      });
      resultado.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
      setPedidos(resultado);
      setSeleccionado((actual) => actual && resultado.some((p) => p.id === actual) ? actual : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al consultar Firebase");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const pedidoSeleccionado = useMemo(
    () => pedidos.find((p) => p.id === seleccionado) ?? null,
    [pedidos, seleccionado],
  );

  const filas = useMemo<Fila[]>(() =>
    pedidos.flatMap((pedido) => pedido.partidas.map((orden) => ({
      ...orden, registroId: pedido.id, fecha: pedido.fecha,
    }))), [pedidos]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (texto) {
      const normalizar = (s: string) => s.toLowerCase().replace(/^ot-/, "");
      const buscado = normalizar(texto);
      return filas.filter((fila) =>
        normalizar(fila.ot || "").includes(buscado) ||
        (fila.descripcion || "").toLowerCase().includes(texto),
      );
    }
    return seleccionado ? filas.filter((fila) => fila.registroId === seleccionado) : filas;
  }, [filas, busqueda, seleccionado]);

  const totalVisible = visibles.reduce((s, fila) => s + (Number(fila.total) || 0), 0);

  const reimprimir = async () => {
    if (!pedidoSeleccionado || imprimiendo) return;
    setImprimiendo(true);
    setError("");
    try {
      const ordenes: OrdenBandaProveedor[] = pedidoSeleccionado.partidas.map((orden) => ({
        id: orden.id,
        ot: orden.ot,
        descripcion: orden.descripcion,
        total: Number(orden.total) || 0,
        datos: orden.datos as OrdenBandaProveedor["datos"],
      }));
      const fecha = pedidoSeleccionado.fecha;
      const fechaPDF = fecha && !Number.isNaN(new Date(fecha).getTime())
        ? new Date(fecha).toLocaleDateString("es-MX")
        : undefined;
      await generarPDFPagoBandaProveedor({
        ordenes,
        fecha: fechaPDF,
        nombreArchivo: `Pago_Banda_Proveedor_${pedidoSeleccionado.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF");
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <section style={{ width: "89%", maxWidth: 1400, margin: "30px auto", padding: "20px 0", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(290px, 3fr)", gap: 24, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ marginTop: 0 }}>Consulta de órdenes guardadas</h3>
          <p>Selecciona un guardado del lado derecho para ver sus órdenes, o busca una OT entre todos los registros.</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              aria-label="Buscar OT o descripción en todos los pedidos"
              placeholder="Buscar OT o descripción (búsqueda global)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: 10, flex: "1 1 220px", minWidth: 0, border: "1px solid #cbd5e1", borderRadius: 6 }}
            />
            <button type="button" style={estiloBoton} onClick={() => { setBusqueda(""); setSeleccionado(null); }}>
              Mostrar todas
            </button>
            <button type="button" style={{ ...estiloBoton, background: "#2563eb", color: "white" }} disabled={cargando} onClick={() => void cargar()}>
              {cargando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          {pedidoSeleccionado && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: 12, marginBottom: 14 }}>
              <strong>Pedido: {fechaCompleta(pedidoSeleccionado.fecha)}</strong>
              <span> · {pedidoSeleccionado.partidas.length} órdenes · </span>
              <strong>{moneda(pedidoSeleccionado.total)}</strong>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  style={{ ...estiloBoton, background: "#16a34a", color: "white", opacity: 1 }}
                  disabled={imprimiendo}
                  title="Reimprimir PDF con la plantilla original"
                  onClick={() => void reimprimir()}
                >
                  {imprimiendo ? "Generando PDF..." : "Reimprimir PDF"}
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
          {cargando && <p>Cargando órdenes...</p>}
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", textAlign: "left", fontSize: 14 }}>
              <thead><tr>
                {["Folio", "Fecha", "Descripción", "Cantidad", "Total"].map((titulo) => (
                  <th key={titulo} style={{ padding: 10, borderBottom: "2px solid #cbd5e1" }}>{titulo}</th>
                ))}
              </tr></thead>
              <tbody>
                {visibles.map((fila, i) => (
                  <tr key={`${fila.registroId}-${fila.id}-${i}`}>
                    <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{fila.ot || "—"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{fechaCorta(fila.fecha)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{fila.descripcion || "—"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>{fila.datos?.cantidad ?? "—"}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{moneda(Number(fila.total) || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={4} style={{ padding: 10, textAlign: "right", fontWeight: 700 }}>Total mostrado:</td>
                <td style={{ padding: 10, fontWeight: 700 }}>{moneda(totalVisible)}</td>
              </tr></tfoot>
            </table>
            {!cargando && !visibles.length && <p>No se encontraron órdenes.</p>}
          </div>
          {busqueda.trim() && <p style={{ fontSize: 12, color: "#64748b" }}>Búsqueda global: {visibles.length} coincidencia(s). Para reimprimir, selecciona el pedido correspondiente en el panel derecho.</p>}
        </div>

        <aside style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: 20, position: "sticky", top: 12, minWidth: 0 }}>
          <h3 style={{ marginTop: 0 }}>Órdenes guardadas</h3>
          <div style={{ maxHeight: "calc(100vh - 190px)", minHeight: 180, overflowY: "auto", display: "grid", alignContent: "start", gap: 9 }}>
            {pedidos.map((pedido) => {
              const activo = pedido.id === seleccionado;
              return (
                <button
                  key={pedido.id}
                  type="button"
                  onClick={() => { setSeleccionado((actual) => actual === pedido.id ? null : pedido.id); setBusqueda(""); }}
                  style={{ textAlign: "left", padding: 13, borderRadius: 6, cursor: "pointer", border: `1px solid ${activo ? "#2563eb" : "#dbe2ea"}`, background: activo ? "#dbeafe" : "#f8fafc", color: "#0f172a" }}
                >
                  <strong style={{ display: "block" }}>{fechaCompleta(pedido.fecha)}</strong>
                  <span style={{ display: "block", marginTop: 5, color: "#475569" }}>
                    {pedido.partidas.length} órdenes · {moneda(pedido.total)}
                  </span>
                </button>
              );
            })}
            {!cargando && pedidos.length === 0 && <p>No hay pedidos guardados.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ConsultaPagos;
