// src/Calendario/tipos.ts

export type VistaCalendario = "dia" | "semana" | "mes" | "anio";

export type TipoEventoCalendario =
    | "personal"
    | "compartido"
    | "permiso"
    | "feriado"
    | "cumpleanos"
    | "general";

export type EventoCalendario = {
    id: string;
    titulo: string;
    descripcion?: string;

    fechaInicio: string; // YYYY-MM-DD
    fechaFin?: string; // YYYY-MM-DD

    horaInicio?: string; // HH:mm
    horaFin?: string; // HH:mm

    todoElDia?: boolean;

    tipo: TipoEventoCalendario;
    color?: string;

    creadoPorUid?: string;
    creadoPorNombre?: string;

    visiblePara?: Record<string, true>;
};