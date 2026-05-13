// src/Configuracion/Mostrar_tablas.tsx
// Este componente muestra las tablas del cotizador y permite editarlas

import { useEffect, useMemo, useState } from "react";
import { ref, get, push, update, remove } from "firebase/database";
import { db } from "../firebase/config";
import "../css/mostrar_tablas.css";
import { formatearMoneda } from "../funciones/formato_moneda";

const TABLAS_COTIZADOR = [
  "Aspecto de la resistencia",
  "Diametro_de_tubo",
  "alambre_kanthal_d",
  "alambre_nicromel",
  "aspecto_r",
  "barrenos",
  "borne",
  "cable_para_soldar",
  "desoldar_base",
  "dobleces",
  "resoldar_borne_terminal",
  "sellos",
  "servicios",
  "soldadura_resistencia",
  "soldar_cable_resistencia",
  "tapones_macho",
  "terminales",
  "termoparj",
  "termopark",
  "tornillo",
];

type FilaFirebase = {
  id: string;
  [key: string]: any;
};

export default function MostrarTablas() {
  const [tablaActiva, setTablaActiva] = useState<string>(TABLAS_COTIZADOR[0]);
  const [filas, setFilas] = useState<FilaFirebase[]>([]);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nuevaFila, setNuevaFila] = useState<Record<string, any>>({});

  const cargarTabla = async (nombreTabla: string) => {
    setCargando(true);
    setEditando(false);
    setNuevaFila({});

    try {
      const snap = await get(ref(db, `cotizador/${nombreTabla}`));

      if (!snap.exists()) {
        setFilas([]);
        return;
      }

      const data = snap.val();

      const arreglo = Object.entries(data).map(([id, value]: any) => ({
        id,
        ...value,
      }));

      setFilas(arreglo);
    } catch (error) {
      console.error("Error cargando tabla:", error);
      alert("No se pudo cargar la tabla");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTabla(tablaActiva);
  }, [tablaActiva]);

  const columnas = useMemo(() => {
    const setColumnas = new Set<string>();

    filas.forEach((fila) => {
      Object.keys(fila).forEach((key) => {
        if (key !== "id") setColumnas.add(key);
      });
    });

    Object.keys(nuevaFila).forEach((key) => setColumnas.add(key));

    return Array.from(setColumnas);
  }, [filas, nuevaFila]);

  const cambiarValor = (id: string, campo: string, valor: string) => {
    setFilas((prev) =>
      prev.map((fila) =>
        fila.id === id
          ? {
              ...fila,
              [campo]: valor,
            }
          : fila
      )
    );
  };

  const guardarFila = async (fila: FilaFirebase) => {
    const { id, ...datos } = fila;

    try {
      await update(ref(db, `cotizador/${tablaActiva}/${id}`), datos);
      alert("Fila actualizada");
    } catch (error) {
      console.error("Error guardando fila:", error);
      alert("No se pudo guardar la fila");
    }
  };

  const eliminarFila = async (id: string) => {
    const confirmar = window.confirm("¿Eliminar esta fila?");
    if (!confirmar) return;

    try {
      await remove(ref(db, `cotizador/${tablaActiva}/${id}`));
      setFilas((prev) => prev.filter((fila) => fila.id !== id));
    } catch (error) {
      console.error("Error eliminando fila:", error);
      alert("No se pudo eliminar la fila");
    }
  };

  const agregarFila = async () => {
    if (Object.keys(nuevaFila).length === 0) {
      alert("Primero escribe datos para la nueva fila");
      return;
    }

    try {
      const nuevaRef = await push(ref(db, `cotizador/${tablaActiva}`), nuevaFila);

      setFilas((prev) => [
        ...prev,
        {
          id: nuevaRef.key || "",
          ...nuevaFila,
        },
      ]);

      setNuevaFila({});
      alert("Fila agregada");
    } catch (error) {
      console.error("Error agregando fila:", error);
      alert("No se pudo agregar la fila");
    }
  };

  const agregarColumnaNuevaFila = () => {
    const nombreCampo = prompt("Nombre del campo:");
    if (!nombreCampo) return;

    setNuevaFila((prev) => ({
      ...prev,
      [nombreCampo]: "",
    }));
  };
// Función para convertir nombres de campos a un formato más legible
    const nombreBonito = (texto: string) => {
    return texto
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    };

  return (
    <div className="mostrar-tablas-page">
      <aside className="mostrar-tablas-sidebar">
        <h2>cotizador</h2>

        {TABLAS_COTIZADOR.map((tabla) => (
          <button
            key={tabla}
            className={tablaActiva === tabla ? "tabla-btn activa" : "tabla-btn"}
            onClick={() => setTablaActiva(tabla)}
          >
            {nombreBonito(tabla)}
          </button>
        ))}
      </aside>

      <main className="mostrar-tablas-main">
        <div className="mostrar-tablas-header">
          <div>
            <h1>{nombreBonito(tablaActiva)}</h1>
            <p>
              {editando
                ? "Modo edición: puedes modificar, eliminar o agregar filas."
                : "Modo lectura: los datos no se pueden modificar."}
            </p>
          </div>

          <div className="acciones-tabla">
            <button
              className={editando ? "btn-rojo" : "btn-azul"}
              onClick={() => setEditando(!editando)}
            >
              {editando ? "Cerrar edición" : "Editar"}
            </button>

            <button className="btn-gris" onClick={() => cargarTabla(tablaActiva)}>
              Recargar
            </button>
          </div>
        </div>

        {cargando ? (
          <p>Cargando tabla...</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="mostrar-tablas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {columnas.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                  {editando && <th>Acciones</th>}
                </tr>
              </thead>

              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="td-id">{fila.id}</td>

                    {columnas.map((col) => (
                      <td key={col}>
                        {editando ? (
                          <input
                            value={fila[col] ?? ""}
                            onChange={(e) =>
                              cambiarValor(fila.id, col, e.target.value)
                            }
                          />
                        ) : (
                        <span>
                        {col.toLowerCase().includes("precio")
                            ? formatearMoneda(Number(fila[col] || 0))
                            : String(fila[col] ?? "")}
                        </span>
                        )}
                      </td>
                    ))}

                    {editando && (
                      <td className="td-acciones">
                        <button
                          className="btn-verde"
                          onClick={() => guardarFila(fila)}
                        >
                          Guardar
                        </button>

                        <button
                          className="btn-rojo"
                          onClick={() => eliminarFila(fila.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {editando && (
                  <tr className="fila-nueva">
                    <td>Nueva</td>

                    {columnas.map((col) => (
                      <td key={col}>
                        <input
                          value={nuevaFila[col] ?? ""}
                          onChange={(e) =>
                            setNuevaFila((prev) => ({
                              ...prev,
                              [col]: e.target.value,
                            }))
                          }
                        />
                      </td>
                    ))}

                    <td className="td-acciones">
                      <button className="btn-gris" onClick={agregarColumnaNuevaFila}>
                        + Campo
                      </button>

                      <button className="btn-verde" onClick={agregarFila}>
                        Agregar
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {filas.length === 0 && (
              <div className="tabla-vacia">
                No hay datos en esta tabla. Activa edición para agregar una fila.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}