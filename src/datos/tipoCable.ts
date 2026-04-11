export interface TipoCable {
  nombre: string;
  precio: number;
}

export const tipoCable: TipoCable[] = [
  { nombre: "200° CAL 10", precio: 58.42 },
  { nombre: "200° CAL 12", precio: 39.74 },
  { nombre: "200° CAL 14", precio: 25.5 },
  { nombre: "200° CAL 16", precio: 16.46 },
  { nombre: "300° CAL 10", precio: 111.68 },
  { nombre: "300° CAL 12", precio: 74.28 },
  { nombre: "300° CAL 14", precio: 46.9 },
  { nombre: "300° CAL 16", precio: 33.09 },
  { nombre: "300° CAL 18", precio: 26.56 },
];

export interface Termpopar {
  nombre: string;
  precio: number;
}

export const termopar: Termpopar[] = [
  { nombre: "Termopar J", precio: 53.72 },
  { nombre: "Termopar K", precio: 60.75 },
];

export interface Tira {
  longitud: number; // pulgadas, según tu referencia
  precio: number; // precio correspondiente
}

export const tira: Tira[] = [
  { longitud: 6, precio: 335.94 },
  { longitud: 8, precio: 359.6 },
  { longitud: 10, precio: 392.08 },
  { longitud: 12, precio: 417.6 },
  { longitud: 14, precio: 459.36 },
  { longitud: 16, precio: 487.2 },
  { longitud: 18, precio: 509.24 },
  { longitud: 20, precio: 544.04 },
  { longitud: 22, precio: 576.52 },
  { longitud: 24, precio: 620.6 },
  { longitud: 26, precio: 564.24 },
  { longitud: 28, precio: 737.76 },
  { longitud: 30, precio: 800.4 },
  { longitud: 32, precio: 835.2 },
  { longitud: 34, precio: 875.8 },
  { longitud: 36, precio: 910.6 },
  { longitud: 38, precio: 951.2 },
  { longitud: 40, precio: 1010.36 },
];
