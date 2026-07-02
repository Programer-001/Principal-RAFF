//src/datos/Resistencia_alta_C.ts

export const diametros = [
  { label: "1/4", value: 0.25 },
  { label: "3/8", value: 0.375 },
  { label: "1/2", value: 0.5 },
  { label: "5/8", value: 0.625 },
  { label: "3/4", value: 0.75 },
];
export const anchos = [
  2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22,
];

export const precios = [
    [562.43, 495.53, 554.08, 583.34, 750.61],
    [562.43, 495.53, 554.08, 600.07, 771.52],
    [514.08, 495.53, 535.26, 574.99, 706.70],
    [524.81, 466.25, 551.98, 589.62, 729.70],
    [537.35, 476.71, 562.43, 627.26, 750.61],
    [566.62, 493.44, 589.62, 679.54, 792.43],
    [577.08, 516.43, 625.15, 706.70, 838.44],
    [602.16, 545.71, 648.14, 731.81, 884.42],
    [614.70, 566.62, 677.42, 809.16, 934.61],
    [664.85, 614.70, 735.98, 809.16, 1028.70],
    [689.99, 660.98, 767.34, 848.89, 1083.06],
    [731.81, 689.99, 798.71, 890.71, 1160.44],
    [752.71, 708.79, 827.98, 930.43, 1218.97],
    [779.88, 731.81, 880.25, 970.15, 1268.83],
    [830.06, 752.71, 911.62, 995.26, 1298.42],
    [855.18, 775.70, 938.78, 1014.07, 1327.70],
    [882.34, 800.80, 982.70, 1087.25, 1377.88],
    [915.79, 830.06, 1053.79, 1135.33, 1432.25],
    [945.07, 857.26, 1087.25, 1177.15, 1492.87],
    [1003.62, 882.34, 1120.70, 1221.06, 1572.34],
    [1045.44, 922.07, 1189.69, 1294.24, 1630.88],
    [1087.25, 942.98, 1210.61, 1340.24, 1685.24],
    [1156.25, 968.06, 1244.06, 1375.79, 1745.88],
];
/*
====================================
Calcula en pulgadas
====================================
*/
export const obtenerPrecioCartuchoAlta = (
    diametro: string,
    longitud: number,
    terminal90: boolean = false
): number => {
    const diametroLimpio = diametro.replace(/"/g, "").trim();

    const col = diametros.findIndex((d) => d.label === diametroLimpio);
    if (col === -1 || !longitud) return 0;

    const longitudMaxTabla = 22;
    const longitudBase = longitud > longitudMaxTabla ? longitudMaxTabla : longitud;

    const fila = anchos.findIndex((a) => a === longitudBase);
    if (fila === -1) return 0;

    let precioProveedor = precios[fila][col] ?? 0;

    // Excedente después de 22 pulgadas
    if (longitud > longitudMaxTabla) {
        const excedentePulgadas = longitud - longitudMaxTabla;
        const excedenteCm = excedentePulgadas * 2.54;

        precioProveedor += excedenteCm * 1.5;
    }

    // Extra terminal 90°
    if (terminal90) {
        precioProveedor += 170;
    }

    return precioProveedor *1.70;
};
/*
====================================
Calcula en milimetros
====================================
*/
export const obtenerPrecioCartuchoAltaMilimetrica = (
    diametroMm: number,
    longitudPulgadas: number,
    terminal90: boolean = false
): number => {

    // 🔹 Convertir mm → pulgadas aproximadas
    const pulgadas = diametroMm / 25.4;

    // 🔹 Buscar diámetro más cercano
    const diametroCercano = diametros.reduce((prev, curr) => {
        return Math.abs(curr.value - pulgadas) < Math.abs(prev.value - pulgadas)
            ? curr
            : prev;
    });

    // 🔹 Calcular precio base normal
    let precio = obtenerPrecioCartuchoAlta(
        diametroCercano.label,
        longitudPulgadas,
        terminal90
    );

    // 🔥 Incremento milimétrica
    precio *= 1.10;

    return precio;
};

/*
====================================
Calcula en milimetros y pulgadas del proveedor
====================================
*/


export const convertirDiametroCartuchoAlta = (mm: number): string => {
    const pulgadas = Number(mm) / 25.4;

    if (pulgadas <= 0.25) return "1/4";
    if (pulgadas <= 0.3125) return "5/16";
    if (pulgadas <= 0.375) return "3/8";
    if (pulgadas <= 0.5) return "1/2";
    if (pulgadas <= 0.625) return "5/8";

    return "3/4";
};

export const buscarLongitudComercialCartuchoAlta = (longitudCm: number) => {
    const pulgadasSolicitadas = longitudCm / 2.54;

    const index = anchos.findIndex((pulgadas) => pulgadas >= pulgadasSolicitadas);

    const fila = index === -1 ? anchos.length - 1 : index;

    return {
        fila,
        cm: Number((anchos[fila] * 2.54).toFixed(2)),
        pulgadas: anchos[fila],
    };
};

export const calcularCartuchoAltaProveedor = (datos: {
    tipo: "pulgadas" | "milimetros";
    diametro: string;
    mm: number;
    longitudCm: number;
    cableCm: number;
    terminal90: boolean;
    descuento30: boolean;
}) => {
    let diametroFinal = datos.diametro;

    if (datos.tipo === "milimetros") {
        diametroFinal = convertirDiametroCartuchoAlta(datos.mm);
    }

    const longitudComercial = buscarLongitudComercialCartuchoAlta(datos.longitudCm);

    let diametroParaPrecio = diametroFinal;

    // 5/16 usa precio de 1/4, igual que tu código de Sheets
    if (diametroFinal === "5/16") {
        diametroParaPrecio = "1/4";
    }

    const col = diametros.findIndex((d) => d.label === diametroParaPrecio);

    const precioBase = col === -1 ? 0 : precios[longitudComercial.fila][col] ?? 0;

    const incrementoMilimetrico =
        datos.tipo === "milimetros" ? precioBase * 0.1 : 0;

    const excedenteCable =
        datos.cableCm > 25 ? (datos.cableCm - 25) * 1.5 : 0;

    const terminal = datos.terminal90 ? 170 : 0;

    const subtotal =
        precioBase +
        incrementoMilimetrico +
        excedenteCable +
        terminal;

    const descuento = datos.descuento30 ? subtotal * 0.3 : 0;

    const total = subtotal - descuento;

    return {
        diametro: diametroFinal,
        longitudSolicitada: datos.longitudCm,
        longitudComercialCm: longitudComercial.cm,
        longitudComercialPulgadas: longitudComercial.pulgadas,
        precioBase,
        incrementoMilimetrico,
        excedenteCable,
        terminal,
        subtotal,
        descuento,
        total,
    };
};
/*
export const precios = [
  [656.17, 578.12, 646.42, 680.57, 875.71],
  [653.18, 575.49, 643.48, 696.9, 896.01],
  [594.31, 572.86, 618.79, 664.73, 816.99],
  [603.93, 536.54, 635.19, 678.51, 839.7],
  [615.51, 546.05, 644.24, 696.94, 859.79],
  [646.03, 562.6, 672.26, 715.18, 903.49],
  [654.9, 586.07, 709.45, 771.17, 951.51],
  [680.17, 616.41, 732.11, 798.26, 999.0],
  [691.07, 637.02, 761.59, 822.73, 1050.73],
  [743.97, 687.81, 823.53, 905.4, 1151.06],
  [768.4, 736.1, 854.54, 945.36, 1206.14],
  [811.09, 764.74, 885.24, 987.21, 1286.16],
  [830.27, 781.82, 913.29, 1026.3, 1344.57],
  [856.1, 803.33, 966.28, 1064.97, 1392.84],
  [906.79, 822.29, 995.88, 1087.25, 1418.44],
  [929.69, 843.29, 1020.58, 1102.43, 1443.39],
  [954.53, 866.32, 1063.12, 1176.21, 1490.62],
  [985.87, 893.58, 1134.43, 1222.21, 1541.85],
  [1012.38, 918.31, 1164.68, 1260.99, 1599.2],
  [1069.78, 940.5, 1194.58, 1301.55, 1675.98],
  [1108.81, 977.96, 1261.81, 1372.69, 1729.74],
  [1147.39, 995.14, 1277.57, 1414.38, 1778.46],
  [1214.07, 1016.48, 1306.28, 1444.59, 1833.19],
];

export const obtenerPrecioCartuchoAlta = (
  diametro: string,
  longitud: number
): number => {
  const diametroLimpio = diametro.replace(/"/g, "").trim();

  const col = diametros.findIndex((d) => d.label === diametroLimpio);
  const fila = anchos.findIndex((a) => a === longitud);

  if (col === -1 || fila === -1) return 0;

  return precios[fila][col] ?? 0;
};

segunda tabla que cambio 
export const precios = [
    [515.56, 454.23, 507.9, 534.73, 688.06],
    [515.56, 454.23, 507.9, 550.07, 707.22],
    [471.24, 454.23, 490.66, 527.08, 647.81],
    [481.07, 427.39, 505.98, 540.49, 668.89],
    [492.57, 436.99, 515.56, 574.99, 688.06],
    [519.4, 452.32, 540.49, 622.91, 726.4],
    [528.99, 473.4, 573.06, 647.81, 768.57],
    [551.98, 500.24, 594.13, 670.82, 810.72],
    [563.48, 519.4, 620.97, 741.73, 856.72],
    [609.44, 563.48, 674.65, 741.73, 942.98],
    [632.49, 605.9, 703.4, 778.15, 992.81],
    [670.82, 632.49, 732.15, 816.49, 1063.73],
    [689.99, 649.73, 758.98, 852.9, 1117.39],
    [714.89, 670.82, 806.89, 889.31, 1163.1],
    [760.89, 689.99, 835.65, 912.32, 1190.22],
    [783.92, 711.06, 860.55, 929.57, 1217.06],
    [808.81, 734.06, 900.81, 996.64, 1263.05],
    [839.48, 760.89, 965.98, 1040.72, 1312.89],
    [866.32, 785.82, 996.64, 1079.06, 1368.47],
    [919.99, 808.81, 1027.31, 1119.31, 1441.31],
    [958.32, 845.23, 1090.55, 1186.38, 1494.98],
    [996.64, 864.4, 1109.72, 1228.56, 1544.81],
    [1059.89, 887.39, 1140.39, 1261.14, 1600.39],
];


*/

