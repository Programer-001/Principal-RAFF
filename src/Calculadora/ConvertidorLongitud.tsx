import React, { useMemo, useState } from "react";

type UnidadLongitud =
  | "mm"
  | "cm"
  | "m"
  | "pulgadas"
  | "pies"
  | "yardas";

type FormatoNumero = "decimal" | "fraccion";

const unidades: {
  value: UnidadLongitud;
  label: string;
  factorMetros: number;
}[] = [
  { value: "mm", label: "Milímetros", factorMetros: 0.001 },
  { value: "cm", label: "Centímetros", factorMetros: 0.01 },
  { value: "m", label: "Metros", factorMetros: 1 },
  { value: "pulgadas", label: "Pulgadas", factorMetros: 0.0254 },
  { value: "pies", label: "Pies", factorMetros: 0.3048 },
  { value: "yardas", label: "Yardas", factorMetros: 0.9144 },
];

const obtenerFactor = (unidad: UnidadLongitud) => {
  return unidades.find((u) => u.value === unidad)?.factorMetros || 1;
};

const formatearDecimal = (numero: number) => {
  return numero.toFixed(6).replace(/\.?0+$/, "");
};

const textoANumero = (texto: string) => {
  const limpio = texto.trim().replace(/\s+/g, " ");

  if (limpio === "") return NaN;

  if (limpio.includes("/")) {
    const partes = limpio.split(" ");

    let entero = 0;
    let fraccion = limpio;

    if (partes.length === 2) {
      entero = Number(partes[0]);
      fraccion = partes[1];
    }

    if (partes.length > 2) return NaN;

    const fraccionPartes = fraccion.split("/");

    if (fraccionPartes.length !== 2) return NaN;

    const [num, den] = fraccionPartes.map(Number);

    if (
      isNaN(entero) ||
      isNaN(num) ||
      isNaN(den) ||
      den === 0
    ) {
      return NaN;
    }

    return entero + num / den;
  }

  return Number(limpio);
};

const mcd = (a: number, b: number): number => {
  return b === 0 ? a : mcd(b, a % b);
};

const decimalAFraccion = (valor: number) => {
  const entero = Math.floor(valor);
  const decimal = valor - entero;

  const denominador = 64;
  let numerador = Math.round(decimal * denominador);

  if (numerador === 0) return `${entero}`;
  if (numerador === denominador) return `${entero + 1}`;

  const divisor = mcd(numerador, denominador);

  numerador = numerador / divisor;
  const denSimplificado = denominador / divisor;

  return entero > 0
    ? `${entero} ${numerador}/${denSimplificado}`
    : `${numerador}/${denSimplificado}`;
};

const ConvertidorLongitud: React.FC = () => {
  const [valor, setValor] = useState("");
  const [unidadOrigen, setUnidadOrigen] =
    useState<UnidadLongitud>("pulgadas");
  const [unidadDestino, setUnidadDestino] =
    useState<UnidadLongitud>("cm");

  const [formatoEntrada, setFormatoEntrada] =
    useState<FormatoNumero>("decimal");

  const [formatoResultado, setFormatoResultado] =
    useState<FormatoNumero>("decimal");

  const numeroEntrada = useMemo(() => {
    return textoANumero(valor);
  }, [valor]);

  const resultadoNumero = useMemo(() => {
    if (valor === "" || isNaN(numeroEntrada)) {
      return NaN;
    }

    const valorEnMetros =
      numeroEntrada * obtenerFactor(unidadOrigen);

    return valorEnMetros / obtenerFactor(unidadDestino);
  }, [valor, numeroEntrada, unidadOrigen, unidadDestino]);

  const resultado = useMemo(() => {
    if (isNaN(resultadoNumero)) return "";

    if (formatoResultado === "fraccion") {
      return decimalAFraccion(resultadoNumero);
    }

    return formatearDecimal(resultadoNumero);
  }, [resultadoNumero, formatoResultado]);

  const manejarCambioValor = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const texto = e.target.value;

    setValor(texto);

    if (texto.includes("/")) {
      setFormatoEntrada("fraccion");
    } else {
      setFormatoEntrada("decimal");
    }
  };

  const cambiarFormatoEntrada = (formato: FormatoNumero) => {
    if (valor === "" || isNaN(numeroEntrada)) {
      setFormatoEntrada(formato);
      return;
    }

    setFormatoEntrada(formato);

    if (formato === "decimal") {
      setValor(formatearDecimal(numeroEntrada));
    } else {
      setValor(decimalAFraccion(numeroEntrada));
    }
  };

  const invertirUnidades = () => {
    setUnidadOrigen(unidadDestino);
    setUnidadDestino(unidadOrigen);
  };

  return (
    <div className="convertidor-longitud">
      <label className="convertidor-label">Valor</label>

      <input
        className="convertidor-input"
        type="text"
        inputMode="decimal"
        value={valor}
        placeholder="0"
        onKeyDown={(e) => {
          if (["+", "e", "E"].includes(e.key)) {
            e.preventDefault();
          }
        }}
        onChange={manejarCambioValor}
      />

      <div className="convertidor-radios">
        <label>
          <input
            type="radio"
            checked={formatoEntrada === "decimal"}
            onChange={() => cambiarFormatoEntrada("decimal")}
          />
          Decimal
        </label>

        <label>
          <input
            type="radio"
            checked={formatoEntrada === "fraccion"}
            onChange={() => cambiarFormatoEntrada("fraccion")}
          />
          Fracción
        </label>
      </div>

      <label className="convertidor-label">De</label>

      <select
        className="convertidor-select"
        value={unidadOrigen}
        onChange={(e) =>
          setUnidadOrigen(e.target.value as UnidadLongitud)
        }
      >
        {unidades.map((unidad) => (
          <option key={unidad.value} value={unidad.value}>
            {unidad.label}
          </option>
        ))}
      </select>

      <button
        className="btn-invertir"
        type="button"
        onClick={invertirUnidades}
      >
        ⇅
      </button>

      <label className="convertidor-label">A</label>

      <select
        className="convertidor-select"
        value={unidadDestino}
        onChange={(e) =>
          setUnidadDestino(e.target.value as UnidadLongitud)
        }
      >
        {unidades.map((unidad) => (
          <option key={unidad.value} value={unidad.value}>
            {unidad.label}
          </option>
        ))}
      </select>

      <div className="convertidor-radios">
        <label>
          <input
            type="radio"
            checked={formatoResultado === "decimal"}
            onChange={() => setFormatoResultado("decimal")}
          />
          Decimal
        </label>

        <label>
          <input
            type="radio"
            checked={formatoResultado === "fraccion"}
            onChange={() => setFormatoResultado("fraccion")}
          />
          Fracción
        </label>
      </div>

      <div className="convertidor-resultado">
        <span>Resultado</span>
        <strong>{resultado || "0"}</strong>
      </div>
    </div>
  );
};

export default ConvertidorLongitud;