// src/Paqueterias.tsx

import React, { useEffect, useState } from "react";
import {getDatabase, ref,
  onValue,
  push,
  remove,
} from "firebase/database";
import { app } from "../firebase/config";

interface PaqueteriaItem {
  id: string;
  nombre: string;
}

const Paqueterias: React.FC = () => {
  const db = getDatabase(app);

  const [paqueterias, setPaqueterias] = useState<PaqueteriaItem[]>([]);
  const [nuevaPaqueteria, setNuevaPaqueteria] = useState("");

  useEffect(() => {
    const paqueteriasRef = ref(db, "paqueterias");

    const unsubscribe = onValue(paqueteriasRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPaqueterias([]);
        return;
      }

      // Si Firebase todavía tiene el arreglo viejo
      if (Array.isArray(data)) {
        const lista = data
          .map((nombre, index) => ({
            id: String(index),
            nombre,
          }))
          .filter((item) => item.nombre);

        setPaqueterias(lista);
        return;
      }

      // Si ya está guardado con push()
      const lista = Object.entries(data).map(([id, valor]) => ({
        id,
        nombre:
          typeof valor === "string"
            ? valor
            : (valor as any)?.nombre || "",
      }));

      setPaqueterias(lista.filter((p) => p.nombre));
    });

    return () => unsubscribe();
  }, [db]);

  const agregarPaqueteria = async () => {
    const nombre = nuevaPaqueteria.trim();

    if (!nombre) {
      alert("Escribe una paquetería");
      return;
    }

    const yaExiste = paqueterias.some(
      (p) => p.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (yaExiste) {
      alert("Esa paquetería ya existe");
      return;
    }

    try {
      await push(ref(db, "paqueterias"), nombre);

      setNuevaPaqueteria("");
    } catch (error) {
      console.error("Error agregando paquetería:", error);
      alert("No se pudo agregar la paquetería");
    }
  };

  const eliminarPaqueteria = async (id: string, nombre: string) => {
    const confirmar = window.confirm(
      `¿Eliminar la paquetería "${nombre}"?`
    );

    if (!confirmar) return;

    try {
      await remove(ref(db, `paqueterias/${id}`));
    } catch (error) {
      console.error("Error eliminando paquetería:", error);
      alert("No se pudo eliminar la paquetería");
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>Paqueterías</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <input
          type="text"
          value={nuevaPaqueteria}
          onChange={(e) => setNuevaPaqueteria(e.target.value)}
          placeholder="Nueva paquetería"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              agregarPaqueteria();
            }
          }}
          style={{
            flex: 1,
            padding: 8,
          }}
        />

        <button
          className="btn btn-blue"
          onClick={agregarPaqueteria}
        >
          Agregar
        </button>
      </div>

      <table className="caja-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Paquetería</th>
            <th style={{ width: 100 }}>Acción</th>
          </tr>
        </thead>

        <tbody>
          {paqueterias.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>

              <td>
                <button
                  className="btn btn-red"
                  onClick={() =>
                    eliminarPaqueteria(p.id, p.nombre)
                  }
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}

          {paqueterias.length === 0 && (
            <tr>
              <td colSpan={2}>No hay paqueterías registradas</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Paqueterias;