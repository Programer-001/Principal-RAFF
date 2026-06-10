import React, { useState } from "react";
import AsistenciaHoy from "./AsistenciaHoy";
import ReporteBonoPuntualidad from "./ReporteBonoPuntualidad";
import ChecadaManual from "./ChecadaManual";
import Respaldo from "./Respaldo";
import "../css/checador.css";

type VistaChecador = "asistencia" | "bono" | "manual"|"respaldo";

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
                <button
                className={vista === "manual" ? "tab-activa" : ""}
                onClick={() => setVista("manual")}
            >
                Checada Manual
            </button>
            <button
            className={vista === "manual" ? "tab-activa" : ""}
            onClick={() => setVista("respaldo")}
        >
            Archivo
            </button>
            </div>

            {vista === "asistencia" && <AsistenciaHoy />}

            {vista === "bono" && <ReporteBonoPuntualidad />}
            {vista === "manual" && <ChecadaManual />}
            {vista === "respaldo" && <Respaldo />}      
        </div>
    );
};

export default Checador;