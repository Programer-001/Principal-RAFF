//src/Calendario/PanelEventos.tsx
//Este será el panel lateral izquierdo que muestra los eventos del día seleccionado, con opción a crear nuevo evento.
import { EventoCalendario } from "./tipos";

type Props = {
    fechaSeleccionada: string;
    eventosFechaSeleccionada: EventoCalendario[];
    onCrearEvento: () => void;
    onSeleccionarEvento: (evento: EventoCalendario) => void;
};

const PanelEventos = ({
    fechaSeleccionada,
    eventosFechaSeleccionada,
    onCrearEvento,
    onSeleccionarEvento,
}: Props) => {
    const fechaSeleccionadaDate = new Date(`${fechaSeleccionada}T00:00:00`);

    const nombreDiaSeleccionado =
        fechaSeleccionadaDate.toLocaleDateString("es-MX", {
            weekday: "long",
        });

    const numeroDiaSeleccionado = fechaSeleccionadaDate.getDate();

    return (
        <aside className="cal-sidebar">
            <button className="cal-btn-crear" onClick={onCrearEvento}>
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
                        Sin eventos para este día
                    </div>
                ) : (
                    eventosFechaSeleccionada.map((evento) => (
                    <div
                        key={evento.id}
                        className={`cal-evento-side ${evento.tipo}`}
                        onClick={() => onSeleccionarEvento(evento)}
                        style={{ cursor: "pointer" }}
                    >
                        {evento.todoElDia
                            ? evento.titulo
                            : `${evento.horaInicio || ""} ${evento.titulo}`}
                    </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default PanelEventos;