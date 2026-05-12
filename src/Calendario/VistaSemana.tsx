//src/Calendario/VistaSemana.tsx
//Vista para mostrar la semana actual con sus eventos
import { EventoCalendario } from "./tipos";
import { fechaLocalDesdeDate } from "../funciones/formato_fechas";
type Props = {
    fechaActual: Date;
    eventos: EventoCalendario[];
    fechaSeleccionada: string;
    onSeleccionarEvento: (evento: EventoCalendario) => void;
    onSeleccionarFecha: (fecha: string) => void;
};

const nombresDias = [
    "Lun",
    "Mar",
    "Mié",
    "Jue",
    "Vie",
    "Sáb",
    "Dom",
];

const obtenerSemana = (fecha: Date) => {

    const copia = new Date(fecha);

    const dia = copia.getDay();

    const diferencia =
        dia === 0 ? -6 : 1 - dia;

    copia.setDate(copia.getDate() + diferencia);

    return Array.from({ length: 7 }, (_, i) => {
        const nueva = new Date(copia);

        nueva.setDate(copia.getDate() + i);

        return nueva;
    });

};

const VistaSemana = ({
    fechaActual,
    eventos,
    fechaSeleccionada,
    onSeleccionarEvento,
    onSeleccionarFecha,
}: Props) => {

    const diasSemana = obtenerSemana(fechaActual);

    return (
        <div className="cal-semana-container">

            {diasSemana.map((dia, index) => {

                const fechaISO = fechaLocalDesdeDate(dia);

                const eventosDia = eventos.filter(
                    (evento) =>
                        evento.fechaInicio === fechaISO
                );

                return (
                        <div
                            key={fechaISO}
                            className={`cal-semana-columna ${
                                fechaSeleccionada === fechaISO ? "seleccionado" : ""
                            }`}
                            onClick={() => onSeleccionarFecha(fechaISO)}
                        >

                        <div className="cal-semana-header">

                            <span>
                                {nombresDias[index]}
                            </span>

                            <strong>
                                {dia.getDate()}
                            </strong>

                        </div>

                        <div className="cal-semana-eventos">

                            {eventosDia.map((evento) => (
                                <div
                                    key={evento.id}
                                    className={`cal-semana-evento ${evento.tipo}`}
                                    onClick={() =>
                                        onSeleccionarEvento(evento)
                                    }
                                >

                                    <span>
                                        {evento.horaInicio}
                                    </span>

                                    <strong>
                                        {evento.titulo}
                                    </strong>

                                </div>
                            ))}

                        </div>

                    </div>
                );
            })}

        </div>
    );
};

export default VistaSemana;