import React, { useEffect, useState } from "react";
import { get, ref } from "firebase/database";

import { db } from "../../firebase/config";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockCartuchoBaja = {
  voltaje: string;
  potencia: string;

  diametro: string;
  longitud: string;

  cableAltaTemperatura: string;

  // Guardamos el ID del registro de Firebase.
  cableSeleccionadoId: string;

  // También guardamos el texto para poder
  // consultarlo fácilmente en la receta.
  calibreGradosCable: string;

  longitudCable: string;
  cantidadCables: string;

  terminalCable90: boolean;
  tuboZapa: boolean;

  datosAdicionales: string;
};

type CableFirebase = {
  id: string;
  tipo: string;
  precio: number;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresCartuchoBajaVacios: ValoresStockCartuchoBaja = {
  voltaje: "",
  potencia: "",

  diametro: "",
  longitud: "",

  cableAltaTemperatura: "",

  cableSeleccionadoId: "",
  calibreGradosCable: "",

  longitudCable: "",
  cantidadCables: "",

  terminalCable90: false,
  tuboZapa: false,

  datosAdicionales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockCartuchoBaja;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockCartuchoBaja>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockCartuchoBaja: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CATÁLOGO DE CABLES
  // =======================================================

  const [opcionesSoldarCable, setOpcionesSoldarCable] =
    useState<CableFirebase[]>([]);

  const [cargandoCables, setCargandoCables] =
    useState(false);

  // =======================================================
  // CARGAR MISMO CATÁLOGO QUE EL COTIZADOR
  // =======================================================

  useEffect(() => {
    const cargarSoldarCable = async () => {
      try {
        setCargandoCables(true);

        const snapshot = await get(
          ref(
            db,
            "cotizador/cable_para_soldar"
          )
        );

        if (!snapshot.exists()) {
          setOpcionesSoldarCable([]);
          return;
        }

        const data = snapshot.val();

        const opciones: CableFirebase[] =
          Object.keys(data).map((key) => ({
            id: key,

            tipo:
              data[key]?.Tipo || "",

            precio:
              Number(
                data[key]?.Precio
              ) || 0,
          }));

        setOpcionesSoldarCable(
          opciones
        );
      } catch (error) {
        console.error(
          "Error cargando cables para Cartucho Baja:",
          error
        );

        setOpcionesSoldarCable([]);
      } finally {
        setCargandoCables(false);
      }
    };

    cargarSoldarCable();
  }, []);

  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = <
    K extends keyof ValoresStockCartuchoBaja
  >(
    campo: K,
    valor: ValoresStockCartuchoBaja[K]
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // =======================================================
  // CAMBIAR CABLE ALTA TEMPERATURA
  // =======================================================

  const cambiarCableAltaTemperatura = (
    valor: string
  ) => {
    setValores((prev) => ({
      ...prev,

      cableAltaTemperatura:
        valor,

      // Igual que en el cotizador:
      // si deja de ser SI, limpiamos
      // todos los datos dependientes.
      cableSeleccionadoId:
        valor === "SI"
          ? prev.cableSeleccionadoId
          : "",

      calibreGradosCable:
        valor === "SI"
          ? prev.calibreGradosCable
          : "",

      longitudCable:
        valor === "SI"
          ? prev.longitudCable
          : "",

      cantidadCables:
        valor === "SI"
          ? prev.cantidadCables
          : "",
    }));
  };

  // =======================================================
  // SELECCIONAR CABLE
  // =======================================================

  const seleccionarCable = (
    id: string
  ) => {
    const seleccionado =
      opcionesSoldarCable.find(
        (item) =>
          item.id === id
      );

    setValores((prev) => ({
      ...prev,

      cableSeleccionadoId:
        seleccionado?.id || "",

      calibreGradosCable:
        seleccionado?.tipo || "",

      // Igual que en el cotizador:
      // si se quita el cable seleccionado,
      // limpiamos longitud y cantidad.
      longitudCable:
        seleccionado
          ? prev.longitudCable
          : "",

      cantidadCables:
        seleccionado
          ? prev.cantidadCables
          : "",
    }));
  };

  // =======================================================
  // CAMBIAR LONGITUD DEL CABLE
  // =======================================================

  const cambiarLongitudCable = (
    valor: string
  ) => {
    setValores((prev) => ({
      ...prev,

      longitudCable:
        valor,

      // Si se borra la longitud,
      // también limpiamos cantidad.
      cantidadCables:
        valor
          ? prev.cantidadCables
          : "",
    }));
  };

  // =======================================================
  // CAMPO DE LECTURA
  // =======================================================

  const renderLectura = (
    etiqueta: string,
    valor: React.ReactNode
  ) => {
    return (
      <div className="res-stock-campo-lectura">
        <label>
          {etiqueta}
        </label>

        <span>
          {valor === "" ||
          valor === null ||
          valor === undefined
            ? "--"
            : valor}
        </span>
      </div>
    );
  };

  // =======================================================
  // MODO LECTURA
  // =======================================================

  if (!modoEdicion) {
    return (
      <div className="res-stock-informacion">

        {renderLectura(
          "Voltaje",
          valores.voltaje
            ? `${valores.voltaje} V`
            : "--"
        )}

        {renderLectura(
          "Potencia",
          valores.potencia
            ? `${valores.potencia} W`
            : "--"
        )}

        {renderLectura(
          "Diámetro",
          valores.diametro
        )}

        {renderLectura(
          "Longitud",
          valores.longitud
            ? `${valores.longitud} cm`
            : "--"
        )}

        {renderLectura(
          "Cable de alta temperatura",
          valores.cableAltaTemperatura
        )}

        {valores.cableAltaTemperatura ===
          "SI" && (
          <>
            {renderLectura(
              "Calibre y grados de cable",
              valores.calibreGradosCable
            )}

            {renderLectura(
              "Longitud de cable",
              valores.longitudCable
                ? `${valores.longitudCable} cm`
                : "--"
            )}

            {renderLectura(
              "Cantidad de cables",
              valores.cantidadCables
            )}
          </>
        )}

        {renderLectura(
          "Terminal de cable a 90°",
          valores.terminalCable90
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "Tubo Zapa",
          valores.tuboZapa
            ? "Sí"
            : "No"
        )}

        <div className="res-stock-campo-lectura res-stock-datos-lectura">
          <label>
            Datos Adicionales
          </label>

          <span>
            {valores.datosAdicionales ||
              "--"}
          </span>
        </div>

      </div>
    );
  }

  // =======================================================
  // MODO EDICIÓN
  // =======================================================

  return (
    <div className="res-stock-formulario">

      {/* ===================================================
          VOLTAJE
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Voltaje
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={
            valores.voltaje
          }
          onChange={(e) =>
            cambiarValor(
              "voltaje",
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          POTENCIA
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Potencia
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={
            valores.potencia
          }
          onChange={(e) =>
            cambiarValor(
              "potencia",
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          DIÁMETRO
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Diámetro
        </label>

        <select
          value={
            valores.diametro
          }
          onChange={(e) =>
            cambiarValor(
              "diametro",
              e.target.value
            )
          }
        >
          <option value="">
            Selecciona
          </option>

          <option value="3/8">
            3/8
          </option>

          <option value="1/2">
            1/2
          </option>

          <option value="5/8">
            5/8
          </option>

          <option value="3/4">
            3/4
          </option>
        </select>
      </div>

      {/* ===================================================
          LONGITUD
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Longitud
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={
            valores.longitud
          }
          onChange={(e) =>
            cambiarValor(
              "longitud",
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          CABLE DE ALTA TEMPERATURA
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Cable de alta temperatura
        </label>

        <select
          value={
            valores.cableAltaTemperatura
          }
          onChange={(e) =>
            cambiarCableAltaTemperatura(
              e.target.value
            )
          }
        >
          <option value="">
            Selecciona
          </option>

          <option value="SI">
            SI
          </option>

          <option value="NO">
            NO
          </option>
        </select>
      </div>

      {/* ===================================================
          CALIBRE Y GRADOS DE CABLE
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Calibre y grados de cable
        </label>

        <select
          value={
            valores.cableSeleccionadoId
          }
          disabled={
            valores.cableAltaTemperatura !==
            "SI"
          }
          onChange={(e) =>
            seleccionarCable(
              e.target.value
            )
          }
        >
          <option value="">
            {cargandoCables
              ? "Cargando..."
              : "Seleccione..."}
          </option>

          {opcionesSoldarCable.map(
            (item) => (
              <option
                key={
                  item.id
                }
                value={
                  item.id
                }
              >
                {item.tipo}
              </option>
            )
          )}
        </select>
      </div>

      {/* ===================================================
          LONGITUD DE CABLE
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Longitud de cable (cm)
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={
            valores.longitudCable
          }
          disabled={
            valores.cableAltaTemperatura !==
              "SI" ||
            !valores.cableSeleccionadoId
          }
          onChange={(e) =>
            cambiarLongitudCable(
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          CANTIDAD DE CABLES
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Cantidad de cables
        </label>

        <input
          type="number"
          min={1}
          step={1}
          value={
            valores.cantidadCables
          }
          disabled={
            valores.cableAltaTemperatura !==
              "SI" ||
            !valores.cableSeleccionadoId ||
            !valores.longitudCable
          }
          onChange={(e) =>
            cambiarValor(
              "cantidadCables",
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          TERMINAL 90°
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Terminal de cable a 90°
        </label>

        <input
          type="checkbox"
          checked={
            valores.terminalCable90
          }
          onChange={(e) =>
            cambiarValor(
              "terminalCable90",
              e.target.checked
            )
          }
        />
      </div>

      {/* ===================================================
          TUBO ZAPA
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Tubo Zapa
        </label>

        <input
          type="checkbox"
          checked={
            valores.tuboZapa
          }
          onChange={(e) =>
            cambiarValor(
              "tuboZapa",
              e.target.checked
            )
          }
        />
      </div>

      {/* ===================================================
          DATOS ADICIONALES
      =================================================== */}

      <div className="res-stock-campo res-stock-textarea">
        <label>
          Datos Adicionales
        </label>

        <textarea
          value={
            valores.datosAdicionales
          }
          onChange={(e) =>
            cambiarValor(
              "datosAdicionales",
              e.target.value
            )
          }
          placeholder="Ej. salida a 90°"
        />
      </div>

    </div>
  );
};

export default StockCartuchoBaja;