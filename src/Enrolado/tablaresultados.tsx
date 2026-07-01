import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
import { Enrolado_total } from "./Calculos";
import { Aislador } from "./aisladores";

interface Props {
  voltaje: number;
  potencia: number;
  longitudTubo: number;
  tubo: string;
}

interface FilaAWG {
  calibre: number;
  diametro: number;
  resistencia: number;
  aumento: number;
}

const TablaResultados: React.FC<Props> = ({
  voltaje,
  potencia,
  longitudTubo,
  tubo,
}) => {
  const [resultados, setResultados] = useState<number[][]>([]);
  const [tablaAWG, setTablaAWG] = useState<FilaAWG[]>([]);
  const [aisladores, setAisladores] = useState<Aislador[]>([]);

useEffect(() => {
  const cargarDatos = async () => {
    const snapAWG = await get(ref(db, "cotizador/AWG"));

    if (snapAWG.exists()) {
      const datosAWG = Object.values(snapAWG.val()) as FilaAWG[];
      datosAWG.sort((a, b) => a.calibre - b.calibre);
      setTablaAWG(datosAWG);
    } else {
      setTablaAWG([]);
    }

    const snapAisladores = await get(ref(db, "cotizador/Aisladores"));

    if (snapAisladores.exists()) {
      const datosAisladores = Object.values(
        snapAisladores.val()
      ) as Aislador[];

      setAisladores(datosAisladores);
    } else {
      setAisladores([]);
    }
  };

  cargarDatos();
}, []);

  useEffect(() => {
    if (!voltaje || !potencia || !longitudTubo || !tubo) return;
    if (tablaAWG.length === 0) return;
    if (aisladores.length === 0) return;

    const calcular = async () => {
        await Enrolado_total(
        voltaje,
        potencia,
        longitudTubo,
        tubo,
        setResultados,
        tablaAWG,
        aisladores
        );
    };

    calcular();
  }, [voltaje, potencia, longitudTubo, tubo, tablaAWG, aisladores]);

  const obtenerAumento = (calibre: number) => {
    const fila = tablaAWG.find((t) => t.calibre === calibre);
    return fila ? fila.aumento : 0;
  };

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="table-awg">
          <thead>
            <tr>
              <th>Enrolado (cm)</th>
              <th>Calibre</th>
              <th>Resistencia con Aumento</th>
              <th>Guía</th>
              <th>Metros de Alambre</th>
            </tr>
          </thead>

          <tbody>
            {resultados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  No hay resultados
                </td>
              </tr>
            ) : (
              resultados.map((fila, i) => {
                const enrolado = typeof fila[0] === "number" ? fila[0] : 0;
                const calibreFila = typeof fila[3] === "number" ? fila[3] : 0;
                const calibreGuia = typeof fila[2] === "number" ? fila[2] : 0;
                const longitudCable = typeof fila[4] === "number" ? fila[4] : 0;

                const sumaAumento =
                  obtenerAumento(calibreFila) + Math.pow(voltaje, 2) / potencia;

                return (
                  <tr key={i}>
                    <td>{enrolado.toFixed(2)}</td>
                    <td>{calibreFila}</td>
                    <td>{sumaAumento.toFixed(2)}</td>
                    <td>{calibreGuia}</td>
                    <td>{longitudCable.toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaResultados;