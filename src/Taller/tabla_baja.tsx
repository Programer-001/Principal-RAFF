//src/Taller/tabla_baja.tsx
//Este componente muestra la tabla de cartucho baja fabricación y permite editarla si se ingresa la contraseña correcta.
import React, { useEffect, useState } from "react";
import { ref, onValue, set, push } from "firebase/database";
import { db } from "../firebase/config";

type FilaBaja = {
  id?: string;
  diametro: string;
  largo: string;
  guia: string;
  alambre: string;
  potencia: string;
  voltaje: string;
  ohms: string;
};

const PASSWORD_EDITAR = "1103"; // cámbiala

const columnas: { key: keyof FilaBaja; label: string }[] = [
  { key: "diametro", label: "Diámetro" },
  { key: "largo", label: "Largo" },
  { key: "guia", label: "Guía" },
  { key: "alambre", label: "Alambre" },
  { key: "potencia", label: "Potencia" },
  { key: "voltaje", label: "Voltaje" },
  { key: "ohms", label: "Ohms" },
];

const TablaBaja: React.FC = () => {
  const [filas, setFilas] = useState<FilaBaja[]>([]);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    const tablaRef = ref(db, "cotizador/cartucho_baja_fabricacion");

    const unsubscribe = onValue(tablaRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setFilas([]);
        return;
      }

      const lista: FilaBaja[] = Object.entries(data).map(
        ([id, value]: any) => ({
          id,
          diametro: value.diametro || "",
          largo: value.largo || "",
          guia: value.guia || "",
          alambre: value.alambre || "",
          potencia: value.potencia || "",
          voltaje: value.voltaje || "",
          ohms: value.ohms || "",
        })
      );

      setFilas(lista);
    });

    return () => unsubscribe();
  }, []);

  const pedirPassword = () => {
    const pass = window.prompt("Ingresa la contraseña para editar:");

    if (pass === PASSWORD_EDITAR) {
      setEditando(true);
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const actualizarFila = (
    index: number,
    campo: keyof FilaBaja,
    valor: string
  ) => {
    const copia = [...filas];
    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };
    setFilas(copia);
  };

  const agregarFila = () => {
    setFilas([
      ...filas,
      {
        diametro: "",
        largo: "",
        guia: "",
        alambre: "",
        potencia: "",
        voltaje: "",
        ohms: "",
      },
    ]);
  };

  const guardarCambios = async () => {
    try {
      for (const fila of filas) {
        const datosGuardar = {
          diametro: fila.diametro,
          largo: fila.largo,
          guia: fila.guia,
          alambre: fila.alambre,
          potencia: fila.potencia,
          voltaje: fila.voltaje,
          ohms: fila.ohms,
        };

        if (fila.id) {
          await set(
            ref(db, `cotizador/cartucho_baja_fabricacion/${fila.id}`),
            datosGuardar
          );
        } else {
          const nuevaRef = push(
            ref(db, "cotizador/cartucho_baja_fabricacion")
          );
          await set(nuevaRef, datosGuardar);
        }
      }

      alert("Tabla guardada correctamente");
      setEditando(false);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la tabla");
    }
  };

return (
  <div className="tabla-baja-page">
    <h2>Tabla Cartucho Baja Fabricación</h2>

    <div className="tabla-baja-actions">
      {!editando ? (
        <button className="btn btn-blue" onClick={pedirPassword}>
          Editar
        </button>
      ) : (
        <>
          <button className="btn btn-green" onClick={agregarFila}>
            + Agregar fila
          </button>
          <button className="btn btn-yellow" onClick={guardarCambios}>
            Guardar
          </button>
          <button className="btn btn-red" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </>
      )}
    </div>

    <div className="tabla-baja-wrapper">
      <table className="tabla-baja">
        <thead>
          <tr>
            {columnas.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.map((fila, index) => (
            <tr key={fila.id || index}>
              {columnas.map((col) => (
                <td key={col.key}>
                  {editando ? (
                    <input
                      value={fila[col.key] || ""}
                      onChange={(e) =>
                        actualizarFila(index, col.key, e.target.value)
                      }
                    />
                  ) : (
                    fila[col.key] || "—"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
};

export default TablaBaja;