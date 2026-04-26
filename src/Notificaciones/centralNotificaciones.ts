// src/Notificaciones/centralNotificaciones.ts
/* 
Este archivo:

Recibe un tipo (pedido_listo, etc.)
Busca su config
Resuelve destinatarios (uid reales)
Genera fechas
Arma objeto completo
Lo guarda en Firebase

*/
import { push, ref, set } from "firebase/database";
import { db } from "../firebase/config";
import {
    DestinoNotificacion,
    NotificacionSistema,
    OrigenNotificacion,
    PrioridadNotificacion,
} from "./tiposNotificaciones";
import {
    HORAS_VIDA_NOTIFICACION,
    TIPOS_NOTIFICACION,
    TipoNotificacionSistema,
} from "./notificacionesConfig";
import { obtenerDestinatariosUids } from "./destinatariosNotificaciones";

type CrearNotificacionParams = {
    tipo: TipoNotificacionSistema;
    destino: DestinoNotificacion;
    origen: OrigenNotificacion;

    mensaje?: string;
    titulo?: string;
    prioridad?: PrioridadNotificacion;

    creadoPorUid?: string;
    creadoPorNombre?: string;
};

export const crearNotificacionSistema = async ({
    tipo,
    destino,
    origen,
    mensaje,
    titulo,
    prioridad,
    creadoPorUid,
    creadoPorNombre,
}: CrearNotificacionParams): Promise<string | null> => {
    const config = TIPOS_NOTIFICACION[tipo];

    if (!config) {
        console.error("Tipo de notificación no configurado:", tipo);
        return null;
    }

    const destinatariosUids = await obtenerDestinatariosUids(destino);

    if (destinatariosUids.length === 0) {
        console.warn("No se encontraron destinatarios para la notificación:", {
            tipo,
            destino,
        });
        return null;
    }

    const ahora = Date.now();
    const fechaExpiracion =
        ahora + HORAS_VIDA_NOTIFICACION * 60 * 60 * 1000;

    const nuevaRef = push(ref(db, "notificaciones"));

    const notificacion: NotificacionSistema = {
        id: nuevaRef.key || undefined,

        tipo,
        titulo: titulo || config.titulo,
        mensaje: mensaje || config.mensajeDefault,

        prioridad: prioridad || config.prioridadDefault,
        estado: "pendiente",

        destino,
        destinatariosUids,

        origen,

        creadoPorUid,
        creadoPorNombre,

        fechaCreacion: ahora,
        fechaExpiracion,

        vistaPor: {},

        totalDestinatarios: destinatariosUids.length,
        totalVistos: 0,
        completada: false,

    };

    await set(nuevaRef, notificacion);

    return nuevaRef.key;
};