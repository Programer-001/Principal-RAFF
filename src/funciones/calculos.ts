// src/utils/calculos.ts
import { diametros, anchos, precios } from "../datos/tabla";
import { diametros_c, anchos_c, precios_c } from "../datos/tabla_ceramica";
function redondearArriba(num: number, lista: number[]): number {
  return lista.find((v) => v >= num) ?? lista[lista.length - 1];
}

/**
 * Calcula el precio según diámetro y ancho.
 * - Redondea hacia arriba para buscar en la tabla
 * - Si excede los límites, divide entre 2 y multiplica el precio x2
 */
export function calcularPrecio(diametro: number, ancho: number): number | null {
  const maxD = Math.max(...diametros);
  const maxA = Math.max(...anchos);
  let factor = 1;

  let d = diametro;
  let a = ancho;

  // Si exceden los valores de la tabla
  if (diametro > maxD) {
    d = diametro / 2;
    factor *= 2;
  }
  if (ancho > maxA) {
    a = ancho / 2;
    factor *= 2;
  }

  // Redondear hacia arriba
  const dRed = redondearArriba(d, diametros);
  const aRed = redondearArriba(a, anchos);

  // Buscar índices
  const fila = anchos.indexOf(aRed);
  const col = diametros.indexOf(dRed);

  if (fila === -1 || col === -1) return null;

  const valor = precios[fila][col] * factor;
  return valor;
}
