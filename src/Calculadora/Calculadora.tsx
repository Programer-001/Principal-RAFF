//src/Calculadora/Calculadora.tsx
import React, { useState } from "react";
import "../css/Calculadora.css";

import CalculadoraBasica from "./CalculadoraBasica";
import ConvertidorLongitud from "./ConvertidorLongitud";
import CalculadoraOhm from "./CalculadoraOhm";

const Calculadora: React.FC = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [modo, setModo] = useState<
    "calculadora" | "longitud"| "ohm"
  >("calculadora");

  return (
    <div className="calculadora-container">
      {/* Encabezado */}
      <div className="calculadora-header">
        <button
          className="btn-menu"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          ☰
        </button>

        <h2>
          {modo === "calculadora"
            ? "Calculadora"
            : "Convertidor"}
        </h2>
      </div>

      {/* Cuerpo */}
      <div className="calculadora-body">
        {menuAbierto && (
          <div className="calculadora-menu">

            <button
              className="menu-item"
              onClick={() => {
                setModo("calculadora");
                setMenuAbierto(false);
              }}
            >
              🧮 Calculadora estándar
            </button>

            <button
              className="menu-item"
              onClick={() => {
                setModo("longitud");
                setMenuAbierto(false);
              }}
            >
              📏 Longitud
            </button>
            <button
            className="menu-item"
            onClick={() => {
              setModo("ohm");
              setMenuAbierto(false);
            }}
          >
            ⚡ Ley de Ohm
          </button>
          </div>
        )}

            <div className="calculadora-contenido">
            {modo === "calculadora" && <CalculadoraBasica />}

            {modo === "longitud" && <ConvertidorLongitud />}
            {modo === "ohm" && <CalculadoraOhm />}
            </div>
      </div>
    </div>
  );
};

export default Calculadora;