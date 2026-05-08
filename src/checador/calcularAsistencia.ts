// src/checador/calcularAsistencia.ts

export type EstadoAsistencia =
    | "puntual"
    | "puntual_sin_bono"
    | "retardo_leve"
    | "retardo_moderado"
    | "retardo_grave"
    | "permiso"
    | "falta";

// ===============================
// CALCULAR ESTADO POR HORA
// ===============================
export function calcularEstadoEntrada(
    horaEntrada?: string
): EstadoAsistencia {
    if (!horaEntrada) return "falta";

    const [hh, mm, ss = 0] = horaEntrada.split(":").map(Number);

    const segundos = hh * 3600 + mm * 60 + ss;

    const conservaBonoHasta = 9 * 3600 + 30 * 60 + 59; // 09:30:59
    const toleranciaHasta = 9 * 3600 + 35 * 60 + 59;   // 09:35:59
    const leveHasta = 9 * 3600 + 45 * 60 + 59;         // 09:45:59
    const moderadoHasta = 10 * 3600 + 59;              // 10:00:59

    if (segundos <= conservaBonoHasta) return "puntual";

    if (segundos <= toleranciaHasta) return "puntual_sin_bono";

    if (segundos <= leveHasta) return "retardo_leve";

    if (segundos <= moderadoHasta) return "retardo_moderado";

    return "retardo_grave";
}

// ===============================
// RESUMEN SEMANAL
// ===============================
export function calcularResumenSemanal(
    registros: EstadoAsistencia[]
) {
    const puntualSinBono = registros.filter(
        (r) => r === "puntual_sin_bono"
    ).length;
    const permisos = registros.filter(
        (r) => r === "permiso"
    ).length;
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
        puntualSinBono > 0 ||
        leves > 0 ||
        moderados > 0 ||
        graves > 0 ||
        faltasDirectas > 0;

    return {
        puntualSinBono,
        permisos,
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