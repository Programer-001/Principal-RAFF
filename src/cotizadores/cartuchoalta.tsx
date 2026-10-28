//src/cotizadores/cartuchoalta.tsx

import React, { useState, useEffect } from "react";
import { calcularCartuchoAltaProveedor, cargarTablaCartuchoAlta } from "../datos/Resistencia_alta_C";
import { formatearMoneda } from "../funciones/formato_moneda";
import { FiCopy } from "react-icons/fi";
import { ItemCotizado } from "../cotizador";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
type ResistenciaStockAlta = {
  id: string;
  nombre: string;
  tipo: string;
  habilitado: boolean;
  valores: {
    voltaje?: string;
    potencia?: string;
    diametro?: string;
    diametroMm?: string;
    longitud?: string;
    milimetrica?: boolean;
    cableAltaTemperatura?: string;
    calibreGradosCable?: string;
    longitudCable?: string;
    cantidadCables?: string;
    terminalCable90?: boolean;
    tuboZapa?: boolean;
    datosAdicionales?: string;
  };
};

interface Props {
    data?: ItemCotizado;
    onGuardar: (item: ItemCotizado) => void;
    setDirty: React.Dispatch<React.SetStateAction<boolean>>;
    perfil?: {
        area?: string;
        puesto?: string;
        username?: string;
    };
}
  const CartuchoAlta = ({ data, onGuardar, setDirty, perfil }: Props) => {
  const [cantidadResistencias, setCantidadResistencias] = useState("");
  const [voltaje, setVoltaje] = useState("");
  const [watts, setWatts] = useState("");
  const [diametro, setDiametro] = useState("");
  const [longitudCm, setLongitudCm] = useState("");
  const [milimetrica, setmilimetrica] = useState(false);
  const [diametroMm, setDiametroMm] = useState("");
  const [terminal90, setterminal90] = useState(false);
  const [tubozapa, settubozapa] = useState(false);
  const [cableAltaTemperatura, setCableAltaTemperatura] = useState("");
  const [medidaCableCm, setMedidaCableCm] = useState("");
  const [cantidadCables, setCantidadCables] = useState("");
  const [datosAdicionales, setDatosAdicionales] = useState("");
  const [opcionesSoldarCable, setOpcionesSoldarCable] = useState<any[]>([]);
  const [soldarCableSeleccionado, setSoldarCableSeleccionado] = useState<any>(null);
  const [servicioExpress, setServicioExpress] = useState(false);
  const [resistenciasStock, setResistenciasStock] = useState<ResistenciaStockAlta[]>([]);
  const [estadoTabla, setEstadoTabla] = useState<"cargando" | "lista" | "error">("cargando");
  // Todos los campos numéricos: vacío para cero y sin valores negativos.
  const normalizarNumero = (valor: string, entero = false): string => {
    if (valor === "" || valor === "0" || valor === "-0") return "";
    if (valor.includes("-") || valor.includes("+")) return "";
    if (valor.toLowerCase().includes("e")) return "";
    if (entero && valor.includes(".")) return "";
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || numero === 0) return "";
    return valor;
  };

  const impedirNegativos = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
  };

  const numeroGuardado = (valor: unknown, entero = false): string =>
    normalizarNumero(String(valor ?? ""), entero);

  //Area administracion
  const esAdministracion = perfil?.area === "Administración";
  // Cargar precios una sola vez al abrir el cotizador.
  useEffect(() => {
    let activo = true;
    cargarTablaCartuchoAlta()
      .then(() => { if (activo) setEstadoTabla("lista"); })
      .catch((error) => {
        console.error("Error cargando precios Cartucho Alta:", error);
        if (activo) setEstadoTabla("error");
      });
    return () => { activo = false; };
  }, []);
  //-------------------------------------useEffect-------------------------------------------->>
  useEffect(() => {
    const cargarSoldarCable = async () => {
      const snapshot = await get(ref(db, "cotizador/cable_para_soldar"));

      if (snapshot.exists()) {
        const data = snapshot.val();

        const opciones = Object.keys(data).map((key) => ({
          id: key,
          tipo: data[key].Tipo,
          precio: Number(data[key].Precio),
        }));

        setOpcionesSoldarCable(opciones);
      }
    };

    cargarSoldarCable();
  }, []);

  // Plantillas activas de Cartucho Alta desde Firebase
  useEffect(() => {
    const cargarStock = async () => {
      try {
        const snapshot = await get(ref(db, "ResistenciasStock"));
        if (!snapshot.exists()) {
          setResistenciasStock([]);
          return;
        }
        const lista: ResistenciaStockAlta[] = Object.entries(snapshot.val())
          .map(([id, item]: [string, any]) => ({
            id,
            nombre: item.nombre || "Sin nombre",
            tipo: item.tipo || "",
            habilitado: item.habilitado !== false,
            valores: item.valores || {},
          }))
          .filter((item) => item.habilitado && item.tipo === "CartuchoA")
          .sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
        setResistenciasStock(lista);
      } catch (error) {
        console.error("Error cargando stock Cartucho Alta:", error);
        setResistenciasStock([]);
      }
    };
    cargarStock();
  }, []);

  //---------------------------------FUNCIONES------------------------------------------------>>

  const tipoSoldarCable = soldarCableSeleccionado?.tipo || "";
  const precioSoldarCable = soldarCableSeleccionado?.precio || 0;

  const calcularPrecioCable = (precioPorMetro: number, cm: number): number => {
    if (!precioPorMetro || !cm) return 0;

    if (cm < 100) {
      return precioPorMetro;
    } else {
      return (cm / 100) * precioPorMetro;
    }
  };

  // total de cable por UNA resistencia
  const totalCable =
    calcularPrecioCable(precioSoldarCable, Number(medidaCableCm)) *
    (Number(cantidadCables) || 0);
  // El costo se calcula exclusivamente con el motor existente del proveedor.
  // No se aplica el descuento opcional del 30% del proveedor.
  const datosValidos =
    Number(cantidadResistencias) > 0 &&
    Number.isInteger(Number(cantidadResistencias)) &&
    Number(longitudCm) > 0 &&
    (milimetrica ? Number(diametroMm) > 0 : diametro !== "");

  const resultadoProveedor = estadoTabla === "lista" && datosValidos
    ? calcularCartuchoAltaProveedor({
        tipo: milimetrica ? "milimetros" : "pulgadas",
        diametro: milimetrica ? "" : diametro,
        mm: milimetrica ? Number(diametroMm) : 0,
        longitudCm: Number(longitudCm),
        cableCm: cableAltaTemperatura === "SI" ? Number(medidaCableCm) : 0,
        terminal90,
        descuento30: true,
      })
    : null;

  // El tubo zapa no está incluido en la función del proveedor.
  // Se conserva el cargo que ya utilizaba este cotizador.
  const totalTuboZapa = tubozapa ? 130 : 0;
  const precioUnitario = resultadoProveedor?.precioBase ?? 0;
  const extraMilimetrica = resultadoProveedor?.incrementoMilimetrico ?? 0;
  const totalTerminal90 = resultadoProveedor?.terminal ?? 0;
  const precioNormal = !milimetrica ? precioUnitario : 0;
  const precioMilimetrico = milimetrica ? precioUnitario : 0;
  const totalPorResistencia = (resultadoProveedor?.total ?? 0) + totalTuboZapa;
  const subtotalProveedor = totalPorResistencia * (Number(cantidadResistencias) || 0);
  const totalBase = subtotalProveedor * 1.70;
  const total = resultadoProveedor
    ? (servicioExpress ? totalBase * 1.30 : totalBase)
    : 0;

  // Aplica plantilla sin cambiar cantidad ni servicio express.
  const aplicarStock = (stock: ResistenciaStockAlta) => {
    const v = stock.valores;
    setVoltaje(numeroGuardado(v.voltaje));
    setWatts(numeroGuardado(v.potencia));
    setLongitudCm(numeroGuardado(v.longitud));
    const esMilimetrica = v.milimetrica === true;
    setmilimetrica(esMilimetrica);
    setDiametro(esMilimetrica ? "" : String(v.diametro ?? ""));
    setDiametroMm(esMilimetrica ? numeroGuardado(v.diametroMm) : "");

    const usarCable = String(v.cableAltaTemperatura ?? "").toUpperCase();
    setCableAltaTemperatura(usarCable);
    if (usarCable === "SI") {
      const texto = String(v.calibreGradosCable ?? "").trim().toLowerCase();
      const opcion = opcionesSoldarCable.find((item) =>
        String(item.id).toLowerCase() === texto ||
        String(item.tipo).trim().toLowerCase() === texto
      );
      setSoldarCableSeleccionado(opcion || null);
      setMedidaCableCm(opcion ? numeroGuardado(v.longitudCable) : "");
      setCantidadCables(opcion ? numeroGuardado(v.cantidadCables, true) : "");
      if (texto && !opcion) {
        alert(`No se encontró el cable "${v.calibreGradosCable}" en el catálogo. Selecciónalo manualmente.`);
      }
    } else {
      setSoldarCableSeleccionado(null);
      setMedidaCableCm("");
      setCantidadCables("");
    }
    setterminal90(v.terminalCable90 === true);
    settubozapa(v.tuboZapa === true);
    setDatosAdicionales(String(v.datosAdicionales ?? ""));
    setDirty(true);
  };

  const resetForm = () => {
    setCantidadResistencias("");
    setVoltaje("");
    setWatts("");
    setDiametro("");
    setLongitudCm("");
    setmilimetrica(false);
    setDiametroMm("");
    setterminal90(false);
    settubozapa(false);
    setCableAltaTemperatura("");
    setMedidaCableCm("");
    setCantidadCables("");
    setDatosAdicionales("");
    setServicioExpress(false);
    setSoldarCableSeleccionado(null);
  };
  //------------------------DESCRIPCION-------------------------------------------------->>

  const descripcion = [
    `${cantidadResistencias || 0} RESISTENCIA${
      Number(cantidadResistencias) > 1 ? "S" : ""
    } TIPO CARTUCHO DE ALTA CONCENTRACION`,

    `/ ${voltaje || 0}V - ${watts || 0}W`,

      milimetrica
          ? `/ DIAMETRO DE: ${diametroMm || 0} mm X LONGITUD DE: ${longitudCm || 0} CM`
          : `/ DIAMETRO DE: ${diametro || ""}" X LONGITUD DE: ${longitudCm || 0} CM`,



    cableAltaTemperatura === "SI"
      ? `/ ${cantidadCables || 0} CABLE${
          Number(cantidadCables) > 1 ? "S" : ""
        } DE: ${tipoSoldarCable || ""} DE ${medidaCableCm || 0} CM C/U`
      : null,

    terminal90 ? `/ TERMINAL DE CABLE A 90°` : null,

    tubozapa ? `/ TUBO ZAPA` : null,

    servicioExpress ? `/ SERVICIO EXPRESS` : null,

    datosAdicionales ? `/ DATOS: ${datosAdicionales}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  //----------------------------------------------useEffect------------------------------->>
  // Cargar datos si se proporciona un objeto "data"
  useEffect(() => {
    if (data) {
      const d = data.datos || {};

      setCantidadResistencias(numeroGuardado(d.cantidadResistencias, true));
      setVoltaje(numeroGuardado(d.voltaje));
      setWatts(numeroGuardado(d.watts));
      setDiametro(d.diametro || "");
      setLongitudCm(numeroGuardado(d.longitudCm));

    setmilimetrica(!!d.milimetrica);
    setDiametroMm(numeroGuardado(d.diametroMm));
      setterminal90(!!d.terminal90);
      settubozapa(!!d.tubozapa);

      setCableAltaTemperatura(d.cableAltaTemperatura || "");
      setMedidaCableCm(numeroGuardado(d.medidaCableCm));
      setCantidadCables(numeroGuardado(d.cantidadCables, true));
      setServicioExpress(!!d.servicioExpress);

      setDatosAdicionales(d.datosAdicionales || "");
      setSoldarCableSeleccionado(d.soldarCableSeleccionado || null);
    }
  }, [data]);
  // ---------------------------------------------------------
// ENTER → SIGUIENTE CAMPO
// ---------------------------------------------------------
const pasarAlSiguienteCampo = (
    e: React.KeyboardEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const formulario = e.currentTarget.closest(".form-container");
    if (!formulario) return;

    const elementos = Array.from(
        formulario.querySelectorAll<HTMLElement>(
            'input:not(:disabled):not([type="checkbox"]), select:not(:disabled), textarea:not(:disabled)'
        )
    ).filter((elemento) => elemento.getClientRects().length > 0);

    const posicionActual = elementos.indexOf(e.currentTarget);

    if (posicionActual >= 0) {
        elementos[posicionActual + 1]?.focus();
    }
};
  //---------------------HTML---------------------------------------------------------------------->>
  return (
    <>
      <div className="form-container">
        <h1>Cartucho de alta concentración</h1>

        <div className="form-row">
          <label>Cantidad:</label>
          <input
            type="number"
            value={cantidadResistencias}
            onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
            onChange={(e) => setCantidadResistencias(normalizarNumero(e.target.value, true))}
          />
        </div>

        <div className="form-row">
          <label>Voltaje:</label>
          <input
            type="number"
            value={voltaje}
            onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
            onChange={(e) => setVoltaje(normalizarNumero(e.target.value))}
          />
        </div>

        <div className="form-row">
          <label>Potencia:</label>
          <input
            type="number"
            value={watts}
            onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
            onChange={(e) => setWatts(normalizarNumero(e.target.value))}
          />
        </div>

        <div className="form-row">
          <label>Diametro:</label>
          <select
            value={diametro}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setDiametro(e.target.value)}
            disabled={milimetrica}
          >
            <option value="">Selecciona</option>
            <option value="1/4">1/4</option>
             <option value="5/16">5/16</option>
            <option value="3/8">3/8</option>
            <option value="1/2">1/2</option>
            <option value="5/8">5/8</option>
            <option value="3/4">3/4</option>
          </select>
        </div>

        <div className="form-row">
          <label>Longitud:</label>
          <input
            type="number"
            value={longitudCm}
            onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
            onChange={(e) => setLongitudCm(normalizarNumero(e.target.value))}
          />
        </div>

        <div className="form-row checkbox-row">
          <label>Milimetrica:</label>
                  <input
                      type="checkbox"
                      checked={milimetrica}
                      onKeyDown={pasarAlSiguienteCampo}
                      onChange={(e) => {
                          const checked = e.target.checked;
                          setmilimetrica(checked);

                          if (checked) {
                              setDiametro("");
                          } else {
                              setDiametroMm("");
                          }
                      }}
                  />
              </div>
              {milimetrica && (
                  <div className="form-row">
                      <label>Diámetro en mm:</label>
                      <input
                          type="number"
                          value={diametroMm}
                          onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
                          onChange={(e) => setDiametroMm(normalizarNumero(e.target.value))}
                          placeholder="Ej. 20"
                      />
                  </div>
              )}

              <div className="form-row">
                  <label>Cable de alta temperatura:</label>
                  <select
                      value={cableAltaTemperatura}
                      onKeyDown={pasarAlSiguienteCampo}
                      onChange={(e) => {
                          const valor = e.target.value;
                          setCableAltaTemperatura(valor);

                          // limpiar si cambia a NO o vacío
                          if (valor !== "SI") {
                              setSoldarCableSeleccionado(null);
                              setMedidaCableCm("");
                              setCantidadCables("");
                          }
                      }}
                  >
                      <option value="">Selecciona</option>
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                  </select>
              </div>

              <div className="form-row">
                  <label>Calibre y grados de cable:</label>
                  <select
                      value={soldarCableSeleccionado?.id || ""}
                      onKeyDown={pasarAlSiguienteCampo}
                      onChange={(e) => {
                          const id = e.target.value;

                          const seleccionado = opcionesSoldarCable.find(
                              (item) => item.id === id
                          );

                          setSoldarCableSeleccionado(seleccionado || null);

                          // si borra la selección, limpia los campos de abajo
                          if (!id) {
                              setMedidaCableCm("");
                              setCantidadCables("");
                          }
                      }}
                      disabled={cableAltaTemperatura !== "SI"}
                  >
                      <option value="">Seleccione...</option>

                      {opcionesSoldarCable.map((item) => (
                          <option key={item.id} value={item.id}>
                              {item.tipo}
                          </option>
                      ))}
                  </select>
              </div>
            {/*Longitud de cable*/}
              <div className="form-row">
                  <label>Longitud de cable (cm):</label>
                  <input
                      type="number"
                      value={medidaCableCm}
                      onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
                      onChange={(e) => setMedidaCableCm(normalizarNumero(e.target.value))}
                      disabled={cableAltaTemperatura !== "SI" || !soldarCableSeleccionado}
                  />
              </div>
            {/*Cantidad de cables*/}
              <div className="form-row">
                  <label>Cantidad de cables:</label>
                  <input
                      type="number"
                      value={cantidadCables}
                      onKeyDown={(e) => { impedirNegativos(e); pasarAlSiguienteCampo(e); }}
                      onChange={(e) => setCantidadCables(normalizarNumero(e.target.value, true))}
                      disabled={cableAltaTemperatura !== "SI" || !soldarCableSeleccionado || !medidaCableCm}
                  />
              </div>
          {/*terminal 90°*/}
        <div className="form-row checkbox-row">
          <label>Terminal de cable a 90°:</label>
          <input
            type="checkbox"
            checked={terminal90}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setterminal90(e.target.checked)}
          />
        </div>
        {/*Tubo zapa*/}
        <div className="form-row checkbox-row">
          <label>Tubo zapa:</label>
          <input
            type="checkbox"
            checked={tubozapa}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => settubozapa(e.target.checked)}
          />
        </div>
        {/*servicio express*/}
      <div className="form-row checkbox-row">
      <label>Servicio Express (+30%):</label>
      <input
        type="checkbox"
        checked={servicioExpress}
        onKeyDown={pasarAlSiguienteCampo}
        onChange={(e) => setServicioExpress(e.target.checked)}
      />
    </div>
    {/*datos adicionales*/}
        <div className="form-row textarea-row">
        <label>Datos Adicionales:</label>
          <textarea
            value={datosAdicionales}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setDatosAdicionales(e.target.value)}
            placeholder="Ej. salida a 90°"
          />
        </div>
          {/* DESCRIPCIÓN FORMATEADA PARA COPIAR */}
            <div
              style={{
                border: "1px solid #ccc",
                padding: "20px",
                margin: "12px 0 20px 0",
                borderRadius: "8px",
                background: "#f9f9f9",
                top: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Descripción</h3>

                <button
                  type="button"
                  title="Copiar descripción"
                  onClick={() => navigator.clipboard.writeText(descripcion)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 4,
                  }}
                >
                  <FiCopy size={18} />
                </button>
              </div>

              <p style={{ fontSize: "14px" }}>{descripcion}</p>
               </div>
            {/* TOTAL */}
              {estadoTabla === "cargando" && <p role="status">Cargando precios de Cartucho Alta desde Firebase...</p>}
              {estadoTabla === "error" && <p role="alert" style={{ color: "#b91c1c" }}>No se pudieron cargar los precios desde Firebase. No es posible agregar la cotización.</p>}
              <h2>Subtotal: {formatearMoneda(total)}</h2>
              <h1>Total: {formatearMoneda(total*1.16)}</h1>

              <button
                className="btn btn-blue"
                disabled={estadoTabla !== "lista"}
                onClick={() => {
                 if (estadoTabla !== "lista" || !Number.isFinite(total) || total <= 0) {
                   alert("No hay un precio válido de Cartucho Alta disponible.");
                   return;
                 }
                // Validaciones obligatorias
                if (Number(cantidadResistencias) <= 0) {
                    alert("Debes ingresar una cantidad mayor a cero.");
                    return;
                }

                if (milimetrica) {
                    if (Number(diametroMm) <= 0) {
                        alert("Debes ingresar un diámetro en milímetros.");
                        return;
                    }
                } else {
                    if (!diametro) {
                        alert("Debes seleccionar un diámetro.");
                        return;
                    }
                }

                if (Number(longitudCm) <= 0) {
                    alert("Debes ingresar una longitud mayor a cero.");
                    return;
                }
                {/*Guardar variables*/}

                  onGuardar({
                    id: data?.id || Date.now().toString(),
                    tipo: "CartuchoA",
                    descripcion,
                    total: Number(total.toFixed(2)),
                    datos: {
                      cantidadResistencias,
                      voltaje,
                      potencia: watts,
                      watts,
                      diametro,
                      longitudCm,

                      milimetrica,
                      diametroMm,
                      terminal90,
                      tubozapa,

                      cableAltaTemperatura,
                      medidaCableCm,
                      cantidadCables,

                      soldarCableSeleccionado,
                      tipoSoldarCable,
                      precioSoldarCable,
                      totalCable,

                      precioUnitario,
                      extraMilimetrica,
                      totalTerminal90,
                      totalTuboZapa,
                      servicioExpress,

                      datosAdicionales,
                    },
                  });
                  resetForm();
                  setDirty(false);
                }}
              >
                {data ? "ACTUALIZAR" : "AGREGAR"}
              </button>

              {resistenciasStock.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 20 }}>
                  {resistenciasStock.map((stock) => (
                    <button
                      key={stock.id}
                      type="button"
                      onClick={() => aplicarStock(stock)}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer", fontWeight: "bold" }}
                    >
                      {stock.nombre}
                    </button>
                  ))}
                </div>
              )}

             
              {/* Datos de administrador */}
              {esAdministracion && (
                    <div
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: 8,
                        padding: 12,
                        marginTop: 15,
                        background: "#f8f8f8",
                        fontFamily: "monospace",
                      }}
                    >
                      <h3>Variables de Cartucho Alta</h3>

                      <p>
                        <strong>Precio normal:</strong>{" "}
                        {formatearMoneda(precioNormal)}
                      </p>

                      <p>
                        <strong>Precio milimétrica:</strong>{" "}
                        {formatearMoneda(precioMilimetrico)}
                      </p>

                      <hr />

                      <p>
                        <strong>Precio del cable:</strong>{" "}
                        {formatearMoneda(precioSoldarCable)}
                      </p>

                      <p>
                        <strong>Total cable:</strong>{" "}
                        {formatearMoneda(totalCable)}
                      </p>

                      <p>
                        <strong>Extra milimétrica:</strong>{" "}
                        {formatearMoneda(extraMilimetrica)}
                      </p>

                      <p>
                        <strong>Terminal 90:</strong>{" "}
                        {formatearMoneda(totalTerminal90)}
                      </p>

                      <p>
                        <strong>Tubo zapa:</strong>{" "}
                        {formatearMoneda(totalTuboZapa)}
                      </p>

                      <hr />

                      <p>
                        <strong>Precio por resistencia:</strong>{" "}
                        {formatearMoneda(totalPorResistencia)}
                      </p>

                      <p><strong>Subtotal proveedor (cantidad):</strong>{" "}{formatearMoneda(subtotalProveedor)}</p>
                      <p>
                        <strong>Subtotal de venta:</strong>{" "}
                        {formatearMoneda(total)}
                      </p>

                      <p>
                        <strong>Total + IVA:</strong>{" "}
                        {formatearMoneda(total * 1.16)}
                      </p>
                    </div>
              )}

{/*Fin de todo el formulario con todo y botones de stock */}
      </div>
    </>
  );
};
export default CartuchoAlta;
