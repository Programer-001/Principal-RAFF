// src/datos/resistencias_stock.ts

export type ResistenciaStock = {
  nombre: string;
  valores: {
    voltaje: string;
    potencia: string;
    longitud: string;
    diametro: string;
    dobleces: string;
    tornillo: string;
    borne: string;
    datosAdicionales: string;
  };
};

export const resistenciasStock: ResistenciaStock[] = [
  {
    nombre: "Sauna",
    valores: {
      voltaje: "220",
      potencia: "2000",
      longitud: "160",
      diametro: "5/16 tp 304",
      dobleces: "5 DOBLECES",
      tornillo: "ACERO INOX 5/8 CON ARGON (Resistencias inoxidable)",
      borne: "GALVANIZADO",
      datosAdicionales: "RESISTENCIAS SAUNA STOCK RAFF",
    },
  },
  {
    nombre: "Vapor grande",
    valores: {
      voltaje: "220",
      potencia: "2800",
      longitud: "120",
      diametro: "5/16 tp 304",
      dobleces: "6 DOBLECES",
      tornillo: "ACERO INOX 5/8 CON ARGON (Resistencias inoxidable)",
      borne: "GALVANIZADO",
      datosAdicionales: "RESISTENCIAS VAPOR GRANDE STOCK RAFF",
    },
  },
  {
    nombre: "Vapor chica",
    valores: {
      voltaje: "220",
      potencia: "2000",
      longitud: "82",
      diametro: "5/16 tp 304",
      dobleces: "5 DOBLECES",
      tornillo: "ACERO INOX 5/8 CON ARGON (Resistencias inoxidable)",
      borne: "GALVANIZADO",
      datosAdicionales: "RESISTENCIAS DE VAPOR CHICA STOCK RAFF",
    },
  },
  {
    nombre: "M de cobre",
    valores: {
      voltaje: "220",
      potencia: "2500",
      longitud: "90",
      diametro: "7/16 cobre",
      dobleces: "3 DOBLECES",
      tornillo: "",
      borne: "GALVANIZADO",
      datosAdicionales: "RESISTENCIAS DE M DE COBRE STOCK RAFF SIN TORNILLO",
    },
  },
  {
    nombre: "M de cobre con tornillo",
    valores: {
      voltaje: "220",
      potencia: "2500",
      longitud: "90",
      diametro: "7/16 cobre",
      dobleces: "3 DOBLECES",
      tornillo: "ACERO INOX 3/4 CON PLATA (20%) (Resistencias de cobre)",
      borne: "GALVANIZADO",
      datosAdicionales: "RESISTENCIAS DE M DE COBRE STOCK RAFF CON TORNILLO",
    },
  },
  {
    nombre: "Boiler",
    valores: {
      voltaje: "120",
      potencia: "900",
      longitud: "100",
      diametro: "5/16 tp 304",
      dobleces: "1 DOBLEZ",
      tornillo: "ACERO INOX 1/2 CON ARGON (Resistencias inoxidable)",
      borne: "GALVANIZADO",
      datosAdicionales: "STOCK BOILER STOCK RAFF",
    },
  },
];