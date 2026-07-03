import React, { useEffect, useState } from "react";

const CalculadoraBasica: React.FC = () => {
  const [pantalla, setPantalla] = useState("0");

  const agregar = (valor: string) => {
    if (pantalla === "0") {
      setPantalla(valor);
    } else {
      setPantalla(pantalla + valor);
    }
  };

  const limpiar = () => {
    setPantalla("0");
  };

  const borrar = () => {
    if (pantalla.length === 1) {
      setPantalla("0");
    } else {
      setPantalla(pantalla.slice(0, -1));
    }
  };

  const calcular = () => {
    try {
      // eslint-disable-next-line no-eval
      const resultado = eval(pantalla);
      setPantalla(String(resultado));
    } catch {
      setPantalla("Error");
    }
  };

  useEffect(() => {
    const manejarTeclado = (e: KeyboardEvent) => {
      const tecla = e.key;

      if (/^[0-9]$/.test(tecla)) {
        agregar(tecla);
        return;
      }

      if (tecla === ".") {
        agregar(".");
        return;
      }

      if (["+", "-", "*", "/"].includes(tecla)) {
        agregar(tecla);
        return;
      }

      if (tecla === "Enter" || tecla === "=") {
        e.preventDefault();
        calcular();
        return;
      }

      if (tecla === "Backspace") {
        borrar();
        return;
      }

      if (tecla === "Escape") {
        limpiar();
      }
    };

    window.addEventListener("keydown", manejarTeclado);

    return () => {
      window.removeEventListener("keydown", manejarTeclado);
    };
  }, [pantalla]);

  const botones = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "=", "+"
  ];

  return (
    <>
      <input
        className="calculadora-display"
        value={pantalla}
        readOnly
      />

      <div className="calculadora-extra">
        <button className="btn-gray" onClick={limpiar}>
          C
        </button>

        <button className="btn-gray" onClick={borrar}>
          ⌫
        </button>
      </div>

      <div className="calculadora-grid">
        {botones.map((b) => (
          <button
            key={b}
            className={b === "=" ? "btn-equals" : ""}
            onClick={() => {
              if (b === "=") {
                calcular();
              } else {
                agregar(b);
              }
            }}
          >
            {b}
          </button>
        ))}
      </div>
    </>
  );
};

export default CalculadoraBasica;