// src/funciones/configuracion_tubular.tsx

import React, { useEffect, useState } from "react";

/* =========================================================
   TIPOS
========================================================= */

export type TipoConfiguracionTubular =
  | "Brida"
  | "Placa"
  | "Lamina"
  | "Tapón macho";

export interface ConfiguracionTubularFila {
  resistencias: number;
  potencia: number;
  voltaje: number;
  conceptos: string[];
}

export interface ConfiguracionTubularDatos {
  tipo: TipoConfiguracionTubular;
  cantidad: number;
  filas: ConfiguracionTubularFila[];
}

/* =========================================================
   PROPS
========================================================= */

interface Props {
  abierto: boolean;

  tipo: TipoConfiguracionTubular | "";

  cantidadMontajes: number;

  cantidadResistencias: number;

  potenciaGeneral: number;

  voltajeGeneral: number;

  configuracionActual?: ConfiguracionTubularDatos | null;

  onGuardar: (configuracion: ConfiguracionTubularDatos) => void;

  onCancelar: () => void;
}

/* =========================================================
   COMPONENTE
========================================================= */

const ConfiguracionTubular: React.FC<Props> = ({
  abierto,
  tipo,
  cantidadMontajes,
  cantidadResistencias,
  potenciaGeneral,
  voltajeGeneral,
  configuracionActual,
  onGuardar,
  onCancelar,
}) => {
  const [filas, setFilas] = useState<ConfiguracionTubularFila[]>([]);

  /* =========================================================
     CARGAR CONFIGURACIÓN
  ========================================================= */

  useEffect(() => {
    if (!abierto) return;

    if (!tipo) return;

    /*
      Si ya existe una configuración guardada
      del mismo tipo y misma cantidad, la cargamos.
    */
    if (
      configuracionActual &&
      configuracionActual.tipo === tipo &&
      configuracionActual.cantidad === cantidadMontajes
    ) {
      setFilas(
        configuracionActual.filas.map((fila) => ({
          ...fila,
          conceptos: [...(fila.conceptos || [])],
        }))
      );

      return;
    }

    /*
      Si es configuración nueva,
      creamos una fila por cada:
      - Brida
      - Placa
      - Lámina
      - Tapón macho
    */

    const nuevasFilas: ConfiguracionTubularFila[] = Array.from(
      { length: cantidadMontajes },
      () => ({
        resistencias: 0,
        potencia: 0,
        voltaje: voltajeGeneral || 0,
        conceptos: [],
      })
    );

    setFilas(nuevasFilas);
  }, [
    abierto,
    tipo,
    cantidadMontajes,
    voltajeGeneral,
    configuracionActual,
  ]);

  /* =========================================================
     SI ESTÁ CERRADO NO MOSTRAMOS NADA
  ========================================================= */

  if (!abierto || !tipo) return null;

  /* =========================================================
     ACTUALIZAR FILA
  ========================================================= */

  const actualizarFila = (
    index: number,
    campo: "resistencias" | "potencia" | "voltaje",
    valor: number
  ) => {
    setFilas((anteriores) =>
      anteriores.map((fila, i) =>
        i === index
          ? {
              ...fila,
              [campo]: valor,
            }
          : fila
      )
    );
  };

  /* =========================================================
     CONCEPTOS
  ========================================================= */

  const agregarConcepto = (filaIndex: number) => {
    setFilas((anteriores) =>
      anteriores.map((fila, index) =>
        index === filaIndex
          ? {
              ...fila,
              conceptos: [...fila.conceptos, ""],
            }
          : fila
      )
    );
  };

  const cambiarConcepto = (
    filaIndex: number,
    conceptoIndex: number,
    valor: string
  ) => {
    setFilas((anteriores) =>
      anteriores.map((fila, index) => {
        if (index !== filaIndex) {
          return fila;
        }

        const nuevosConceptos = [...fila.conceptos];

        nuevosConceptos[conceptoIndex] = valor;

        return {
          ...fila,
          conceptos: nuevosConceptos,
        };
      })
    );
  };

  const eliminarConcepto = (
    filaIndex: number,
    conceptoIndex: number
  ) => {
    setFilas((anteriores) =>
      anteriores.map((fila, index) => {
        if (index !== filaIndex) {
          return fila;
        }

        return {
          ...fila,

          conceptos: fila.conceptos.filter(
            (_, indexConcepto) =>
              indexConcepto !== conceptoIndex
          ),
        };
      })
    );
  };

  /* =========================================================
     TOTALES
  ========================================================= */

  const totalAsignadas = filas.reduce(
    (total, fila) =>
      total + Number(fila.resistencias || 0),
    0
  );

  const faltantes =
    cantidadResistencias - totalAsignadas;

  /* =========================================================
     VALIDACIÓN
  ========================================================= */

  const guardarConfiguracion = () => {
    /*
      Debe haber resistencias.
    */

    if (cantidadResistencias <= 0) {
      alert(
        "Primero debes indicar la cantidad total de resistencias."
      );

      return;
    }

    /*
      Debe existir al menos un montaje.
    */

    if (cantidadMontajes <= 0) {
      alert(
        `Debes indicar la cantidad de ${tipo}.`
      );

      return;
    }

    /*
      Todas las resistencias deben quedar asignadas.
    */

    if (totalAsignadas !== cantidadResistencias) {
      alert(
        `Debes asignar exactamente las ${cantidadResistencias} resistencias.\n\n` +
          `Actualmente tienes asignadas: ${totalAsignadas}.`
      );

      return;
    }

    /*
      No dejamos filas con 0 resistencias.
      Si hay 2 bridas, ambas deben tener resistencias.
    */

    const filaVacia = filas.findIndex(
      (fila) => Number(fila.resistencias) <= 0
    );

    if (filaVacia !== -1) {
      alert(
        `${tipo} ${filaVacia + 1} no tiene resistencias asignadas.`
      );

      return;
    }

    /*
      Limpiamos conceptos vacíos antes de guardar.
    */

    const configuracionLimpia: ConfiguracionTubularDatos = {
      tipo,

      cantidad: cantidadMontajes,

      filas: filas.map((fila) => ({
        resistencias: Number(fila.resistencias) || 0,

        potencia: Number(fila.potencia) || 0,

        voltaje: Number(fila.voltaje) || 0,

        conceptos: fila.conceptos
          .map((concepto) => concepto.trim())
          .filter((concepto) => concepto !== ""),
      })),
    };

    onGuardar(configuracionLimpia);
  };

  /* =========================================================
     NOMBRE PARA MOSTRAR
  ========================================================= */

  const nombrePlural = (() => {
    switch (tipo) {
      case "Brida":
        return "Bridas";

      case "Placa":
        return "Placas";

      case "Lamina":
        return "Láminas";

      case "Tapón macho":
        return "Tapones macho";

      default:
        return tipo;
    }
  })();

  /* =========================================================
     HTML
  ========================================================= */

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "12px",
          padding: "25px",
          boxSizing: "border-box",
          boxShadow: "0 10px 35px rgba(0,0,0,0.30)",
        }}
      >
        {/* =====================================================
            ENCABEZADO
        ===================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "25px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: "15px",
              }}
            >
              Configuración de {tipo}
            </h2>

            <div
              style={{
                display: "flex",
                gap: "30px",
                flexWrap: "wrap",
                fontSize: "16px",
              }}
            >
              <span>
                Resistencias:{" "}
                <strong>
                  {cantidadResistencias}
                </strong>
              </span>

              <span>
                {nombrePlural}:{" "}
                <strong>
                  {cantidadMontajes}
                </strong>
              </span>

              {potenciaGeneral > 0 && (
                <span>
                  Potencia general:{" "}
                  <strong>
                    {potenciaGeneral}W
                  </strong>
                </span>
              )}

              {voltajeGeneral > 0 && (
                <span>
                  Voltaje general:{" "}
                  <strong>
                    {voltajeGeneral}V
                  </strong>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelar}
            title="Cerrar"
            style={{
              border: "none",
              background: "transparent",
              fontSize: "32px",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 5px",
            }}
          >
            ×
          </button>
        </div>

        {/* =====================================================
            TABLA
        ===================================================== */}

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "850px",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  {tipo}
                </th>

                <th
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Resistencias
                </th>

                <th
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Potencia
                </th>

                <th
                  style={{
                    textAlign: "center",
                    padding: "10px",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Voltaje
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "10px",
                    borderBottom: "2px solid #ddd",
                  }}
                >
                  Conceptos
                </th>
              </tr>
            </thead>

            <tbody>
              {filas.map((fila, index) => (
                <tr key={index}>
                  {/* TIPO */}

                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <strong>
                      {tipo} {index + 1}
                    </strong>
                  </td>

                  {/* RESISTENCIAS */}

                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={
                        fila.resistencias === 0
                          ? ""
                          : fila.resistencias
                      }
                      onKeyDown={(e) => {
                        if (
                          ["-", "+", "e", "E"].includes(
                            e.key
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const valor =
                          e.target.value;

                        actualizarFila(
                          index,
                          "resistencias",
                          valor === ""
                            ? 0
                            : Math.max(
                                0,
                                Number(valor)
                              )
                        );
                      }}
                      style={{
                        width: "90px",
                        padding: "8px",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>

                  {/* POTENCIA */}

                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={
                        fila.potencia === 0
                          ? ""
                          : fila.potencia
                      }
                      placeholder={
                        potenciaGeneral
                          ? String(potenciaGeneral)
                          : ""
                      }
                      onKeyDown={(e) => {
                        if (
                          ["-", "+", "e", "E"].includes(
                            e.key
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const valor =
                          e.target.value;

                        actualizarFila(
                          index,
                          "potencia",
                          valor === ""
                            ? 0
                            : Math.max(
                                0,
                                Number(valor)
                              )
                        );
                      }}
                      style={{
                        width: "110px",
                        padding: "8px",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>

                  {/* VOLTAJE */}

                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <input
                      type="number"
                      min={0}
                      value={
                        fila.voltaje === 0
                          ? ""
                          : fila.voltaje
                      }
                      onKeyDown={(e) => {
                        if (
                          ["-", "+", "e", "E"].includes(
                            e.key
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const valor =
                          e.target.value;

                        actualizarFila(
                          index,
                          "voltaje",
                          valor === ""
                            ? 0
                            : Math.max(
                                0,
                                Number(valor)
                              )
                        );
                      }}
                      style={{
                        width: "100px",
                        padding: "8px",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>

                  {/* CONCEPTOS */}

                  <td
                    style={{
                      padding: "12px 10px",
                      verticalAlign: "top",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "7px",
                      }}
                    >
                      {fila.conceptos.map(
                        (
                          concepto,
                          conceptoIndex
                        ) => (
                          <div
                            key={conceptoIndex}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <input
                              type="text"
                              value={concepto}
                              placeholder="Ej. PUENTES (3)"
                              onChange={(e) =>
                                cambiarConcepto(
                                  index,
                                  conceptoIndex,
                                  e.target.value
                                )
                              }
                              style={{
                                flex: 1,
                                minWidth: "180px",
                                padding: "8px",
                                boxSizing:
                                  "border-box",
                              }}
                            />

                            <button
                              type="button"
                              title="Eliminar concepto"
                              onClick={() =>
                                eliminarConcepto(
                                  index,
                                  conceptoIndex
                                )
                              }
                              style={{
                                border:
                                  "1px solid #ccc",
                                background:
                                  "#ffffff",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontSize: "20px",
                                width: "34px",
                                height: "34px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          agregarConcepto(index)
                        }
                        style={{
                          border:
                            "1px dashed #999",
                          background:
                            "transparent",
                          borderRadius: "6px",
                          cursor: "pointer",
                          padding: "7px 10px",
                          width: "fit-content",
                        }}
                      >
                        + Agregar concepto
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            ESTADO DE ASIGNACIÓN
        ===================================================== */}

        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            background: "#f7f7f7",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <span>
            Resistencias asignadas:{" "}
            <strong>
              {totalAsignadas} /{" "}
              {cantidadResistencias}
            </strong>
          </span>

          {faltantes > 0 && (
            <span
              style={{
                fontWeight: "bold",
              }}
            >
              Faltan {faltantes} por asignar
            </span>
          )}

          {faltantes < 0 && (
            <span
              style={{
                fontWeight: "bold",
              }}
            >
              Hay {Math.abs(faltantes)} de más
            </span>
          )}

          {faltantes === 0 &&
            cantidadResistencias > 0 && (
              <span
                style={{
                  fontWeight: "bold",
                }}
              >
                ✓ Configuración completa
              </span>
            )}
        </div>

        {/* =====================================================
            BOTONES
        ===================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            marginTop: "30px",
          }}
        >
          <button
            type="button"
            className="btn btn-blue"
            onClick={guardarConfiguracion}
          >
            Guardar
          </button>

          <button
            type="button"
            className="btn"
            onClick={onCancelar}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionTubular;