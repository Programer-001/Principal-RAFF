import React from "react";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockCuarzo = {
  voltaje: string;
  potencia: string;

  diametro: string;
  largo: string;

  cable: boolean;
  terminalTornillo: boolean;

  datosAdicionales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresCuarzoVacios: ValoresStockCuarzo = {
  voltaje: "",
  potencia: "",

  diametro: "",
  largo: "",

  cable: false,
  terminalTornillo: false,

  datosAdicionales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockCuarzo;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockCuarzo>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockCuarzo: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockCuarzo,
    valor: string | boolean
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // =======================================================
  // CAMPO LECTURA
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
          "Largo",
          valores.largo
        )}

        {renderLectura(
          "Cable",
          valores.cable
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "Terminal tornillo",
          valores.terminalTornillo
            ? "Sí"
            : "No"
        )}

        <div className="res-stock-campo-lectura res-stock-datos-lectura">
          <label>
            Datos Adicionales
          </label>

          <span>
            {valores.datosAdicionales || "--"}
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
            Seleccione...
          </option>

          {/*
            Aquí conectaremos las opciones
            reales que utiliza Cuarzo.tsx
          */}
        </select>
      </div>

      {/* LARGO */}

      <div className="res-stock-campo">
        <label>Largo</label>

        <select
          value={valores.largo}
          onChange={(e) =>
            cambiarValor(
              "largo",
              e.target.value
            )
          }
        >
          <option value="">
            Seleccione...
          </option>

          {/*
            Aquí conectaremos las medidas
            reales que utiliza Cuarzo.tsx
          */}
        </select>
      </div>

      {/* ================================================
          OPCIONES ADICIONALES
      ================================================ */}

      <div className="res-stock-subtitulo">
        Opciones adicionales
      </div>

      {/* CABLE */}

      <div className="res-stock-campo res-stock-check">
        <label>Cable</label>

        <input
          type="checkbox"
          checked={valores.cable}
          onChange={(e) =>
            cambiarValor(
              "cable",
              e.target.checked
            )
          }
        />
      </div>

      {/* TERMINAL TORNILLO */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Terminal tornillo
        </label>

        <input
          type="checkbox"
          checked={
            valores.terminalTornillo
          }
          onChange={(e) =>
            cambiarValor(
              "terminalTornillo",
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
          placeholder="Ej. terminal especial, salida lateral, etc."
        />
      </div>

    </div>
  );
};

export default StockCuarzo;