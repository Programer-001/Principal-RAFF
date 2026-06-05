// src/Enrolado/aisladores.ts

import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
export interface Aislador {
  nombre: string;
  tubo: string; // "5/16" o "7/16"
  diametro: number;
  tolerancia: number;
  diametro_final: number;
}


export const obtenerAisladoresFirebase = async (): Promise<Aislador[]> => {
  const snap = await get(ref(db, "cotizador/Aisladores"));

  if (!snap.exists()) return [];

  return Object.values(snap.val()) as Aislador[];
};


// Función para convertir fracciones a número (ejemplo: "5/16" → 0.3125)
export const fraccionANumero = (fraccion: string): number => {
  if (fraccion.includes("/")) {
    const [numerador, denominador] = fraccion.split("/").map(Number);
    return numerador / denominador;
  }

  return parseFloat(fraccion);
};

// Función para obtener datos del aislador de forma síncrona
export const obtenerDatosAislador = (
  tuboSeleccionado: string | number,
  aisladores: Aislador[]
): Aislador | null => {
  const tuboNumero = fraccionANumero(String(tuboSeleccionado));

  return (
    aisladores.find(
      (a) => Math.abs(fraccionANumero(a.tubo) - tuboNumero) < 0.001
    ) || null
  );
};
