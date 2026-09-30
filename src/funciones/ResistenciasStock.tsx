import React, { useEffect, useMemo, useState } from "react";
import {
  get,
  push,
  ref,
  remove,
  set,
} from "firebase/database";

import { db } from "../firebase/config";

// =========================================================
// COMPONENTES DE STOCK
// =========================================================

import StockTubular, {
  ProductoExtraStock,
  ValoresStockTubular,
  valoresTubularVacios,
} from "./stockresistencias/StockTubular";

import StockBanda, {
  ValoresStockBanda,
  valoresBandaVacios,
} from "./stockresistencias/StockBanda";

import StockCartuchoAlta, {
  ValoresStockCartuchoAlta,
  valoresCartuchoAltaVacios,
} from "./stockresistencias/StockCartuchoAlta";

import StockCartuchoBaja, {
  ValoresStockCartuchoBaja,
  valoresCartuchoBajaVacios,
} from "./stockresistencias/StockCartuchoBaja";

import StockResorte, {
  ValoresStockResorte,
  valoresResorteVacios,
} from "./stockresistencias/StockResorte";

import StockTermopar, {
  ValoresStockTermopar,
  valoresTermoparVacios,
} from "./stockresistencias/StockTermopar";

import StockCuarzo, {
  ValoresStockCuarzo,
  valoresCuarzoVacios,
} from "./stockresistencias/StockCuarzo";

import "../css/ResistenciasStock.css";

// =========================================================
// TIPOS
// =========================================================

type TipoCotizador =
  | "tubular"
  | "banda"
  | "CartuchoA"
  | "CartuchoB"
  | "resorte"
  | "termopar"
  | "cuarzo";

type ResistenciaStock = {
  id: string;
  nombre: string;
  tipo: TipoCotizador;
  habilitado: boolean;
  valores: Record<string, any>;
  productosExtras?: {
    descripcion: string;
    precio: number;
  }[];
};

type Pestana = {
  valor: TipoCotizador;
  nombre: string;
};

// =========================================================
// PESTAÑAS
// =========================================================

const PESTANAS: Pestana[] = [
  {
    valor: "tubular",
    nombre: "Tubular",
  },
  {
    valor: "banda",
    nombre: "Banda",
  },
  {
    valor: "CartuchoA",
    nombre: "Cartucho Alta",
  },
  {
    valor: "CartuchoB",
    nombre: "Cartucho Baja",
  },
  {
    valor: "resorte",
    nombre: "Resorte",
  },
  {
    valor: "termopar",
    nombre: "Termopar",
  },
  {
    valor: "cuarzo",
    nombre: "Cuarzo",
  },
];

// =========================================================
// NORMALIZADORES
// =========================================================

const normalizarTubular = (
  valores: any = {}
): ValoresStockTubular => ({
  ...valoresTubularVacios,
  ...valores,
});

const normalizarBanda = (
  valores: any = {}
): ValoresStockBanda => ({
  ...valoresBandaVacios,
  ...valores,
});

const normalizarCartuchoAlta = (
  valores: any = {}
): ValoresStockCartuchoAlta => ({
  ...valoresCartuchoAltaVacios,
  ...valores,
});

const normalizarCartuchoBaja = (
  valores: any = {}
): ValoresStockCartuchoBaja => ({
  ...valoresCartuchoBajaVacios,
  ...valores,
});

const normalizarResorte = (
  valores: any = {}
): ValoresStockResorte => ({
  ...valoresResorteVacios,
  ...valores,
});

const normalizarTermopar = (
  valores: any = {}
): ValoresStockTermopar => ({
  ...valoresTermoparVacios,
  ...valores,
});

const normalizarCuarzo = (
  valores: any = {}
): ValoresStockCuarzo => ({
  ...valoresCuarzoVacios,
  ...valores,
});

// =========================================================
// COMPONENTE
// =========================================================

