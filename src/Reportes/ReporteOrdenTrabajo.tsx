// src/Reportes/ReporteOrdenTrabajo.tsx
// Consulta exclusivamente: no escribe, actualiza ni elimina datos de Firebase.
import React, { useState } from "react";
import { getDatabase, get, ref } from "firebase/database";
import { app } from "../firebase/config";

type Objeto = Record<string, any>;
type Movimiento = { ruta: string; datos: Objeto };

const texto = (valor: unknown): string =>
  valor === null || valor === undefined || String(valor).trim() === ""
    ? "—"
    : String(valor);

const fecha = (valor: unknown): string => {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "number") {
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? texto(valor) : d.toLocaleString("es-MX");
  }
  const s = String(valor);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleString("es-MX");
  }
  return s;
};

// Firebase puede devolver numerosSerie como arreglo o como objeto con claves "0", "1", etc.
const obtenerNumerosSerie = (partida: Objeto): string[] => {
  const origen = partida.numerosSerie;
  const valores = Array.isArray(origen)
    ? origen
    : origen && typeof origen === "object"
      ? Object.entries(origen as Objeto)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([, valor]) => valor)
      : origen === null || origen === undefined ? [] : [origen];
  return valores
    .filter((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "")
    .map((valor) => String(valor).trim());
};

const normalizarFactura = (valor: unknown): string =>
  String(valor ?? "").trim().toUpperCase().replace(/\s+/g, "");

function facturasDeOT(ot: Objeto): string[] {
  const origen = ot.facturas;
  if (!origen) return [];
  const elementos = Array.isArray(origen)
    ? origen
    : typeof origen === "object"
      ? Object.values(origen)
      : [origen];
  return Array.from(new Set(elementos.map((item: any) => {
    const valor = item && typeof item === "object" ? item.factura : item;
    return valor === null || valor === undefined ? "" : String(valor).trim();
  }).filter(Boolean)));
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: { padding: 20, maxWidth: 1250, margin: "0 auto", fontFamily: "Arial, sans-serif", color: "#172033" },
  tarjeta: { background: "#fff", border: "1px solid #dce3eb", borderRadius: 10, padding: 18, marginTop: 18 },
  rejilla: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  etiqueta: { fontSize: 12, color: "#596579", marginBottom: 4 },
  valor: { fontWeight: 600, overflowWrap: "anywhere" },
  tabla: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  celda: { borderBottom: "1px solid #e5e9ef", padding: "10px 8px", textAlign: "left", verticalAlign: "top", overflowWrap: "anywhere" },
  boton: { padding: "10px 15px", border: 0, borderRadius: 6, background: "#174ea6", color: "white", cursor: "pointer" },
};

const Campo: React.FC<{ nombre: string; valor: unknown }> = ({ nombre, valor }) => (
  <div>
    <div style={estilos.etiqueta}>{nombre}</div>
    <div style={estilos.valor}>{texto(valor)}</div>
  </div>
);

const Tabla: React.FC<{ columnas: string[]; filas: React.ReactNode[][] }> = ({ columnas, filas }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={estilos.tabla}>
      <thead><tr>{columnas.map((c) => <th key={c} style={{ ...estilos.celda, background: "#f2f5fa" }}>{c}</th>)}</tr></thead>
      <tbody>{filas.length ? filas.map((fila, i) => (
        <tr key={i}>{fila.map((celda, j) => <td key={j} style={estilos.celda}>{celda}</td>)}</tr>
      )) : <tr><td style={estilos.celda} colSpan={columnas.length}>Sin registros.</td></tr>}</tbody>
    </table>
  </div>
);

