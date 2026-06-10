import React, { useState } from "react";
import AsistenciaHoy from "./AsistenciaHoy";
import ReporteBonoPuntualidad from "./ReporteBonoPuntualidad";
import ChecadaManual from "./ChecadaManual";
import Respaldo from "./Respaldo";
import ChecadorParticular from "./checador_particular";
import "../css/checador.css";

type VistaChecador =
    | "asistencia"
    | "bono"
    | "manual"
    | "respaldo";

type PerfilUsuario = {
    activo?: boolean;
    area?: string;
    puesto?: string;
    puedeChecarCelular?: boolean;
};

const normalizar = (texto: string = "") =>
    texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

const Checador: React.FC = () => {
    const [vista, setVista] =
        useState<VistaChecador>("asistencia");

    const perfil: PerfilUsuario = JSON.parse(
        localStorage.getItem("perfil") || "{}"
    );

    const esAdministracion =
        normalizar(perfil.area) === "administracion";

    const puedeChecarCelular =
        perfil.puedeChecarCelular === true;

    if (puedeChecarCelular && !esAdministracion) {
        return (
            <div className="checador-page">
                <ChecadorParticular />
            </div>
        );
    }

    if (!esAdministracion) {
        return (
            <div className="checador-page">
                <section className="bono-card">
                    <h2>Sin acceso</h2>
                    <p>
                        No tienes permiso para acceder al
                        módulo de checador.
                    </p>
                </section>
            </div>
        );
    }

    return (
        <div className="checador-page">
            <div className="checador-tabs">
                <button
                    className={
                        vista === "asistencia" ? "tab-activa" : ""
                    }
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
                    className={
                        vista === "respaldo" ? "tab-activa" : ""
                    }
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