//src/datos/Termopares.ts
export interface TermoparJ {
  medida_cm: number; // Medida en centímetros
  precio: number; // Precio sin IVA
}

export const termoparJ: TermoparJ[] = [
  { medida_cm: 100, precio: 150.55 },
  { medida_cm: 150, precio: 176.96 },
  { medida_cm: 200, precio: 203.38 },
  { medida_cm: 250, precio: 211.3 },
  { medida_cm: 300, precio: 237.73 },
  { medida_cm: 350, precio: 264.13 },
  { medida_cm: 400, precio: 293.46 },
  { medida_cm: 500, precio: 343.44 },
  { medida_cm: 600, precio: 396.18 },
  { medida_cm: 700, precio: 475.42 },
  { medida_cm: 800, precio: 570.5 },
  { medida_cm: 900, precio: 684.6 },
  { medida_cm: 1000, precio: 821.52 },
  { medida_cm: 1100, precio: 985.83 },
  { medida_cm: 1200, precio: 1182.99 },
  { medida_cm: 1300, precio: 1419.59 },
  { medida_cm: 1400, precio: 1703.51 },
  { medida_cm: 1500, precio: 2044.21 },
  { medida_cm: 1600, precio: 2453.05 },
  { medida_cm: 1700, precio: 2943.66 },
  { medida_cm: 1800, precio: 3532.39 },
  { medida_cm: 1900, precio: 4238.87 },
  { medida_cm: 2000, precio: 5086.64 },
  { medida_cm: 2100, precio: 6103.97 },
  { medida_cm: 2200, precio: 7324.76 },
  { medida_cm: 2300, precio: 8789.72 },
  { medida_cm: 2400, precio: 10547.66 },
  { medida_cm: 2500, precio: 12657.19 },
];

//------------------------------------------------>>
export interface TermoparK {
  medida_cm: number; // Medida en centímetros
  precio: number; // Precio sin IVA
}

export const termoparK: TermoparK[] = [
  { medida_cm: 100, precio: 169.04 },
  { medida_cm: 200, precio: 211.3 },
  { medida_cm: 300, precio: 293.15 },
  { medida_cm: 400, precio: 382.95 },
  { medida_cm: 500, precio: 470.11 },
  { medida_cm: 600, precio: 549.32 },
  { medida_cm: 700, precio: 631.72 },
  { medida_cm: 800, precio: 726.47 },
  { medida_cm: 900, precio: 835.45 },
  { medida_cm: 1000, precio: 960.76 },
  { medida_cm: 1100, precio: 1104.88 },
  { medida_cm: 1200, precio: 1270.61 },
  { medida_cm: 1300, precio: 1461.2 },
  { medida_cm: 1400, precio: 1680.38 },
  { medida_cm: 1500, precio: 1932.44 },
  { medida_cm: 1600, precio: 2222.3 },
  { medida_cm: 1700, precio: 2555.65 },
  { medida_cm: 1800, precio: 2938.99 },
  { medida_cm: 1900, precio: 3379.84 },
  { medida_cm: 2000, precio: 3886.82 },
  { medida_cm: 2100, precio: 4469.84 },
  { medida_cm: 2200, precio: 5140.32 },
  { medida_cm: 2300, precio: 5911.37 },
  { medida_cm: 2400, precio: 6798.07 },
  { medida_cm: 2500, precio: 7817.78 },
  { medida_cm: 2600, precio: 8990.45 },
  { medida_cm: 2700, precio: 10339.02 },
  { medida_cm: 2800, precio: 11889.87 },
];

export interface BulboTornilloTermopar {
    tipo: string;
    precio: number;
}

export const bulboTornilloTermopar: BulboTornilloTermopar[] = [
    { tipo: "BULBO 3/16 (DEFAULT)", precio: 0.0 },
    { tipo: "TORNILLO 1/4", precio: 280.0 },
    { tipo: "TORNILLO 6MM", precio: 280.0 },
    { tipo: "TORNILLO 3/16", precio: 280.0 },
    { tipo: "TORNILLO 3/8", precio: 300.0 },
    { tipo: "TORNILLO 1/2", precio: 300.0 },
    { tipo: "CAMBIO DE BULBO + TORNILLO 1/4", precio: 350.0 },
    { tipo: "CAMBIO DE BULBO + TORNILLO 6MM", precio: 350.0 },
    { tipo: "CAMBIO DE BULBO + TORNILLO 3/16", precio: 350.0 },
    { tipo: "CAMBIO DE BULBO + TORNILLO 3/8", precio: 350.0 },
    { tipo: "CAMBIO DE BULBO + TORNILLO 1/2", precio: 350.0 },
    { tipo: "SIN BULBO", precio: 0.0 },
];