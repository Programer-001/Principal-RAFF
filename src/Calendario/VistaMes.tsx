// src/Calendario/VistaMes.tsx
//Aquí ya vamos a dibujar el calendario tipo iOS usando grid, no <table>.
import {
    nombresDias,
    obtenerDiasDelMes,
} from "./helpers";

import { EventoCalendario } from "./tipos";

type Props = {
    year: number;
    month: number;
    eventos: EventoCalendario[];
    fechaSeleccionada: string;
    onSeleccionarFecha: (fecha: string) => void;
};

    const VistaMes = ({ year, month, eventos, fechaSeleccionada, onSeleccionarFecha }: Props) => {
    const dias = obtenerDiasDelMes(year, month);

    return (
        <div className="cal-mes-container">
            <div className="cal-mes-dias-header">
                {nombresDias.map((dia) => (
                    <div key={dia} className="cal-mes-dia-nombre">
                        {dia}
                    </div>
                ))}
            </div>

            <div className="cal-mes-grid">
                {dias.map((item, index) => {
                    if (!item) {
                        return (
                            <div
                                key={index}
                                className="cal-mes-dia vacio"
                            />
                        );
                    }

                    const fechaDia = item.fecha
                        .toISOString()
                        .split("T")[0];

                    const eventosDelDia = eventos.filter(
                        (evento) => evento.fechaInicio === fechaDia
                    );

                    return (
                        <div
                            key={index}
                            className={`cal-mes-dia ${
                                fechaSeleccionada === fechaDia
                                    ? "seleccionado"
                                    : ""
                            }`}
                            onClick={() => onSeleccionarFecha(fechaDia)}
                        >
                            <div className="cal-mes-numero">
                                {item.dia}
                            </div>

                            {eventosDelDia.slice(0, 3).map((evento) => (
                                <div
                                    key={evento.id}
                                    className={`cal-evento-demo ${evento.tipo}`}
                                    title={evento.titulo}
                                >
                                    {evento.todoElDia
                                        ? evento.titulo
                                        : `${evento.horaInicio || ""} ${evento.titulo}`}
                                </div>
                            ))}

                            {eventosDelDia.length > 3 && (
                                <div className="cal-evento-mas">
                                    +{eventosDelDia.length - 3} más
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VistaMes;