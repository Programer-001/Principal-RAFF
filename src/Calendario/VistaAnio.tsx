//src/Calendario/VistaAnio.tsx
//Vista para mostrar el año completo con mini meses
import {
    obtenerDiasDelMes,
} from "./helpers";

import { fechaLocalDesdeDate } from "../funciones/formato_fechas";

type Props = {
    year: number;
    onSeleccionarFecha: (fecha: string) => void;
    onCambiarVistaMes: () => void;
};

const nombresMeses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
];

const nombresDias = [
    "L",
    "M",
    "M",
    "J",
    "V",
    "S",
    "D",
];

const VistaAnio = ({
    year,
    onSeleccionarFecha,
    onCambiarVistaMes,
}: Props) => {

    return (
        <div className="cal-anio-container">

            {Array.from({ length: 12 }, (_, month) => {

                const dias = obtenerDiasDelMes(
                    year,
                    month
                );

                return (
                    <div
                        key={month}
                        className="cal-mini-mes"
                    >

                        <h3>
                            {nombresMeses[month]}
                        </h3>

                        <div className="cal-mini-dias-header">
                            {nombresDias.map((dia) => (
                                <span key={dia}>
                                    {dia}
                                </span>
                            ))}
                        </div>

                        <div className="cal-mini-grid">

                            {dias.map((item, index) => {

                                if (!item) {
                                    return (
                                        <div
                                            key={index}
                                            className="vacio"
                                        />
                                    );
                                }

                                const fecha =
                                    fechaLocalDesdeDate(
                                        item.fecha
                                    );

                                return (
                                    <button
                                        key={fecha}
                                        className="cal-mini-dia"
                                        onClick={() => {
                                            onSeleccionarFecha(fecha);
                                            onCambiarVistaMes();
                                        }}
                                    >
                                        {item.dia}
                                    </button>
                                );
                            })}

                        </div>

                    </div>
                );
            })}

        </div>
    );
};

export default VistaAnio;