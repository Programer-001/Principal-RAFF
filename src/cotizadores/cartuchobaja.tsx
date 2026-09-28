// src/cotizadores/cartuchobaja.tsx

import React, { useState, useEffect } from "react";
import { obtenerPrecioCartuchoBaja } from "../datos/Resistencia_baja_C";
import { formatearMoneda } from "../funciones/formato_moneda";
import { ItemCotizado } from "../cotizador";
import { FiCopy } from "react-icons/fi";
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

const CartuchoBaja = ({
  data,
  onGuardar,
  setDirty,
  perfil,
}: Props) => {
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
  const [terminal90, setterminal90] = useState(false);
  const [tubozapa, settubozapa] = useState(false);

  const [soldarCableSeleccionado, setSoldarCableSeleccionado] =
    useState<any>(null);

  // Área administración
  const esAdministracion = perfil?.area === "Administración";

  // -------------------------------------------------------------------------
  // CARGAR CABLES DESDE FIREBASE
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // DATOS DEL CABLE
  // -------------------------------------------------------------------------

  const tipoSoldarCable = soldarCableSeleccionado?.tipo || "";
  const precioSoldarCable = soldarCableSeleccionado?.precio || 0;

  const totalTerminal90 = terminal90 ? 150 : 0;
  const totalTuboZapa = tubozapa ? 130 : 0;

  // -------------------------------------------------------------------------
  // CÁLCULO DEL CABLE
  // -------------------------------------------------------------------------
  // 300° CAL 14:
  // - Hasta 30 cm = sin costo
  // - Más de 30 cm = se cobra solamente el excedente
  //
  // Los demás cables conservan su cálculo normal.
  // -------------------------------------------------------------------------

  const calcularPrecioCable = (
    precioPorMetro: number,
    cm: number,
    tipoCable: string
  ): number => {
    if (!precioPorMetro || !cm) return 0;

    if (tipoCable.trim().toUpperCase() === "300° CAL 14") {
      const cmCobrables = Math.max(cm - 30, 0);

      return (cmCobrables / 100) * precioPorMetro;
    }

    // Cálculo original para los demás cables
    if (cm < 100) {
      return precioPorMetro;
    }

    return (cm / 100) * precioPorMetro;
  };

  const totalCable =
    calcularPrecioCable(
      precioSoldarCable,
      Number(medidaCableCm),
      tipoSoldarCable
    ) * (Number(cantidadCables) || 0);

  // -------------------------------------------------------------------------
  // PRECIO DE LA RESISTENCIA
  // -------------------------------------------------------------------------

  const pulgadas = longitudCm
    ? Math.round(Number(longitudCm) / 2.54)
    : 0;

  const precioUnitario =
    diametro && pulgadas
      ? obtenerPrecioCartuchoBaja(diametro, pulgadas)
      : 0;

  const totalPorResistencia =
    precioUnitario +
    totalCable +
    totalTerminal90 +
    totalTuboZapa;

  const total =
    (totalPorResistencia * (Number(cantidadResistencias) || 0)) / 1.16;

  // -------------------------------------------------------------------------
  // LIMPIAR FORMULARIO
  // -------------------------------------------------------------------------

  const resetForm = () => {
    setCantidadResistencias("");
    setVoltaje("");
    setWatts("");
    setDiametro("");
    setLongitudCm("");
    setCantidadCables("");
    setCableAltaTemperatura("");
    setMedidaCableCm("");
    setterminal90(false);
    setDatosAdicionales("");
    setSoldarCableSeleccionado(null);
    settubozapa(false);
  };

  // -------------------------------------------------------------------------
  // VALIDACIÓN DE NÚMEROS
  // -------------------------------------------------------------------------

  // Permite vacío, cero y números positivos.
  // También permite decimales.
  const numeroNoNegativo = (
    valor: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (valor === "") {
      setter("");
      return;
    }

    const numero = Number(valor);

    if (!isNaN(numero) && numero >= 0) {
      setter(valor);
    }
  };

  // Permite vacío.
  // Cuando tiene valor, solamente permite enteros desde 1.
  const enteroPositivo = (
    valor: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (valor === "") {
      setter("");
      return;
    }

    const numero = Number(valor);

    if (
      !isNaN(numero) &&
      numero >= 1 &&
      Number.isInteger(numero)
    ) {
      setter(valor);
    }
  };

  // -------------------------------------------------------------------------
  // ENTER = PASAR AL SIGUIENTE CAMPO
  // -------------------------------------------------------------------------
  // Busca automáticamente el siguiente input/select habilitado.
  // Los campos disabled se saltan.
  // -------------------------------------------------------------------------

  const pasarAlSiguienteCampo = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const formulario = e.currentTarget.closest(".form-container");

    if (!formulario) return;

    const elementos = Array.from(
      formulario.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(
        'input:not(:disabled):not([type="checkbox"]), select:not(:disabled), textarea:not(:disabled)'
      )
    );

    const posicionActual = elementos.indexOf(e.currentTarget);

    if (
      posicionActual >= 0 &&
      posicionActual < elementos.length - 1
    ) {
      elementos[posicionActual + 1].focus();
    }
  };

  // -------------------------------------------------------------------------
  // DESCRIPCIÓN
  // -------------------------------------------------------------------------

  const hayDatosDescripcion =
    cantidadResistencias ||
    diametro ||
    longitudCm ||
    voltaje ||
    watts ||
    tipoSoldarCable ||
    terminal90 ||
    tubozapa ||
    datosAdicionales;

  const descripcion = hayDatosDescripcion
    ? [
        cantidadResistencias ||
        diametro ||
        longitudCm
          ? `${cantidadResistencias || ""} RESISTENCIA${
              Number(cantidadResistencias) > 1 ? "S" : ""
            } CARTUCHO BAJA CONCENTRACION ${
              diametro || ""
            }${
              longitudCm ? ` X ${longitudCm} CM` : ""
            }`.trim()
          : null,

        voltaje || watts
          ? `/ ${voltaje || ""}V - ${watts || ""}W`
          : null,

        tipoSoldarCable && cableAltaTemperatura === "SI"
          ? `/ ${cantidadCables || ""} CABLE${
              Number(cantidadCables) > 1 ? "S" : ""
            } DE: ${tipoSoldarCable}${
              medidaCableCm
                ? ` DE ${medidaCableCm} CM C/U`
                : ""
            }`
          : null,

        terminal90 ? `/ TERMINAL 90°` : null,

        tubozapa ? `/ TUBO ZAPA` : null,

        datosAdicionales
          ? `/ DATOS: ${datosAdicionales}`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .trim()
    : "";

  // -------------------------------------------------------------------------
  // CARGAR DATOS CUANDO SE EDITA UNA PARTIDA
  // -------------------------------------------------------------------------

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

      setterminal90(!!d.terminal90);
      settubozapa(!!d.tubozapa);

      setSoldarCableSeleccionado(
        d.soldarCableSeleccionado || null
      );
    }
  }, [data]);

  // -------------------------------------------------------------------------
  // HTML
  // -------------------------------------------------------------------------

  return (
    <>
      <div className="form-container">
        <h1>Cartucho de baja concentración</h1>

        {/* CANTIDAD */}
        <div className="form-row">
          <label>Cantidad: </label>

          <input
            type="number"
            min="1"
            step="1"
            value={cantidadResistencias}
            onChange={(e) =>
              enteroPositivo(
                e.target.value,
                setCantidadResistencias
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
          />
        </div>

        {/* VOLTAJE */}
        <div className="form-row">
          <label>Voltaje: </label>

          <input
            type="number"
            min="0"
            value={voltaje}
            onChange={(e) =>
              numeroNoNegativo(
                e.target.value,
                setVoltaje
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
          />
        </div>

        {/* POTENCIA */}
        <div className="form-row">
          <label>Potencia: </label>

          <input
            type="number"
            min="0"
            value={watts}
            onChange={(e) =>
              numeroNoNegativo(
                e.target.value,
                setWatts
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
          />
        </div>

        {/* DIÁMETRO */}
        <div className="form-row">
          <label>Diametro: </label>

          <select
            value={diametro}
            onChange={(e) => setDiametro(e.target.value)}
            onKeyDown={pasarAlSiguienteCampo}
          >
            <option value="">Selecciona</option>
            <option value="3/8">3/8</option>
            <option value="1/2">1/2</option>
            <option value="5/8">5/8</option>
            <option value="3/4">3/4</option>
          </select>
        </div>

        {/* LONGITUD */}
        <div className="form-row">
          <label>Longitud: </label>

          <input
            type="number"
            min="0"
            value={longitudCm}
            onChange={(e) =>
              numeroNoNegativo(
                e.target.value,
                setLongitudCm
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
          />
        </div>

        {/* CABLE ALTA TEMPERATURA */}
        <div className="form-row">
          <label>Cable de alta temperatura:</label>

          <select
            value={cableAltaTemperatura}
            onChange={(e) => {
              const valor = e.target.value;

              setCableAltaTemperatura(valor);

              if (valor !== "SI") {
                setSoldarCableSeleccionado(null);
                setMedidaCableCm("");
                setCantidadCables("");
              }
            }}
            onKeyDown={pasarAlSiguienteCampo}
          >
            <option value="">Selecciona</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </div>

        {/* TIPO DE CABLE */}
        <div className="form-row">
          <label>Calibre y grados de cable:</label>

          <select
            value={soldarCableSeleccionado?.id || ""}
            onChange={(e) => {
              const id = e.target.value;

              const seleccionado =
                opcionesSoldarCable.find(
                  (item) => item.id === id
                );

              setSoldarCableSeleccionado(
                seleccionado || null
              );

              if (!id) {
                setMedidaCableCm("");
                setCantidadCables("");
              }
            }}
            onKeyDown={pasarAlSiguienteCampo}
            disabled={cableAltaTemperatura !== "SI"}
          >
            <option value="">Seleccione...</option>

            {opcionesSoldarCable.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.tipo}
              </option>
            ))}
          </select>
        </div>

        {/* LONGITUD DE CABLE */}
        <div className="form-row">
          <label>Longitud de cable (cm):</label>

          <input
            type="number"
            min="0"
            value={medidaCableCm}
            onChange={(e) =>
              numeroNoNegativo(
                e.target.value,
                setMedidaCableCm
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
            disabled={
              cableAltaTemperatura !== "SI" ||
              !soldarCableSeleccionado
            }
          />
        </div>

        {/* CANTIDAD DE CABLES */}
        <div className="form-row">
          <label>Cantidad de cables:</label>

          <input
            type="number"
            min="1"
            step="1"
            value={cantidadCables}
            onChange={(e) =>
              enteroPositivo(
                e.target.value,
                setCantidadCables
              )
            }
            onKeyDown={pasarAlSiguienteCampo}
            disabled={
              cableAltaTemperatura !== "SI" ||
              !soldarCableSeleccionado ||
              !medidaCableCm
            }
          />
        </div>

        {/* TERMINAL 90° */}
        <div className="form-row checkbox-row">
          <label>Terminal de cable a 90°:</label>

          <input
            type="checkbox"
            checked={terminal90}
            onChange={(e) =>
              setterminal90(e.target.checked)
            }
          />
        </div>

        {/* TUBO ZAPA */}
        <div className="form-row checkbox-row">
          <label>Tubo zapa:</label>

          <input
            type="checkbox"
            checked={tubozapa}
            onChange={(e) =>
              settubozapa(e.target.checked)
            }
          />
        </div>

        {/* DATOS ADICIONALES */}
        <div className="form-row textarea-row">
          <label>Datos Adicionales: </label>

          <textarea
            value={datosAdicionales}
            onChange={(e) =>
              setDatosAdicionales(e.target.value)
            }
            placeholder="Ej. salida a 90°"
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="form-row textarea-row full-width descripcion-row">
          <div className="descripcion-box">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label className="descripcion-title">
                Descripción
              </label>

              <button
                type="button"
                title="Copiar descripción"
                onClick={() =>
                  navigator.clipboard.writeText(
                    descripcion
                  )
                }
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

            <p className="descripcion-texto">
              {descripcion}
            </p>
          </div>
        </div>
      </div>

      {/* TOTAL */}
      <h2>
        <strong>Subtotal:</strong>{" "}
        {formatearMoneda(total)}
      </h2>

      <h1>
        <strong>Total:</strong>{" "}
        {formatearMoneda(total * 1.16)}
      </h1>

      {/* INFORMACIÓN PARA ADMINISTRACIÓN */}
      {esAdministracion && (
        <div className="form-row textarea-row">
          <div>
            <p>
              Potencia maxima por resistencia:{" "}
              {Number(longitudCm) * 10} Watts
            </p>

            <p>
              Precio del cable:{" "}
              {formatearMoneda(precioSoldarCable)}
            </p>

            <p>
              Precio cable:{" "}
              {formatearMoneda(totalCable)}
            </p>

            <p>
              Precio de resistencia:{" "}
              {formatearMoneda(totalPorResistencia)}
            </p>

            <p>
              Precio terminal 90°:{" "}
              {formatearMoneda(totalTerminal90)}
            </p>

            <p>
              Precio tubo zapa:{" "}
              {formatearMoneda(totalTuboZapa)}
            </p>

            <p>
              Subtotal:{" "}
              {formatearMoneda(total)}
            </p>
          </div>
        </div>
      )}

      {/* GUARDAR */}
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

              terminal90,
              totalTerminal90,

              tubozapa,
              totalTuboZapa,
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