import React, { useEffect, useState } from "react";
import {
  get,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { db } from "../firebase/config";
import "../css/ResistenciasStock.css";

type CatalogoItem = {
  id: string;
  tipo: string;
};

type ProductoExtraStock = {
  descripcion: string;
  precio: string;
};

type ValoresResistencia = {
  voltaje: string;
  potencia: string;
  longitud: string;
  diametro: string;
  dobleces: string;
  tornillo: string;
  borne: string;

  soldaduraResistencia: string;

  soldarCableResistencia: string;
  cableParaSoldar: string;
  longitudCable: string;
  cantidadCable: string;

  datosAdicionales: string;
};

type ResistenciaStock = {
  id: string;
  nombre: string;
  habilitado: boolean;
  valores: ValoresResistencia;
  productosExtras: ProductoExtraStock[];
};

const valoresVacios: ValoresResistencia = {
  voltaje: "",
  potencia: "",
  longitud: "",
  diametro: "",
  dobleces: "",
  tornillo: "",
  borne: "",

  soldaduraResistencia: "",

  soldarCableResistencia: "",
  cableParaSoldar: "",
  longitudCable: "",
  cantidadCable: "",

  datosAdicionales: "",
};

const ResistenciasStock: React.FC = () => {
  const [resistencias, setResistencias] =
    useState<ResistenciaStock[]>([]);

  const [seleccionadaId, setSeleccionadaId] =
    useState<string | null>(null);

  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);

  const [nombre, setNombre] = useState("");
  const [habilitado, setHabilitado] = useState(true);

  const [valores, setValores] =
    useState<ValoresResistencia>({
      ...valoresVacios,
    });

  const [productosExtras, setProductosExtras] =
    useState<ProductoExtraStock[]>([]);

  // =========================================================
  // CATÁLOGOS
  // =========================================================

  const [diametros, setDiametros] =
    useState<CatalogoItem[]>([]);

  const [bornes, setBornes] =
    useState<CatalogoItem[]>([]);

  const [dobleces, setDobleces] =
    useState<CatalogoItem[]>([]);

  const [tornillos, setTornillos] =
    useState<CatalogoItem[]>([]);

  const [
    soldadurasResistencia,
    setSoldadurasResistencia,
  ] = useState<CatalogoItem[]>([]);

  const [
    soldarCableOpciones,
    setSoldarCableOpciones,
  ] = useState<CatalogoItem[]>([]);

  const [
    cablesParaSoldar,
    setCablesParaSoldar,
  ] = useState<CatalogoItem[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // =========================================================
  // CARGAR RESISTENCIAS
  // =========================================================

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

      const lista: ResistenciaStock[] =
        Object.entries(data).map(
          ([id, item]: [string, any]) => ({
            id,

            nombre: item.nombre || "",

            habilitado:
              item.habilitado !== false,

            valores: {
              voltaje:
                item.valores?.voltaje || "",

              potencia:
                item.valores?.potencia || "",

              longitud:
                item.valores?.longitud || "",

              diametro:
                item.valores?.diametro || "",

              dobleces:
                item.valores?.dobleces || "",

              tornillo:
                item.valores?.tornillo || "",

              borne:
                item.valores?.borne || "",

              soldaduraResistencia:
                item.valores
                  ?.soldaduraResistencia || "",

              soldarCableResistencia:
                item.valores
                  ?.soldarCableResistencia || "",

              cableParaSoldar:
                item.valores
                  ?.cableParaSoldar || "",

              longitudCable:
                item.valores
                  ?.longitudCable || "",

              cantidadCable:
                item.valores
                  ?.cantidadCable || "",

              datosAdicionales:
                item.valores
                  ?.datosAdicionales || "",
            },

            productosExtras: Array.isArray(
              item.productosExtras
            )
              ? item.productosExtras.map(
                  (extra: any) => ({
                    descripcion:
                      extra.descripcion || "",

                    precio: String(
                      extra.precio ?? ""
                    ),
                  })
                )
              : [],
          })
        );

      setResistencias(lista);
    } catch (error) {
      console.error(
        "Error cargando ResistenciasStock:",
        error
      );

      alert(
        "No se pudieron cargar las resistencias."
      );
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CARGAR CATÁLOGOS
  // =========================================================

  const cargarCatalogo = async (
    ruta: string
  ): Promise<CatalogoItem[]> => {
    try {
      const snapshot = await get(
        ref(db, `cotizador/${ruta}`)
      );

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();

      return Object.keys(data).map((id) => ({
        id,
        tipo: data[id].Tipo || "",
      }));
    } catch (error) {
      console.error(
        `Error cargando catálogo ${ruta}:`,
        error
      );

      return [];
    }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      await cargarResistencias();

      const [
        listaBornes,
        listaDobleces,
        listaTornillos,
        listaDiametros,
        listaSoldadurasResistencia,
        listaSoldarCable,
        listaCablesParaSoldar,
      ] = await Promise.all([
        cargarCatalogo("borne"),
        cargarCatalogo("dobleces"),
        cargarCatalogo("tornillo"),
        cargarCatalogo("Diametro_del_tubo"),
        cargarCatalogo("soldadura_resistencia"),
        cargarCatalogo("soldar_cable_resistencia"),
        cargarCatalogo("cable_para_soldar"),
      ]);

      setBornes(listaBornes);
      setDobleces(listaDobleces);
      setTornillos(listaTornillos);
      setDiametros(listaDiametros);

      setSoldadurasResistencia(
        listaSoldadurasResistencia
      );

      setSoldarCableOpciones(
        listaSoldarCable
      );

      setCablesParaSoldar(
        listaCablesParaSoldar
      );
    };

    cargarTodo();
  }, []);

  // =========================================================
  // FORMULARIO
  // =========================================================

  const limpiarFormulario = () => {
    setNombre("");
    setHabilitado(true);

    setValores({
      ...valoresVacios,
    });

    setProductosExtras([]);
  };

  const cargarEnFormulario = (
    resistencia: ResistenciaStock
  ) => {
    setNombre(resistencia.nombre);
    setHabilitado(resistencia.habilitado);

    setValores({
      ...valoresVacios,
      ...resistencia.valores,
    });

    setProductosExtras(
      resistencia.productosExtras || []
    );
  };

  const cambiarValor = (
    campo: keyof ValoresResistencia,
    valor: string
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // =========================================================
  // PRODUCTOS EXTRAS
  // =========================================================

  const agregarProductoExtra = () => {
    setProductosExtras((prev) => [
      ...prev,
      {
        descripcion: "",
        precio: "",
      },
    ]);
  };

  const cambiarProductoExtra = (
    index: number,
    campo: keyof ProductoExtraStock,
    valor: string
  ) => {
    setProductosExtras((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const eliminarProductoExtra = (
    index: number
  ) => {
    setProductosExtras((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // =========================================================
  // SELECCIONAR
  // =========================================================

  const seleccionarResistencia = (
    resistencia: ResistenciaStock
  ) => {
    if (
      seleccionadaId === resistencia.id
    ) {
      setSeleccionadaId(null);
      setModoEdicion(false);
      setModoNuevo(false);
      limpiarFormulario();
      return;
    }

    setSeleccionadaId(resistencia.id);
    setModoEdicion(false);
    setModoNuevo(false);

    cargarEnFormulario(resistencia);
  };

  // =========================================================
  // NUEVA
  // =========================================================

  const nuevaResistencia = () => {
    setSeleccionadaId(null);
    setModoNuevo(true);
    setModoEdicion(true);

    limpiarFormulario();
  };

  // =========================================================
  // CANCELAR
  // =========================================================

  const cancelar = () => {
    if (modoNuevo) {
      setModoNuevo(false);
      setModoEdicion(false);
      setSeleccionadaId(null);

      limpiarFormulario();
      return;
    }

    const resistencia = resistencias.find(
      (item) =>
        item.id === seleccionadaId
    );

    if (resistencia) {
      cargarEnFormulario(resistencia);
    }

    setModoEdicion(false);
  };

  // =========================================================
  // GUARDAR
  // =========================================================

  const guardar = async () => {
    if (!nombre.trim()) {
      alert(
        "Escribe el nombre de la resistencia."
      );
      return;
    }

    const datosGuardar = {
      nombre: nombre.trim(),

      habilitado,

      valores: {
        voltaje:
          valores.voltaje.trim(),

        potencia:
          valores.potencia.trim(),

        longitud:
          valores.longitud.trim(),

        diametro:
          valores.diametro,

        dobleces:
          valores.dobleces,

        tornillo:
          valores.tornillo,

        borne:
          valores.borne,

        soldaduraResistencia:
          valores.soldaduraResistencia,

        soldarCableResistencia:
          valores.soldarCableResistencia,

        cableParaSoldar:
          valores.cableParaSoldar,

        longitudCable:
          valores.longitudCable.trim(),

        cantidadCable:
          valores.cantidadCable.trim(),

        datosAdicionales:
          valores.datosAdicionales.trim(),
      },

      productosExtras:
        productosExtras
          .filter(
            (extra) =>
              extra.descripcion.trim() !== "" ||
              extra.precio.trim() !== ""
          )
          .map((extra) => ({
            descripcion:
              extra.descripcion.trim(),

            precio:
              Number(extra.precio) || 0,
          })),
    };

    try {
      setGuardando(true);

      if (modoNuevo) {
        const nuevaRef = push(
          ref(db, "ResistenciasStock")
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
      } else {
        if (!seleccionadaId) return;

        await update(
          ref(
            db,
            `ResistenciasStock/${seleccionadaId}`
          ),
          datosGuardar
        );

        await cargarResistencias();

        setModoEdicion(false);
      }
    } catch (error) {
      console.error(
        "Error guardando resistencia:",
        error
      );

      alert(
        "No se pudo guardar la resistencia."
      );
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // ELIMINAR
  // =========================================================

  const eliminar = async () => {
    if (!seleccionadaId) return;

    const confirmar =
      window.confirm(
        `¿Seguro que deseas eliminar la resistencia "${nombre}"?\n\nEsta acción la eliminará de Firebase.`
      );

    if (!confirmar) return;

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
        "Error eliminando resistencia:",
        error
      );

      alert(
        "No se pudo eliminar la resistencia."
      );
    }
  };

  // =========================================================
  // HTML
  // =========================================================

  return (
    <div className="res-stock">

      {/* IZQUIERDA */}

      <aside className="res-stock-sidebar">

        <div className="res-stock-sidebar-titulo">
          Resistencias Stock
        </div>

        {cargando ? (
          <div className="res-stock-cargando">
            Cargando...
          </div>
        ) : (
          <>
            {resistencias.map(
              (resistencia) => {
                const activa =
                  seleccionadaId ===
                  resistencia.id;

                return (
                  <button
                    key={resistencia.id}
                    type="button"
                    onClick={() =>
                      seleccionarResistencia(
                        resistencia
                      )
                    }
                    className={`res-stock-item ${
                      activa
                        ? "activo"
                        : ""
                    }`}
                  >
                    <span className="res-stock-item-nombre">
                      {resistencia.nombre}
                    </span>

                    {!resistencia.habilitado && (
                      <span className="res-stock-deshabilitada">
                        Deshabilitada
                      </span>
                    )}
                  </button>
                );
              }
            )}

            <button
              type="button"
              onClick={nuevaResistencia}
              title="Agregar resistencia"
              className="res-stock-agregar"
            >
              +
            </button>
          </>
        )}
      </aside>

      {/* DERECHA */}

      <section className="res-stock-contenido">

        <div className="res-stock-titulo">
          INFORMACIÓN
        </div>

        {!seleccionadaId &&
          !modoNuevo && (
            <div className="res-stock-vacio">
              Selecciona una resistencia
              para ver su información.
            </div>
          )}

        {/* ===================================================
            MODO LECTURA
        =================================================== */}

        {seleccionadaId &&
          !modoEdicion && (
            <div className="res-stock-informacion">

              <div className="res-stock-campo-lectura">
                <label>Nombre</label>
                <strong>
                  {nombre || "--"}
                </strong>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Habilitado</label>

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

              <div className="res-stock-campo-lectura">
                <label>Voltaje</label>

                <span>
                  {valores.voltaje
                    ? `${valores.voltaje} V`
                    : "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Potencia</label>

                <span>
                  {valores.potencia
                    ? `${valores.potencia} W`
                    : "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Longitud</label>

                <span>
                  {valores.longitud
                    ? `${valores.longitud} cm`
                    : "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>
                  Diámetro Tubo
                </label>

                <span>
                  {valores.diametro ||
                    "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Borne</label>

                <span>
                  {valores.borne ||
                    "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Dobleces</label>

                <span>
                  {valores.dobleces ||
                    "--"}
                </span>
              </div>

              <div className="res-stock-campo-lectura">
                <label>Tornillo</label>

                <span>
                  {valores.tornillo ||
                    "--"}
                </span>
              </div>

              {/* SOLDADURA EN RESISTENCIA */}

              <div className="res-stock-campo-lectura">
                <label>
                  Soldadura en resistencia
                </label>

                <span>
                  {valores.soldaduraResistencia ||
                    "--"}
                </span>
              </div>

              {/* SOLDAR CABLE */}

              <div className="res-stock-campo-lectura">
                <label>
                  Soldar cable en resistencia
                </label>

                <span>
                  {valores.soldarCableResistencia ||
                    "--"}
                </span>
              </div>

              {valores.soldarCableResistencia !==
                "" &&
                valores.soldarCableResistencia !==
                  "NO" && (
                  <div className="res-stock-campo-lectura">
                    <label>
                      Cable para soldar
                    </label>

                    <span>
                      {valores.cableParaSoldar ||
                        "--"}
                    </span>
                  </div>
                )}

              {valores.soldarCableResistencia !==
                "" &&
                valores.soldarCableResistencia !==
                  "NO" &&
                valores.cableParaSoldar !==
                  "" &&
                valores.cableParaSoldar !==
                  "NO" && (
                  <>
                    <div className="res-stock-campo-lectura">
                      <label>
                        Longitud de cable
                      </label>

                      <span>
                        {valores.longitudCable
                          ? `${valores.longitudCable} cm`
                          : "--"}
                      </span>
                    </div>

                    <div className="res-stock-campo-lectura">
                      <label>
                        Cantidad de cables
                      </label>

                      <span>
                        {valores.cantidadCable ||
                          "--"}
                      </span>
                    </div>
                  </>
                )}

              {/* PRODUCTOS EXTRAS */}

              <div className="res-stock-campo-lectura">
                <label>
                  Productos Extras
                </label>

                {productosExtras.length ===
                0 ? (
                  <span>--</span>
                ) : (
                  <div>
                    {productosExtras.map(
                      (extra, index) => (
                        <div key={index}>
                          {extra.descripcion} — $
                          {Number(
                            extra.precio || 0
                          ).toFixed(2)}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="res-stock-campo-lectura res-stock-datos-lectura">
                <label>
                  Datos adicionales
                </label>

                <span>
                  {valores.datosAdicionales ||
                    "--"}
                </span>
              </div>

              <div className="res-stock-acciones">
                <button
                  type="button"
                  className="res-stock-btn res-stock-btn-editar"
                  onClick={() =>
                    setModoEdicion(true)
                  }
                >
                  EDITAR
                </button>
              </div>
            </div>
          )}

        {/* ===================================================
            MODO EDICIÓN
        =================================================== */}

        {modoEdicion && (
          <div className="res-stock-formulario">

            <div className="res-stock-campo">
              <label>Nombre</label>

              <input
                type="text"
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="res-stock-campo res-stock-check">
              <label>
                Habilitado en cotizador
              </label>

              <input
                type="checkbox"
                checked={habilitado}
                onChange={(e) =>
                  setHabilitado(
                    e.target.checked
                  )
                }
              />
            </div>

            <div className="res-stock-campo">
              <label>Voltaje</label>

              <input
                type="number"
                min={0}
                value={valores.voltaje}
                onChange={(e) =>
                  cambiarValor(
                    "voltaje",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="res-stock-campo">
              <label>Potencia</label>

              <input
                type="number"
                min={0}
                value={valores.potencia}
                onChange={(e) =>
                  cambiarValor(
                    "potencia",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="res-stock-campo">
              <label>
                Longitud (cm)
              </label>

              <input
                type="number"
                min={0}
                value={valores.longitud}
                onChange={(e) =>
                  cambiarValor(
                    "longitud",
                    e.target.value
                  )
                }
              />
            </div>

            {/* DIÁMETRO */}

            <div className="res-stock-campo">
              <label>
                Diámetro Tubo
              </label>

              <select
                value={valores.diametro}
                onChange={(e) =>
                  cambiarValor(
                    "diametro",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione...
                </option>

                {diametros.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* BORNE */}

            <div className="res-stock-campo">
              <label>Borne</label>

              <select
                value={valores.borne}
                onChange={(e) =>
                  cambiarValor(
                    "borne",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione...
                </option>

                {bornes.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* DOBLECES */}

            <div className="res-stock-campo">
              <label>Dobleces</label>

              <select
                value={valores.dobleces}
                onChange={(e) =>
                  cambiarValor(
                    "dobleces",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione...
                </option>

                {dobleces.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* TORNILLO */}

            <div className="res-stock-campo">
              <label>Tornillo</label>

              <select
                value={valores.tornillo}
                onChange={(e) =>
                  cambiarValor(
                    "tornillo",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione...
                </option>

                {tornillos.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SOLDADURA EN RESISTENCIA */}

            <div className="res-stock-campo">
              <label>
                Soldadura en resistencia
              </label>

              <select
                value={
                  valores.soldaduraResistencia
                }
                onChange={(e) =>
                  cambiarValor(
                    "soldaduraResistencia",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Seleccione...
                </option>

                {soldadurasResistencia.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* SOLDAR CABLE */}

            <div className="res-stock-campo">
              <label>
                Soldar cable en resistencia
              </label>

              <select
                value={
                  valores.soldarCableResistencia
                }
                onChange={(e) => {
                  const valor =
                    e.target.value;

                  if (
                    valor === "" ||
                    valor === "NO"
                  ) {
                    setValores(
                      (prev) => ({
                        ...prev,

                        soldarCableResistencia:
                          valor,

                        cableParaSoldar: "",
                        longitudCable: "",
                        cantidadCable: "",
                      })
                    );
                  } else {
                    cambiarValor(
                      "soldarCableResistencia",
                      valor
                    );
                  }
                }}
              >
                <option value="">
                  Seleccione...
                </option>

                {soldarCableOpciones.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.tipo}
                    >
                      {item.tipo}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* CABLE PARA SOLDAR */}

            {valores.soldarCableResistencia !==
              "" &&
              valores.soldarCableResistencia !==
                "NO" && (
                <div className="res-stock-campo">
                  <label>
                    Cable para soldar
                  </label>

                  <select
                    value={
                      valores.cableParaSoldar
                    }
                    onChange={(e) => {
                      const valor =
                        e.target.value;

                      if (
                        valor === "" ||
                        valor === "NO"
                      ) {
                        setValores(
                          (prev) => ({
                            ...prev,

                            cableParaSoldar:
                              valor,

                            longitudCable:
                              "",

                            cantidadCable:
                              "",
                          })
                        );
                      } else {
                        cambiarValor(
                          "cableParaSoldar",
                          valor
                        );
                      }
                    }}
                  >
                    <option value="">
                      Seleccione...
                    </option>

                    {cablesParaSoldar.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.tipo}
                        >
                          {item.tipo}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

            {/* LONGITUD Y CANTIDAD */}

            {valores.soldarCableResistencia !==
              "" &&
              valores.soldarCableResistencia !==
                "NO" &&
              valores.cableParaSoldar !==
                "" &&
              valores.cableParaSoldar !==
                "NO" && (
                <>
                  <div className="res-stock-campo">
                    <label>
                      Longitud de cable para
                      soldar
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={
                        valores.longitudCable
                      }
                      onChange={(e) =>
                        cambiarValor(
                          "longitudCable",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="res-stock-campo">
                    <label>
                      Cantidad de cables
                    </label>

                    <input
                      type="number"
                      min={0}
                      value={
                        valores.cantidadCable
                      }
                      onChange={(e) =>
                        cambiarValor(
                          "cantidadCable",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </>
              )}

            {/* PRODUCTOS EXTRAS */}

            <div className="res-stock-productos-extras">

              <label>
                Productos Extras
              </label>

              {productosExtras.map(
                (extra, index) => (
                  <div
                    key={index}
                    className="res-stock-producto-extra"
                  >
                    <input
                      type="text"
                      placeholder="Descripción"
                      value={
                        extra.descripcion
                      }
                      onChange={(e) =>
                        cambiarProductoExtra(
                          index,
                          "descripcion",
                          e.target.value
                        )
                      }
                    />

                    <input
                      type="number"
                      min={0}
                      placeholder="Precio"
                      value={extra.precio}
                      onChange={(e) =>
                        cambiarProductoExtra(
                          index,
                          "precio",
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      className="res-stock-btn-extra-eliminar"
                      onClick={() =>
                        eliminarProductoExtra(
                          index
                        )
                      }
                    >
                      X
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                className="res-stock-btn-extra-agregar"
                onClick={
                  agregarProductoExtra
                }
              >
                + AGREGAR PRODUCTO EXTRA
              </button>
            </div>

            {/* DATOS ADICIONALES */}

            <div className="res-stock-campo res-stock-textarea">
              <label>
                Datos Adicionales
              </label>

              <textarea
                value={
                  valores.datosAdicionales
                }
                placeholder="Ej. RESISTENCIAS SAUNA STOCK RAFF"
                onChange={(e) =>
                  cambiarValor(
                    "datosAdicionales",
                    e.target.value
                  )
                }
              />
            </div>

            {/* BOTONES */}

            <div className="res-stock-acciones">

              <button
                type="button"
                className="res-stock-btn res-stock-btn-guardar"
                onClick={guardar}
                disabled={guardando}
              >
                {guardando
                  ? "GUARDANDO..."
                  : modoNuevo
                  ? "AGREGAR RESISTENCIA"
                  : "GUARDAR CAMBIOS"}
              </button>

              <button
                type="button"
                className="res-stock-btn res-stock-btn-cancelar"
                onClick={cancelar}
                disabled={guardando}
              >
                CANCELAR
              </button>

              {!modoNuevo &&
                seleccionadaId && (
                  <button
                    type="button"
                    className="res-stock-btn res-stock-btn-eliminar"
                    onClick={eliminar}
                    disabled={guardando}
                  >
                    ELIMINAR RESISTENCIA
                  </button>
                )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ResistenciasStock;