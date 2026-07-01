//import { obtenerDatosAislador } from "./Aislador";
import { obtenerDatosAislador, type Aislador } from "./aisladores";
interface FilaAWG {
  calibre: number;
  diametro: number;
  resistencia: number;
  aumento: number;
}

export const Resistencia = (Voltaje: number, Potencia: number) => {
  return Math.pow(Voltaje, 2) / Potencia;
};

export const Enrolado = (
  Longitud: number,
  Diametro_Guia: number,
  Diametro_alambre: number
): number | string => {
  // Verifica que los parámetros sean números válidos antes de cualquier operación
  if (isNaN(Longitud) || isNaN(Diametro_Guia) || isNaN(Diametro_alambre)) {
    return "Error: Ingresa números válidos";
  }

  // Verifica que Longitud, Diametro_Guia y Diametro_alambre sean números válidos
  if (Longitud <= 0 || Diametro_Guia <= 0 || Diametro_alambre <= 0) {
    return "Error: Los valores deben ser mayores que cero";
  }

  let vueltas = NVueltas(Longitud, Diametro_Guia, Diametro_alambre);

  // Verificar si la función NVueltas devuelve un error
  if (typeof vueltas === "string" && vueltas.startsWith("Error")) {
    return vueltas; // Si hay un error en NVueltas, lo devolvemos
  }

  // Asegúrate de que el resultado de vueltas es un número antes de realizar la multiplicación
  if (typeof vueltas !== "number" || isNaN(vueltas)) {
    return "Error: El cálculo de vueltas no produjo un número válido";
  }

  // Realiza la multiplicación si todo es válido
  return vueltas * Diametro_alambre;
};

export const NVueltas = (
  Longitud: number,
  Diametro_Guia: number,
  Diametro_alambre: number
): number | string => {
  // Verifica que los parámetros sean números válidos
  if (isNaN(Longitud) || isNaN(Diametro_Guia) || isNaN(Diametro_alambre)) {
    return "Error: Ingresa números válidos";
  }

  // Convierte explícitamente a números
  Longitud = Number(Longitud);
  Diametro_Guia = Number(Diametro_Guia);
  Diametro_alambre = Number(Diametro_alambre);

  // Verifica si la conversión fue exitosa
  if (isNaN(Longitud) || isNaN(Diametro_Guia) || isNaN(Diametro_alambre)) {
    return "Error: Los valores convertidos no son números válidos";
  }

  // Comprobamos si la suma de Diametro_Guia y Diametro_alambre es cero
  if (Diametro_Guia + Diametro_alambre === 0) {
    return "Error: La suma de Diametro_Guia y Diametro_alambre no puede ser cero.";
  }

  // Calcula las vueltas de manera segura
  return Longitud / ((Diametro_Guia + Diametro_alambre) * Math.PI);
};

export const longituddecable = (
  calibre: number,
  resistencia: number,
  resistividad: number,
  tablaAWG: FilaAWG[]
): number | string => {
  const fila = tablaAWG.find((row) => row.calibre === calibre);

  if (!fila) {
    return `Error: No se encontró valor para ${calibre}`;
  }

  if (resistividad === 0) {
    return "Error: División por cero";
  }

  return (fila.aumento + resistencia) / resistividad;
};

// Función para buscar el valor correspondiente en la tabla (columna de aumento)
export const buscarValor = (
  calibres: number[],
  aumentos: number[],
  clave: number
) => {
  for (let i = 0; i < calibres.length; i++) {
    if (calibres[i] === clave) {
      return aumentos[i]; // Retorna el valor de aumento correspondiente
    }
  }
  return null; // Si no se encuentra el valor, devuelve null
};

