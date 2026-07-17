// src/Info_adicional/Tablas.tsx
// Este componente muestra las tablas almacenadas en Firebase
// y permite seleccionar cuál se desea visualizar.

import React, { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { formatearMoneda } from "../funciones/formato_moneda";
import "../css/info-adicional.css";

type TipoTabla = "alambre_kanthal_d" | "alambre_nicromel";

type ValorFirebase = string | number | boolean | null;

type RegistroFirebase = Record<string, ValorFirebase>;

type RegistrosTabla = Record<string, RegistroFirebase>;

type FilaTabla = {
  id: string;
  [campo: string]: ValorFirebase | undefined;
};

type OpcionTabla = {
  value: TipoTabla;
  label: string;
  ruta: string;
};

const OPCIONES_TABLAS: OpcionTabla[] = [
  {
    value: "alambre_kanthal_d",
    label: "Alambre Kanthal D",
    ruta: "cotizador/alambre_kanthal_d",
  },
  {
    value: "alambre_nicromel",
    label: "Alambre Nicromel",
    ruta: "cotizador/alambre_nicromel",
  },
];

const Tablas: React.FC = () => {
  const [tablaSeleccionada, setTablaSeleccionada] =
    useState<TipoTabla>("alambre_kanthal_d");

  const [registros, setRegistros] = useState<RegistrosTabla>({});
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const opcionActual = useMemo(() => {
    return OPCIONES_TABLAS.find(
      (opcion) => opcion.value === tablaSeleccionada
    );
  }, [tablaSeleccionada]);

  useEffect(() => {
    const cargarTabla = async () => {
      if (!opcionActual) {
        setRegistros({});
        return;
      }

      try {
        setCargando(true);
        setError("");

        const referenciaTabla = ref(db, opcionActual.ruta);
        const snapshot = await get(referenciaTabla);

        if (snapshot.exists()) {
          const datos = snapshot.val() as RegistrosTabla;
          setRegistros(datos);
        } else {
          setRegistros({});
        }
      } catch (error) {
        console.error("Error al cargar la tabla:", error);
        setError("No fue posible cargar los registros.");
        setRegistros({});
      } finally {
        setCargando(false);
      }
    };

    cargarTabla();
  }, [opcionActual]);

  const filas = useMemo<FilaTabla[]>(() => {
    return Object.entries(registros).map(([id, datos]) => ({
      id,
      ...datos,
    }));
  }, [registros]);

const columnas = useMemo<string[]>(() => {
  if (tablaSeleccionada === "alambre_nicromel") {
    return [
      "Tipo",
      "Diametro",
      "Resistencia",
      "Aumento",
      "Precio",
    ];
  }

  if (tablaSeleccionada === "alambre_kanthal_d") {
    return [
      "Tipo",
      "Resistencia",
      "Precio",
    ];
  }

  return [];
}, [tablaSeleccionada]);

const mostrarValor = (
  valor: ValorFirebase | undefined,
  columna: string
): string => {
  if (valor === undefined || valor === null || valor === "") {
    return "--";
  }

  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }

  if (columna === "Precio") {
    return formatearMoneda(Number(valor));
  }

  return String(valor);
};

  return (
    <div className="pagina-tablas">
      <div className="tablas-encabezado">
        <div>
          <h1>Tablas de alambres</h1>
          <p>Consulta la información de los alambres disponibles.</p>
        </div>

        <div className="tablas-selector">
          <label htmlFor="tabla">Seleccionar tabla</label>

          <select
            id="tabla"
            value={tablaSeleccionada}
            onChange={(e) =>
              setTablaSeleccionada(e.target.value as TipoTabla)
            }
          >
            {OPCIONES_TABLAS.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="tablas-contenedor">
        <h2>{opcionActual?.label ?? "Tabla"}</h2>

        {cargando && (
          <div className="tablas-mensaje">
            Cargando registros...
          </div>
        )}

        {!cargando && error && (
          <div className="tablas-error">
            {error}
          </div>
        )}

        {!cargando && !error && filas.length === 0 && (
          <div className="tablas-mensaje">
            Esta tabla no contiene registros.
          </div>
        )}

        {!cargando && !error && filas.length > 0 && (
          <div className="tabla-scroll">
            <table className="tabla-firebase">
                <thead>
                <tr>
                    {columnas.map((columna) => (
                    <th key={columna}>
                        {columna}
                    </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {filas.map((fila) => (
                    <tr key={fila.id}>
                    {columnas.map((columna) => (
                        <td key={`${fila.id}-${columna}`}>
                        {mostrarValor(fila[columna], columna)}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tablas;