import React from "react";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockCartuchoAlta = {
  voltaje: string;
  potencia: string;

  diametro: string;
  longitud: string;

  milimetrica: boolean;

  cableAltaTemperatura: string;
  calibreGradosCable: string;

  longitudCable: string;
  cantidadCables: string;

  terminalCable90: boolean;
  tuboZapa: boolean;

  datosAdicionales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresCartuchoAltaVacios: ValoresStockCartuchoAlta = {
  voltaje: "",
  potencia: "",

  diametro: "",
  longitud: "",

  milimetrica: false,

  cableAltaTemperatura: "",
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

  valores: ValoresStockCartuchoAlta;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockCartuchoAlta>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockCartuchoAlta: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockCartuchoAlta,
    valor: string | boolean
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
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
        <label>{etiqueta}</label>

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
          "Milimétrica",
          valores.milimetrica
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "Cable de alta temperatura",
          valores.cableAltaTemperatura
        )}

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
          <label>Datos Adicionales</label>

          <span>
            {valores.datosAdicionales || "--"}
          </span>
        </div>
      </div>
    );
  }

  // =========================================================
  // MODO EDICIÓN
  // =========================================================

  return (
    <div className="res-stock-formulario">

      {/* VOLTAJE */}

      <div className="res-stock-campo">
        <label>Voltaje</label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.voltaje}
          onChange={(e) =>
            cambiarValor(
              "voltaje",
              e.target.value
            )
          }
        />
      </div>

      {/* POTENCIA */}

      <div className="res-stock-campo">
        <label>Potencia</label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.potencia}
          onChange={(e) =>
            cambiarValor(
              "potencia",
              e.target.value
            )
          }
        />
      </div>

      {/* DIÁMETRO */}

      <div className="res-stock-campo">
        <label>Diámetro</label>

        <select
          value={valores.diametro}
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

          <option value="1/4">
            1/4
          </option>

          <option value="5/16">
            5/16
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

      {/* LONGITUD */}

      <div className="res-stock-campo">
        <label>Longitud</label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.longitud}
          onChange={(e) =>
            cambiarValor(
              "longitud",
              e.target.value
            )
          }
        />
      </div>

      {/* MILIMÉTRICA */}

      <div className="res-stock-campo res-stock-check">
        <label>Milimétrica</label>

        <input
          type="checkbox"
          checked={valores.milimetrica}
          onChange={(e) =>
            cambiarValor(
              "milimetrica",
              e.target.checked
            )
          }
        />
      </div>

      {/* CABLE DE ALTA TEMPERATURA */}

      <div className="res-stock-campo">
        <label>
          Cable de alta temperatura
        </label>

        <select
          value={
            valores.cableAltaTemperatura
          }
          onChange={(e) =>
            cambiarValor(
              "cableAltaTemperatura",
              e.target.value
            )
          }
        >
          <option value="">
            Selecciona
          </option>

          <option value="SI">
            Sí
          </option>

          <option value="NO">
            No
          </option>
        </select>
      </div>

      {/* CALIBRE Y GRADOS */}

      <div className="res-stock-campo">
        <label>
          Calibre y grados de cable
        </label>

        <input
          type="text"
          value={
            valores.calibreGradosCable
          }
          disabled={
            valores.cableAltaTemperatura !== "SI"
          }
          onChange={(e) =>
            cambiarValor(
              "calibreGradosCable",
              e.target.value
            )
          }
          placeholder="Ej. Calibre 14 - 300°"
        />
      </div>

      {/* LONGITUD DE CABLE */}

      <div className="res-stock-campo">
        <label>
          Longitud de cable (cm)
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.longitudCable}
          disabled={
            valores.cableAltaTemperatura !== "SI"
          }
          onChange={(e) =>
            cambiarValor(
              "longitudCable",
              e.target.value
            )
          }
        />
      </div>

      {/* CANTIDAD DE CABLES */}

      <div className="res-stock-campo">
        <label>
          Cantidad de cables
        </label>

        <input
          type="number"
          min={0}
          step="1"
          value={valores.cantidadCables}
          disabled={
            valores.cableAltaTemperatura !== "SI"
          }
          onChange={(e) =>
            cambiarValor(
              "cantidadCables",
              e.target.value
            )
          }
        />
      </div>

      {/* TERMINAL A 90 */}

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

      {/* TUBO ZAPA */}

      <div className="res-stock-campo res-stock-check">
        <label>Tubo Zapa</label>

        <input
          type="checkbox"
          checked={valores.tuboZapa}
          onChange={(e) =>
            cambiarValor(
              "tuboZapa",
              e.target.checked
            )
          }
        />
      </div>

      {/* DATOS ADICIONALES */}

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

export default StockCartuchoAlta;