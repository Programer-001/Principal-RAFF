//src/cotizadores/cartuchobaja.tsx

import React, { useState, useEffect } from "react";
import { obtenerPrecioCartuchoAlta } from "../datos/Resistencia_alta_C";
import { formatearMoneda } from "../funciones/formato_moneda";
import { ItemCotizado } from "../cotizador";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
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
  const [terminal90, setterminal90] = useState(false);
  const [tubozapa, settubozapa] = useState(false);
  const [cableAltaTemperatura, setCableAltaTemperatura] = useState("");
  const [medidaCableCm, setMedidaCableCm] = useState("");
  const [cantidadCables, setCantidadCables] = useState("");
  const [datosAdicionales, setDatosAdicionales] = useState("");
  const [opcionesSoldarCable, setOpcionesSoldarCable] = useState<any[]>([]);
  const [soldarCableSeleccionado, setSoldarCableSeleccionado] =
    useState<any>(null);
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

  const pulgadas = longitudCm ? Math.round(Number(longitudCm) / 2.54) : 0;

  const precioUnitario =
    diametro && pulgadas ? obtenerPrecioCartuchoAlta(diametro, pulgadas) : 0;

    const extraMilimetrica = milimetrica ? precioUnitario * 0.1 : 0;

  const totalTerminal90 = terminal90 ? 150 : 0;
  const totalTuboZapa = tubozapa ? 130 : 0;

  // total por UNA resistencia
  const totalPorResistencia =
    precioUnitario +
    extraMilimetrica +
    totalCable +
    totalTerminal90 +
    totalTuboZapa;

  // total general
  const total = totalPorResistencia * (Number(cantidadResistencias) || 0);

  const resetForm = () => {
    setCantidadResistencias("");
    setVoltaje("");
    setWatts("");
    setDiametro("");
    setLongitudCm("");
    setmilimetrica(false);
    setterminal90(false);
    settubozapa(false);
    setCableAltaTemperatura("");
    setMedidaCableCm("");
    setCantidadCables("");
    setDatosAdicionales("");
    setSoldarCableSeleccionado(null);
  };
  //------------------------DESCRIPCION-------------------------------------------------->>

  const descripcion = [
    `${cantidadResistencias || 0} RESISTENCIA${
      Number(cantidadResistencias) > 1 ? "S" : ""
    } TIPO CARTUCHO DE ALTA CONCENTRACION`,

    `/ ${voltaje || 0}V - ${watts || 0}W`,

    `/ DIAMETRO DE: ${diametro || ""}" X LONGITUD DE: ${longitudCm || 0} CM`,

    milimetrica ? `/ MILIMETRICA` : null,

    cableAltaTemperatura === "SI"
      ? `/ ${cantidadCables || 0} CABLE${
          Number(cantidadCables) > 1 ? "S" : ""
        } DE: ${tipoSoldarCable || ""} DE ${medidaCableCm || 0} CM C/U`
      : null,

    terminal90 ? `/ TERMINAL DE CABLE A 90°` : null,

    tubozapa ? `/ TUBO ZAPA` : null,

    datosAdicionales ? `/ DATOS: ${datosAdicionales}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  //----------------------------------------------useEffect------------------------------->>
  useEffect(() => {
    if (data) {
      const d = data.datos || {};

      setCantidadResistencias(d.cantidadResistencias || "");
      setVoltaje(d.voltaje || "");
      setWatts(d.watts || "");
      setDiametro(d.diametro || "");
      setLongitudCm(d.longitudCm || "");

      setmilimetrica(!!d.milimetrica);
      setterminal90(!!d.terminal90);
      settubozapa(!!d.tubozapa);

      setCableAltaTemperatura(d.cableAltaTemperatura || "");
      setMedidaCableCm(d.medidaCableCm || "");
      setCantidadCables(d.cantidadCables || "");

      setDatosAdicionales(d.datosAdicionales || "");
      setSoldarCableSeleccionado(d.soldarCableSeleccionado || null);
    }
  }, [data]);
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
            onChange={(e) => setCantidadResistencias(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Voltaje:</label>
          <input
            type="number"
            value={voltaje}
            onChange={(e) => setVoltaje(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Potencia:</label>
          <input
            type="number"
            value={watts}
            onChange={(e) => setWatts(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Diametro:</label>
          <select
            value={diametro}
            onChange={(e) => setDiametro(e.target.value)}
          >
            <option value="">Selecciona</option>
            <option value="1/4">1/4</option>
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
            onChange={(e) => setLongitudCm(e.target.value)}
          />
        </div>

        <div className="form-row checkbox-row">
          <label>Milimetrica:</label>
          <input
            type="checkbox"
            checked={milimetrica}
            onChange={(e) => setmilimetrica(e.target.checked)}
          />
        </div>

              <div className="form-row">
                  <label>Cable de alta temperatura:</label>
                  <select
                      value={cableAltaTemperatura}
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

              <div className="form-row">
                  <label>Longitud de cable (cm):</label>
                  <input
                      type="number"
                      value={medidaCableCm}
                      onChange={(e) => setMedidaCableCm(e.target.value)}
                      disabled={cableAltaTemperatura !== "SI" || !soldarCableSeleccionado}
                  />
              </div>

              <div className="form-row">
                  <label>Cantidad de cables:</label>
                  <input
                      type="number"
                      value={cantidadCables}
                      onChange={(e) => setCantidadCables(e.target.value)}
                      disabled={cableAltaTemperatura !== "SI" || !soldarCableSeleccionado || !medidaCableCm}
                  />
              </div>

        <div className="form-row checkbox-row">
          <label>Terminal de cable a 90°:</label>
          <input
            type="checkbox"
            checked={terminal90}
            onChange={(e) => setterminal90(e.target.checked)}
          />
        </div>

        <div className="form-row checkbox-row">
          <label>Tubo zapa:</label>
          <input
            type="checkbox"
            checked={tubozapa}
            onChange={(e) => settubozapa(e.target.checked)}
          />
        </div>

        <div className="form-row textarea-row">
        <label>Datos Adicionales:</label>
          <textarea
            value={datosAdicionales}
            onChange={(e) => setDatosAdicionales(e.target.value)}
            placeholder="Ej. salida a 90°"
          />
        </div>

        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            margin: "5%",
            borderRadius: "8px",
            background: "#f9f9f9",
            top: "10px",
          }}
        >
          <h3>Descripción</h3>
          <p style={{ fontSize: "14px" }}>{descripcion}</p>
              </div>

              <h2><strong>Subtotal</strong>${formatearMoneda(total)}</h2>
              <h1><strong>Total</strong>${formatearMoneda(total*1.16)}</h1>
              {/* TOTAL */}
              {esAdministracion && (
        <div>
                  <p>Precio del cable: ${formatearMoneda(precioSoldarCable)}</p>
                  <p>Precio cable: ${formatearMoneda(totalCable)}</p>
                  <p>Precio de resistencia: ${formatearMoneda(totalPorResistencia)}</p>
          <p>Subtotal: ${formatearMoneda(total)}</p>
        </div>
              )}

        <button
          className="btn btn-blue"
          onClick={() => {
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

                datosAdicionales,
              },
            });
            resetForm();
            setDirty(false);
          }}
        >
          {data ? "ACTUALIZAR" : "AGREGAR"}
        </button>
      </div>
    </>
  );
};
export default CartuchoAlta;
