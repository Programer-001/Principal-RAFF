// src/datos/Precio_Banda_interno.ts

export const medidasBandas: number[] = [
    1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5,
    11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15,
];

// Precio base
const PRECIO_BASE = 115;
const INCREMENTO = 10;

/**
 * Calcula el precio de una banda según ancho y diámetro
 */
export const obtenerPrecioBanda = (
    ancho: number,
    diametro: number
): number | null => {
    const filaIndex = medidasBandas.indexOf(ancho);
    const columnaIndex = medidasBandas.indexOf(diametro);

    if (filaIndex === -1 || columnaIndex === -1) {
        return null; // medida no válida
    }

    return PRECIO_BASE + (filaIndex + columnaIndex) * INCREMENTO;
};

/**
 * Genera la tabla completa como matriz (opcional)
 */
export const tablaPreciosBandas: number[][] = medidasBandas.map(
    (_, filaIndex) =>
        medidasBandas.map(
            (_, columnaIndex) => PRECIO_BASE + (filaIndex + columnaIndex) * INCREMENTO
        )
);
