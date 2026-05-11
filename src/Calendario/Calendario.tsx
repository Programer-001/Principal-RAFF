// src/Calendario/Calendario.tsx
//Este será el layout principal
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { EventoCalendario } from "./tipos";
import { escucharEventosUsuario } from "./firebaseCalendario";
import CrearEventoModal from "./CrearEventoModal";
import PanelEventos from "./PanelEventos";
import DetalleEvento from "./DetalleEvento";
import {  obtenerFechaLocal, formatearFechaMX,} from "../funciones/formato_fechas";
import "../css/calendario.css";

import VistaMes from "./VistaMes";

import {
    formatearFechaTitulo,
} from "./helpers";

const Calendario = () => {

   const [eventos, setEventos] = useState<EventoCalendario[]>([]);
   const [eventoSeleccionado, setEventoSeleccionado] =useState<EventoCalendario | null>(null);

    const [fechaActual, setFechaActual] = useState(
        new Date()
    );
    const [fechaSeleccionada, setFechaSeleccionada] = useState(
        obtenerFechaLocal()
    );
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const year = fechaActual.getFullYear();
    const month = fechaActual.getMonth();



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
    // Escuchar eventos del usuario en tiempo real
    useEffect(() => {
        const usuario = auth.currentUser;

        if (!usuario?.uid) return;

        const unsub = escucharEventosUsuario(usuario.uid, setEventos);

        return () => unsub();
    }, []);
    // Función para manejar la selección de un evento desde la lista lateral
    const manejarSeleccionEvento = (evento: EventoCalendario) => {
        setEventoSeleccionado((actual) =>
            actual?.id === evento.id ? null : evento
        );
    };

//HTML
    return (
        <div className="cal-layout">

            {/* SIDEBAR */}
            <PanelEventos
                fechaSeleccionada={fechaSeleccionada}
                eventosFechaSeleccionada={eventosFechaSeleccionada}
                onCrearEvento={() => setModalCrearAbierto(true)}
                onSeleccionarEvento={manejarSeleccionEvento}
            />

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
                    onSeleccionarEvento={manejarSeleccionEvento}
                />
            </main>
            {/* DETALLE EVENTO */}
            <DetalleEvento
                evento={eventoSeleccionado}
                onClose={() => setEventoSeleccionado(null)}
            />
            {/* MODAL CREAR EVENTO */}
            <CrearEventoModal
                abierto={modalCrearAbierto}
                onClose={() => setModalCrearAbierto(false)}
            />
        </div>
    );
};

export default Calendario;