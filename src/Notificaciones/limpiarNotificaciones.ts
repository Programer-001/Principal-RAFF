// src/Notificaciones/limpiarNotificaciones.ts
//Este sirve para borrar notificaciones vencidas después de 48 horas.

import { get, ref, remove } from "firebase/database";
import { db } from "../firebase/config";
import { NotificacionSistema } from "./tiposNotificaciones";

export const limpiarNotificacionesExpiradas = async () => {
    const snapshot = await get(ref(db, "notificaciones"));

    if (!snapshot.exists()) {
        return;
    }

    const ahora = Date.now();
    const notificaciones = snapshot.val() as Record<string, NotificacionSistema>;

    const promesasBorrado = Object.entries(notificaciones)
        .filter(([_, notificacion]) => {
            return (
                typeof notificacion.fechaExpiracion === "number" &&
                notificacion.fechaExpiracion <= ahora
            );
        })
        .map(([id]) => {
            return remove(ref(db, `notificaciones/${id}`));
        });

    await Promise.all(promesasBorrado);
};