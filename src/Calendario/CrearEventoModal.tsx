// src/Calendario/CrearEventoModal.tsx
/* 
Ahí pondremos el formulario visual primero:

título
descripción
fecha
hora inicio
hora fin
todo el día
tipo
cancelar
guardar

*/
import { useState, useEffect } from "react";
import { auth } from "../firebase/config";
import { EventoCalendario } from "./tipos";
import { crearEventoCalendario, actualizarEventoCalendario  } from "./firebaseCalendario";
type Props = {
    abierto: boolean;
    onClose: () => void;
    eventoEditar?: EventoCalendario | null;
};

const CrearEventoModal = ({
    abierto,
    onClose,
    eventoEditar,
}: Props) => {

const [titulo, setTitulo] = useState("");
const [descripcion, setDescripcion] = useState("");

const [fecha, setFecha] = useState("");
const [horaInicio, setHoraInicio] = useState("");
const [horaFin, setHoraFin] = useState("");

const [todoElDia, setTodoElDia] = useState("No");

const [tipo, setTipo] = useState("personal");

const [guardando, setGuardando] = useState(false);

// Función para guardar el evento (crear o actualizar)
const guardarEvento = async () => {

    if (!titulo.trim()) {
        alert("Escribe un título");
        return;
    }

    if (!fecha) {
        alert("Selecciona una fecha");
        return;
    }

    try {

        setGuardando(true);

        const usuario = auth.currentUser;

        if (!usuario) {
            alert("No hay usuario activo");
            return;
        }

if (eventoEditar?.id) {

    await actualizarEventoCalendario(
        eventoEditar.id,
        {
            titulo,
            descripcion,

            fechaInicio: fecha,
            fechaFin: fecha,

            horaInicio,
            horaFin,

            todoElDia: todoElDia === "Sí",

            tipo: tipo as any,
        }
    );

} else {

    await crearEventoCalendario({
        titulo,
        descripcion,

        fechaInicio: fecha,
        fechaFin: fecha,

        horaInicio,
        horaFin,

        todoElDia: todoElDia === "Sí",

        tipo: tipo as any,

        creadoPorUid: usuario.uid,
        creadoPorNombre: usuario.email || "Usuario",

        visiblePara: {
            [usuario.uid]: true,
        },
    });

}

        // LIMPIAR
        setTitulo("");
        setDescripcion("");

        setFecha("");

        setHoraInicio("");
        setHoraFin("");

        setTodoElDia("No");

        setTipo("personal");

        onClose();

    } catch (error) {

        console.error(error);

        alert("Error al guardar evento");

    } finally {

        setGuardando(false);

    }

};
// Cuando se abra el modal, si viene un eventoEditar, precargamos los datos
useEffect(() => {
    if (!abierto) return;

    if (eventoEditar) {
        setTitulo(eventoEditar.titulo || "");
        setDescripcion(eventoEditar.descripcion || "");
        setFecha(eventoEditar.fechaInicio || "");
        setHoraInicio(eventoEditar.horaInicio || "");
        setHoraFin(eventoEditar.horaFin || "");
        setTodoElDia(eventoEditar.todoElDia ? "Sí" : "No");
        setTipo(eventoEditar.tipo || "personal");
    } else {
        setTitulo("");
        setDescripcion("");
        setFecha("");
        setHoraInicio("");
        setHoraFin("");
        setTodoElDia("No");
        setTipo("personal");
    }
}, [abierto, eventoEditar]);


    if (!abierto) return null;

return (
    <div className="cal-modal-overlay">
        <div className="cal-modal">
            <div className="cal-modal-header">
                <h2>{eventoEditar ? "Editar evento" : "Nuevo evento"}</h2>

                <button className="cal-modal-cerrar" onClick={onClose}>
                    ✕
                </button>
            </div>

            <div className="cal-modal-body">
                <div className="cal-form-group">
                    <label>Título</label>
                    <input
                        type="text"
                        placeholder="Ej. Junta producción"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                    />
                </div>

                <div className="cal-form-group">
                    <label>Descripción</label>
                    <textarea
                        placeholder="Notas del evento..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                    />
                </div>

                <div className="cal-form-row">
                    <div className="cal-form-group">
                        <label>Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </div>

                    <div className="cal-form-group">
                        <label>Todo el día</label>
                        <select
                            value={todoElDia}
                            onChange={(e) => setTodoElDia(e.target.value)}
                        >
                            <option>No</option>
                            <option>Sí</option>
                        </select>
                    </div>
                </div>

                <div className="cal-form-row">
                    <div className="cal-form-group">
                        <label>Hora inicio</label>
                        <input
                            type="time"
                            value={horaInicio}
                            onChange={(e) => setHoraInicio(e.target.value)}
                        />
                    </div>

                    <div className="cal-form-group">
                        <label>Hora fin</label>
                        <input
                            type="time"
                            value={horaFin}
                            onChange={(e) => setHoraFin(e.target.value)}
                        />
                    </div>
                </div>

                <div className="cal-form-group">
                    <label>Tipo</label>
                    <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <option value="personal">Personal</option>
                        <option value="general">General</option>
                    </select>
                </div>
            </div>

            <div className="cal-modal-footer">
                <button className="cal-btn-secundario" onClick={onClose}>
                    Cancelar
                </button>

                <button
                    className="cal-btn-principal"
                    onClick={guardarEvento}
                    disabled={guardando}
                >
                    {guardando
                        ? "Guardando..."
                        : eventoEditar
                            ? "Guardar cambios"
                            : "Guardar evento"}
                </button>
            </div>
        </div>
    </div>
);
};

export default CrearEventoModal;