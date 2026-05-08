// src/checador/calcularAsistencia.ts

export type EstadoAsistencia =
    | "puntual"
    | "retardo_leve"
    | "retardo_moderado"
    | "retardo_grave"
    | "falta";

// ===============================
// CALCULAR ESTADO POR HORA
// ===============================
export function calcularEstadoEntrada(
    horaEntrada?: string
): EstadoAsistencia {
    if (!horaEntrada) return "falta";

    const [hh, mm] = horaEntrada.split(":").map(Number);

    const minutos = hh * 60 + mm;

    const entradaOficial = 9 * 60 + 30;

    const leveInicio = 9 * 60 + 36;
    const leveFin = 9 * 60 + 45;

    const moderadoInicio = 9 * 60 + 46;
    const moderadoFin = 10 * 60;

    if (minutos <= entradaOficial) {
        return "puntual";
    }

    if (minutos >= leveInicio && minutos <= leveFin) {
        return "retardo_leve";
    }

    if (minutos >= moderadoInicio && minutos <= moderadoFin) {
        return "retardo_moderado";
    }

    return "retardo_grave";
}

// ===============================
// RESUMEN SEMANAL
// ===============================
export function calcularResumenSemanal(
    registros: EstadoAsistencia[]
) {
    const leves = registros.filter(
        (r) => r === "retardo_leve"
    ).length;

    const moderados = registros.filter(
        (r) => r === "retardo_moderado"
    ).length;

    const graves = registros.filter(
        (r) => r === "retardo_grave"
    ).length;

    const faltasDirectas = registros.filter(
        (r) => r === "falta"
    ).length;

    const faltasPorLeves = Math.floor(leves / 3);

    const faltasPorModerados = Math.floor(
        moderados / 2
    );

    const faltasPorGraves = graves;

    const faltasEquivalentes =
        faltasDirectas +
        faltasPorLeves +
        faltasPorModerados +
        faltasPorGraves;

    const pierdeBono =
        leves > 0 ||
        moderados > 0 ||
        graves > 0 ||
        faltasDirectas > 0;

    return {
        leves,
        moderados,
        graves,
        faltasDirectas,
        faltasEquivalentes,
        bonoPuntualidad: pierdeBono ? 0 : 100,
        pierdeBono,
    };
}

export function calcularEstadoDia(
    entrada?: string,
    totalChecadas?: number
): EstadoAsistencia | "incompleto" {
    if (!entrada) return "falta";

    if ((totalChecadas || 0) < 4) {
        return "incompleto";
    }

    return calcularEstadoEntrada(entrada);
}