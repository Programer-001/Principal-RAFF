//src/datos/Resistencia_baja_C.ts

export const diametros = [
  { label: "3/8", value: 0.375 },
  { label: "1/2", value: 0.5 },
  { label: "5/8", value: 0.625 },
  { label: "3/4", value: 0.75 },
];
export const anchos = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export const precios = [
  [286.48, 343.78, 412.53, 474.41],
  [316.59, 378.15, 451.27, 517.21],
  [365.87, 434.99, 516.19, 589.61],
  [428.49, 507.05, 598.33, 681.11],
  [458.22, 539.69, 633.25, 718.41],
  [506.56, 593.82, 692.81, 783.29],
  [531.48, 620.08, 719.32, 810.47],
  [574.74, 667.36, 769.72, 864.27],
  [606.92, 701.36, 804.26, 899.93],
  [628.3, 722.58, 823.78, 918.58],
  [669.22, 765.92, 868.09, 964.62],
  [705.96, 804.06, 905.96, 1003.19],
  [750.08, 580.14, 952.22, 1050.72],
  [772.13, 870.85, 969.62, 1066.16],
  [808.1, 906.93, 1003.75, 1099.79],
  [860.58, 961.05, 1057.25, 1154.3],
  [880.65, 978.57, 1070.01, 1164.09],
  [895.34, 989.93, 1075.84, 1166.25],
  [949.7, 1044.77, 1128.35, 1218.8],
];
export const obtenerPrecioCartuchoBaja = (
  diametro: string,
  longitud: number
): number => {
  const diametroLimpio = diametro.replace(/"/g, "").trim();

  const col = diametros.findIndex((d) => d.label === diametroLimpio);
  const fila = anchos.findIndex((a) => a === longitud);

  if (col === -1 || fila === -1) return 0;

  return precios[fila][col] ?? 0;
};