//---------------Valor 1----No se uso emjor use resultado_final------------------>>
export const buscarValor_1 = (
  valor1: number,
  valor2: string,
  rangoDatos: number[][],
  aisladores: Aislador[]
) => {
  //console.log("entro a buscarValor_1", valor1, valor2, rangoDatos);//me da los datos para checar que entra en la función
  if (!Array.isArray(rangoDatos) || rangoDatos.length === 0) {
    return [["Error: Rango vacío o inválido"]];
  }

  let mejorFila: number[] | null = null;
  let mejorDiferencia = Infinity;

  let diametro_aislador = obtenerDatosAislador(valor2, aisladores);
  if (diametro_aislador == null) {
    return [["Error: Valor inválido para el aislador"]];
  }

  for (let i = 0; i < rangoDatos.length; i++) {
    //console.log("Fila:", i, "Datos:", rangoDatos[i]);
    //console.log("Valor 1:", rangoDatos[i][0], "Valor 2:", rangoDatos[i][1]);

    if (Array.isArray(rangoDatos[i]) && rangoDatos[i].length >= 2) {
      let diferencia_1 = Math.abs(rangoDatos[i][0] - valor1); //mitad del tubo
      let diferencia_2 = Math.abs(
        rangoDatos[i][1] - diametro_aislador.diametro_final
      ); //diametro del aislador

      /*console.log(
        `Fila ${i}`,
        "enrolado_cm:",
        rangoDatos[i][0],
        "diam_total:",
        rangoDatos[i][1],
        "valor1:",
        valor1,
        "diametro_final:",
        diametro_aislador.diametro_final,
        "dif1:",
        diferencia_1,
        "dif2:",
        diferencia_2
      );*/

      if (
        rangoDatos[i][0] <= valor1 &&
        rangoDatos[i][1] <= diametro_aislador.diametro_final &&
        diferencia_1 + diferencia_2 < mejorDiferencia
      ) {
        mejorDiferencia = diferencia_1 + diferencia_2;
        mejorFila = rangoDatos[i];
      }
    }
  }
  console.table(mejorFila);
  return mejorFila ? [mejorFila] : [["No encontrado", "-", "-", "-", "-"]];
};

//------------------------->>
//------------------Prueba----------------->>
export const resultado_final = (
  mitad_tubular: number,
  parametro_aislador: string,
  matriz_datos: number[][],
  aisladores: Aislador[]
) => {
  const diametro_aislador = obtenerDatosAislador(
    parametro_aislador,
    aisladores
  );

  if (!diametro_aislador) {
    return [["Error: Valor inválido para el aislador"]];
  }

  if (!Array.isArray(matriz_datos) || matriz_datos.length === 0) {
    return [["Error: Rango vacío o inválido"]];
  }

  const salida: number[][] = [];

  for (let i = 0; i < matriz_datos.length; i++) {
    const fila = matriz_datos[i];

    if (fila.length >= 5) {
      const [enrolado_cm, diam_total] = fila;

      if (
        enrolado_cm <= mitad_tubular &&
        diam_total <= diametro_aislador.diametro_final
      ) {
        salida.push(fila);
      }
    }
  }

  return salida;
};

//----------------------------------------->>
export const opciones3 = (
  valor1: number,
  valor2: string,
  rangoDatos: (number | string)[][],
  aisladores: Aislador[]
): number[][] | string[][] => {
  if (!Array.isArray(rangoDatos) || rangoDatos.length === 0) {
    return [["Error: Rango vacío o inválido"]];
  }

  const rangoNumerico: number[][] = rangoDatos.map((row) =>
    row.map((value) => (typeof value === "string" ? parseFloat(value) : value))
  );

  const diam_ceramica = obtenerDatosAislador(valor2, aisladores);

  if (!diam_ceramica) {
    return [["Error: No se encontró un aislador válido"]];
  }

  const resultados: { fila: number[]; diferencia: number }[] = [];

  for (let i = 0; i < rangoNumerico.length; i++) {
    if (rangoNumerico[i] && rangoNumerico[i].length >= 2) {
      const diferencia_1 = Math.abs(rangoNumerico[i][0] - valor1);
      const diferencia_2 = Math.abs(
        rangoNumerico[i][1] - diam_ceramica.diametro_final
      );

      resultados.push({
        fila: rangoNumerico[i],
        diferencia: diferencia_1 + diferencia_2,
      });
    }
  }

  resultados.sort((a, b) => a.diferencia - b.diferencia);

  return resultados.slice(0, 3).map((item) => item.fila);
};

//---------------------------------------------------------------------------->>

