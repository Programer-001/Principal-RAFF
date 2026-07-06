import React, { useMemo, useState } from "react";

type TipoDatoOhm = "V" | "P" | "R" | "I";

const opcionesOhm: {
  value: TipoDatoOhm;
  label: string;
  unidad: string;
}[] = [
  { value: "V", label: "Voltaje", unidad: "V" },
  { value: "P", label: "Potencia", unidad: "W" },
  { value: "R", label: "Resistencia", unidad: "Ω" },
  { value: "I", label: "Corriente", unidad: "A" },
];

const formatear = (numero: number) => {
  if (!isFinite(numero)) return "";

  return numero.toFixed(4).replace(/\.?0+$/, "");
};

const obtenerLabel = (tipo: TipoDatoOhm) => {
  return opcionesOhm.find((op) => op.value === tipo)?.label || "";
};

const obtenerUnidad = (tipo: TipoDatoOhm) => {
  return opcionesOhm.find((op) => op.value === tipo)?.unidad || "";
};

const CalculadoraOhm: React.FC = () => {
  const [valor1, setValor1] = useState("");
  const [valor2, setValor2] = useState("");

  const [tipo1, setTipo1] = useState<TipoDatoOhm>("V");
  const [tipo2, setTipo2] = useState<TipoDatoOhm>("P");

  const resultados = useMemo(() => {
    const n1 = Number(valor1);
    const n2 = Number(valor2);

    if (
      valor1 === "" ||
      valor2 === "" ||
      isNaN(n1) ||
      isNaN(n2) ||
      n1 <= 0 ||
      n2 <= 0 ||
      tipo1 === tipo2
    ) {
      return null;
    }

    const datos: Partial<Record<TipoDatoOhm, number>> = {
      [tipo1]: n1,
      [tipo2]: n2,
    };

    const V = datos.V;
    const P = datos.P;
    const R = datos.R;
    const I = datos.I;

    if (V && P) {
      datos.R = (V * V) / P;
      datos.I = P / V;
    }

    if (V && R) {
      datos.P = (V * V) / R;
      datos.I = V / R;
    }

    if (V && I) {
      datos.P = V * I;
      datos.R = V / I;
    }

    if (P && R) {
      datos.V = Math.sqrt(P * R);
      datos.I = datos.V ? P / datos.V : undefined;
    }

    if (P && I) {
      datos.V = P / I;
      datos.R = P / (I * I);
    }

    if (R && I) {
      datos.V = R * I;
      datos.P = R * I * I;
    }

    return datos;
  }, [valor1, valor2, tipo1, tipo2]);

  const limpiar = () => {
    setValor1("");
    setValor2("");
  };

  const tiposCalculados = opcionesOhm.filter(
    (opcion) => opcion.value !== tipo1 && opcion.value !== tipo2
  );

  return (
    <div className="convertidor-longitud">
      <label className="convertidor-label">Dato 1</label>

      <input
        className="convertidor-input"
        type="number"
        inputMode="decimal"
        value={valor1}
        placeholder="Ej. 220"
        onKeyDown={(e) => {
          if (["-", "+", "e", "E"].includes(e.key)) {
            e.preventDefault();
          }
        }}
        onChange={(e) => setValor1(e.target.value)}
      />

      <select
        className="convertidor-select"
        value={tipo1}
        onChange={(e) => setTipo1(e.target.value as TipoDatoOhm)}
      >
        {opcionesOhm.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label} ({opcion.unidad})
          </option>
        ))}
      </select>

      <label className="convertidor-label">Dato 2</label>

      <input
        className="convertidor-input"
        type="number"
        inputMode="decimal"
        value={valor2}
        placeholder="Ej. 2000"
        onKeyDown={(e) => {
          if (["-", "+", "e", "E"].includes(e.key)) {
            e.preventDefault();
          }
        }}
        onChange={(e) => setValor2(e.target.value)}
      />

      <select
        className="convertidor-select"
        value={tipo2}
        onChange={(e) => setTipo2(e.target.value as TipoDatoOhm)}
      >
        {opcionesOhm.map((opcion) => (
          <option key={opcion.value} value={opcion.value}>
            {opcion.label} ({opcion.unidad})
          </option>
        ))}
      </select>

      {tipo1 === tipo2 && (
        <div className="convertidor-resultado">
          <span>Selecciona dos datos diferentes</span>
        </div>
      )}

      <div className="convertidor-resultado">
        <span>Resultado</span>
      </div>

      {resultados ? (
        tiposCalculados.map((opcion) => (
          <div
            key={opcion.value}
            className="convertidor-resultado"
          >
            <span>{obtenerLabel(opcion.value)}</span>

            <strong>
              {formatear(resultados[opcion.value] || 0)}{" "}
              {obtenerUnidad(opcion.value)}
            </strong>
          </div>
        ))
      ) : (
        <div className="convertidor-resultado">
          <span>Ingresa dos datos válidos</span>
          <strong>0</strong>
        </div>
      )}

      <button
        className="btn-invertir"
        type="button"
        onClick={limpiar}
      >
        Limpiar
      </button>
    </div>
  );
};

export default CalculadoraOhm;