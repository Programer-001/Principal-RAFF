import React from "react";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockResorte = {
  ohms: string;
  tipoAlambre: string;
  alambreResorte: string;
  terminales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresResorteVacios: ValoresStockResorte = {
  ohms: "",
  tipoAlambre: "",
  alambreResorte: "",
  terminales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockResorte;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockResorte>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockResorte: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockResorte,
    valor: string
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
          "OHMS",
          valores.ohms
            ? `${valores.ohms} Ω`
            : "--"
        )}

        {renderLectura(
          "Tipo de alambre",
          valores.tipoAlambre
        )}

        {renderLectura(
          "Alambre del resorte",
          valores.alambreResorte
        )}

        {renderLectura(
          "Terminales",
          valores.terminales
        )}
      </div>
    );
  }

  // =======================================================
  // MODO EDICIÓN
  // =======================================================

  return (
    <div className="res-stock-formulario">

      {/* OHMS */}

      <div className="res-stock-campo">
        <label>OHMS</label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.ohms}
          onChange={(e) =>
            cambiarValor(
              "ohms",
              e.target.value
            )
          }
        />
      </div>

      {/* TIPO DE ALAMBRE */}

      <div className="res-stock-campo">
        <label>Tipo de alambre</label>

        <select
          value={valores.tipoAlambre}
          onChange={(e) => {
            cambiarValor(
              "tipoAlambre",
              e.target.value
            );

            // Al cambiar el tipo de alambre,
            // limpiamos el alambre seleccionado.
            cambiarValor(
              "alambreResorte",
              ""
            );
          }}
        >
          <option value="">
            Selecciona
          </option>

          <option value="NICROMEL">
            NICROMEL
          </option>

          <option value="KANTHAL">
            KANTHAL
          </option>
        </select>
      </div>

      {/* ALAMBRE DEL RESORTE */}

      <div className="res-stock-campo">
        <label>Alambre del resorte</label>

        <select
          value={valores.alambreResorte}
          disabled={!valores.tipoAlambre}
          onChange={(e) =>
            cambiarValor(
              "alambreResorte",
              e.target.value
            )
          }
        >
          <option value="">
            Selecciona
          </option>

          {/*
            AQUÍ COLOCAREMOS LAS OPCIONES REALES
            DEL COTIZADOR DE RESORTES.

            No las escribimos manualmente porque
            deben coincidir con el catálogo real.
          */}
        </select>
      </div>

      {/* TERMINALES */}

      <div className="res-stock-campo">
        <label>Terminales</label>

        <select
          value={valores.terminales}
          onChange={(e) =>
            cambiarValor(
              "terminales",
              e.target.value
            )
          }
        >
          <option value="">
            Selecciona
          </option>

          {/*
            AQUÍ TAMBIÉN USAREMOS LAS OPCIONES
            REALES DEL COTIZADOR.
          */}
        </select>
      </div>
    </div>
  );
};

export default StockResorte;