const ResistenciasStock: React.FC = () => {
  // =======================================================
  // GENERAL
  // =======================================================

  const [resistencias, setResistencias] = useState<
    ResistenciaStock[]
  >([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [tipoActivo, setTipoActivo] =
    useState<TipoCotizador>("tubular");

  const [seleccionadaId, setSeleccionadaId] =
    useState<string | null>(null);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  const [nombre, setNombre] = useState("");
  const [habilitado, setHabilitado] = useState(true);

  // =======================================================
  // TUBULAR
  // =======================================================

  const [valoresTubular, setValoresTubular] =
    useState<ValoresStockTubular>({
      ...valoresTubularVacios,
    });

  const [productosExtras, setProductosExtras] =
    useState<ProductoExtraStock[]>([]);

  // =======================================================
  // BANDA
  // =======================================================

  const [valoresBanda, setValoresBanda] =
    useState<ValoresStockBanda>({
      ...valoresBandaVacios,
    });

  // =======================================================
  // CARTUCHO ALTA
  // =======================================================

  const [
    valoresCartuchoAlta,
    setValoresCartuchoAlta,
  ] = useState<ValoresStockCartuchoAlta>({
    ...valoresCartuchoAltaVacios,
  });

  // =======================================================
  // CARTUCHO BAJA
  // =======================================================

  const [
    valoresCartuchoBaja,
    setValoresCartuchoBaja,
  ] = useState<ValoresStockCartuchoBaja>({
    ...valoresCartuchoBajaVacios,
  });

  // =======================================================
  // RESORTE
  // =======================================================

  const [valoresResorte, setValoresResorte] =
    useState<ValoresStockResorte>({
      ...valoresResorteVacios,
    });

  // =======================================================
  // TERMOPAR
  // =======================================================

  const [valoresTermopar, setValoresTermopar] =
    useState<ValoresStockTermopar>({
      ...valoresTermoparVacios,
    });

  // =======================================================
  // CUARZO
  // =======================================================

  const [valoresCuarzo, setValoresCuarzo] =
    useState<ValoresStockCuarzo>({
      ...valoresCuarzoVacios,
    });

  // =======================================================
  // CARGAR FIREBASE
  // =======================================================

  const cargarResistencias = async () => {
    try {
      setCargando(true);

      const snapshot = await get(
        ref(db, "ResistenciasStock")
      );

      if (!snapshot.exists()) {
        setResistencias([]);
        return;
      }

      const data = snapshot.val();

      const lista: ResistenciaStock[] = Object.entries(
        data
      ).map(([id, item]: [string, any]) => ({
        id,

        nombre: item.nombre || "Sin nombre",

        // Los registros anteriores a esta modificación
        // son considerados Tubular.
        tipo:
          (item.tipo as TipoCotizador) ||
          "tubular",

        habilitado:
          item.habilitado !== false,

        valores:
          item.valores || {},

        productosExtras:
          Array.isArray(item.productosExtras)
            ? item.productosExtras
            : [],
      }));

      lista.sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre,
          "es",
          {
            sensitivity: "base",
          }
        )
      );

      setResistencias(lista);
    } catch (error) {
      console.error(
        "Error cargando ResistenciasStock:",
        error
      );

      alert(
        "No se pudieron cargar las resistencias de stock."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarResistencias();
  }, []);

  // =======================================================
  // FILTRAR
  // =======================================================

  const resistenciasFiltradas = useMemo(() => {
    const texto =
      busqueda.trim().toLowerCase();

    return resistencias.filter((item) => {
      if (item.tipo !== tipoActivo) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return item.nombre
        .toLowerCase()
        .includes(texto);
    });
  }, [
    resistencias,
    tipoActivo,
    busqueda,
  ]);

  // =======================================================
  // LIMPIAR TODOS LOS FORMULARIOS
  // =======================================================

  const limpiarFormulario = () => {
    setNombre("");
    setHabilitado(true);

    setValoresTubular({
      ...valoresTubularVacios,
    });

    setProductosExtras([]);

    setValoresBanda({
      ...valoresBandaVacios,
    });

    setValoresCartuchoAlta({
      ...valoresCartuchoAltaVacios,
    });

    setValoresCartuchoBaja({
      ...valoresCartuchoBajaVacios,
    });

    setValoresResorte({
      ...valoresResorteVacios,
    });

    setValoresTermopar({
      ...valoresTermoparVacios,
    });

    setValoresCuarzo({
      ...valoresCuarzoVacios,
    });
  };

  // =======================================================
  // CARGAR VALORES DE UNA RECETA
  // =======================================================

  const cargarValoresReceta = (
    item: ResistenciaStock
  ) => {
    switch (item.tipo) {
      case "tubular":
        setValoresTubular(
          normalizarTubular(item.valores)
        );

        setProductosExtras(
          (item.productosExtras || []).map(
            (producto) => ({
              descripcion:
                producto.descripcion || "",

              precio: String(
                producto.precio ?? ""
              ),
            })
          )
        );

        break;

      case "banda":
        setValoresBanda(
          normalizarBanda(item.valores)
        );
        break;

      case "CartuchoA":
        setValoresCartuchoAlta(
          normalizarCartuchoAlta(
            item.valores
          )
        );
        break;

      case "CartuchoB":
        setValoresCartuchoBaja(
          normalizarCartuchoBaja(
            item.valores
          )
        );
        break;

      case "resorte":
        setValoresResorte(
          normalizarResorte(item.valores)
        );
        break;

      case "termopar":
        setValoresTermopar(
          normalizarTermopar(item.valores)
        );
        break;

      case "cuarzo":
        setValoresCuarzo(
          normalizarCuarzo(item.valores)
        );
        break;
    }
  };

  // =======================================================
  // SELECCIONAR
  // =======================================================

  const seleccionarResistencia = (
    item: ResistenciaStock
  ) => {
    setSeleccionadaId(item.id);

    setModoNuevo(false);
    setModoEdicion(false);

    setNombre(item.nombre);
    setHabilitado(item.habilitado);

    cargarValoresReceta(item);
  };

  // =======================================================
  // CAMBIAR PESTAÑA
  // =======================================================

  const cambiarTipo = (
    tipo: TipoCotizador
  ) => {
    if (
      modoEdicion &&
      !window.confirm(
        "Hay cambios sin guardar. ¿Deseas cambiar de cotizador?"
      )
    ) {
      return;
    }

    setTipoActivo(tipo);

    setSeleccionadaId(null);
    setModoEdicion(false);
    setModoNuevo(false);

    setBusqueda("");

    limpiarFormulario();
  };

  // =======================================================
  // NUEVA RECETA
  // =======================================================

  const nuevaReceta = () => {
    limpiarFormulario();

    setSeleccionadaId(null);

    setModoNuevo(true);
    setModoEdicion(true);
  };

  // =======================================================
  // EDITAR
  // =======================================================

  const editarReceta = () => {
    if (!seleccionadaId) {
      return;
    }

    setModoEdicion(true);
    setModoNuevo(false);
  };

  // =======================================================
  // CANCELAR
  // =======================================================

  const cancelarEdicion = () => {
    if (modoNuevo) {
      limpiarFormulario();

      setSeleccionadaId(null);
      setModoNuevo(false);
      setModoEdicion(false);

      return;
    }

    const seleccionada =
      resistencias.find(
        (item) =>
          item.id === seleccionadaId
      );

    if (seleccionada) {
      setNombre(seleccionada.nombre);
      setHabilitado(
        seleccionada.habilitado
      );

      cargarValoresReceta(
        seleccionada
      );
    }

    setModoEdicion(false);
  };

  // =======================================================
  // OBTENER VALORES SEGÚN COTIZADOR
  // =======================================================

  const obtenerValoresActuales = () => {
    switch (tipoActivo) {
      case "tubular":
        return valoresTubular;

      case "banda":
        return valoresBanda;

      case "CartuchoA":
        return valoresCartuchoAlta;

      case "CartuchoB":
        return valoresCartuchoBaja;

      case "resorte":
        return valoresResorte;

      case "termopar":
        return valoresTermopar;

      case "cuarzo":
        return valoresCuarzo;

      default:
        return {};
    }
  };

  // =======================================================
  // VALIDAR
  // =======================================================

  const validar = () => {
    if (!nombre.trim()) {
      alert(
        "Escribe el nombre de la receta."
      );

      return false;
    }

    // Validación especial para productos
    // adicionales de Tubular.
    if (tipoActivo === "tubular") {
      for (
        let i = 0;
        i < productosExtras.length;
        i++
      ) {
        const producto =
          productosExtras[i];

        if (
          !producto.descripcion.trim()
        ) {
          alert(
            `El producto extra ${
              i + 1
            } no tiene descripción.`
          );

          return false;
        }

        if (
          producto.precio === "" ||
          Number(producto.precio) < 0
        ) {
          alert(
            `El producto extra ${
              i + 1
            } tiene un precio inválido.`
          );

          return false;
        }
      }
    }

    return true;
  };

  // =======================================================
  // GUARDAR
  // =======================================================

  const guardar = async () => {
    if (!validar()) {
      return;
    }

    try {
      setGuardando(true);

      const valoresActuales =
        obtenerValoresActuales();

      const datosGuardar: any = {
        nombre: nombre.trim(),

        tipo: tipoActivo,

        habilitado,

        valores: {
          ...valoresActuales,
        },
      };

      // Productos extras solamente pertenecen
      // a Tubular.
      if (tipoActivo === "tubular") {
        datosGuardar.productosExtras =
          productosExtras.map(
            (producto) => ({
              descripcion:
                producto.descripcion.trim(),

              precio:
                Number(
                  producto.precio
                ) || 0,
            })
          );
      }

      // ===================================================
      // NUEVO
      // ===================================================

      if (modoNuevo) {
        const nuevaRef = push(
          ref(
            db,
            "ResistenciasStock"
          )
        );

        await set(
          nuevaRef,
          datosGuardar
        );

        await cargarResistencias();

        setSeleccionadaId(
          nuevaRef.key
        );

        setModoNuevo(false);
        setModoEdicion(false);

        return;
      }

      // ===================================================
      // EDITAR
      // ===================================================

      if (!seleccionadaId) {
        alert(
          "No hay una receta seleccionada."
        );

        return;
      }

      await set(
        ref(
          db,
          `ResistenciasStock/${seleccionadaId}`
        ),
        datosGuardar
      );

      await cargarResistencias();

      setModoEdicion(false);
    } catch (error) {
      console.error(
        "Error guardando receta:",
        error
      );

      alert(
        "No se pudo guardar la receta."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =======================================================
  // ELIMINAR
  // =======================================================

  const eliminar = async () => {
    if (!seleccionadaId) {
      return;
    }

    const seleccionada =
      resistencias.find(
        (item) =>
          item.id === seleccionadaId
      );

    if (!seleccionada) {
      return;
    }

    const confirmar =
      window.confirm(
        `¿Seguro que deseas eliminar "${seleccionada.nombre}"?`
      );

    if (!confirmar) {
      return;
    }

    try {
      await remove(
        ref(
          db,
          `ResistenciasStock/${seleccionadaId}`
        )
      );

      setSeleccionadaId(null);

      setModoEdicion(false);
      setModoNuevo(false);

      limpiarFormulario();

      await cargarResistencias();
    } catch (error) {
      console.error(
        "Error eliminando receta:",
        error
      );

      alert(
        "No se pudo eliminar la receta."
      );
    }
  };

  // =======================================================
  // FORMULARIO DEL COTIZADOR
  // =======================================================

  const renderFormularioTipo = () => {
    switch (tipoActivo) {
      // ===================================================
      // TUBULAR
      // ===================================================

      case "tubular":
        return (
          <StockTubular
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresTubular
            }
            setValores={
              setValoresTubular
            }
            productosExtras={
              productosExtras
            }
            setProductosExtras={
              setProductosExtras
            }
          />
        );

      // ===================================================
      // BANDA
      // ===================================================

      case "banda":
        return (
          <StockBanda
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresBanda
            }
            setValores={
              setValoresBanda
            }
          />
        );

      // ===================================================
      // CARTUCHO ALTA
      // ===================================================

      case "CartuchoA":
        return (
          <StockCartuchoAlta
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresCartuchoAlta
            }
            setValores={
              setValoresCartuchoAlta
            }
          />
        );

      // ===================================================
      // CARTUCHO BAJA
      // ===================================================

      case "CartuchoB":
        return (
          <StockCartuchoBaja
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresCartuchoBaja
            }
            setValores={
              setValoresCartuchoBaja
            }
          />
        );

      // ===================================================
      // RESORTE
      // ===================================================

      case "resorte":
        return (
          <StockResorte
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresResorte
            }
            setValores={
              setValoresResorte
            }
          />
        );

      // ===================================================
      // TERMOPAR
      // ===================================================

      case "termopar":
        return (
          <StockTermopar
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresTermopar
            }
            setValores={
              setValoresTermopar
            }
          />
        );

      // ===================================================
      // CUARZO
      // ===================================================

      case "cuarzo":
        return (
          <StockCuarzo
            modoEdicion={
              modoEdicion
            }
            valores={
              valoresCuarzo
            }
            setValores={
              setValoresCuarzo
            }
          />
        );

      default:
        return null;
    }
  };

  // =======================================================
  // VARIABLES DE INTERFAZ
  // =======================================================

  const haySeleccion =
    seleccionadaId !== null ||
    modoNuevo;

  const nombreTipoActivo =
    PESTANAS.find(
      (item) =>
        item.valor === tipoActivo
    )?.nombre || "";

  // =======================================================
  // HTML
  // =======================================================

  return (
    <div className="res-stock-pagina">
      <div className="res-stock-contenedor">

        {/* =================================================
            ENCABEZADO
        ================================================= */}

        <div className="res-stock-encabezado">
          <div>
            <h1>
              RESISTENCIAS DE STOCK
            </h1>

            <p>
              Administración de plantillas
              para los cotizadores
            </p>
          </div>
        </div>

        {/* =================================================
            PESTAÑAS
        ================================================= */}

        <div className="res-stock-tabs">
          {PESTANAS.map(
            (pestana) => (
              <button
                key={
                  pestana.valor
                }
                type="button"
                className={
                  tipoActivo ===
                  pestana.valor
                    ? "res-stock-tab activo"
                    : "res-stock-tab"
                }
                onClick={() =>
                  cambiarTipo(
                    pestana.valor
                  )
                }
              >
                {pestana.nombre}
              </button>
            )
          )}
        </div>

        {/* =================================================
            LAYOUT
        ================================================= */}

        <div className="res-stock-layout">

          {/* ===============================================
              PANEL IZQUIERDO
          =============================================== */}

          <aside className="res-stock-sidebar">

            <div className="res-stock-sidebar-header">
              <h2>
                {nombreTipoActivo}
              </h2>

              <button
                type="button"
                className="res-stock-btn-nuevo"
                onClick={
                  nuevaReceta
                }
                title={`Nueva receta de ${nombreTipoActivo}`}
              >
                +
              </button>
            </div>

            {/* BUSCADOR */}

            <div className="res-stock-busqueda">
              <input
                type="text"
                placeholder="Buscar..."
                value={
                  busqueda
                }
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
              />
            </div>

            {/* LISTA */}

            <div className="res-stock-lista">
              {cargando ? (
                <div className="res-stock-mensaje">
                  Cargando...
                </div>
              ) : resistenciasFiltradas.length ===
                0 ? (
                <div className="res-stock-mensaje">
                  No hay recetas de{" "}
                  {nombreTipoActivo}.
                </div>
              ) : (
                resistenciasFiltradas.map(
                  (item) => (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      className={
                        seleccionadaId ===
                        item.id
                          ? "res-stock-item activo"
                          : "res-stock-item"
                      }
                      onClick={() =>
                        seleccionarResistencia(
                          item
                        )
                      }
                    >
                      <span className="res-stock-item-nombre">
                        {
                          item.nombre
                        }
                      </span>

                      <span
                        className={
                          item.habilitado
                            ? "res-stock-estado habilitado"
                            : "res-stock-estado deshabilitado"
                        }
                      >
                        {item.habilitado
                          ? "Habilitado"
                          : "Deshabilitado"}
                      </span>
                    </button>
                  )
                )
              )}
            </div>
          </aside>

          {/* ===============================================
              PANEL DERECHO
          =============================================== */}

          <main className="res-stock-panel">

            {!haySeleccion ? (
              <div className="res-stock-vacio">
                <h2>
                  {nombreTipoActivo}
                </h2>

                <p>
                  Selecciona una receta
                  de la lista o presiona +
                  para crear una nueva.
                </p>
              </div>
            ) : (
              <>

                {/* =========================================
                    CABECERA
                ========================================= */}

                <div className="res-stock-panel-header">
                  <div>
                    <h2>
                      {modoNuevo
                        ? "NUEVA RECETA"
                        : nombre ||
                          "RECETA"}
                    </h2>

                    <span className="res-stock-tipo-label">
                      {
                        nombreTipoActivo
                      }
                    </span>
                  </div>

                  {!modoEdicion &&
                    seleccionadaId && (
                      <div className="res-stock-acciones">

                        <button
                          type="button"
                          className="res-stock-btn-editar"
                          onClick={
                            editarReceta
                          }
                        >
                          EDITAR
                        </button>

                        <button
                          type="button"
                          className="res-stock-btn-eliminar"
                          onClick={
                            eliminar
                          }
                        >
                          ELIMINAR
                        </button>

                      </div>
                    )}
                </div>

                {/* =========================================
                    NOMBRE / HABILITADO
                ========================================= */}

                {modoEdicion ? (
                  <div className="res-stock-datos-generales">

                    <div className="res-stock-campo">
                      <label>
                        Nombre
                      </label>

                      <input
                        type="text"
                        value={
                          nombre
                        }
                        onChange={(e) =>
                          setNombre(
                            e.target.value
                          )
                        }
                        placeholder={`Nombre de la receta de ${nombreTipoActivo}`}
                      />
                    </div>

                    <div className="res-stock-campo res-stock-check">
                      <label>
                        Habilitado en
                        cotizador
                      </label>

                      <input
                        type="checkbox"
                        checked={
                          habilitado
                        }
                        onChange={(e) =>
                          setHabilitado(
                            e.target.checked
                          )
                        }
                      />
                    </div>

                  </div>
                ) : (
                  <div className="res-stock-datos-generales">

                    <div className="res-stock-campo-lectura">
                      <label>
                        Nombre
                      </label>

                      <strong>
                        {nombre ||
                          "--"}
                      </strong>
                    </div>

                    <div className="res-stock-campo-lectura">
                      <label>
                        Habilitado
                      </label>

                      <span
                        className={
                          habilitado
                            ? "res-stock-estado habilitado"
                            : "res-stock-estado deshabilitado"
                        }
                      >
                        {habilitado
                          ? "Sí"
                          : "No"}
                      </span>
                    </div>

                  </div>
                )}

                {/* =========================================
                    FORMULARIO ESPECÍFICO
                ========================================= */}

                <div className="res-stock-formulario-tipo">
                  {renderFormularioTipo()}
                </div>

                {/* =========================================
                    BOTONES
                ========================================= */}

                {modoEdicion && (
                  <div className="res-stock-footer">

                    <button
                      type="button"
                      className="res-stock-btn-cancelar"
                      onClick={
                        cancelarEdicion
                      }
                      disabled={
                        guardando
                      }
                    >
                      CANCELAR
                    </button>

                    <button
                      type="button"
                      className="res-stock-btn-guardar"
                      onClick={
                        guardar
                      }
                      disabled={
                        guardando
                      }
                    >
                      {guardando
                        ? "GUARDANDO..."
                        : modoNuevo
                        ? "AGREGAR RECETA"
                        : "GUARDAR CAMBIOS"}
                    </button>

                  </div>
                )}

              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ResistenciasStock;