// src/Info_adicional/Tablas.tsx
// Muestra tablas almacenadas en Firebase y la tabla local de Banda, Termopares,cartucho de baja.

import React, { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { formatearMoneda } from "../funciones/formato_moneda";
import { diametros, anchos, precios } from "../datos/tabla";//tabla de banda
import { termoparJ, termoparK } from "../datos/Termopares";
import "../css/info-adicional.css";

type TipoTabla =
  | "alambre_kanthal_d"
  | "alambre_nicromel"
  | "banda"
  | "cartucho_baja"
  | "termopar_j"
  | "termopar_k";

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
  ruta?: string;
};

type DiametroCartuchoBaja = {
  label: string;
  value: number;
};

type TablaCartuchoBaja = {
  nombre: string;
  diametros: DiametroCartuchoBaja[];
  largos: number[];
  precios: number[][];
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
  {
    value: "banda",
    label: "Banda",
  },
  {
  value: "cartucho_baja",
  label: "Cartucho Baja",
  ruta: "cotizador/tabla_cartucho_baja",
},
{
  value: "termopar_j",
  label: "Termopar tipo J",
},
{
  value: "termopar_k",
  label: "Termopar tipo K",
},
];

const Tablas: React.FC = () => {
  const [tablaSeleccionada, setTablaSeleccionada] =
    useState<TipoTabla>("alambre_kanthal_d");

  const [registros, setRegistros] = useState<RegistrosTabla>({});
  const [tablaCartuchoBaja, setTablaCartuchoBaja] =useState<TablaCartuchoBaja | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const opcionActual = useMemo(() => {
    return OPCIONES_TABLAS.find(
      (opcion) => opcion.value === tablaSeleccionada
    );
  }, [tablaSeleccionada]);

useEffect(() => {
  const cargarTabla = async () => {
    setError("");

if (tablaSeleccionada === "banda" ||tablaSeleccionada === "termopar_j" ||tablaSeleccionada === "termopar_k") 
  {
      setRegistros({});
      setTablaCartuchoBaja(null);
      setCargando(false);
      return;
    }

    if (!opcionActual?.ruta) {
      setRegistros({});
      setTablaCartuchoBaja(null);
      return;
    }

    try {
      setCargando(true);

      const referenciaTabla = ref(db, opcionActual.ruta);
      const snapshot = await get(referenciaTabla);

      if (!snapshot.exists()) {
        setRegistros({});
        setTablaCartuchoBaja(null);
        return;
      }

      if (tablaSeleccionada === "cartucho_baja") {
        const datos = snapshot.val() as TablaCartuchoBaja;

        setTablaCartuchoBaja(datos);
        setRegistros({});
        return;
      }

      const datos = snapshot.val() as RegistrosTabla;

      setRegistros(datos);
      setTablaCartuchoBaja(null);
    } catch (error) {
      console.error("Error al cargar la tabla:", error);
      setError("No fue posible cargar los registros.");
      setRegistros({});
      setTablaCartuchoBaja(null);
    } finally {
      setCargando(false);
    }
  };

  cargarTabla();
}, [tablaSeleccionada, opcionActual]);

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
      return ["Tipo", "Resistencia", "Precio"];
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
          <h1>Tablas de información</h1>
          <p>Consulta la información disponible.</p>
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

        {/* Tabla especial de Banda */}
        {tablaSeleccionada === "banda" && (
          <div className="tabla-scroll tabla-scroll-banda">
            <table className="tabla-firebase tabla-banda">
              <thead>
                <tr>
                  <th className="celda-diametro-ancho">
                    Ø / Ancho
                  </th>

                  {anchos.map((ancho) => (
                    <th key={`ancho-${ancho}`}>
                      {ancho}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {diametros.map((diametro, indiceDiametro) => (
                  <tr key={`diametro-${diametro}`}>
                    <th className="columna-diametro">
                      {diametro}
                    </th>

                    {anchos.map((ancho, indiceAncho) => {
                      const precio =
                        precios[indiceDiametro]?.[indiceAncho];

                      return (
                        <td
                          key={`${diametro}-${ancho}`}
                        >
                          {precio !== undefined
                            ? formatearMoneda(precio)
                            : "--"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mensajes de Cartucho Baja */}
        {tablaSeleccionada === "cartucho_baja" && cargando && (
          <div className="tablas-mensaje">
            Cargando registros...
          </div>
        )}

        {tablaSeleccionada === "cartucho_baja" &&
          !cargando &&
          error && (
            <div className="tablas-error">
              {error}
            </div>
        )}

        {tablaSeleccionada === "cartucho_baja" &&
          !cargando &&
          !error &&
          !tablaCartuchoBaja && (
            <div className="tablas-mensaje">
              Esta tabla no contiene registros.
            </div>
        )}
        {/* Tabla especial de cartucho de baja */}
        {tablaSeleccionada === "cartucho_baja" &&
        !cargando &&
        !error &&
        tablaCartuchoBaja && (
          <div className="tabla-scroll tabla-scroll-cartucho-baja">
            <table className="tabla-firebase tabla-cartucho-baja">
              <thead>
                <tr>
                  <th className="celda-largo-diametro">
                    Largo / Ø
                  </th>

                  {tablaCartuchoBaja.diametros.map((diametro) => (
                    <th key={diametro.value}>
                      {diametro.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tablaCartuchoBaja.largos.map(
                  (largo, indiceLargo) => (
                    <tr key={largo}>
                      <th className="columna-largo">
                        {largo}"
                      </th>

                      {tablaCartuchoBaja.diametros.map(
                        (diametro, indiceDiametro) => {
                          const precio =
                            tablaCartuchoBaja.precios[indiceLargo]?.[
                              indiceDiametro
                            ];

                          return (
                            <td key={`${largo}-${diametro.value}`}>
                              {precio !== undefined
                                ? formatearMoneda(precio)
                                : "--"}
                            </td>
                          );
                        }
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
       {/*Tablas de termopares*/}
        {(tablaSeleccionada === "termopar_j" ||
          tablaSeleccionada === "termopar_k") && (
          <div className="tabla-scroll">
            <table className="tabla-firebase">
              <thead>
                <tr>
                  <th>Medida (cm)</th>
                  <th>Precio</th>
                </tr>
              </thead>

              <tbody>
                {(tablaSeleccionada === "termopar_j"
                  ? termoparJ
                  : termoparK
                ).map((item) => (
                  <tr key={item.medida_cm}>
                    <td>{item.medida_cm}</td>
                    <td>{formatearMoneda(item.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Tablas obtenidas de Firebase */}
        {tablaSeleccionada !== "banda" && tablaSeleccionada !== "cartucho_baja" && tablaSeleccionada !== "termopar_j" && tablaSeleccionada !== "termopar_k" && (
          <>
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
                          <td
                            key={`${fila.id}-${columna}`}
                          >
                            {mostrarValor(
                              fila[columna],
                              columna
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Tablas;