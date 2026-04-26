// src/Notificaciones/marcarNotificacionVista.ts

import { get, ref, update } from "firebase/database";
import { db } from "../firebase/config";
import { NotificacionSistema } from "./tiposNotificaciones";

export const marcarNotificacionVista = async (
    notificacionId: string,
    uid: string
) => {
    if (!notificacionId || !uid) return;

    const notiRef = ref(db, `notificaciones/${notificacionId}`);
    const snapshot = await get(notiRef);

    if (!snapshot.exists()) return;

    const notificacion = snapshot.val() as NotificacionSistema;

    const yaVista = notificacion.vistaPor?.[uid] === true;

    if (yaVista) return;

    const vistaPorActualizado = {
        ...(notificacion.vistaPor || {}),
        [uid]: true,
    };

    const totalDestinatarios =
        notificacion.totalDestinatarios ||
        notificacion.destinatariosUids?.length ||
        0;

    const totalVistos = Object.values(vistaPorActualizado).filter(Boolean).length;

    const completada =
        totalDestinatarios > 0 && totalVistos >= totalDestinatarios;

    await update(notiRef, {
        vistaPor: vistaPorActualizado,
        totalDestinatarios,
        totalVistos,
        completada,
    });
};