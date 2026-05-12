//src/Calendario/VistaDia.tsx
//Vista para mostrar los eventos de un día específico
import { EventoCalendario } from "./tipos";

type Props = {
    fechaSeleccionada: string;
    eventos: EventoCalendario[];
    onSeleccionarEvento: (evento: EventoCalendario) => void;
};

const VistaDia = ({
    fechaSeleccionada,
    eventos,
    onSeleccionarEvento,
}: Props) => {

    const eventosDia = eventos
        .filter(
            (evento) =>
                evento.fechaInicio === fechaSeleccionada
        )
        .sort((a, b) => {
            const horaA = a.horaInicio || "00:00";
            const horaB = b.horaInicio || "00:00";

            return horaA.localeCompare(horaB);
        });

    return (
        <div className="cal-dia-container">

            {eventosDia.length === 0 ? (
                <div className="cal-dia-vacio">
                    Sin eventos para este día
                </div>
            ) : (
                eventosDia.map((evento) => (
                    <div
                        key={evento.id}
                        className={`cal-dia-evento ${evento.tipo}`}
                        onClick={() => onSeleccionarEvento(evento)}
                    >

                        <div className="cal-dia-hora">
                            {evento.todoElDia
                                ? "Todo el día"
                                : `${evento.horaInicio} - ${evento.horaFin}`}
                        </div>

                        <div className="cal-dia-info">

                            <h3>
                                {evento.titulo}
                            </h3>

                            {evento.descripcion && (
                                <p>
                                    {evento.descripcion}
                                </p>
                            )}

                        </div>

                    </div>
                ))
            )}

        </div>
    );
};

export default VistaDia;