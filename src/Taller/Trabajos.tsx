// src/Taller/Trabajos.tsx

import React, { useEffect, useMemo, useState } from "react";
import { getDatabase, onValue, ref } from "firebase/database";
import { app } from "../firebase/config";
import { ReactComponent as ClipboardSvg} from "../Imagenes/svg/clipboard_coloreable.svg";
import "../css/Trabajos.css";
import "../css/clipboard.css";

type EstadoFiltro = "fabricacion" | "completada";

type EmpleadoFirebase = {
  id?: string;
  username?: string;
  nombre?: string;
  activo?: boolean;
  area?: string;
  puesto?: string;
  [key: string]: any;
};

type TrabajoFirebase = {
  partida?: number | string;
  tipo?: string;
  descripcion?: string;
  estadoProduccion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  trabajador?: string;
  datos?: Record<string, any>;
  [key: string]: any;
};

type OrdenFirebase = {
  ot?: string;
  otLabel?: string;
  fecha?: string;
  trabajos?: Record<string, TrabajoFirebase>;
  clienteSnapshot?: {
    nombre?: string;
    razonSocial?: string;
  };
  [key: string]: any;
};

interface EmpleadoProduccion {
  key: string;
  id: string;
  username: string;
}

interface TrabajoProduccion {
  id: string;
  ordenId: string;

  folio: string;
  partidaId: string;
  numeroPartida: number;

  descripcion: string;
  tipo: string;

  trabajador: string;

  estadoProduccion: string;
  estadoFiltro: EstadoFiltro;

  fechaFiltro: string;
  fechaInicio: string;
  fechaFin: string;

  cliente: string;
}

interface GrupoTrabajador {
  trabajador: string;
  trabajos: TrabajoProduccion[];
}

