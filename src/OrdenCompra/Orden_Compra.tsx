import React, { useEffect, useState } from "react";
import { ref, get, set, update } from "firebase/database";
import { db } from "../firebase/config";
import { generarPDFOrdenCompra } from "../plantillas/OC";

interface Producto {
  id: string;
  Producto: string;
  Categoria: string;
  habilitado?: boolean;
}

interface ItemOrden {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
}

interface OrdenData {
  folio: string;
  fecha: string;
  productos: ItemOrden[];
  surtida?: boolean;
}

type ModoPantalla = "nuevo" | "lectura" | "edicion";

const Orden_compra: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [orden, setOrden] = useState<ItemOrden[]>([]);
  const [seleccionados, setSeleccionados] = useState<Producto[]>([]);
  const [folio, setFolio] = useState("");
  const [fechaOrden, setFechaOrden] = useState("");
  const [ultimasOrdenes, setUltimasOrdenes] = useState<OrdenData[]>([]);
  const [modo, setModo] = useState<ModoPantalla>("nuevo");
  const [surtida, setSurtida] = useState(false);
  const [cargando, setCargando] = useState(false);

  const esSoloLectura = modo === "lectura";

  // 🔹 Cargar productos
  useEffect(() => {
    const cargarProductos = async () => {
      const snapshot = await get(ref(db, "Productos"));

      if (snapshot.exists()) {
        const data = snapshot.val();

        const lista: Producto[] = Object.keys(data)
          .map((key) => ({
            id: key,
            Producto: data[key].Producto,
            Categoria: data[key].Categoria || "",
            habilitado:
              data[key].habilitado === undefined ? true : data[key].habilitado,
          }))
          .filter((p) => p.habilitado);

        setProductos(lista);
      }
    };

    cargarProductos();
  }, []);

  // 🔹 Cargar últimas órdenes
  const cargarUltimasOrdenes = async () => {
    try {
      const snapshot = await get(ref(db, "ordenes_compra"));
      if (!snapshot.exists()) {
        setUltimasOrdenes([]);
        return;
      }

      const data = snapshot.val();
      const lista = Object.values(data) as OrdenData[];

      const ordenadas = lista.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setUltimasOrdenes(ordenadas.slice(0, 10));
    } catch (error) {
      console.error("Error cargando últimas órdenes:", error);
    }
  };

  useEffect(() => {
    cargarUltimasOrdenes();
  }, []);

  // 🟢 Inicializar nueva orden
  useEffect(() => {
    if (modo !== "nuevo") return;

    const inicializarFolio = async () => {
      const nuevo = await generarFolio();
      setFolio(nuevo);
      setFechaOrden(new Date().toISOString());
      setOrden([]);
      setSurtida(false);
    };

    inicializarFolio();
  }, [modo]);

  // 🔎 Buscador
  useEffect(() => {
    if (!busqueda.trim()) {
      setResultados([]);
      return;
    }

    const filtrados = productos.filter((p) =>
      p.Producto.toLowerCase().includes(busqueda.toLowerCase())
    );

    setResultados(filtrados);
  }, [busqueda, productos]);

  // 📌 Generar folio
  const generarFolio = async () => {
    const hoy = new Date();
    const dd = ("0" + hoy.getDate()).slice(-2);
    const mm = ("0" + (hoy.getMonth() + 1)).slice(-2);
    const aa = hoy.getFullYear().toString().slice(-2);

    const prefijo = `${dd}${mm}${aa}`;

    const snapshot = await get(ref(db, "ordenes_compra"));

    let consecutivo = 1;

    if (snapshot.exists()) {
      const data = snapshot.val();
      const foliosHoy = Object.keys(data).filter((key) =>
        key.startsWith(prefijo)
      );

      consecutivo = foliosHoy.length + 1;
    }

    return prefijo + ("0" + consecutivo).slice(-2);
  };

  // 🔹 Cargar orden seleccionada
  const cargarOrdenSeleccionada = async (folioSeleccionado: string) => {
    try {
      setCargando(true);

      const snapshot = await get(
        ref(db, `ordenes_compra/${folioSeleccionado}`)
      );

      if (!snapshot.exists()) return;

      const data = snapshot.val() as OrdenData;

      setFolio(data.folio);
      setFechaOrden(data.fecha);
      setOrden(data.productos || []);
      setSurtida(data.surtida || false);
      setModo("lectura");
      setBusqueda("");
      setResultados([]);
      setSeleccionados([]);
    } catch (error) {
      console.error("Error cargando orden:", error);
    } finally {
      setCargando(false);
    }
  };

  // ➕ Agregar producto
  const agregarProducto = (producto: Producto) => {
    if (esSoloLectura) return;

    const existe = orden.some((item) => item.id === producto.id);

    if (existe) {
      alert("Este producto ya fue agregado.");
      return;
    }

    setOrden((prev) => [
      ...prev,
      {
        id: producto.id,
        descripcion: producto.Producto,
        cantidad: 1,
        unidad: "Pieza(s)",
      },
    ]);
  };

  // ➕ Agregar varios productos
  const agregarSeleccionados = () => {
    if (esSoloLectura) return;

    seleccionados.forEach((p) => {
      const existe = orden.some((item) => item.id === p.id);

      if (!existe) {
        setOrden((prev) => [
          ...prev,
          {
            id: p.id,
            descripcion: p.Producto,
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

  // ❌ Eliminar producto
  const eliminarProducto = (id: string) => {
    if (esSoloLectura) return;
    setOrden((prev) => prev.filter((item) => item.id !== id));
  };

  // 💾 Guardar orden
  const guardarOrden = async () => {
    if (orden.length === 0) {
      alert("Debe agregar al menos un artículo.");
      return;
    }

    const ordenData: OrdenData = {
      folio,
      fecha: fechaOrden || new Date().toISOString(),
      productos: orden,
      surtida,
    };

    try {
      await set(ref(db, `ordenes_compra/${folio}`), ordenData);

      alert(
        modo === "nuevo"
          ? "Orden guardada correctamente"
          : "Orden actualizada correctamente"
      );

      await cargarUltimasOrdenes();
      setModo("lectura");
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar la orden.");
    }
  };

  // ✅ Toggle surtida
  const toggleSurtida = async () => {
    const nuevoEstado = !surtida;
    setSurtida(nuevoEstado);

    if (modo !== "nuevo") {
      try {
        await update(ref(db, `ordenes_compra/${folio}`), {
          surtida: nuevoEstado,
        });

        setUltimasOrdenes((prev) =>
          prev.map((o) =>
            o.folio === folio ? { ...o, surtida: nuevoEstado } : o
          )
        );
      } catch (error) {
        console.error("Error actualizando surtida:", error);
      }
    }
  };

  // 🆕 Nueva orden
  const nuevaOrden = async () => {
    setModo("nuevo");
    setOrden([]);
    setBusqueda("");
    setResultados([]);
    setSeleccionados([]);
    setSurtida(false);
  };

  return (
    <div
      style={{
        padding: 20,
        display: "flex",
        gap: 24,
        alignItems: "flex-start",
      }}
    >
      {/* PANEL PRINCIPAL */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0 }}>
            {modo === "nuevo"
              ? "Orden de compra"
              : modo === "lectura"
              ? "Consulta de orden de compra"
              : "Editar orden de compra"}
          </h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {modo === "lectura" && (
              <button
                onClick={() => setModo("edicion")}
                style={{
                  padding: 10,
                  backgroundColor: "#f57c00",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Editar
              </button>
            )}

            {modo !== "lectura" && (
              <button
                onClick={guardarOrden}
                disabled={orden.length === 0}
                style={{
                  padding: 10,
                  backgroundColor: orden.length === 0 ? "#9e9e9e" : "#2e7d32",
                  color: "white",
                  border: "none",
                  cursor: orden.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {modo === "nuevo" ? "GUARDAR ORDEN" : "ACTUALIZAR ORDEN"}
              </button>
            )}

            {(modo === "lectura" || modo === "edicion") && (
              <button
                onClick={() =>
                  generarPDFOrdenCompra({
                    folio,
                    productos: orden,
                  })
                }
                style={{
                  padding: 10,
                  backgroundColor: "#1976d2",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Guardar en PDF
              </button>
            )}

            <button
              onClick={nuevaOrden}
              style={{
                padding: 10,
                backgroundColor: "#424242",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Nueva orden
            </button>
          </div>
        </div>

        <div className="encabezado-cotizador">
          <div className="encabezado-ite">
            <b>Folio: </b>
            {folio}
          </div>
        </div>

        {(modo === "lectura" || modo === "edicion") && (
          <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: "bold" }}>
              <input
                type="checkbox"
                checked={surtida}
                onChange={toggleSurtida}
                style={{ marginRight: 8 }}
              />
              Orden surtida
            </label>
          </div>
        )}

        {/* BUSCADOR SOLO EN NUEVO O EDICION */}
        {!esSoloLectura && (
          <>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />

            {resultados.length > 0 && (
              <div style={{ border: "1px solid #ccc", marginTop: 5 }}>
                {resultados.map((p) => {
                  const seleccionado = seleccionados.some((x) => x.id === p.id);

                  return (
                    <div
                      key={p.id}
                      style={{
                        padding: 8,
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        backgroundColor: seleccionado ? "#cfe3ff" : "white",
                      }}
                      onClick={(e) => {
                        if (e.ctrlKey) {
                          setSeleccionados((prev) => {
                            const existe = prev.find((x) => x.id === p.id);

                            if (existe) {
                              return prev.filter((x) => x.id !== p.id);
                            } else {
                              return [...prev, p];
                            }
                          });
                        } else {
                          agregarProducto(p);
                          setBusqueda("");
                          setResultados([]);
                        }
                      }}
                    >
                      {p.Producto}
                    </div>
                  );
                })}
              </div>
            )}

            {seleccionados.length > 0 && (
              <button
                onClick={agregarSeleccionados}
                style={{
                  marginTop: 10,
                  padding: 8,
                  background: "#1e3a8a",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Agregar seleccionados ({seleccionados.length})
              </button>
            )}
          </>
        )}

        {/* TABLA */}
        <h3 style={{ marginTop: 30 }}>Productos agregados</h3>

        <div className="table-scroll">
          <table className="caja-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Unidad</th>
                {!esSoloLectura && <th>❌</th>}
              </tr>
            </thead>

            <tbody>
              {orden.map((item) => (
                <tr key={item.id}>
                  <td>{item.descripcion}</td>

                  <td>
                    {esSoloLectura ? (
                      item.cantidad
                    ) : (
                      <input
                        type="number"
                        value={item.cantidad}
                        min={1}
                        onChange={(e) => {
                          const nuevaCantidad = Number(e.target.value);

                          setOrden((prev) =>
                            prev.map((o) =>
                              o.id === item.id
                                ? {
                                    ...o,
                                    cantidad:
                                      nuevaCantidad < 1 || isNaN(nuevaCantidad)
                                        ? 1
                                        : nuevaCantidad,
                                  }
                                : o
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
                          setOrden((prev) =>
                            prev.map((o) =>
                              o.id === item.id
                                ? { ...o, unidad: e.target.value }
                                : o
                            )
                          )
                        }
                      >
                        <option>Pieza(s)</option>
                        <option>Rollo(s)</option>
                        <option>Caja(s)</option>
                        <option>Metro(s)</option>
                        <option>Kilogramo(s)</option>
                      </select>
                    )}
                  </td>

                  {!esSoloLectura && (
                    <td>
                      <button onClick={() => eliminarProducto(item.id)}>
                        X
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BARRA DERECHA */}
      <div
        style={{
          width: 280,
          minWidth: 240,
          borderLeft: "1px solid #ccc",
          paddingLeft: 20,
          position: "sticky",
          top: 20,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3>Últimas OC</h3>

        {ultimasOrdenes.length === 0 && <p>No hay órdenes registradas.</p>}

        {ultimasOrdenes.map((o) => (
          <div
            key={o.folio}
            onClick={() => cargarOrdenSeleccionada(o.folio)}
            style={{
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
              background:
                o.folio === folio
                  ? "#d0e7ff"
                  : o.surtida
                  ? "#c8e6c9"
                  : "#f5f5f5",
            }}
          >
            <strong>OC {o.folio}</strong>
            <br />
            <small>
              {new Date(o.fecha).toLocaleString("es-MX", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </small>

            {o.surtida && (
              <>
                <br />
                <span style={{ color: "green", fontWeight: "bold" }}>
                  ✔ Surtida
                </span>
              </>
            )}
          </div>
        ))}

        {cargando && <p>Cargando...</p>}
      </div>
    </div>
  );
};

export default Orden_compra;
