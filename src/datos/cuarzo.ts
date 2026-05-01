// src/datos/cuarzo.ts

export const IVA = 1.16;
export const GANANCIA_CUARZO = 1.7;

export type DiametroCuarzo = "3/8" | "1/2";

export const diametrosCuarzo: DiametroCuarzo[] = ["3/8", "1/2"];

export const largosCuarzo = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160];

export const preciosCuarzo: Record<DiametroCuarzo, Record<number, number>> = {
    "3/8": {
        30: 450,
        40: 500,
        50: 550,
        60: 600,
        70: 650,
        80: 700,
        90: 750,
        100: 800,
        110: 900,
        120: 1000,
        130: 1100,
        140: 1200,
        150: 1300,
        160: 1400,
    },
    "1/2": {
        30: 480,
        40: 530,
        50: 580,
        60: 630,
        70: 680,
        80: 730,
        90: 780,
        100: 1080,
        110: 1180,
        120: 1280,
        130: 1380,
        140: 1480,
        150: 1580,
        160: 1680,
    },
};

export const obtenerPrecioCuarzoProveedor = (
    diametro: DiametroCuarzo | "",
    largo: number
): number => {
    if (!diametro || !largo) return 0;
    return preciosCuarzo[diametro]?.[largo] ?? 0;
};

export const calcularPrecioCuarzo = (
    diametro: DiametroCuarzo | "",
    largo: number,
    cantidad: number
): number => {
    const precioProveedor = obtenerPrecioCuarzoProveedor(diametro, largo);

    return precioProveedor * IVA * GANANCIA_CUARZO * cantidad;
};