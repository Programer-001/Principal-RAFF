// src/Notificaciones/tiposNotificaciones.ts
/*
Con esto ya tenemos definido:

qué es una notificación
qué prioridad puede tener
a quién va dirigida
de dónde viene
cuándo se creó
cuándo expira
quién ya la vio
*/

export type PrioridadNotificacion = "normal" | "importante" | "urgente";

export type EstadoNotificacion = "pendiente" | "vista" | "expirada";

export type TipoDestinoNotificacion =
    | "uid"
    | "area"
    | "puesto"
    | "area_puesto"
    | "todos";

export interface PrioridadConfig {
    key: PrioridadNotificacion;
    label: string;
    color: string;
    fondo: string;
    icono: string;
    orden: number;
}

export interface DestinoNotificacion {
    tipo: TipoDestinoNotificacion;

    uid?: string;
    area?: string;
    puesto?: string;

    uids?: string[];
}

export interface OrigenNotificacion {
    modulo: string;
    referencia?: string;
    rutaVista?: string;
}

export interface NotificacionSistema {
    id?: string;

    tipo: string;
    titulo: string;
    mensaje: string;

    prioridad: PrioridadNotificacion;
    estado: EstadoNotificacion;

    destino: DestinoNotificacion;
    destinatariosUids: string[];

    origen: OrigenNotificacion;

    creadoPorUid?: string;
    creadoPorNombre?: string;

    fechaCreacion: number;
    fechaExpiracion: number;

    vistaPor?: Record<string, boolean>;
    totalDestinatarios?: number;
    totalVistos?: number;
    completada?: boolean;
}