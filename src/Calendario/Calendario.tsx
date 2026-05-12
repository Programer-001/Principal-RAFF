// src/Calendario/Calendario.tsx
//Este será el layout principal
import { useEffect, useState } from "react";
import { auth } from "../firebase/config";
import { EventoCalendario } from "./tipos";
import { escucharEventosUsuario } from "./firebaseCalendario";
import CrearEventoModal from "./CrearEventoModal";
import PanelEventos from "./PanelEventos";
import DetalleEvento from "./DetalleEvento";
import {  obtenerFechaLocal, formatearFechaMX,fechaLocalDesdeDate} from "../funciones/formato_fechas";
import "../css/calendario.css";

import VistaAnio from "./VistaAnio";
import VistaSemana from "./VistaSemana";
import VistaDia from "./VistaDia";
import VistaMes from "./VistaMes";

import {
    formatearFechaTitulo,
} from "./helpers";

const Calendario = () => {

   const [eventos, setEventos] = useState<EventoCalendario[]>([]);
   const [eventoSeleccionado, setEventoSeleccionado] =useState<EventoCalendario | null>(null);
    const [eventoEditar, setEventoEditar] = useState<EventoCalendario | null>(null);
    const [busqueda, setBusqueda] = useState("");
    
const [vistaActiva, setVistaActiva] = useState<
    "mes" | "dia" | "semana" | "anio"
>("mes");
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

    const manejarSeleccionFecha = (fecha: string) => {
    setFechaSeleccionada(fecha);
    setFechaActual(new Date(`${fecha}T00:00:00`));
        };

    const siguientePeriodo = () => {

        if (vistaActiva === "dia") {
            const nuevaFecha = new Date(
                year,
                month,
                fechaActual.getDate() + 1
            );

            setFechaActual(nuevaFecha);
            setFechaSeleccionada(fechaLocalDesdeDate(nuevaFecha));

            return;
        }

        if (vistaActiva === "semana") {
            setFechaActual(
                new Date(
                    year,
                    month,
                    fechaActual.getDate() + 7
                )
            );

            return;
        }
            if (vistaActiva === "anio") {
                setFechaActual(
                    new Date(year + 1, 0, 1)
                );

                return;
            }

        setFechaActual(
            new Date(year, month + 1, 1)
        );
    };

    const anteriorPeriodo = () => {

        if (vistaActiva === "dia") {
            const nuevaFecha = new Date(
                year,
                month,
                fechaActual.getDate() - 1
            );

            setFechaActual(nuevaFecha);
            setFechaSeleccionada(fechaLocalDesdeDate(nuevaFecha));

            return;
        }

        if (vistaActiva === "semana") {
            setFechaActual(
                new Date(
                    year,
                    month,
                    fechaActual.getDate() - 7
                )
            );

            return;
        }
        if (vistaActiva === "anio") {
            setFechaActual(
                new Date(year - 1, 0, 1)
            );

            return;
        }

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
// Filtrar eventos según la búsqueda
    const eventosFiltradosBusqueda = eventos.filter(
    (evento) => {

        const texto = `
            ${evento.titulo}
            ${evento.descripcion || ""}
        `.toLowerCase();

        return texto.includes(
            busqueda.toLowerCase()
        );
    }
    );
// Limitar resultados de búsqueda a 8 para no saturar la interfaz
const resultadosBusqueda = busqueda.trim()
    ? eventosFiltradosBusqueda.slice(0, 8)
    : [];


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
                           onClick={anteriorPeriodo}
                        >
                            ‹
                        </button>

                        <button
                            className="cal-nav-btn"
                            onClick={siguientePeriodo}
                        >
                            ›
                        </button>

                        <h1 className="cal-titulo">
                            {formatearFechaTitulo(year, month)}
                        </h1>

                    </div>

                    <div className="cal-header-right">
                        <div className="cal-header-search">

                            <input
                                type="text"
                                placeholder="Buscar evento..."
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                }}
                            />

                            {resultadosBusqueda.length > 0 && (
                        <div className="cal-busqueda-resultados">
                            {resultadosBusqueda.map((evento) => (
                                <button
                                    key={evento.id}
                                    className="cal-busqueda-item"
                                    onClick={() => {
                                        manejarSeleccionFecha(evento.fechaInicio);
                                        manejarSeleccionEvento(evento);
                                        setVistaActiva("mes");
                                        setBusqueda("");
                                    }}
                                >
                                    <strong>{evento.titulo}</strong>
                                    <span>{evento.fechaInicio}</span>
                                </button>
                            ))}
                        </div>
                         )}

                        </div>
                        <button
                            className={`cal-vista-btn ${
                                vistaActiva === "anio" ? "activa" : ""
                            }`}
                            onClick={() => setVistaActiva("anio")}
                        >
                            Año
                        </button>

                        <button
                            className={`cal-vista-btn ${
                                vistaActiva === "mes" ? "activa" : ""
                            }`}
                            onClick={() => setVistaActiva("mes")}
                        >
                            Mes
                        </button>


                        <button
                            className={`cal-vista-btn ${
                                vistaActiva === "semana"
                                    ? "activa"
                                    : ""
                            }`}
                            onClick={() => setVistaActiva("semana")}
                        >
                            Semana
                        </button>

                        <button
                            className={`cal-vista-btn ${
                                vistaActiva === "dia" ? "activa" : ""
                            }`}
                            onClick={() => setVistaActiva("dia")}
                        >
                            Día
                        </button>

                    </div>

                </div>

                {/* CALENDARIO */}
            {vistaActiva === "mes" ? (
                <VistaMes
                    year={year}
                    month={month}
                    eventos={busqueda.trim() ? eventosFiltradosBusqueda : eventos}
                    fechaSeleccionada={fechaSeleccionada}
                    onSeleccionarFecha={manejarSeleccionFecha}
                    onSeleccionarEvento={manejarSeleccionEvento}
                />
            ) : vistaActiva === "dia" ? (
                <VistaDia
                    fechaSeleccionada={fechaSeleccionada}
                    eventos={busqueda.trim() ? eventosFiltradosBusqueda : eventos}
                    onSeleccionarEvento={manejarSeleccionEvento}
                />
            ) : vistaActiva === "semana" ? (
                <VistaSemana
                    fechaActual={fechaActual}
                    eventos={busqueda.trim() ? eventosFiltradosBusqueda : eventos}
                    fechaSeleccionada={fechaSeleccionada}
                    onSeleccionarFecha={manejarSeleccionFecha}
                    onSeleccionarEvento={manejarSeleccionEvento}
                />
            ) : (
                <VistaAnio
                    year={year}
                    onSeleccionarFecha={manejarSeleccionFecha}
                    onCambiarVistaMes={() =>
                        setVistaActiva("mes")
                    }
                />
            )}
            </main>
            {/* DETALLE EVENTO */}
            <DetalleEvento
                evento={eventoSeleccionado}
                onClose={() => setEventoSeleccionado(null)}
                onEditar={(evento) => {
                    setEventoEditar(evento);

                    setEventoSeleccionado(null);

                    setModalCrearAbierto(true);
                }}
            />
            {/* MODAL CREAR EVENTO */}
            <CrearEventoModal
                abierto={modalCrearAbierto}
                eventoEditar={eventoEditar}
                onClose={() => {
                    setModalCrearAbierto(false);
                    setEventoEditar(null);
                }}
            />
        </div>
    );
};

export default Calendario;