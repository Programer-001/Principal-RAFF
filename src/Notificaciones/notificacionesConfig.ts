// src/Notificaciones/notificacionesConfig.ts

import {
    PrioridadConfig,
    PrioridadNotificacion,
} from "./tiposNotificaciones";

export const PRIORIDADES_NOTIFICACION: Record<
    PrioridadNotificacion,
    PrioridadConfig
> = {
    normal: {
        key: "normal",
        label: "Normal",
        color: "#374151",
        fondo: "rgba(55, 65, 81, 0.10)",
        icono: "/src/Imagenes/svg/notificaciones/normal.svg",
        orden: 1,
    },
    importante: {
        key: "importante",
        label: "Importante",
        color: "#b7791f",
        fondo: "rgba(217, 160, 30, 0.20)",
        icono: "/src/Imagenes/svg/notificaciones/importante.svg",
        orden: 2,
    },
    urgente: {
        key: "urgente",
        label: "Urgente",
        color: "#dc2626",
        fondo: "rgba(220, 38, 38, 0.12)",
        icono: "/src/Imagenes/svg/notificaciones/urgente.svg",
        orden: 3,
    },
};

export type TipoNotificacionSistema =
    | "pedido_listo"
    | "material_solicitado"
    | "ot_terminada"
    | "mensaje_manual";

export interface TipoNotificacionConfig {
    key: TipoNotificacionSistema;
    titulo: string;
    prioridadDefault: PrioridadNotificacion;
    mensajeDefault: string;
    icono?: string;
}

export const TIPOS_NOTIFICACION: Record<
    TipoNotificacionSistema,
    TipoNotificacionConfig
> = {
    pedido_listo: {
        key: "pedido_listo",
        titulo: "Pedido listo",
        prioridadDefault: "importante",
        mensajeDefault: "Hay un pedido listo para revisión.",
        icono: "/src/Imagenes/svg/notificaciones/pedido_listo.svg",
    },

    material_solicitado: {
        key: "material_solicitado",
        titulo: "Material solicitado",
        prioridadDefault: "importante",
        mensajeDefault: "Se solicitó material para producción.",
        icono: "/src/Imagenes/svg/notificaciones/material_solicitado.svg",
    },

    ot_terminada: {
        key: "ot_terminada",
        titulo: "OT terminada",
        prioridadDefault: "normal",
        mensajeDefault: "Una orden de trabajo fue marcada como terminada.",
        icono: "/src/Imagenes/svg/notificaciones/ot_terminada.svg",
    },

    mensaje_manual: {
        key: "mensaje_manual",
        titulo: "Mensaje manual",
        prioridadDefault: "normal",
        mensajeDefault: "Tienes un nuevo mensaje interno.",
        icono: "/src/Imagenes/svg/notificaciones/mensaje_manual.svg",
    },
};

export const HORAS_VIDA_NOTIFICACION = 48;