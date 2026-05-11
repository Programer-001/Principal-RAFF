// src/Calendario/Calendario.tsx
//Este será el layout principal
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { EventoCalendario } from "./tipos";
import { escucharEventosUsuario } from "./firebaseCalendario";
import CrearEventoModal from "./CrearEventoModal";
import "../css/calendario.css";

import VistaMes from "./VistaMes";

import {
    formatearFechaTitulo,
} from "./helpers";

const Calendario = () => {

    const hoy = new Date();
   const [eventos, setEventos] = useState<EventoCalendario[]>([]);
    

    const [fechaActual, setFechaActual] = useState(
        new Date()
    );
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
    new Date().toISOString().split("T")[0]
    );
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();
    const fechaHoy = hoy.toISOString().split("T")[0];
    const fechaSeleccionadaDate = new Date(
        `${fechaSeleccionada}T00:00:00`
    );

    const nombreDiaSeleccionado =
        fechaSeleccionadaDate.toLocaleDateString("es-MX", {
            weekday: "long",
        });

    const numeroDiaSeleccionado =
        fechaSeleccionadaDate.getDate();
    const eventosHoy = eventos
        .filter((evento) => evento.fechaInicio === fechaHoy)
        .sort((a, b) => {
            const horaA = a.horaInicio || "00:00";
            const horaB = b.horaInicio || "00:00";
            return horaA.localeCompare(horaB);
        });
    const eventosFechaSeleccionada = eventos
    .filter((evento) => evento.fechaInicio === fechaSeleccionada)
    .sort((a, b) => {
        const horaA = a.horaInicio || "00:00";
        const horaB = b.horaInicio || "00:00";
        return horaA.localeCompare(horaB);
    });
    const siguienteMes = () => {
        setFechaActual(
            new Date(year, month + 1, 1)
        );
    };

    const anteriorMes = () => {
        setFechaActual(
            new Date(year, month - 1, 1)
        );
    };
useEffect(() => {
    const usuario = auth.currentUser;

    if (!usuario?.uid) return;

    const unsub = escucharEventosUsuario(usuario.uid, setEventos);

    return () => unsub();
}, []);

//HTML
    return (
        <div className="cal-layout">

            {/* SIDEBAR */}
            <aside className="cal-sidebar">

                <button
                    className="cal-btn-crear"
                    onClick={() => setModalCrearAbierto(true)}
                >
                    + Nuevo evento
                </button>
                <div className="cal-mini-card">

                    <span className="cal-mini-label">
                        {nombreDiaSeleccionado}
                    </span>

                    <span className="cal-mini-dia">
                        {numeroDiaSeleccionado}
                    </span>

                </div>

                <div className="cal-sidebar-section">
                <h3>Eventos</h3>

                    {eventosFechaSeleccionada.length === 0 ? (
                        <div className="cal-sidebar-vacio">
                            Sin eventos para hoy
                        </div>
                    ) : (
                        eventosFechaSeleccionada.map((evento) => (
                            <div
                                key={evento.id}
                                className={`cal-evento-side ${evento.tipo}`}
                            >
                                {evento.todoElDia
                                    ? evento.titulo
                                    : `${evento.horaInicio || ""} ${evento.titulo}`}
                            </div>
                        ))
                    )}
                </div>

            </aside>

            {/* CONTENIDO */}
            <main className="cal-main">

                {/* HEADER */}
                <div className="cal-header">

                    <div className="cal-header-left">

                        <button
                            className="cal-nav-btn"
                            onClick={anteriorMes}
                        >
                            ‹
                        </button>

                        <button
                            className="cal-nav-btn"
                            onClick={siguienteMes}
                        >
                            ›
                        </button>

                        <h1 className="cal-titulo">
                            {formatearFechaTitulo(year, month)}
                        </h1>

                    </div>

                    <div className="cal-header-right">

                        <button className="cal-vista-btn activa">
                            Mes
                        </button>

                        <button className="cal-vista-btn">
                            Semana
                        </button>

                        <button className="cal-vista-btn">
                            Día
                        </button>

                    </div>

                </div>

                {/* CALENDARIO */}
                <VistaMes
                    year={year}
                    month={month}
                    eventos={eventos}
                    fechaSeleccionada={fechaSeleccionada}
                    onSeleccionarFecha={setFechaSeleccionada}
                />
            </main>
            <CrearEventoModal
            abierto={modalCrearAbierto}
            onClose={() => setModalCrearAbierto(false)}
        />
        </div>
    );
};

export default Calendario;