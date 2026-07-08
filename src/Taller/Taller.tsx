//src/Taller/Taller.tsx
//Este componente es la página principal del taller, donde se puede acceder a diferentes vistas relacionadas con el taller.
import React, { useState } from "react";
import TablaBaja from "./tabla_baja";
import "../css/Taller.css";

type VistaTaller = "tabla_baja";

const Taller: React.FC = () => {
  const [vista, setVista] = useState<VistaTaller>("tabla_baja");

  return (
    <div className="taller-page">
      <h1>Taller</h1>

      <div className="taller-tabs">
        <button
          className={vista === "tabla_baja" ? "tab-activa" : ""}
          onClick={() => setVista("tabla_baja")}
        >
          Cartucho baja
        </button>
      </div>

      <div className="taller-contenido">
        {vista === "tabla_baja" && <TablaBaja />}
      </div>
    </div>
  );
};

export default Taller;