const ReporteOrdenTrabajo: React.FC = () => {
  const [numero, setNumero] = useState("");
  const [clave, setClave] = useState("");
  const [ot, setOt] = useState<Objeto | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscandoCorte, setBuscandoCorte] = useState(false);
  const [corteConsultado, setCorteConsultado] = useState(false);
  const [error, setError] = useState("");
  const [errorCorte, setErrorCorte] = useState("");

  const buscar = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const digitos = numero.replace(/\D/g, "");
    setOt(null); setClave(""); setMovimientos([]); setCorteConsultado(false);
    setError(""); setErrorCorte("");
    if (!digitos) { setError("Escribe un número de orden válido."); return; }
    const key = `ot${digitos.padStart(5, "0")}`;
    setBuscando(true);
    try {
      const snap = await get(ref(getDatabase(app), `ordenes_trabajo/${key}`));
      if (!snap.exists()) { setError(`No se encontró ${key}.`); return; }
      setClave(key);
      setOt(snap.val() as Objeto);
    } catch (e) {
      console.error("Error consultando OT", e);
      setError("No fue posible consultar la orden. Revisa tu conexión y permisos de lectura.");
    } finally { setBuscando(false); }
  };

  const facturas = ot ? facturasDeOT(ot) : [];

  const buscarCorte = async () => {
    if (!ot || !facturas.length) return;
    setBuscandoCorte(true); setErrorCorte(""); setMovimientos([]); setCorteConsultado(false);
    try {
      // La estructura compartida es corte-caja/<día>/<movimiento>.
      // Esta consulta lee el nodo completo SOLO cuando el usuario pulsa el botón.
      // Para bases grandes conviene crear posteriormente un índice factura -> movimientos.
      const snap = await get(ref(getDatabase(app), "corte-caja"));
      const buscadas = new Set(facturas.map(normalizarFactura));
      const encontrados: Movimiento[] = [];
      if (snap.exists()) {
        const dias = snap.val() as Objeto;
        for (const [dia, registros] of Object.entries(dias)) {
          if (!registros || typeof registros !== "object") continue;
          for (const [id, registro] of Object.entries(registros as Objeto)) {
            if (!registro || typeof registro !== "object") continue;
            const factura = (registro as Objeto).factura;
            const valores = Array.isArray(factura) ? factura : [factura];
            if (valores.some((v) => buscadas.has(normalizarFactura(v)) && normalizarFactura(v) !== "")) {
              encontrados.push({ ruta: `corte-caja/${dia}/${id}`, datos: registro as Objeto });
            }
          }
        }
      }
      setMovimientos(encontrados);
      setCorteConsultado(true);
    } catch (e) {
      console.error("Error consultando corte de caja", e);
      setErrorCorte("No se pudo consultar corte de caja. Revisa los permisos y la conexión.");
    } finally { setBuscandoCorte(false); }
  };

  const partidas = ot?.trabajos && typeof ot.trabajos === "object"
    ? Object.entries(ot.trabajos as Objeto).map(([id, valor]) => ({ id, datos: valor as Objeto }))
    : [];
  const cliente = ot?.clienteSnapshot || {};
  const asesor = ot?.asesorSnapshot || {};

  return (
    <main style={estilos.pagina}>
      <h2>Reporte de orden de trabajo</h2>
      <p>Consulta de información registrada en Firebase. Este módulo no modifica datos.</p>
      <form onSubmit={buscar} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input aria-label="Número de OT" placeholder="Ej. 888 u OT-00888" value={numero}
          onChange={(e) => setNumero(e.target.value)} style={{ padding: 10, minWidth: 220, border: "1px solid #b7c1d0", borderRadius: 6 }} />
        <button type="submit" disabled={buscando} style={estilos.boton}>{buscando ? "Buscando…" : "Buscar OT"}</button>
        {ot && <button type="button" onClick={() => window.print()} style={estilos.boton}>Imprimir / guardar PDF</button>}
      </form>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}

      {ot && <>
        <section style={estilos.tarjeta}>
          <h3>{texto(ot.otLabel !== undefined ? ot.otLabel : `OT-${clave.slice(2)}`)} · Información general</h3>
          <div style={estilos.rejilla}>
            <Campo nombre="Clave Firebase" valor={clave} />
            <Campo nombre="Fecha registrada en mostrador" valor={fecha(ot.fecha)} />
            <Campo nombre="Entrada a almacén" valor={fecha(ot.Entrada_Almacen)} />
            <Campo nombre="Estado general" valor={ot.estadoGeneral} />
            <Campo nombre="Tipo de documento" valor={ot.tipoDocumento} />
            <Campo nombre="Cliente" valor={cliente.razonSocial || cliente.nombre || "PÚBLICO GENERAL"} />
            <Campo nombre="Teléfono" valor={cliente.telefono} />
            <Campo nombre="Asesor" valor={asesor.username || asesor.nombre} />
            <Campo nombre="Número de partidas" valor={partidas.length} />
            <Campo nombre="En taller" valor={ot.taller === undefined ? "—" : ot.taller ? "Sí" : "No"} />
            <Campo nombre="Envío" valor={ot.envio === undefined ? "—" : ot.envio ? "Sí" : "No"} />
            <Campo nombre="Folio de envío" valor={ot.envioFolio} />
          </div>
        </section>

        <section style={estilos.tarjeta}>
          <h3>Importes y facturación</h3>
          <div style={estilos.rejilla}>
            <Campo nombre="Subtotal" valor={ot.subtotal} />
            <Campo nombre="Descuento del cliente" valor={ot.descuentoCliente} />
            <Campo nombre="Total con descuento" valor={ot.totalConDescuento} />
            <Campo nombre="Total con IVA (si está registrado)" valor={ot.totalConIva} />
            <Campo nombre="Crédito" valor={ot.credito === undefined ? "—" : typeof ot.credito === "boolean" ? ot.credito ? "Sí" : "No" : JSON.stringify(ot.credito)} />
            <Campo nombre="Pagado (valor registrado)" valor={typeof ot.pagado === "object" ? JSON.stringify(ot.pagado) : ot.pagado} />
            <Campo nombre="Facturas vinculadas" valor={facturas.length ? facturas.join(", ") : "Sin factura vinculada"} />
          </div>
        </section>

        <section style={estilos.tarjeta}>
          <h3>Partidas de producción ({partidas.length})</h3>
          <Tabla columnas={["Partida", "Tipo", "Operador", "Estado", "Inspeccionó", "Resultado"]}
            filas={partidas.map(({ id, datos: p }, i) => [
              texto(p.partida || `Partida ${i + 1} (${id})`), texto(p.tipo), texto(p.trabajador),
              texto(p.estadoProduccion), texto(p.inspeccion?.usuario),
              p.inspeccion?.aprobado === undefined ? "—" : p.inspeccion.aprobado ? "Aprobada" : "No aprobada",
            ])} />
          {partidas.map(({ id, datos: p }, i) => <details key={id} style={{ marginTop: 14, border: "1px solid #e5e9ef", borderRadius: 8, padding: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>{texto(p.partida || `Partida ${i + 1}`)} · Ver desglose completo</summary>
            <div style={{ ...estilos.rejilla, marginTop: 16 }}>
              <Campo nombre="Clave de partida" valor={id} />
              <Campo nombre="Tipo" valor={p.tipo} />
              <Campo nombre="Estado de producción" valor={p.estadoProduccion} />
              <Campo nombre="Operador asignado" valor={p.trabajador} />
              <Campo nombre="Inicio de fabricación" valor={fecha(p.fechaInicio)} />
              <Campo nombre="Fin de fabricación" valor={fecha(p.fechaFin)} />
              <Campo nombre="Material solicitado" valor={p.materialSolicitado === undefined ? "—" : p.materialSolicitado ? "Sí" : "No"} />
              <Campo nombre="Material entregado" valor={p.materialEntregado === undefined ? "—" : p.materialEntregado ? "Sí" : "No"} />
              <Campo nombre="Fecha de entrega de material" valor={fecha(p.materialEntregaFecha)} />
              <Campo nombre="Pedido recibido" valor={p.pedido_recibido} />
              <Campo nombre="Inspeccionó" valor={p.inspeccion?.usuario} />
              <Campo nombre="Fecha de inspección" valor={fecha(p.inspeccion?.fecha)} />
              <Campo nombre="Resultado de inspección" valor={p.inspeccion?.aprobado === undefined ? "—" : p.inspeccion.aprobado ? "Aprobada" : "No aprobada"} />
              <Campo nombre="Observaciones" valor={p.inspeccion?.observaciones} />
              <div>
                <div style={estilos.etiqueta}>Números de serie</div>
                {obtenerNumerosSerie(p).length ? (
                  <div style={estilos.valor}>
                    {obtenerNumerosSerie(p).map((serie, indice) => (
                      <div key={`${id}-serie-${indice}`}>{serie}</div>
                    ))}
                  </div>
                ) : (
                  <div style={estilos.valor}>No hay números de serie registrados en esta partida.</div>
                )}
              </div>
            </div>
            <h4>Descripción</h4>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{texto(p.descripcion)}</p>
            <details><summary style={{ cursor: "pointer" }}>Ver datos adicionales guardados de la partida</summary>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(p.datos ?? {}, null, 2)}</pre>
            </details>
          </details>)}
        </section>

        <section style={estilos.tarjeta}>
          <h3>Movimientos relacionados en corte de caja</h3>
          {!facturas.length ? <p>Esta OT no tiene números de factura vinculados en el campo facturas.</p> : <>
            <p>Facturas a localizar: <strong>{facturas.join(", ")}</strong></p>
            <button type="button" onClick={buscarCorte} disabled={buscandoCorte} style={estilos.boton}>
              {buscandoCorte ? "Consultando corte de caja…" : "Buscar movimientos por factura"}
            </button>
            <p style={{ fontSize: 12, color: "#596579" }}>La búsqueda recorre corte-caja al pulsar el botón; si el nodo es grande, puede consumir una descarga considerable.</p>
            {errorCorte && <p role="alert" style={{ color: "#b42318" }}>{errorCorte}</p>}
            {corteConsultado && <>
              <p>{movimientos.length ? `${movimientos.length} movimiento(s) encontrado(s).` : "No se encontraron movimientos con esas facturas."}</p>
              <Tabla columnas={["Ruta", "Factura", "Fecha", "Cantidad", "Método", "Estatus", "Transacción", "Comentarios", "ID"]}
                filas={movimientos.map(({ ruta, datos: m }) => [
                  texto(ruta), texto(m.factura), fecha(m.fecha), texto(m.cantidad), texto(m.metodo),
                  texto(m.estatus), texto(m.transaccion), texto(m.comentarios), texto(m.id),
                ])} />
            </>}
          </>}
        </section>

        <section style={estilos.tarjeta}>
          <details><summary style={{ cursor: "pointer", fontWeight: 700 }}>Ver todos los datos originales de esta OT (JSON, solo lectura)</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12 }}>{JSON.stringify(ot, null, 2)}</pre>
          </details>
        </section>
      </>}
    </main>
  );
};

export default ReporteOrdenTrabajo;