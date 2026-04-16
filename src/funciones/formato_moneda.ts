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
    // quitar $ y comas
    let limpio = valor.replace(/\$/g, "").replace(/,/g, "");

    // dejar solo números y punto
    limpio = limpio.replace(/[^0-9.]/g, "");

    // permitir solo un punto decimal
    const partes = limpio.split(".");
    if (partes.length > 2) {
        limpio = partes[0] + "." + partes.slice(1).join("");
    }

    // separar entero y decimal
    const [entero, decimal] = limpio.split(".");

    const enteroFormateado = entero ? Number(entero).toLocaleString("es-MX") : "";

    const texto =
        decimal !== undefined ? `${enteroFormateado}.${decimal}` : enteroFormateado;

    const numero = limpio === "" || limpio === "." ? 0 : Number(limpio);

    return {
        texto,
        numero,
    };
};