//src/DevolucionesMercancia/DevolucionesMercancia.tsx
//este archivo contiene el componente principal para la sección de devoluciones de mercancía. Permite crear y consultar devoluciones, saldos a favor o garantías. Se puede seleccionar un cliente existente o capturar uno temporal. Se puede buscar clientes por nombre, razón social o RFC. Al guardar, se genera un folio único y se almacena en Firebase Realtime Database.

import React, { useState } from "react";
import CrearDevolucion from "./CrearDevolucion";
import ConsultarDevolucion from "./ConsultarDevolucion";

type VistaDevolucion = "crear" | "consultar";

const DevolucionesMercancia: React.FC = () => {
  const [vista, setVista] = useState<VistaDevolucion>("crear");

  return (
    <div className="form-container">
      <h1>Devoluciones de Mercancía</h1>

      <div className="cotizador-tabs">
        <button
          type="button"
          className={vista === "crear" ? "tab-activa" : ""}
          onClick={() => setVista("crear")}
        >
          Crear
        </button>

        <button
          type="button"
          className={vista === "consultar" ? "tab-activa" : ""}
          onClick={() => setVista("consultar")}
        >
          Consultar
        </button>
      </div>

      {vista === "crear" && <CrearDevolucion />}

      {vista === "consultar" && <ConsultarDevolucion />}
    </div>
  );
};

export default DevolucionesMercancia;