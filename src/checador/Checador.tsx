import React, { useState } from "react";
import AsistenciaHoy from "./AsistenciaHoy";
import ReporteBonoPuntualidad from "./ReporteBonoPuntualidad";
import "../css/checador.css";

type VistaChecador = "asistencia" | "bono";

const Checador: React.FC = () => {
    const [vista, setVista] = useState<VistaChecador>("asistencia");

    return (
        <div className="checador-page">
            <div className="checador-tabs">
                <button
                    className={vista === "asistencia" ? "tab-activa" : ""}
                    onClick={() => setVista("asistencia")}
                >
                    Asistencia Hoy
                </button>

                <button
                    className={vista === "bono" ? "tab-activa" : ""}
                    onClick={() => setVista("bono")}
                >
                    Bono de Puntualidad
                </button>
            </div>

            {vista === "asistencia" && <AsistenciaHoy />}

            {vista === "bono" && <ReporteBonoPuntualidad />}
        </div>
    );
};

export default Checador;