// src/Calendario/helpers.ts
//Aquí pondremos las funciones de fechas para construir el calendario sin librerías.
export const nombresMeses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

export const nombresDias = [
    "lun",
    "mar",
    "mié",
    "jue",
    "vie",
    "sáb",
    "dom",
];

export const obtenerDiasDelMes = (
    year: number,
    month: number
) => {
    const primerDia = new Date(year, month, 1);

    const ultimoDia = new Date(year, month + 1, 0);

    const totalDias = ultimoDia.getDate();

    // Ajustar para que lunes sea el primero
    let inicioSemana = primerDia.getDay();

    if (inicioSemana === 0) {
        inicioSemana = 7;
    }

    const dias = [];

    // Espacios vacíos antes del día 1
    for (let i = 1; i < inicioSemana; i++) {
        dias.push(null);
    }

    // Días reales
    for (let dia = 1; dia <= totalDias; dia++) {
        dias.push({
            dia,
            fecha: new Date(year, month, dia),
        });
    }

    return dias;
};

export const formatearFechaTitulo = (
    year: number,
    month: number
) => {
    return `${nombresMeses[month]} de ${year}`;
};