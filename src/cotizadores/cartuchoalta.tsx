//src/cotizadores/cartuchoalta.tsx

import React, { useState, useEffect } from "react";
import { obtenerPrecioCartuchoAlta, obtenerPrecioCartuchoAltaMilimetrica, anchos } from "../datos/Resistencia_alta_C";
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
  //Area administracion
  const esAdministracion = perfil?.area === "Administración";
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
//convierto longitud de cm -> pulgadas
    const pulgadasReal =  Number(longitudCm) > 0? Number(longitudCm) / 2.54: 0;
//convierto diametro de mm -> pulgadas
const pulgadas =pulgadasReal > 0 ? anchos.reduce((prev, curr) => {
            return Math.abs(curr - pulgadasReal) <
                Math.abs(prev - pulgadasReal)
                ? curr
                : prev;
        }): 0;
    //sacamos el precio de la tabla
    const precioUnitario =
        milimetrica && diametroMm
            ? obtenerPrecioCartuchoAltaMilimetrica(
                Number(diametroMm),
                pulgadas,
                Number(medidaCableCm),
                terminal90
            )
            : diametro && pulgadas
                ? obtenerPrecioCartuchoAlta(diametro, pulgadas, Number(medidaCableCm),terminal90)
                : 0;

    const extraMilimetrica = milimetrica ? precioUnitario * 0.1 : 0;
    //precio del cabble si excede los 25cm
    const convertidorcable = (cableCm: number): number => {
        // Excedente después de 25 cm
        if (cableCm > 25) {
            return (cableCm - 25) * 1.7;
        }
        return 0;
    };
  const totalTerminal90 = terminal90 ? 170 : 0;//preguntar si se queda o se omite porque ya cobra con el precio del proveedor
    const totalTuboZapa = tubozapa ? 130 : 0;
//prueba para que salgan los valores 
    const precioNormal =
        diametro && pulgadas
            ? obtenerPrecioCartuchoAlta(diametro, pulgadas, Number(medidaCableCm),terminal90)
            : 0;

    const precioMilimetrico =
        milimetrica && diametroMm
            ? obtenerPrecioCartuchoAltaMilimetrica(
                Number(diametroMm),
                pulgadas,
                Number(medidaCableCm),
                terminal90
            )
            : 0;

  

  // total por UNA resistencia
  const totalPorResistencia =
    precioUnitario +
    //extraMilimetrica +
    (precioMilimetrico*.10) +
    convertidorcable(Number(medidaCableCm)) +
    //totalCable +
    totalTerminal90 +
    totalTuboZapa;
const subtotal = totalPorResistencia * 0.7;

// total general
const totalBase =
  subtotal * (Number(cantidadResistencias) || 0) * 1.7;

// Servicio Express +30%
const datosValidos =
  Number(cantidadResistencias) > 0 &&
  Number(longitudCm) > 0 &&
  (milimetrica ? Number(diametroMm) > 0 : diametro !== "");
const total = datosValidos ? (servicioExpress ? totalBase * 1.3 : totalBase) : 0;

  // Aplica plantilla sin cambiar cantidad ni servicio express.
  const aplicarStock = (stock: ResistenciaStockAlta) => {
    const v = stock.valores;
    setVoltaje(String(v.voltaje ?? ""));
    setWatts(String(v.potencia ?? ""));
    setLongitudCm(String(v.longitud ?? ""));
    const esMilimetrica = v.milimetrica === true;
    setmilimetrica(esMilimetrica);
    setDiametro(esMilimetrica ? "" : String(v.diametro ?? ""));
    setDiametroMm(esMilimetrica ? String(v.diametroMm ?? "") : "");

    const usarCable = String(v.cableAltaTemperatura ?? "").toUpperCase();
    setCableAltaTemperatura(usarCable);
    if (usarCable === "SI") {
      const texto = String(v.calibreGradosCable ?? "").trim().toLowerCase();
      const opcion = opcionesSoldarCable.find((item) =>
        String(item.id).toLowerCase() === texto ||
        String(item.tipo).trim().toLowerCase() === texto
      );
      setSoldarCableSeleccionado(opcion || null);
      setMedidaCableCm(opcion ? String(v.longitudCable ?? "") : "");
      setCantidadCables(opcion ? String(v.cantidadCables ?? "") : "");
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

      setCantidadResistencias(d.cantidadResistencias || "");
      setVoltaje(d.voltaje || "");
      setWatts(d.watts || "");
      setDiametro(d.diametro || "");
      setLongitudCm(d.longitudCm || "");

    setmilimetrica(!!d.milimetrica);
    setDiametroMm(d.diametroMm || "");
      setterminal90(!!d.terminal90);
      settubozapa(!!d.tubozapa);

      setCableAltaTemperatura(d.cableAltaTemperatura || "");
      setMedidaCableCm(d.medidaCableCm || "");
      setCantidadCables(d.cantidadCables || "");
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
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setCantidadResistencias(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Voltaje:</label>
          <input
            type="number"
            value={voltaje}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setVoltaje(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Potencia:</label>
          <input
            type="number"
            value={watts}
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setWatts(e.target.value)}
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
            onKeyDown={pasarAlSiguienteCampo}
            onChange={(e) => setLongitudCm(e.target.value)}
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
                          onKeyDown={pasarAlSiguienteCampo}
                          onChange={(e) => setDiametroMm(e.target.value)}
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
                      onKeyDown={pasarAlSiguienteCampo}
                      onChange={(e) => setMedidaCableCm(e.target.value)}
                      disabled={cableAltaTemperatura !== "SI" || !soldarCableSeleccionado}
                  />
              </div>
            {/*Cantidad de cables*/}
              <div className="form-row">
                  <label>Cantidad de cables:</label>
                  <input
                      type="number"
                      value={cantidadCables}
                      onKeyDown={pasarAlSiguienteCampo}
                      onChange={(e) => setCantidadCables(e.target.value)}
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
              <h2>Subtotal: {formatearMoneda(total)}</h2>
              <h1>Total: {formatearMoneda(total*1.16)}</h1>

              <button
                className="btn btn-blue"
                onClick={() => {
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
                        {formatearMoneda(precioNormal * 0.7)}
                      </p>

                      <p>
                        <strong>Precio milimétrica:</strong>{" "}
                        {formatearMoneda(precioMilimetrico * 0.7)}
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

                      <p>
                        <strong>Subtotal:</strong>{" "}
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
