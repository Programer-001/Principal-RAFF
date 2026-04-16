// src/funciones/formato_moneda.ts
//para las etiquetas o que se impriman
export const formatearMoneda = (valor: number | undefined | null): string => {
    if (valor === undefined || valor === null || isNaN(valor)) return "$0.00";

    return valor.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

//para los inputs nada mas
export const procesarInputMoneda = (valor: string) => {
    const limpio = valor.replace(/[^0-9]/g, "");
    const numero = Number(limpio);

    return {
        texto: limpio ? numero.toLocaleString("es-MX") : "",
        numero,
    };
};