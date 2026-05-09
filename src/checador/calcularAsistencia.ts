// src/checador/calcularAsistencia.ts

export type EstadoAsistencia =
    | "puntual"
    | "puntual_sin_bono"
    | "retardo_leve"
    | "retardo_moderado"
    | "retardo_grave"
    | "permiso"
    | "falta";

export type PermisoAsistencia = {
    tipo?: string;
    horaPermiso?: string;
};

// ===============================
// CONVERTIR HORA A SEGUNDOS
// ===============================
function horaASegundos(hora?: string): number | null {
    if (!hora) return null;

    const [hh, mm, ss = 0] = hora.split(":").map(Number);

    if (Number.isNaN(hh) || Number.isNaN(mm)) {
        return null;
    }

    return hh * 3600 + mm * 60 + ss;
}

// ===============================
// CALCULAR ESTADO POR HORA NORMAL
// ===============================
export function calcularEstadoEntrada(
    horaEntrada?: string
): EstadoAsistencia {
    if (!horaEntrada) return "falta";

    const segundos = horaASegundos(horaEntrada);

    if (segundos === null) return "falta";

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
// CALCULAR ESTADO POR HORA CON PERMISO
// entrada_tarde usa horaPermiso como nueva base
// IMPORTANTE: entrada_tarde NO gana bono
// ===============================
export function calcularEstadoEntradaConBase(
    horaEntrada?: string,
    horaBase?: string
): EstadoAsistencia {
    const entradaSeg = horaASegundos(horaEntrada);
    const baseSeg = horaASegundos(horaBase);

    if (entradaSeg === null || baseSeg === null) {
        return "falta";
    }

    const toleranciaHasta = baseSeg + 5 * 60 + 59;
    const leveHasta = baseSeg + 15 * 60 + 59;
    const moderadoHasta = baseSeg + 30 * 60 + 59;

    if (entradaSeg <= toleranciaHasta) return "puntual_sin_bono";

    if (entradaSeg <= leveHasta) return "retardo_leve";

    if (entradaSeg <= moderadoHasta) return "retardo_moderado";

    return "retardo_grave";
}

// ===============================
// RESUMEN SEMANAL
// ===============================
export function calcularResumenSemanal(
    registros: (EstadoAsistencia | "incompleto")[]
) {
    const incompletos = registros.filter(
    (r) => r === "incompleto"
    ).length;
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

// ===============================
// CALCULAR ESTADO DEL DÍA
// ===============================
export function calcularEstadoDia(
    entrada?: string,
    totalChecadas?: number,
    ultimaChecada?: string,
    permiso?: PermisoAsistencia
): EstadoAsistencia | "incompleto" {
    const entradaSeg = horaASegundos(entrada);
    const salidaSeg = horaASegundos(ultimaChecada);

    const tienePermisoEntradaTarde =
        permiso?.tipo === "entrada_tarde" && !!permiso.horaPermiso;

    const tienePermisoSalidaTemprano =
        permiso?.tipo === "salida_temprano" && !!permiso.horaPermiso;

    // ===============================
    // SIN ENTRADA
    // ===============================
    if (entradaSeg === null) {
        return "falta";
    }

    // ===============================
    // VALIDAR ENTRADA
    // ===============================
    let estadoEntrada: EstadoAsistencia;

    if (tienePermisoEntradaTarde) {
        estadoEntrada = calcularEstadoEntradaConBase(
            entrada,
            permiso?.horaPermiso
        );
    } else {
        estadoEntrada = calcularEstadoEntrada(entrada);
    }

    // ===============================
    // VALIDAR SALIDA
    // ===============================
    const tieneSalida =
        salidaSeg !== null &&
        salidaSeg !== entradaSeg;

    if (!tieneSalida) {
        return "incompleto";
    }

    // ===============================
    // PERMISO SALIDA TEMPRANO
    // ===============================
    if (tienePermisoSalidaTemprano) {
        const salidaAutorizada = horaASegundos(permiso?.horaPermiso);

        if (salidaAutorizada !== null && salidaSeg >= salidaAutorizada) {
            return estadoEntrada;
        }

        return "incompleto";
    }

    // ===============================
    // SALIDA NORMAL
    // ===============================
    const salidaNormal = 18 * 3600; // 18:00:00

    if (salidaSeg < salidaNormal) {
        return "incompleto";
    }

    return estadoEntrada;
}