export function calcularDiasVacaciones(fechaIngreso?: string | Date): number {
  if (!fechaIngreso) return 0;

  let ingreso: Date;

  if (fechaIngreso instanceof Date) {
    ingreso = fechaIngreso;
  } else {
    // acepta formato "YYYY-MM-DD"
    if (fechaIngreso.includes("-")) {
      ingreso = new Date(fechaIngreso + "T00:00:00");
    } else {
      // acepta formato "DD/MM/YYYY"
      const [dia, mes, anio] = fechaIngreso.split("/");
      ingreso = new Date(Number(anio), Number(mes) - 1, Number(dia));
    }
  }

  const hoy = new Date();

  let anios = hoy.getFullYear() - ingreso.getFullYear();

  const yaCumplioEsteAnio =
    hoy.getMonth() > ingreso.getMonth() ||
    (hoy.getMonth() === ingreso.getMonth() &&
      hoy.getDate() >= ingreso.getDate());

  if (!yaCumplioEsteAnio) anios--;

  if (anios < 1) return 0;
  if (anios === 1) return 12;
  if (anios === 2) return 14;
  if (anios === 3) return 16;
  if (anios === 4) return 18;
  if (anios === 5) return 20;
  if (anios >= 6 && anios <= 10) return 22;
  if (anios >= 11 && anios <= 15) return 24;
  if (anios >= 16 && anios <= 20) return 26;
  if (anios >= 21 && anios <= 25) return 28;
  if (anios >= 26 && anios <= 30) return 30;
  if (anios >= 31 && anios <= 35) return 32;

  // después de 35 años sigue aumentando 2 días cada 5 años
  return 32 + Math.floor((anios - 31) / 5) * 2;
}