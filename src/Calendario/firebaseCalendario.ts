// src/Calendario/firebaseCalendario.ts
/* 
Esto va a guardar en Firebase así:
calendario_eventos
  eventoId
    id
    titulo
    descripcion
    fechaInicio
    horaInicio
    horaFin
    tipo
    creadoPorUid
    visiblePara

*/
import { push, ref, set, onValue,remove,update  } from "firebase/database";
import { db } from "../firebase/config";
import { EventoCalendario } from "./tipos";
// Función para crear un nuevo evento en Firebase
export const crearEventoCalendario = async (
    evento: Omit<EventoCalendario, "id">
) => {
    const nuevaRef = push(ref(db, "calendario_eventos"));

    await set(nuevaRef, {
        ...evento,
        id: nuevaRef.key,
        creadoEn: Date.now(),
        actualizadoEn: Date.now(),
    });

    return nuevaRef.key;
    
};

// Función para escuchar eventos del usuario en tiempo real
export const escucharEventosUsuario = (
    uid: string,
    callback: (eventos: EventoCalendario[]) => void
) => {

    const eventosRef = ref(db, "calendario_eventos");

    return onValue(eventosRef, (snapshot) => {

        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        const data = snapshot.val() as Record<string, EventoCalendario>;

        const lista: EventoCalendario[] = Object.values(data)
            .filter((evento) => evento.visiblePara?.[uid]);

        callback(lista);

    });

};

// Función para eliminar un evento por su ID
export const eliminarEventoCalendario = async (
    eventoId: string
) => {

    const eventoRef = ref(
        db,
        `calendario_eventos/${eventoId}`
    );

    await remove(eventoRef);

};
// Función para actualizar un evento por su ID
export const actualizarEventoCalendario = async (
    eventoId: string,
    cambios: Partial<EventoCalendario>
) => {
    const eventoRef = ref(
        db,
        `calendario_eventos/${eventoId}`
    );

    await update(eventoRef, {
        ...cambios,
        actualizadoEn: Date.now(),
    });
};