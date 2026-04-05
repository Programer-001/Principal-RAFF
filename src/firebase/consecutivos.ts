import { ref, runTransaction } from "firebase/database";
import { db } from "./config";

// 🔹 COTIZACIONES
export const obtenerSiguienteCotizacion = async (): Promise<string> => {
  const refCot = ref(db, "contadores/cotizaciones");

  const resultado = await runTransaction(refCot, (valorActual) => {
    return (valorActual || 0) + 1;
  });

  if (!resultado.committed) {
    throw new Error("Error al generar consecutivo de cotización");
  }

  const numero = resultado.snapshot.val();

  return `${String(numero).padStart(5, "0")}`;
};

export const obtenerSiguienteEnvio = async (): Promise<string> => {
  const refEnv = ref(db, "Contadores/envios");

  const resultado = await runTransaction(refEnv, (valorActual) => {
    return (valorActual || 0) + 1;
  });

  if (!resultado.committed) {
    throw new Error("Error al generar consecutivo de envío");
  }

  const numero = resultado.snapshot.val();

  return `ENV-${String(numero).padStart(5, "0")}`;
};
