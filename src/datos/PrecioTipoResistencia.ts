/*/src/datos/PrecioTipoResistencias.ts*/
export type TipoResistencia =
  | "5/16 tp 304"
  | "5/16 tp 316"
  | "5/16 tp 304 circunferencial"
  | "5/16 tp 316 circunferencial"
  | "7/16 tp 304"
  | "7/16 tp 316"
  | "7/16 tp 304 circunferencial"
  | "7/16 tp 316 circunferencial"
  | "5/16 cobre"
  | "7/16 cobre"

export interface RangoPrecio {
  min: number;
  max: number;
  precio: number;
}

export const tablasPrecios: Record<TipoResistencia, RangoPrecio[]> = {
  // 🔹 5/16 tp 304
  "5/16 tp 304": [
    { min: 0, max: 50, precio: 7.0 },
    { min: 51, max: 100, precio: 6.9 },
    { min: 101, max: 150, precio: 6.8 },
    { min: 151, max: 200, precio: 6.7 },
    { min: 201, max: 250, precio: 6.6 },
    { min: 251, max: 300, precio: 6.5 },
    { min: 301, max: 350, precio: 6.4 },
    { min: 351, max: 400, precio: 6.3 },
    { min: 401, max: 450, precio: 6.2 },
    { min: 451, max: 500, precio: 6.1 },
    { min: 501, max: 550, precio: 6.0 },
    { min: 551, max: 1000, precio: 6.0 },
  ],

  // 🔹 5/16 tp 304 circunferencial
  "5/16 tp 304 circunferencial": [
    { min: 0, max: 50, precio: 7.7 },
    { min: 51, max: 100, precio: 7.6 },
    { min: 101, max: 150, precio: 7.5 },
    { min: 151, max: 200, precio: 7.4 },
    { min: 201, max: 250, precio: 7.3 },
    { min: 251, max: 300, precio: 7.2 },
    { min: 301, max: 350, precio: 7.1 },
    { min: 351, max: 400, precio: 7.0 },
    { min: 401, max: 450, precio: 6.9 },
    { min: 451, max: 500, precio: 6.8 },
    { min: 501, max: 550, precio: 6.7 },
    { min: 551, max: 1000, precio: 6.6 },
  ],

  // 🔹 5/16 tp 316
  "5/16 tp 316": [
    { min: 0, max: 50, precio: 8.0 },
    { min: 51, max: 100, precio: 7.9 },
    { min: 101, max: 150, precio: 7.8 },
    { min: 151, max: 200, precio: 7.7 },
    { min: 201, max: 250, precio: 7.6 },
    { min: 251, max: 300, precio: 7.5 },
    { min: 301, max: 350, precio: 7.4 },
    { min: 351, max: 400, precio: 7.3 },
    { min: 401, max: 450, precio: 7.2 },
    { min: 451, max: 500, precio: 7.1 },
    { min: 501, max: 550, precio: 7.0 },
    { min: 551, max: 1000, precio: 7.0 },
  ],

  // 🔹 5/16 tp 316 circunferencial
  "5/16 tp 316 circunferencial": [
    { min: 0, max: 50, precio: 8.8 },
    { min: 51, max: 100, precio: 8.7 },
    { min: 101, max: 150, precio: 8.6 },
    { min: 151, max: 200, precio: 8.5 },
    { min: 201, max: 250, precio: 8.4 },
    { min: 251, max: 300, precio: 8.3 },
    { min: 301, max: 350, precio: 8.2 },
    { min: 351, max: 400, precio: 8.1 },
    { min: 401, max: 450, precio: 8.0 },
    { min: 451, max: 500, precio: 7.9 },
    { min: 501, max: 550, precio: 7.8 },
    { min: 551, max: 1000, precio: 7.7 },
  ],

  // 🔹 7/16 tp 304
  "7/16 tp 304": [
    { min: 0, max: 50, precio: 8.0 },
    { min: 51, max: 100, precio: 7.9 },
    { min: 101, max: 150, precio: 7.8 },
    { min: 151, max: 200, precio: 7.7 },
    { min: 201, max: 250, precio: 7.6 },
    { min: 251, max: 300, precio: 7.5 },
    { min: 301, max: 350, precio: 7.4 },
    { min: 351, max: 400, precio: 7.3 },
    { min: 401, max: 450, precio: 7.2 },
    { min: 451, max: 500, precio: 7.1 },
    { min: 501, max: 550, precio: 7.0 },
    { min: 551, max: 1000, precio: 7.0 },
  ],

  // 🔹 7/16 tp 304 circunferencial
  "7/16 tp 304 circunferencial": [
    { min: 0, max: 50, precio: 9.5 },
    { min: 51, max: 100, precio: 9.4 },
    { min: 101, max: 150, precio: 9.3 },
    { min: 151, max: 200, precio: 9.2 },
    { min: 201, max: 250, precio: 9.1 },
    { min: 251, max: 300, precio: 9.0 },
    { min: 301, max: 350, precio: 8.9 },
    { min: 351, max: 400, precio: 8.8 },
    { min: 401, max: 450, precio: 8.7 },
    { min: 451, max: 500, precio: 8.6 },
    { min: 501, max: 550, precio: 8.5 },
    { min: 551, max: 1000, precio: 8.5 },
  ],

  // 🔹 7/16 tp 316
  "7/16 tp 316": [
    { min: 0, max: 50, precio: 9.5 },
    { min: 51, max: 100, precio: 9.4 },
    { min: 101, max: 150, precio: 9.3 },
    { min: 151, max: 200, precio: 9.2 },
    { min: 201, max: 250, precio: 9.1 },
    { min: 251, max: 300, precio: 9.0 },
    { min: 301, max: 350, precio: 8.9 },
    { min: 351, max: 400, precio: 8.8 },
    { min: 401, max: 450, precio: 8.7 },
    { min: 451, max: 500, precio: 8.6 },
    { min: 501, max: 550, precio: 8.5 },
    { min: 551, max: 1000, precio: 8.5 },
  ],

  // 🔹 7/16 tp 316 circunferencial
  "7/16 tp 316 circunferencial": [
    { min: 0, max: 50, precio: 9.9 },
    { min: 51, max: 100, precio: 9.8 },
    { min: 101, max: 150, precio: 9.7 },
    { min: 151, max: 200, precio: 9.6 },
    { min: 201, max: 250, precio: 9.5 },
    { min: 251, max: 300, precio: 9.4 },
    { min: 301, max: 350, precio: 9.3 },
    { min: 351, max: 400, precio: 9.2 },
    { min: 401, max: 450, precio: 9.1 },
    { min: 451, max: 500, precio: 9.0 },
    { min: 501, max: 550, precio: 8.9 },
    { min: 551, max: 1000, precio: 8.8 },
  ],

  // 🔹 COBRE (pendiente si tienes tabla real)
    "5/16 cobre": [
        { min: 0, max: 50, precio: 7.0 },
        { min: 51, max: 100, precio: 6.9 },
        { min: 101, max: 150, precio: 6.8 },
        { min: 151, max: 200, precio: 6.7 },
        { min: 201, max: 250, precio: 6.6 },
        { min: 251, max: 300, precio: 6.5 },
        { min: 301, max: 350, precio: 6.4 },
        { min: 351, max: 400, precio: 6.3 },
        { min: 401, max: 450, precio: 6.2 },
        { min: 451, max: 500, precio: 6.1 },
        { min: 501, max: 550, precio: 6.0 },
        { min: 551, max: 1000, precio: 6.0 },
    ],
    "7/16 cobre":
        [
            { min: 0, max: 50, precio: 9.5 },
            { min: 51, max: 100, precio: 9.4 },
            { min: 101, max: 150, precio: 9.3 },
            { min: 151, max: 200, precio: 9.2 },
            { min: 201, max: 250, precio: 9.1 },
            { min: 251, max: 300, precio: 9.0 },
            { min: 301, max: 350, precio: 8.9 },
            { min: 351, max: 400, precio: 8.8 },
            { min: 401, max: 450, precio: 8.7 },
            { min: 451, max: 500, precio: 8.6 },
            { min: 501, max: 550, precio: 8.5 },
            { min: 551, max: 1000, precio: 8.5 },
        ],
  // 🔹 Aletada
  //Aletada: [],
};

export interface RangoDescuento {
  min: number;
  max: number | null; // null = sin límite
  descuento: number; // porcentaje en decimal
}

export const descuentosTubular: RangoDescuento[] = [
  { min: 10, max: 19, descuento: 0.1 },
  { min: 20, max: 29, descuento: 0.15 },
  { min: 30, max: 39, descuento: 0.2 },
  { min: 40, max: null, descuento: 0.3 },
];
// 🔹 Banda
export const descuentosBanda: RangoDescuento[] = [
  { min: 10, max: 19, descuento: 0.05 },
  { min: 20, max: 29, descuento: 0.15 },
  { min: 30, max: 39, descuento: 0.2 },
  { min: 40, max: null, descuento: 0.25 },
];

// 🔹 Función genérica
export const obtenerDescuento = (
  cantidad: number,
  tabla: RangoDescuento[]
): number => {
  const rango = tabla.find((r) => {
    if (r.max === null) return cantidad >= r.min;
    return cantidad >= r.min && cantidad <= r.max;
  });

  return rango ? rango.descuento : 0;
};
