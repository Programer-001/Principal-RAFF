import React from "react";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockTermopar = {
  tipo: string;
  termoparCeramico: string;
  medidaTermopar: string;
  bulboTornillo: string;

  cambioMedidaBulbo: boolean;
  termoparEspecialP: boolean;

  datosAdicionales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresTermoparVacios: ValoresStockTermopar = {
  tipo: "",
  termoparCeramico: "",
  medidaTermopar: "",
  bulboTornillo: "",

  cambioMedidaBulbo: false,
  termoparEspecialP: false,

  datosAdicionales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockTermopar;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockTermopar>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockTermopar: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockTermopar,
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
          "Tipo",
          valores.tipo
        )}

        {renderLectura(
          "Termopar cerámico",
          valores.termoparCeramico
        )}

        {renderLectura(
          "Medida de termopar en cm (cliente)",
          valores.medidaTermopar
            ? `${valores.medidaTermopar} cm`
            : "--"
        )}

        {renderLectura(
          "Bulbo / Tornillo",
          valores.bulboTornillo
        )}

        {renderLectura(
          "Cambio de medida de bulbo",
          valores.cambioMedidaBulbo
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "Termopar especial P",
          valores.termoparEspecialP
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

  // =======================================================
  // MODO EDICIÓN
  // =======================================================

  return (
    <div className="res-stock-formulario">

      {/* TIPO */}

      <div className="res-stock-campo">
        <label>Tipo</label>

        <select
          value={valores.tipo}
          onChange={(e) => {
            cambiarValor(
              "tipo",
              e.target.value
            );

            // Si cambia el tipo,
            // limpiamos la selección dependiente.
            cambiarValor(
              "termoparCeramico",
              ""
            );
          }}
        >
          <option value="">
            Seleccione...
          </option>

          <option value="J">
            J
          </option>

          <option value="K">
            K
          </option>
        </select>
      </div>

      {/* TERMOPAR CERÁMICO */}

      <div className="res-stock-campo">
        <label>Termopar cerámico</label>

        <select
          value={valores.termoparCeramico}
          disabled={!valores.tipo}
          onChange={(e) =>
            cambiarValor(
              "termoparCeramico",
              e.target.value
            )
          }
        >
          <option value="">
            Seleccione...
          </option>

          {/*
            AQUÍ CONECTAREMOS LAS OPCIONES REALES
            DEL COTIZADOR DE TERMOPAR.
          */}
        </select>
      </div>

      {/* MEDIDA */}

      <div className="res-stock-campo">
        <label>
          Medida de termopar en cm (cliente)
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.medidaTermopar}
          onChange={(e) =>
            cambiarValor(
              "medidaTermopar",
              e.target.value
            )
          }
        />
      </div>

      {/* BULBO / TORNILLO */}

      <div className="res-stock-campo">
        <label>Bulbo / Tornillo</label>

        <select
          value={valores.bulboTornillo}
          onChange={(e) =>
            cambiarValor(
              "bulboTornillo",
              e.target.value
            )
          }
        >
          <option value="">
            Seleccione...
          </option>

          {/*
            AQUÍ CONECTAREMOS EL CATÁLOGO REAL
            DE BULBO / TORNILLO.
          */}
        </select>
      </div>

      {/* CAMBIO DE MEDIDA DE BULBO */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Cambio de medida de bulbo
        </label>

        <input
          type="checkbox"
          checked={
            valores.cambioMedidaBulbo
          }
          onChange={(e) =>
            cambiarValor(
              "cambioMedidaBulbo",
              e.target.checked
            )
          }
        />
      </div>

      {/* TERMOPAR ESPECIAL P */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Termopar especial P
        </label>

        <input
          type="checkbox"
          checked={
            valores.termoparEspecialP
          }
          onChange={(e) =>
            cambiarValor(
              "termoparEspecialP",
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
          value={valores.datosAdicionales}
          onChange={(e) =>
            cambiarValor(
              "datosAdicionales",
              e.target.value
            )
          }
          placeholder="Escribe detalles adicionales"
        />
      </div>
    </div>
  );
};

export default StockTermopar;