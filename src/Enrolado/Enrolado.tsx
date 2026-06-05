import { useState } from "react";
import TablaResultados from "./tablaresultados"; // tu TSX
import Table_AWG from "./AWG";
import "../css/Enrolado.css";

const Enrolado = () => {
  const [voltaje, setVoltaje] = useState<number>(0);
  const [potencia, setPotencia] = useState<number>(0);
  const [longitudTubo, setLongitudTubo] = useState<number>(0);
  const [tubo, setTubo] = useState<string>("");
  const [calcularTabla, setCalcularTabla] = useState<boolean>(false);
  const [mostrarTabla, setMostrarTabla] = useState(false); // 👈 toggle tabla AWG

  const handleCalcular = () => {
    if (!voltaje || !potencia || !longitudTubo || !tubo) {
      alert("Todos los campos son obligatorios");
      return;
    }
    setCalcularTabla(true);
  };

  const limpiarCampos = () => {
    setVoltaje(0);
    setPotencia(0);
    setLongitudTubo(0);
    setTubo("");
    setCalcularTabla(false);
  };

  // Calculamos resistencia de forma segura
  const resistencia = potencia > 0 ? Math.pow(voltaje, 2) / potencia : 0;

  return (
    <div className="enrolado-container">
      <div className="encabezado-principal">
        <h1>Enrolado de Tubo</h1>
      </div>
      <div className="enrolado-inputs">
        <label>
          Voltaje
          <input
            type="number"
            inputMode="numeric"
            value={voltaje || ""}
            onChange={(e) => setVoltaje(Number(e.target.value))}
          />
        </label>
        <label>
          Potencia
          <input
            type="number"
            inputMode="numeric"
            value={potencia || ""}
            onChange={(e) => setPotencia(Number(e.target.value))}
          />
        </label>
        <label>
          Longitud
          <input
            type="number"
            inputMode="numeric"
            value={longitudTubo || ""}
            onChange={(e) => setLongitudTubo(Number(e.target.value))}
          />
        </label>
        <label>
          Tubo:
          <select value={tubo || ""} onChange={(e) => setTubo(e.target.value)}>
            <option value="">Seleccione una opción</option>
            <option value="5/16">5/16</option>
            <option value="7/16">7/16</option>
          </select>
        </label>
      </div>

      <h3 className="enrolado-buttons">
        Resistencia: {resistencia.toFixed(2)} Ω
      </h3>

      <div className="enrolado-buttons">
        <button className="btn-primario" onClick={handleCalcular}>
          Calcular
        </button>
        <button className="btn-secundario" onClick={limpiarCampos}>
          Borrar
        </button>
        <button
          className="btn-neutro"
          onClick={() => setMostrarTabla(!mostrarTabla)}
        >
          {mostrarTabla ? "Cerrar Tabla" : "Tabla alambres"}
        </button>
      </div>

      {calcularTabla && (
        <TablaResultados
          voltaje={voltaje}
          potencia={potencia}
          longitudTubo={longitudTubo}
          tubo={tubo}
        />
      )}

      {/* 🔹 Botón para mostrar tabla AWG */}
      <br />

      {mostrarTabla && (
        <div style={{ marginTop: "20px" }}>
          <Table_AWG />
        </div>
      )}
    </div>
  );
};

export default Enrolado;
