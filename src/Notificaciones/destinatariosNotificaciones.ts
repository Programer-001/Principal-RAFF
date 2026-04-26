// src/Notificaciones/destinatariosNotificaciones.ts
/* 
Este archivo ya hace algo importante:

solo toma empleados activo === true
solo toma empleados con uid
evita duplicados
permite destino por área, puesto, área+puesto, uid o todos
*/
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { DestinoNotificacion } from "./tiposNotificaciones";

type EmpleadoNotificacion = {
    uid?: string;
    username?: string;
    nombre?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
};

const normalizarTexto = (texto?: string) => {
    return (texto || "").trim().toLowerCase();
};

export const obtenerDestinatariosUids = async (
    destino: DestinoNotificacion
): Promise<string[]> => {
    const snapshot = await get(ref(db, "RH/Empleados"));

    if (!snapshot.exists()) {
        return [];
    }

    const empleados = snapshot.val() as Record<string, EmpleadoNotificacion>;

    const listaEmpleados = Object.values(empleados).filter((empleado) => {
        return empleado?.activo === true && !!empleado?.uid;
    });

    let uids: string[] = [];

    switch (destino.tipo) {
        case "uid":
            if (destino.uid) {
                uids = [destino.uid];
            }
            break;

        case "area":
            uids = listaEmpleados
                .filter(
                    (empleado) =>
                        normalizarTexto(empleado.area) ===
                        normalizarTexto(destino.area)
                )
                .map((empleado) => empleado.uid as string);
            break;

        case "puesto":
            uids = listaEmpleados
                .filter(
                    (empleado) =>
                        normalizarTexto(empleado.puesto) ===
                        normalizarTexto(destino.puesto)
                )
                .map((empleado) => empleado.uid as string);
            break;

        case "area_puesto":
            uids = listaEmpleados
                .filter(
                    (empleado) =>
                        normalizarTexto(empleado.area) ===
                        normalizarTexto(destino.area) &&
                        normalizarTexto(empleado.puesto) ===
                        normalizarTexto(destino.puesto)
                )
                .map((empleado) => empleado.uid as string);
            break;

        case "todos":
            uids = listaEmpleados.map((empleado) => empleado.uid as string);
            break;

        default:
            uids = [];
            break;
    }

    if (destino.uids && destino.uids.length > 0) {
        uids = [...uids, ...destino.uids];
    }

    return Array.from(new Set(uids));
};