// src/produccion/Solicitud_compra.tsx
import React, { useEffect, useState } from "react";
import { ref, get, set, update,remove  } from "firebase/database";
import { db } from "../firebase/config";
import { formatearFechaHora } from "../funciones/formato_fechas";
import { generarPDFOrdenCompraProduccion } from "../plantillas/OC_Produccion";
//import "../styles.css";

interface Material {
  id: string;
  descripcion: string;
  cantidad: number;
  activo?: boolean;
}

interface ItemSolicitud {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;

  cantidadRecibida?: number;
  noTienen?: boolean;
  colorEstado?: string;
}

interface SolicitudData {
  id: string;
  fecha: string;
  fechaSimple: string;

  estatus: "pendiente" | "parcial" | "completada";

  ingresado: boolean;
  pedido_entregado?: boolean;
  tiene_faltantes?: boolean;

  items: ItemSolicitud[];
}

type ModoPantalla = "nuevo" | "lectura" | "edicion";

const Solicitud_compra: React.FC = () => {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Material[]>([]);
  const [solicitud, setSolicitud] = useState<ItemSolicitud[]>([]);
  const [seleccionados, setSeleccionados] = useState<Material[]>([]);
  const [folio, setFolio] = useState("");
  const [fechaSolicitud, setFechaSolicitud] = useState("");
  const [ultimasSolicitudes, setUltimasSolicitudes] = useState<SolicitudData[]>([]);
  const [modo, setModo] = useState<ModoPantalla>("nuevo");
 const [supervisorProduccion, setSupervisorProduccion] = useState("");
 const [areaUsuario, setAreaUsuario] = useState("");
  const esSoloLectura = modo === "lectura";
  const solicitudActual = ultimasSolicitudes.find(
  (s) => s.id === folio
);

const solicitudEntregada = solicitudActual?.pedido_entregado;
const esAdministracion =
  areaUsuario
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") === "administracion";

  const fechaHoy = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const anio = String(hoy.getFullYear()).slice(-2);
    return `${dia}/${mes}/${anio}`;
  };

  const generarFolio = async () => {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, "0");
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const aa = hoy.getFullYear().toString().slice(-2);

    const prefijo = `${dd}${mm}${aa}`;

    const snap = await get(ref(db, "produccion/Orden_compra_produccion"));
    const data = snap.val() || {};

    const foliosHoy = Object.keys(data).filter((key) =>
      key.startsWith(prefijo)
    );

    const consecutivo = foliosHoy.length + 1;

    return `${prefijo}${String(consecutivo).padStart(2, "0")}`;
  };
  // Cargar supervisor de producción
    useEffect(() => {
    const cargarSupervisor = async () => {
        const snap = await get(ref(db, "RH/Empleados"));

        if (!snap.exists()) return;

        const data = snap.val();

        const empleados = Object.values(data) as any[];

        const supervisor = empleados.find(
        (emp) =>
            emp.activo !== false &&
            String(emp.area || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "produccion" &&
            String(emp.puesto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes("supervisor")
        );

        setSupervisorProduccion(
        supervisor?.username || supervisor?.nombre || ""
        );
        const usuarioGuardado = localStorage.getItem("area") || "";
        setAreaUsuario(usuarioGuardado);
    };

    cargarSupervisor();
    }, []);
    // Cargar materiales de almacén
  useEffect(() => {
    const cargarMateriales = async () => {
      const snap = await get(ref(db, "produccion/almacen_inventario"));

      if (!snap.exists()) return;

      const data = snap.val();

      const lista: Material[] = Object.entries(data)
        .map(([key, item]: [string, any]) => ({
          id: item.id || key,
          descripcion: item.descripcion || item.DESCRIPCION || "",
          cantidad: Number(item.cantidad ?? item.CANTIDAD ?? 0),
          activo: item.activo ?? item.ACTIVO ?? true,
        }))
        .filter((m) => m.activo !== false)
        .sort((a, b) => a.descripcion.localeCompare(b.descripcion));

      setMateriales(lista);
    };

    cargarMateriales();
  }, []);

  const cargarUltimasSolicitudes = async () => {
    const snap = await get(ref(db, "produccion/Orden_compra_produccion"));

    if (!snap.exists()) {
      setUltimasSolicitudes([]);
      return;
    }

    const data = snap.val();

    const lista: SolicitudData[] = Object.values(data);

    const ordenadas = lista.sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();

    if (!isNaN(fechaA) && !isNaN(fechaB)) {
        return fechaB - fechaA;
    }

    return String(b.id || "").localeCompare(String(a.id || ""));
    });

    setUltimasSolicitudes(ordenadas.slice(0, 10));
  };

  useEffect(() => {
    cargarUltimasSolicitudes();
  }, []);

  useEffect(() => {
    if (modo !== "nuevo") return;

    const iniciar = async () => {
      const nuevoFolio = await generarFolio();
      setFolio(nuevoFolio);
      setFechaSolicitud(new Date().toISOString());
      setSolicitud([]);
      setBusqueda("");
      setResultados([]);
      setSeleccionados([]);
    };

    iniciar();
  }, [modo]);

  useEffect(() => {
    if (!busqueda.trim()) {
      setResultados([]);
      return;
    }

    const texto = busqueda.toLowerCase();

    const filtrados = materiales.filter((m) =>
      `${m.id} ${m.descripcion}`.toLowerCase().includes(texto)
    );

    setResultados(filtrados);
  }, [busqueda, materiales]);

  const agregarMaterial = (material: Material) => {
    if (esSoloLectura) return;

    const existe = solicitud.some((item) => item.id === material.id);

    if (existe) {
      alert("Este material ya fue agregado.");
      return;
    }

    setSolicitud((prev) => [
      ...prev,
      {
        id: material.id,
        descripcion: material.descripcion,
        cantidad: 1,
        unidad: "Pieza(s)",
      },
    ]);
  };

  const agregarSeleccionados = () => {
    if (esSoloLectura) return;

    seleccionados.forEach((material) => {
      const existe = solicitud.some((item) => item.id === material.id);

      if (!existe) {
        setSolicitud((prev) => [
          ...prev,
          {
            id: material.id,
            descripcion: material.descripcion,
            cantidad: 1,
            unidad: "Pieza(s)",
          },
        ]);
      }
    });

    setSeleccionados([]);
    setBusqueda("");
    setResultados([]);
  };

  const eliminarMaterial = (id: string) => {
    if (esSoloLectura) return;
    setSolicitud((prev) => prev.filter((item) => item.id !== id));
  };

  const guardarSolicitud = async () => {
    if (solicitud.length === 0) {
      alert("Agrega al menos un material.");
      return;
    }

const data: SolicitudData = {
  id: folio,
  fecha: fechaSolicitud || new Date().toISOString(),
  fechaSimple: fechaHoy(),
  estatus: "pendiente",
  ingresado: false,
  pedido_entregado: false,
  tiene_faltantes: false,
  items: solicitud.map((item) => ({
    ...item,
    unidad: item.unidad || "Pieza(s)",
  })),
};

    if (modo === "nuevo") {
  await set(ref(db, `produccion/Orden_compra_produccion/${folio}`), data);
} else {
  await update(ref(db, `produccion/Orden_compra_produccion/${folio}`), {
    fecha: data.fecha,
    fechaSimple: data.fechaSimple,
    items: data.items,
  });
}

    alert("Solicitud guardada correctamente.");

    await cargarUltimasSolicitudes();
    setModo("lectura");
  };

  const cargarSolicitud = async (id: string) => {
    const snap = await get(ref(db, `produccion/Orden_compra_produccion/${id}`));

    if (!snap.exists()) return;

    const data = snap.val() as SolicitudData;

    setFolio(data.id);
    setFechaSolicitud(data.fecha);
    setSolicitud(
    (data.items || []).map((item: any) => ({
        id: item.id || item.idMaterial || "",
        descripcion: item.descripcion || "",
        cantidad: Number(item.cantidad || 1),
        unidad: item.unidad || "Pieza(s)",

        cantidadRecibida: Number(item.cantidadRecibida || 0),
        noTienen: !!item.noTienen,
        colorEstado: item.colorEstado || "",
    }))
    );
    setModo("lectura");
    setBusqueda("");
    setResultados([]);
    setSeleccionados([]);
  };

  const nuevaSolicitud = async () => {
    setModo("nuevo");
  };
  // Función para eliminar una solicitud (solo para administración)
  const eliminarSolicitud = async (id: string) => {
  if (!esAdministracion) {
    alert("Solo Administración puede eliminar solicitudes.");
    return;
  }

  const confirmar = window.confirm(
    `¿Eliminar solicitud ${id}?`
  );

  if (!confirmar) return;

  await remove(
    ref(db, `produccion/Orden_compra_produccion/${id}`)
  );

  if (folio === id) {
    setModo("nuevo");
  }

  await cargarUltimasSolicitudes();
};
//HTML
  return (
    <div style={{ padding: 20, display: "flex", gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <h2>
            {modo === "nuevo"
              ? "Solicitud de compra"
              : modo === "lectura"
              ? "Consulta de solicitud"
              : "Editar solicitud"}
          </h2>

          <div style={{ display: "flex", gap: 10 }}>
        {modo === "lectura" && !solicitudEntregada && (
        <button
            className="btn btn-orange"
            onClick={() => setModo("edicion")}
        >
            Editar
        </button>
        )}

            {modo !== "lectura" && (
              <button
                className="btn btn-green"
                onClick={guardarSolicitud}
                disabled={solicitud.length === 0}
              >
                {modo === "nuevo" ? "GUARDAR SOLICITUD" : "ACTUALIZAR SOLICITUD"}
              </button>
            )}

            <button className="btn btn-blue" onClick={nuevaSolicitud}>
              Nueva solicitud
            </button>
                {modo === "lectura" && (
                <button
                    className="btn btn-blue"
                    onClick={() =>
                    generarPDFOrdenCompraProduccion({
                        folio,
                        fecha: fechaSolicitud,
                        supervisor: supervisorProduccion,
                        productos: solicitud,
                    })
                    }
                >
                    Guardar en PDF
                </button>
                )}

          </div>
        </div>

        <div className="encabezado-cotizador">
          <div className="encabezado-ite">
            <b>Folio: </b>
            {folio}
          </div>
        </div>

        {!esSoloLectura && (
          <>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar material de almacén..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />

            {resultados.length > 0 && (
              <div style={{ border: "1px solid #ccc", marginTop: 5 }}>
                {resultados.map((m) => {
                  const seleccionado = seleccionados.some((x) => x.id === m.id);

                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: 8,
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        backgroundColor: seleccionado ? "#cfe3ff" : "white",
                      }}
                      onClick={(e) => {
                        if (e.ctrlKey) {
                          setSeleccionados((prev) => {
                            const existe = prev.some((x) => x.id === m.id);
                            return existe
                              ? prev.filter((x) => x.id !== m.id)
                              : [...prev, m];
                          });
                        } else {
                          agregarMaterial(m);
                          setBusqueda("");
                          setResultados([]);
                        }
                      }}
                    >
                      <strong>{m.id}</strong> - {m.descripcion}
                      <br />
                      <small>Existencia actual: {m.cantidad}</small>
                    </div>
                  );
                })}
              </div>
            )}

            {seleccionados.length > 0 && (
              <button className="btn btn-blue" onClick={agregarSeleccionados}>
                Agregar seleccionados ({seleccionados.length})
              </button>
            )}
          </>
        )}

        <h3 style={{ marginTop: 30 }}>Materiales solicitados</h3>

        <div className="table-scroll">
          <table className="caja-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                {!esSoloLectura && <th>❌</th>}
              </tr>
            </thead>

            <tbody>
              {solicitud.map((item) => (
                <tr
                    key={item.id}
                    style={{
                        background:
                        item.colorEstado === "rojo"
                            ? "#fee2e2"
                            : item.colorEstado === "amarillo"
                            ? "#fef9c3"
                            : "transparent",

                        color:
                        item.colorEstado === "rojo"
                            ? "#991b1b"
                            : "inherit",

                        fontWeight:
                        item.colorEstado === "rojo"
                            ? "bold"
                            : "normal",
                    }}
                    >
                  <td>{item.id}</td>
                  <td>
                    {item.descripcion}

                    {item.noTienen && (
                        <div
                        style={{
                            color: "#dc2626",
                            fontWeight: "bold",
                            marginTop: 4,
                        }}
                        >
                        NO TIENEN
                        </div>
                    )}
                    </td>

                  <td>
                    {esSoloLectura ? (
                      item.cantidad
                    ) : (
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) => {
                          const cantidad = Number(e.target.value);

                          setSolicitud((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    cantidad:
                                      cantidad < 1 || isNaN(cantidad)
                                        ? 1
                                        : cantidad,
                                  }
                                : x
                            )
                          );
                        }}
                      />
                    )}
                  </td>

                  <td>
                    {esSoloLectura ? (
                      item.unidad
                    ) : (
                      <select
                        value={item.unidad}
                        onChange={(e) =>
                          setSolicitud((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? { ...x, unidad: e.target.value }
                                : x
                            )
                          )
                        }
                      >
                        <option>Pieza(s)</option>
                        <option>Metro(s)</option>
                        <option>Kilogramo(s)</option>
                        <option>Rollo(s)</option>
                        <option>Caja(s)</option>
                      </select>
                    )}
                  </td>

                  {!esSoloLectura && (
                    <td>
                      <button onClick={() => eliminarMaterial(item.id)}>X</button>
                    </td>
                  )}
                </tr>
              ))}

              {solicitud.length === 0 && (
                <tr>
                  <td colSpan={esSoloLectura ? 4 : 5}>
                    No hay materiales agregados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          width: 280,
          borderLeft: "1px solid #ccc",
          paddingLeft: 20,
          position: "sticky",
          top: 20,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3>Últimas solicitudes</h3>

        {ultimasSolicitudes.length === 0 && <p>No hay solicitudes.</p>}

        {ultimasSolicitudes.map((s) => (
          <div
            key={s.id}
            onClick={() => cargarSolicitud(s.id)}
            style={{
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
              background:
                s.id === folio
                  ? "#d0e7ff"
                  : s.ingresado
                  ? "#c8e6c9"
                  : "#f5f5f5",
            }}
          >
            <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
            >
            <strong>SC {s.id}</strong>

            {esAdministracion && (
            <span
            onClick={(e) => {
                e.stopPropagation();
                eliminarSolicitud(s.id);
            }}
            style={{
                color: "#dc2626",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 18,
                padding: "0 6px",
                userSelect: "none",
            }}
            >
            ✕
            </span>
            )}
            </div>
            <br />
            <small>
            {formatearFechaHora(s.fecha)}
            </small>

            {s.ingresado && (
              <>
                <br />
                <span style={{ color: "green", fontWeight: "bold" }}>
                  ✔ Ingresada
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Solicitud_compra;