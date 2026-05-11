//src/Calendario/DetalleEvento.tsx
//Este será el panel lateral derecho que muestra los detalles del evento seleccionado, con opciones para editar o eliminar.

import { EventoCalendario } from "./tipos";
import { formatearFechaMX } from "../funciones/formato_fechas";
import { eliminarEventoCalendario } from "./firebaseCalendario";
type Props = {
    evento: EventoCalendario | null;
    onClose: () => void;
    onEditar: (evento: EventoCalendario) => void;
};
const DetalleEvento = ({
    evento,
    onClose,
    onEditar,
}: Props) => {

const eliminarEvento = async () => {
    if (!evento?.id) return;

    const confirmar = window.confirm(
        `¿Eliminar el evento "${evento.titulo}"?`
    );

    if (!confirmar) return;

    try {
        await eliminarEventoCalendario(evento.id);
        onClose();
    } catch (error) {
        console.error(error);
        alert("Error al eliminar el evento");
    }
};


    if (!evento) return null;

    return (
        <aside className="cal-detalle">

            <div className="cal-detalle-header">

                <h2>
                    {evento.titulo}
                </h2>

                <button
                    className="cal-detalle-cerrar"
                    onClick={onClose}
                >
                    ✕
                </button>

            </div>

            <div className="cal-detalle-body">

                <div className="cal-detalle-item">
                    <strong>Fecha</strong>

                    <span>
                        {formatearFechaMX(evento.fechaInicio)}
                    </span>
                </div>

                <div className="cal-detalle-item">
                    <strong>Horario</strong>

                    <span>
                        {evento.todoElDia
                            ? "Todo el día"
                            : `${evento.horaInicio} - ${evento.horaFin}`}
                    </span>
                </div>

                <div className="cal-detalle-item">
                    <strong>Tipo</strong>

                    <span>
                        {evento.tipo}
                    </span>
                </div>

                {evento.descripcion && (
                    <div className="cal-detalle-item">
                        <strong>Descripción</strong>

                        <p>
                            {evento.descripcion}
                        </p>
                    </div>
                )}

            </div>

            <div className="cal-detalle-footer">

                <button
                    className="cal-btn-secundario"
                    onClick={() => evento && onEditar(evento)}
                >
                    Editar
                </button>

                <button
                    className="cal-btn-danger"
                    onClick={eliminarEvento}
                >
                    Eliminar
                </button>

            </div>

        </aside>
    );
};

export default DetalleEvento;