export const Enrolado_total = async (
  Voltaje: number,
  Potencia: number,
  Longitud: number,
  diametro_tubo: string,
  setResultados: React.Dispatch<React.SetStateAction<any[]>>,
  tablaAWG: any[],
  aisladores: Aislador[]
) => {
  //Se calcul la resistencia
  const Resistencia_1 = Resistencia(Voltaje, Potencia);
  console.log("Resistencia calculada:", Resistencia_1);

  // Obtener datos del aislador
  const datosAislador = obtenerDatosAislador(diametro_tubo, aisladores );
  if (!datosAislador) {
    console.error("No se encontró el aislador para el diámetro proporcionado.");
    setResultados([]);
    return;
  }

  const diametro_Aislador = datosAislador.diametro_final;
  if (Longitud <= 30) {
    Longitud = Longitud - 10;
  } else if (Longitud <= 50) {
    Longitud = Longitud - 5;
  }
  const mitad_tubo = Longitud / 2;
  console.log("Mitad de la longitud:", mitad_tubo);
  console.log("Diámetro del aislador:", diametro_Aislador);

  // Validar tabla AWG
  if (!tablaAWG || tablaAWG.length === 0){
    console.error("Tabla AWG vacía");
    setResultados([]);
    return;
  }

  const T_Calibre = tablaAWG.map((row) => row.calibre);
  const T_Diametro = tablaAWG.map((row) => row.diametro);
  const T_Resistividad = tablaAWG.map((row) => row.resistencia);
  // muestro la tabla para saber si tiene los datos correctos
  console.table(tablaAWG, ["calibre", "diametro", "resistencia"]);

  let resultados: any[][] = [];

  // Recorremos solo columnas de calibre 8 a 18
  for (let columna = 7; columna <= 17; columna++) {
    for (let fila = 0; fila < T_Calibre.length; fila++) {
        const longitudCable = longituddecable(
        T_Calibre[fila],
        Resistencia_1,
        T_Resistividad[fila],
        tablaAWG
        );
      if (typeof longitudCable !== "number" || isNaN(longitudCable)) continue;

      const resultado_columna1 = Enrolado(
        longitudCable,
        T_Diametro[columna],
        T_Diametro[fila]
      );
      if (typeof resultado_columna1 !== "number" || isNaN(resultado_columna1))
        continue;

      const resultado_columna2 = T_Diametro[columna] + 2 * T_Diametro[fila];

      // Crear fila si no existe
      if (!resultados[fila]) resultados[fila] = [];

      resultados[fila].push([
        resultado_columna1 * 100, // convertir a cm
        resultado_columna2,
        T_Calibre[columna], // calibre columna
        T_Calibre[fila], // calibre fila
        longitudCable,
      ]);
    }
  }
  //------------------------------------------------------------------------>>
  // --- Imprimir todas las iteraciones en consola de forma legible ---
  const resultadosFlat = resultados.flat().map((r) => ({
    enrolado_cm: r[0],
    diam_total: r[1],
    calibre_columna: r[2],
    calibre_fila: r[3],
    longitudCable: r[4],
  }));

  console.table(resultadosFlat);

  //------------------------------------------------------------------------>>
  //Calcula las mejores opciones de la columnas
  let datosPlanos = resultados.flat(); // quita un nivel de arrays
  let salida: (number | string)[][] = []; // Aseguramos que sea un array de arrays
  //Logger.log("🔹 Rango de datos para columnas " + (columna + 1) + " y " + (columna + 2) + ": " + JSON.stringify(rangoDatos));
  //Logger.log("tubo: "+ (longitud_tubo/2)+" tubo: "+tubo);
  let mejorOpcion = resultado_final(mitad_tubo, diametro_tubo, datosPlanos, aisladores);

  if (mejorOpcion.length > 0) {
    mejorOpcion.forEach((fila) => {
      salida.push(
        fila.length === 5 ? fila : ["No encontrado", "-", "-", "-", "-"]
      );
    });
  }
  console.log(mejorOpcion);
  //---3 opciones------->>
  let salidaNumerica: number[][] = salida.map((row) =>
    row.map((value) => (typeof value === "string" ? parseFloat(value) : value))
  );
  let res3 = opciones3(mitad_tubo, diametro_tubo, salidaNumerica, aisladores);

  // 🛠 Verificar si opciones3() devuelve algo
  console.log("📌 Resultado de opciones3():", JSON.stringify(res3));
  console.log(
    "🔍 Tipo de res3:",
    typeof res3,
    ", Contenido:",
    JSON.stringify(res3)
  );

  if (!Array.isArray(res3) || res3.length === 0) {
    console.log("⚠ opciones3() no devolvió resultados válidos.");
    return;
  }

  // 🔹 Convertimos `res3` en `number[][]` para asegurar compatibilidad en la tabla
  let res3Convertido: number[][] = res3
    .map((row) =>
      row.map((value) =>
        typeof value === "string" ? parseFloat(value) : value
      )
    )
    .filter((row) => row.every((value) => !isNaN(value))); // 🔹 Filtramos filas con `NaN`

  console.log("✅ res3 listo para mostrar:", JSON.stringify(res3Convertido));

  //-------------------------------->>
  // 4. Actualiza el estado con los resultados calculados
  //setResultados(resultados);
  setResultados(res3);
};