const normalizarTexto = (valor: unknown): string => {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const normalizarEstado = (estado: unknown): string => {
  return normalizarTexto(estado)
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

/**
 * Relaciona los estados reales de Firebase con los filtros.
 *
 * en_fila            -> fabricación
 * en_proceso         -> fabricación
 * lista_para_entrega -> completada
 */
const obtenerEstadoFiltro = (
  estado: unknown,
): EstadoFiltro | null => {
  const estadoNormalizado = normalizarEstado(estado);

  if (
    estadoNormalizado === "en_fila" ||
    estadoNormalizado === "en_proceso" ||
    estadoNormalizado === "fabricacion" ||
    estadoNormalizado === "en_fabricacion" ||
    estadoNormalizado === "fabricando" ||
    estadoNormalizado === "pendiente_taller" ||
    estadoNormalizado === "produccion" ||
    estadoNormalizado === "en_produccion"
  ) {
    return "fabricacion";
  }

  if (
    estadoNormalizado === "lista_para_entrega" ||
    estadoNormalizado === "completada" ||
    estadoNormalizado === "completado" ||
    estadoNormalizado === "terminada" ||
    estadoNormalizado === "terminado" ||
    estadoNormalizado === "finalizada" ||
    estadoNormalizado === "finalizado"
  ) {
    return "completada";
  }

  return null;
};

const obtenerTextoEstado = (
  estadoProduccion: string,
): string => {
  const estado = normalizarEstado(estadoProduccion);

  if (estado === "en_fila") {
    return "En fila";
  }

  if (estado === "en_proceso") {
    return "En proceso";
  }

  if (estado === "lista_para_entrega") {
    return "Lista para entrega";
  }

  if (
    estado === "fabricacion" ||
    estado === "en_fabricacion" ||
    estado === "fabricando" ||
    estado === "pendiente_taller" ||
    estado === "produccion" ||
    estado === "en_produccion"
  ) {
    return "En fabricación";
  }

  if (
    estado === "completada" ||
    estado === "completado" ||
    estado === "terminada" ||
    estado === "terminado" ||
    estado === "finalizada" ||
    estado === "finalizado"
  ) {
    return "Terminada";
  }

  return estadoProduccion || "Sin estado";
};

const obtenerNumeroPartida = (
  partidaId: string,
  trabajo: TrabajoFirebase,
): number => {
  const partidaGuardada = Number(trabajo.partida);

  if (
    Number.isFinite(partidaGuardada) &&
    partidaGuardada > 0
  ) {
    return partidaGuardada;
  }

  const coincidencia = partidaId.match(/_(\d+)$/);

  if (coincidencia) {
    return Number(coincidencia[1]);
  }

  return 0;
};

/**
 * Convierte fechas a YYYY-MM-DD.
 */
const normalizarFecha = (fecha: unknown): string => {
  if (!fecha) return "";

  const texto = String(fecha).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  // YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}T/.test(texto)) {
    return texto.substring(0, 10);
  }

  // DD/MM/YYYY
  const partes = texto.split("/");

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;

    if (
      dia.length <= 2 &&
      mes.length <= 2 &&
      anio.length === 4
    ) {
      return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(
        2,
        "0",
      )}`;
    }
  }

  return "";
};

const formatearFecha = (fecha: unknown): string => {
  const fechaNormalizada = normalizarFecha(fecha);

  if (!fechaNormalizada) {
    return "Sin fecha";
  }

  const [anio, mes, dia] = fechaNormalizada.split("-");

  return `${dia}/${mes}/${anio}`;
};

/**
 * Fecha usada para los filtros.
 *
 * En fila / en proceso:
 * - fechaInicio
 * - fecha general de la OT
 *
 * Lista para entrega:
 * - fechaFin
 * - fechaInicio
 * - fecha general de la OT
 */
const obtenerFechaFiltro = (
  trabajo: TrabajoFirebase,
  orden: OrdenFirebase,
): string => {
  const estadoReal = normalizarEstado(
    trabajo.estadoProduccion,
  );

  if (estadoReal === "lista_para_entrega") {
    return normalizarFecha(
      trabajo.fechaFin ||
        trabajo.fechaInicio ||
        orden.fecha ||
        "",
    );
  }

  if (
    estadoReal === "en_fila" ||
    estadoReal === "en_proceso"
  ) {
    return normalizarFecha(
      trabajo.fechaInicio ||
        orden.fecha ||
        "",
    );
  }

  const estadoFiltro = obtenerEstadoFiltro(
    trabajo.estadoProduccion,
  );

  if (estadoFiltro === "completada") {
    return normalizarFecha(
      trabajo.fechaFin ||
        trabajo.fechaInicio ||
        orden.fecha ||
        "",
    );
  }

  return normalizarFecha(
    trabajo.fechaInicio ||
      trabajo.fechaFin ||
      orden.fecha ||
      "",
  );
};

const Trabajos: React.FC = () => {
  const [empleados, setEmpleados] = useState<
    EmpleadoProduccion[]
  >([]);

  const [ordenes, setOrdenes] = useState<
    Record<string, OrdenFirebase>
  >({});

  const [cargandoEmpleados, setCargandoEmpleados] =
    useState(true);

  const [cargandoOrdenes, setCargandoOrdenes] =
    useState(true);

  const [error, setError] = useState("");

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] =
    useState("todos");

  const [estadosSeleccionados, setEstadosSeleccionados] =
    useState<EstadoFiltro[]>([
      "fabricacion",
      "completada",
    ]);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [indiceSlide, setIndiceSlide] = useState(0);

  const [trabajoSeleccionado, setTrabajoSeleccionado] =
    useState<TrabajoProduccion | null>(null);

  /**
   * Cargar empleados activos de Producción.
   */
  useEffect(() => {
    const db = getDatabase(app);
    const empleadosRef = ref(db, "RH/Empleados");

    const cancelarEscucha = onValue(
      empleadosRef,
      (snapshot) => {
        const datos = snapshot.val();

        if (!datos) {
          setEmpleados([]);
          setCargandoEmpleados(false);
          return;
        }

        const listaIntermedia = Object.entries(datos).map(
          ([key, valor]) => {
            const empleado = valor as EmpleadoFirebase;

            return {
              key,
              id: String(empleado.id ?? key),
              username: String(
                empleado.username ?? "",
              ).trim(),
              area: normalizarTexto(empleado.area),
              activo: empleado.activo === true,
            };
          },
        );

        const lista: EmpleadoProduccion[] =
          listaIntermedia
            .filter((empleado) => {
              return (
                empleado.activo &&
                empleado.area === "produccion" &&
                empleado.username !== ""
              );
            })
            .map((empleado) => ({
              key: empleado.key,
              id: empleado.id,
              username: empleado.username,
            }))
            .sort((a, b) =>
              a.username.localeCompare(
                b.username,
                "es-MX",
                {
                  sensitivity: "base",
                },
              ),
            );

        setEmpleados(lista);
        setCargandoEmpleados(false);
      },
      (firebaseError) => {
        console.error(
          "Error cargando empleados:",
          firebaseError,
        );

        setError(
          "No se pudieron cargar los trabajadores de Producción.",
        );

        setCargandoEmpleados(false);
      },
    );

    return () => cancelarEscucha();
  }, []);

  /**
   * Cargar todas las órdenes de trabajo.
   */
  useEffect(() => {
    const db = getDatabase(app);
    const ordenesRef = ref(db, "ordenes_trabajo");

    const cancelarEscucha = onValue(
      ordenesRef,
      (snapshot) => {
        const datos = snapshot.val();

        setOrdenes(datos || {});
        setCargandoOrdenes(false);
      },
      (firebaseError) => {
        console.error(
          "Error cargando órdenes:",
          firebaseError,
        );

        setError(
          "No se pudieron cargar las órdenes de trabajo.",
        );

        setCargandoOrdenes(false);
      },
    );

    return () => cancelarEscucha();
  }, []);

  /**
   * Recorre todas las OT y todas sus partidas.
   */
  const todasLasPartidas = useMemo<
    TrabajoProduccion[]
  >(() => {
    const resultado: TrabajoProduccion[] = [];

    Object.entries(ordenes).forEach(
      ([ordenId, orden]) => {
        const trabajosOrden = orden.trabajos || {};

        Object.entries(trabajosOrden).forEach(
          ([partidaId, trabajo]) => {
            const trabajador = String(
              trabajo.trabajador || "",
            ).trim();

            /**
             * Sin trabajador no se puede relacionar
             * la partida con un username.
             */
            if (!trabajador) {
              return;
            }

            const estadoProduccion = String(
              trabajo.estadoProduccion || "",
            ).trim();

            const estadoFiltro =
              obtenerEstadoFiltro(estadoProduccion);

            /**
             * Solo se muestran:
             *
             * en_fila
             * en_proceso
             * lista_para_entrega
             * y sus equivalentes.
             */
            if (!estadoFiltro) {
              return;
            }

            const numeroPartida =
              obtenerNumeroPartida(
                partidaId,
                trabajo,
              );

            const fechaInicio = normalizarFecha(
              trabajo.fechaInicio,
            );

            const fechaFin = normalizarFecha(
              trabajo.fechaFin,
            );

            const fechaFiltro =
              obtenerFechaFiltro(trabajo, orden);

            resultado.push({
              id: `${ordenId}-${partidaId}`,
              ordenId,

              folio: String(
                orden.otLabel ||
                  orden.ot ||
                  ordenId,
              ),

              partidaId,
              numeroPartida,

              descripcion: String(
                trabajo.descripcion ||
                  trabajo.datos?.descripcion ||
                  "Sin descripción",
              ),

              tipo: String(
                trabajo.tipo ||
                  trabajo.datos?.tipo ||
                  "",
              ),

              trabajador,

              estadoProduccion,
              estadoFiltro,

              fechaFiltro,
              fechaInicio,
              fechaFin,

              cliente: String(
                orden.clienteSnapshot?.nombre ||
                  orden.clienteSnapshot
                    ?.razonSocial ||
                  "",
              ),
            });
          },
        );
      },
    );

    resultado.sort((a, b) => {
      const compararOt = a.folio.localeCompare(
        b.folio,
        "es-MX",
        {
          numeric: true,
          sensitivity: "base",
        },
      );

      if (compararOt !== 0) {
        return compararOt;
      }

      return a.numeroPartida - b.numeroPartida;
    });

    return resultado;
  }, [ordenes]);

  /**
   * Filtrar todas las partidas.
   */
  const trabajosFiltrados = useMemo(() => {
    return todasLasPartidas.filter((trabajo) => {
      if (
        !estadosSeleccionados.includes(
          trabajo.estadoFiltro,
        )
      ) {
        return false;
      }

      const trabajadorPartida = normalizarTexto(
        trabajo.trabajador,
      );

      const trabajadorFiltro = normalizarTexto(
        trabajadorSeleccionado,
      );

      if (
        trabajadorSeleccionado !== "todos" &&
        trabajadorPartida !== trabajadorFiltro
      ) {
        return false;
      }

      /**
       * Cuando se elige un rango, la partida necesita
       * una fecha válida.
       */
      if (
        (fechaDesde || fechaHasta) &&
        !trabajo.fechaFiltro
      ) {
        return false;
      }

      if (
        fechaDesde &&
        trabajo.fechaFiltro < fechaDesde
      ) {
        return false;
      }

      if (
        fechaHasta &&
        trabajo.fechaFiltro > fechaHasta
      ) {
        return false;
      }

      return true;
    });
  }, [
    todasLasPartidas,
    trabajadorSeleccionado,
    estadosSeleccionados,
    fechaDesde,
    fechaHasta,
  ]);

  /**
   * Agrupar partidas por trabajador.
   *
   * Si se selecciona Todos, cada trabajador
   * será un slide.
   */
  const gruposTrabajadores =
    useMemo<GrupoTrabajador[]>(() => {
      const grupos = new Map<
        string,
        GrupoTrabajador
      >();

      trabajosFiltrados.forEach((trabajo) => {
        const clave = normalizarTexto(
          trabajo.trabajador,
        );

        if (!grupos.has(clave)) {
          grupos.set(clave, {
            trabajador: trabajo.trabajador,
            trabajos: [],
          });
        }

        grupos.get(clave)?.trabajos.push(trabajo);
      });

      return Array.from(grupos.values()).sort(
        (a, b) =>
          a.trabajador.localeCompare(
            b.trabajador,
            "es-MX",
            {
              sensitivity: "base",
            },
          ),
      );
    }, [trabajosFiltrados]);

  useEffect(() => {
    setIndiceSlide(0);
    setTrabajoSeleccionado(null);
  }, [
    trabajadorSeleccionado,
    estadosSeleccionados,
    fechaDesde,
    fechaHasta,
  ]);

useEffect(() => {
  if (gruposTrabajadores.length === 0) {
    setIndiceSlide(0);
    return;
  }

  if (indiceSlide >= gruposTrabajadores.length) {
    setIndiceSlide(
      gruposTrabajadores.length - 1,
    );
  }
}, [
  gruposTrabajadores.length,
  indiceSlide,
]);

  const cambiarEstado = (
    estado: EstadoFiltro,
  ) => {
    setEstadosSeleccionados((actuales) => {
      if (actuales.includes(estado)) {
        return actuales.filter(
          (actual) => actual !== estado,
        );
      }

      return [...actuales, estado];
    });
  };

  const slideAnterior = () => {
    if (gruposTrabajadores.length <= 1) {
      return;
    }

    setTrabajoSeleccionado(null);

    setIndiceSlide((actual) =>
      actual === 0
        ? gruposTrabajadores.length - 1
        : actual - 1,
    );
  };

  const slideSiguiente = () => {
    if (gruposTrabajadores.length <= 1) {
      return;
    }

    setTrabajoSeleccionado(null);

    setIndiceSlide((actual) =>
      actual === gruposTrabajadores.length - 1
        ? 0
        : actual + 1,
    );
  };

  const limpiarFiltros = () => {
    setTrabajadorSeleccionado("todos");

    setEstadosSeleccionados([
      "fabricacion",
      "completada",
    ]);

    setFechaDesde("");
    setFechaHasta("");

    setIndiceSlide(0);
    setTrabajoSeleccionado(null);
  };

const indiceSeguro =
  gruposTrabajadores.length === 0
    ? 0
    : Math.min(
        indiceSlide,
        gruposTrabajadores.length - 1,
      );

const grupoActual =
  gruposTrabajadores[indiceSeguro];

  const cargando =
    cargandoEmpleados || cargandoOrdenes;

  if (cargando) {
    return (
      <div className="trabajos-cargando">
        Cargando trabajos de producción...
      </div>
    );
  }

  return (
    <div className="trabajos-page">
      <div className="trabajos-encabezado">
        <div>
          <h2>
            Órdenes de trabajo en producción
          </h2>

          <p>
            Consulta todas las partidas asignadas a
            cada trabajador.
          </p>
        </div>

        <div className="trabajos-contador">
          {trabajosFiltrados.length}{" "}
          {trabajosFiltrados.length === 1
            ? "partida"
            : "partidas"}
        </div>
      </div>

      {error && (
        <div className="trabajos-error">
          {error}
        </div>
      )}

      <section className="trabajos-filtros">
        <div className="trabajos-filtro">
          <label htmlFor="trabajador">
            Trabajador
          </label>

          <select
            id="trabajador"
            value={trabajadorSeleccionado}
            onChange={(e) =>
              setTrabajadorSeleccionado(
                e.target.value,
              )
            }
          >
            <option value="todos">
              Todos los trabajadores
            </option>

            {empleados.map((empleado) => (
              <option
                key={empleado.key}
                value={empleado.username}
              >
                {empleado.username}
              </option>
            ))}
          </select>
        </div>

        <div className="trabajos-estados">
          <span className="trabajos-label">
            Mostrar estados
          </span>

          <label className="trabajos-check">
            <input
              type="checkbox"
              checked={estadosSeleccionados.includes(
                "fabricacion",
              )}
              onChange={() =>
                cambiarEstado("fabricacion")
              }
            />

            <span>En fila / En proceso</span>
          </label>

          <label className="trabajos-check">
            <input
              type="checkbox"
              checked={estadosSeleccionados.includes(
                "completada",
              )}
              onChange={() =>
                cambiarEstado("completada")
              }
            />

            <span>Lista para entrega</span>
          </label>
        </div>

        <div className="trabajos-filtro">
          <label htmlFor="fecha-desde">
            Desde
          </label>

          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            max={fechaHasta || undefined}
            onChange={(e) =>
              setFechaDesde(e.target.value)
            }
          />
        </div>

        <div className="trabajos-filtro">
          <label htmlFor="fecha-hasta">
            Hasta
          </label>

          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            min={fechaDesde || undefined}
            onChange={(e) =>
              setFechaHasta(e.target.value)
            }
          />
        </div>

        <button
          type="button"
          className="trabajos-btn-limpiar"
          onClick={limpiarFiltros}
        >
          Limpiar filtros
        </button>
      </section>

      {empleados.length === 0 ? (
        <div className="trabajos-vacio">
          No se encontraron empleados activos del área
          de Producción con username.
        </div>
      ) : gruposTrabajadores.length === 0 ||
        !grupoActual ? (
        <div className="trabajos-vacio">
          No hay partidas que coincidan con el trabajador
          y los filtros seleccionados.
        </div>
      ) : (
        <section className="trabajos-slider">
          {gruposTrabajadores.length > 1 && (
            <button
              type="button"
              className="trabajos-slide-boton trabajos-slide-anterior"
              onClick={slideAnterior}
              aria-label="Trabajador anterior"
            >
              ‹
            </button>
          )}

          <div className="clipboard-container">
            <ClipboardSvg className="clipboard-svg clipboard-rosa" />

            <div className="clipboard-paper">
              <div className="clipboard-hoja">
                <div className="clipboard-hoja-encabezado">
                  <div>
                    <span className="clipboard-etiqueta">
                      Trabajador
                    </span>

                    <h3>{grupoActual.trabajador}</h3>
                  </div>

                  <span className="clipboard-total">
                    {grupoActual.trabajos.length}
                  </span>
                </div>

                {!trabajoSeleccionado ? (
                  <>
                    <div className="clipboard-lista-titulos">
                      <span>Partida</span>
                      <span>Descripción</span>
                      <span>Estado</span>
                    </div>

                    <div className="clipboard-lista">
                      {grupoActual.trabajos.map((trabajo) => (
                        <button
                          type="button"
                          className="clipboard-fila"
                          key={trabajo.id}
                          onClick={() =>
                            setTrabajoSeleccionado(trabajo)
                          }
                        >
                          <span className="clipboard-folio">
                            {trabajo.partidaId}
                          </span>

                          <span className="clipboard-descripcion">
                            {trabajo.descripcion}
                          </span>

                          <span
                            className={`clipboard-estado clipboard-estado-${trabajo.estadoFiltro}`}
                          >
                            {obtenerTextoEstado(
                              trabajo.estadoProduccion,
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="clipboard-detalle">
                    <button
                      type="button"
                      className="clipboard-regresar"
                      onClick={() =>
                        setTrabajoSeleccionado(null)
                      }
                    >
                      ← Regresar a las partidas
                    </button>

                    <div className="clipboard-detalle-folio">
                      {trabajoSeleccionado.partidaId}
                    </div>

                    <dl>
                      <div>
                        <dt>OT</dt>
                        <dd>{trabajoSeleccionado.folio}</dd>
                      </div>

                      <div>
                        <dt>Partida</dt>
                        <dd>
                          {trabajoSeleccionado.numeroPartida ||
                            "--"}
                        </dd>
                      </div>

                      <div>
                        <dt>Trabajador</dt>
                        <dd>
                          {trabajoSeleccionado.trabajador}
                        </dd>
                      </div>

                      <div>
                        <dt>Descripción</dt>
                        <dd>
                          {trabajoSeleccionado.descripcion}
                        </dd>
                      </div>

                      <div>
                        <dt>Tipo</dt>
                        <dd>
                          {trabajoSeleccionado.tipo ||
                            "Sin especificar"}
                        </dd>
                      </div>

                      <div>
                        <dt>Estado</dt>
                        <dd>
                          {obtenerTextoEstado(
                            trabajoSeleccionado.estadoProduccion,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Fecha de inicio</dt>
                        <dd>
                          {formatearFecha(
                            trabajoSeleccionado.fechaInicio,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Fecha de terminación</dt>
                        <dd>
                          {formatearFecha(
                            trabajoSeleccionado.fechaFin,
                          )}
                        </dd>
                      </div>

                      {trabajoSeleccionado.cliente && (
                        <div>
                          <dt>Cliente</dt>
                          <dd>
                            {trabajoSeleccionado.cliente}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </div>

          {gruposTrabajadores.length > 1 && (
            <button
              type="button"
              className="trabajos-slide-boton trabajos-slide-siguiente"
              onClick={slideSiguiente}
              aria-label="Trabajador siguiente"
            >
              ›
            </button>
          )}

          {gruposTrabajadores.length > 1 && (
            <div className="trabajos-indicadores">
              {gruposTrabajadores.map(
                (grupo, index) => (
                  <button
                    key={grupo.trabajador}
                    type="button"
                    className={
                      index === indiceSlide
                        ? "trabajos-indicador activo"
                        : "trabajos-indicador"
                    }
                    onClick={() => {
                      setIndiceSlide(index);
                      setTrabajoSeleccionado(null);
                    }}
                    aria-label={`Ver ${grupo.trabajador}`}
                    title={grupo.trabajador}
                  />
                ),
              )}
            </div>
          )}

          <div className="trabajos-slide-info">
            {indiceSlide + 1} de{" "}
            {gruposTrabajadores.length}
          </div>
        </section>
      )}
    </div>
  );
};

export default Trabajos;