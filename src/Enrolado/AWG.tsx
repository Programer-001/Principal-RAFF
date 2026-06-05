import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";

interface FilaAWG {
  calibre: number;
  diametro: number;
  resistencia: number;
  aumento: number;
}

const Table_AWG = () => {
  const [tabla, setTabla] = useState<FilaAWG[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarAWG = async () => {
      try {
        const snap = await get(ref(db, "cotizador/AWG"));

        if (!snap.exists()) {
          setTabla([]);
          return;
        }

        const datos = Object.values(snap.val()) as FilaAWG[];

        datos.sort((a, b) => a.calibre - b.calibre);

        setTabla(datos);
      } catch (error) {
        console.error("Error cargando tabla AWG:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarAWG();
  }, []);

  if (cargando) return <p>Cargando tabla AWG...</p>;

  return (
    <div className="tabla-awg-container">
      <h3>Tabla AWG</h3>

      <table className="tabla-awg">
        <thead>
          <tr>
            <th>Calibre</th>
            <th>Diámetro</th>
            <th>Resistencia</th>
            <th>Aumento</th>
          </tr>
        </thead>

        <tbody>
          {tabla.map((fila) => (
            <tr key={fila.calibre}>
              <td>{fila.calibre}</td>
              <td>{fila.diametro}</td>
              <td>{fila.resistencia}</td>
              <td>{fila.aumento}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table_AWG;