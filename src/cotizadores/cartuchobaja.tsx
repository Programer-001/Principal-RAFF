//src/cotizadores/cartuchobaja.tsx

import React, { useState, useEffect } from "react";
import { obtenerPrecioCartuchoBaja } from "../datos/Resistencia_baja_C";
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
const CartuchoBaja = ({ data, onGuardar, setDirty,perfil }: Props) => {
  const [cantidadResistencias, setCantidadResistencias] = useState("");
  const [voltaje, setVoltaje] = useState("");
  const [watts, setWatts] = useState("");
  const [diametro, setDiametro] = useState("");
  const [longitudCm, setLongitudCm] = useState("");
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
  const totalCable =
    calcularPrecioCable(precioSoldarCable, Number(medidaCableCm)) *
    (Number(cantidadCables) || 0);

  const pulgadas = longitudCm ? Math.round(Number(longitudCm) / 2.54) : 0;

  const precioUnitario =
    diametro && pulgadas ? obtenerPrecioCartuchoBaja(diametro, pulgadas) : 0;

  const totalPorResistencia = precioUnitario + totalCable;

  const total = totalPorResistencia * (Number(cantidadResistencias) || 0);

  const resetForm = () => {
    setCantidadResistencias("");
    setVoltaje("");
    setWatts("");
    setDiametro("");
    setLongitudCm("");
    setCantidadCables("");
    setCableAltaTemperatura("");
    setMedidaCableCm("");
    setDatosAdicionales("");
    setSoldarCableSeleccionado(null);
  };
  //------------------------DESCRIPCION-------------------------------------------------->>

  const descripcion = [
    `${cantidadResistencias || 0} RESISTENCIA${
      Number(cantidadResistencias) > 1 ? "S" : ""
    } CARTUCHO BAJA CONCENTRACION ${diametro || ""} X ${longitudCm || 0} CM`,

    `/ ${voltaje || 0}V - ${watts || 0}W`,

    tipoSoldarCable && cableAltaTemperatura === "SI"
      ? `/ ${cantidadCables || 0} CABLE${
          Number(cantidadCables) > 1 ? "S" : ""
        } DE: ${tipoSoldarCable} DE ${medidaCableCm || 0} CM C/U`
      : null,

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
      setCantidadCables(d.cantidadCables || "");
      setCableAltaTemperatura(d.cableAltaTemperatura || "");
      setMedidaCableCm(d.medidaCableCm || "");
      setDatosAdicionales(d.datosAdicionales || "");

      setSoldarCableSeleccionado(d.soldarCableSeleccionado || null);
    }
  }, [data]);
  //---------------------HTML---------------------------------------------------------------------->>
  return (
    <>
      <div className="form-container">
        <h1>Cartucho de baja concentración</h1>

        <div className="form-row">
          <label>Cantidad: </label>
          <input
            type="number"
            value={cantidadResistencias}
            onChange={(e) => setCantidadResistencias(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Voltaje: </label>
          <input
            type="number"
            value={voltaje}
            onChange={(e) => setVoltaje(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Potencia: </label>
          <input
            type="number"
            value={watts}
            onChange={(e) => setWatts(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Diametro: </label>
          <select
            value={diametro}
            onChange={(e) => setDiametro(e.target.value)}
          >
            <option value="">Selecciona</option>
            <option value="3/8">3/8</option>
            <option value="1/2">1/2</option>
            <option value="5/8">5/8</option>
            <option value="3/4">3/4</option>
          </select>
        </div>

        <div className="form-row">
          <label>Longitud: </label>
          <input
            type="number"
            value={longitudCm}
            onChange={(e) => setLongitudCm(e.target.value)}
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

        <div className="form-row textarea-row">
          <label>Datos Adicionales: </label>
          <textarea
            value={datosAdicionales}
            onChange={(e) => setDatosAdicionales(e.target.value)}
            placeholder="Ej. salida a 90°"
          />
        </div>

        <div className="form-row textarea-row full-width descripcion-row">
          <div className="descripcion-box">
            <label className="descripcion-title">Descripción</label>
            <p className="descripcion-texto">{descripcion}</p>
          </div>
        </div>
          </div>
          <h2><strong>Subtotal:</strong> ${formatearMoneda(total)}</h2>
          <h1><strong>Total:</strong> ${formatearMoneda(total*1.16)}</h1>
      {/* TOTAL con variables */}
          {esAdministracion && (
              <div className="form-row textarea-row">
                  <div>
                      <p>Potencia maxima por resistencia: {Number(longitudCm)*10 }Watts </p>
                      <p>Precio del cable: ${formatearMoneda(precioSoldarCable)}</p>
                      <p>Precio cable: ${formatearMoneda(totalCable)}</p>
                      <p>Precio de resistencia: ${formatearMoneda(totalPorResistencia)}</p>
                      <p>Subtotal: ${formatearMoneda(total)}</p>
                  </div>
              </div>
          )}

          <button
              className="btn btn-blue"
        onClick={() => {
          onGuardar({
            id: data?.id || Date.now().toString(),
            tipo: "CartuchoB",
            descripcion,
            total: Number(total.toFixed(2)),
            datos: {
              cantidadResistencias,
              voltaje,
              watts,
              diametro,
              longitudCm,
              cableAltaTemperatura,
              medidaCableCm,
              cantidadCables,
              soldarCableSeleccionado,
              tipoSoldarCable,
              precioSoldarCable,
              totalCable,

              precioUnitario,
              datosAdicionales,
            },
          });
          resetForm();
          setDirty(false);
        }}
      >
        {data ? "ACTUALIZAR" : "AGREGAR"}
      </button>
    </>
  );
};
export default CartuchoBaja;
