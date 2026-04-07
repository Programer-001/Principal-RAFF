// src/produccion/inv_almacen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { getDatabase, onValue, push, ref, set, update } from "firebase/database";
import { app } from "../firebase/config";
import "../styles.css";

interface ItemAlmacen {
    id: string;
    descripcion: string;
    cantidad: number;
    fecha?: string;
    activo?: boolean;
    imagenUrl?: string;
    tipoMovimiento?: string;
}

interface ItemResistencia {
    id: string;
    tipo: string;
    cantidad: number;
    fecha?: string;
    activo?: boolean;
    tipoMovimiento?: string;
}

type PanelModo =
    | "ninguno"
    | "agregar_almacen"
    | "ingresar_almacen"
    | "agregar_resistencia"
    | "ingresar_resistencia";

const InvAlmacen: React.FC = () => {
    const db = getDatabase(app);

    const [almacen, setAlmacen] = useState<ItemAlmacen[]>([]);
    const [resistencias, setResistencias] = useState<ItemResistencia[]>([]);
    const [modoPanel, setModoPanel] = useState<PanelModo>("ninguno");

    // ---------- FORM ALMACEN ----------
    const [nuevaDescripcion, setNuevaDescripcion] = useState("");
    const [nuevaCantidadAlmacen, setNuevaCantidadAlmacen] = useState("");

    const [descripcionSeleccionada, setDescripcionSeleccionada] = useState("");
    const [cantidadEntradaAlmacen, setCantidadEntradaAlmacen] = useState("");

    // ---------- FORM RESISTENCIAS ----------
    const [nuevoTipoResistencia, setNuevoTipoResistencia] = useState("");
    const [nuevaCantidadResistencia, setNuevaCantidadResistencia] = useState("");

    const [tipoSeleccionado, setTipoSeleccionado] = useState("");
    const [cantidadEntradaResistencia, setCantidadEntradaResistencia] = useState("");

    useEffect(() => {
        const almacenRef = ref(db, "produccion/almacen_inventario");
        const resistenciasRef = ref(db, "produccion/resistencias_stock");

        const offAlmacen = onValue(almacenRef, (snapshot) => {
            const data = snapshot.val() || {};

            const lista: ItemAlmacen[] = Object.entries(data)
                .map(([firebaseKey, item]: [string, any]) => ({
                    id: item.id || firebaseKey || "",
                    descripcion: item.descripcion || item.DESCRIPCION || "",
                    cantidad: Number(item.cantidad ?? item.CANTIDAD ?? 0),
                    fecha: item.fecha || item.FECHA || "",
                    activo: item.activo ?? item.ACTIVO ?? true,
                    imagenUrl: item.imagenUrl || item.IMAGENURL || "",
                    tipoMovimiento: item.tipoMovimiento || "",
                }))
                .sort((a, b) =>
                    a.descripcion.localeCompare(b.descripcion, "es", {
                        sensitivity: "base",
                    })
                );

            setAlmacen(lista);
        });

        const offResistencias = onValue(resistenciasRef, (snapshot) => {
            const data = snapshot.val() || {};

            const lista: ItemResistencia[] = Object.entries(data)
                .map(([firebaseKey, item]: [string, any]) => ({
                    id: item.id || firebaseKey || "",
                    tipo: item.TIPO || item.tipo || "",
                    cantidad: Number(item.CANTIDAD ?? item.cantidad ?? 0),
                    fecha: item.FECHA || item.fecha || "",
                    activo: item.ACTIVO ?? item.activo ?? true,
                    tipoMovimiento: item.tipoMovimiento || "",
                }))
                .sort((a, b) =>
                    a.tipo.localeCompare(b.tipo, "es", {
                        sensitivity: "base",
                    })
                );

            setResistencias(lista);
        });

        return () => {
            offAlmacen();
            offResistencias();
        };
    }, [db]);

    const fechaHoy = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = String(hoy.getFullYear()).slice(-2);
        return `${dia}/${mes}/${anio}`;
    };

    const fechaCompleta = () => {
        const now = new Date();
        const fecha = now.toLocaleDateString("es-MX");
        const hora = now.toLocaleTimeString("es-MX", { hour12: false });

        return {
            fecha,
            hora,
            fechaHoraISO: now.toISOString(),
        };
    };

    const generarSiguienteId = (items: { id: string }[], prefijo: string, digitos = 4) => {
        const numeros = items
            .map((item) => item.id || "")
            .filter((id) => id.startsWith(prefijo))
            .map((id) => Number(id.replace(prefijo, "")))
            .filter((n) => !isNaN(n));

        const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1;
        return `${prefijo}${String(siguiente).padStart(digitos, "0")}`;
    };

    const guardarMovimiento = async (payload: any) => {
        const movimientoRef = ref(db, "produccion/movimientos_inventario");
        const nuevo = push(movimientoRef);
        const tiempo = fechaCompleta();

        await set(nuevo, {
            ...tiempo,
            ...payload,
        });
    };

    const limpiarFormularios = () => {
        setNuevaDescripcion("");
        setNuevaCantidadAlmacen("");
        setDescripcionSeleccionada("");
        setCantidadEntradaAlmacen("");

        setNuevoTipoResistencia("");
        setNuevaCantidadResistencia("");
        setTipoSeleccionado("");
        setCantidadEntradaResistencia("");
    };

    const abrirPanel = (modo: PanelModo) => {
        limpiarFormularios();
        setModoPanel(modo);
    };

    const cerrarPanel = () => {
        limpiarFormularios();
        setModoPanel("ninguno");
    };

    const agregarMaterialAlmacen = async () => {
        const descripcion = nuevaDescripcion.trim().toUpperCase();
        const cantidad = Number(nuevaCantidadAlmacen || 0);

        if (!descripcion) {
            alert("Escribe la descripción del material.");
            return;
        }

        const existe = almacen.some(
            (item) => item.descripcion.trim().toUpperCase() === descripcion
        );

        if (existe) {
            alert("Ese material ya existe en almacén.");
            return;
        }

        const nuevoId = generarSiguienteId(almacen, "AL", 4);
        const itemRef = ref(db, `produccion/almacen_inventario/${nuevoId}`);

        await set(itemRef, {
            id: nuevoId,
            descripcion,
            cantidad,
            fecha: fechaHoy(),
            activo: true,
            imagenUrl: "",
            tipoMovimiento: "alta",
        });

        await guardarMovimiento({
            modulo: "almacen_inventario",
            accion: "alta_material",
            itemId: nuevoId,
            descripcion,
            cantidadMovimiento: cantidad,
            cantidadAnterior: 0,
            cantidadNueva: cantidad,
        });

        alert("Material agregado correctamente.");
        cerrarPanel();
    };

    const ingresarStockAlmacen = async () => {
        const descripcion = descripcionSeleccionada.trim();
        const cantidadAgregar = Number(cantidadEntradaAlmacen || 0);

        if (!descripcion) {
            alert("Selecciona un material.");
            return;
        }

        if (cantidadAgregar <= 0) {
            alert("La cantidad debe ser mayor a 0.");
            return;
        }

        const item = almacen.find((x) => x.descripcion === descripcion);

        if (!item) {
            alert("No se encontró el material seleccionado.");
            return;
        }

        const cantidadAnterior = Number(item.cantidad || 0);
        const cantidadNueva = cantidadAnterior + cantidadAgregar;

        const itemRef = ref(db, `produccion/almacen_inventario/${item.id}`);

        await update(itemRef, {
            cantidad: cantidadNueva,
            fecha: fechaHoy(),
            tipoMovimiento: "entrada",
            activo: true,
        });

        await guardarMovimiento({
            modulo: "almacen_inventario",
            accion: "entrada_stock",
            itemId: item.id,
            descripcion: item.descripcion,
            cantidadMovimiento: cantidadAgregar,
            cantidadAnterior,
            cantidadNueva,
        });

        alert("Stock actualizado correctamente.");
        cerrarPanel();
    };

    const agregarResistencia = async () => {
        const tipo = nuevoTipoResistencia.trim().toUpperCase();
        const cantidad = Number(nuevaCantidadResistencia || 0);

        if (!tipo) {
            alert("Escribe el tipo de resistencia.");
            return;
        }

        const existe = resistencias.some(
            (item) => item.tipo.trim().toUpperCase() === tipo
        );

        if (existe) {
            alert("Ese tipo ya existe en resistencias.");
            return;
        }

        const nuevoId = generarSiguienteId(resistencias, "RES", 4);
        const itemRef = ref(db, `produccion/resistencias_stock/${nuevoId}`);

        await set(itemRef, {
            id: nuevoId,
            TIPO: tipo,
            CANTIDAD: cantidad,
            FECHA: fechaHoy(),
            ACTIVO: true,
            tipoMovimiento: "alta",
        });

        await guardarMovimiento({
            modulo: "resistencias_stock",
            accion: "alta_material",
            itemId: nuevoId,
            tipo,
            cantidadMovimiento: cantidad,
            cantidadAnterior: 0,
            cantidadNueva: cantidad,
        });

        alert("Resistencia agregada correctamente.");
        cerrarPanel();
    };

    const ingresarStockResistencia = async () => {
        const tipo = tipoSeleccionado.trim();
        const cantidadAgregar = Number(cantidadEntradaResistencia || 0);

        if (!tipo) {
            alert("Selecciona un tipo de resistencia.");
            return;
        }

        if (cantidadAgregar <= 0) {
            alert("La cantidad debe ser mayor a 0.");
            return;
        }

        const item = resistencias.find((x) => x.tipo === tipo);

        if (!item) {
            alert("No se encontró el tipo seleccionado.");
            return;
        }

        const cantidadAnterior = Number(item.cantidad || 0);
        const cantidadNueva = cantidadAnterior + cantidadAgregar;

        const itemRef = ref(db, `produccion/resistencias_stock/${item.id}`);

        await update(itemRef, {
            id: item.id,
            TIPO: item.tipo,
            CANTIDAD: cantidadNueva,
            FECHA: fechaHoy(),
            ACTIVO: true,
            tipoMovimiento: "entrada",
        });

        await guardarMovimiento({
            modulo: "resistencias_stock",
            accion: "entrada_stock",
            itemId: item.id,
            tipo: item.tipo,
            cantidadMovimiento: cantidadAgregar,
            cantidadAnterior,
            cantidadNueva,
        });

        alert("Stock de resistencias actualizado.");
        cerrarPanel();
    };

    const totalAlmacen = useMemo(() => {
        return almacen.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    }, [almacen]);

    const totalResistencias = useMemo(() => {
        return resistencias.reduce((acc, item) => acc + Number(item.cantidad || 0), 0);
    }, [resistencias]);

    const claseCantidad = (cantidad: number) => {
        if (cantidad <= 10) return "stock-bajo";
        if (cantidad <= 20) return "stock-medio";
        return "stock-alto";
    };

    return (
        <div className="inv-page">
            <div className="inv-layout">
                <div className="inv-left-column">
                    <section className="inv-card">
                        <div className="inv-card-header">
                            <div>
                                <h2>Almacén inventario</h2>
                                <span>Total piezas: {totalAlmacen}</span>
                            </div>

                            <div className="inv-header-actions">
                                <button
                                    className="btn btn-green"
                                    onClick={() => abrirPanel("agregar_almacen")}
                                >
                                    Agregar material
                                </button>

                                <button
                                    className="btn btn-blue"
                                    onClick={() => abrirPanel("ingresar_almacen")}
                                >
                                    Ingresar stock
                                </button>
                            </div>
                        </div>

                        <div className="inv-table-scroll">
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Material</th>
                                        <th>Cantidad</th>
                                        <th>Indicador</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {almacen.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="inv-empty">
                                                No hay materiales registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        almacen.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.id}</td>
                                                <td>{item.descripcion}</td>
                                                <td className={claseCantidad(item.cantidad)}>
                                                    {item.cantidad}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`stock-dot ${claseCantidad(item.cantidad)}`}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="inv-card">
                        <div className="inv-card-header">
                            <div>
                                <h2>Resistencias stock</h2>
                                <span>Total piezas: {totalResistencias}</span>
                            </div>

                            <div className="inv-header-actions">
                                <button
                                    className="btn btn-green"
                                    onClick={() => abrirPanel("agregar_resistencia")}
                                >
                                    Agregar material
                                </button>

                                <button
                                    className="btn btn-blue"
                                    onClick={() => abrirPanel("ingresar_resistencia")}
                                >
                                    Ingresar stock
                                </button>
                            </div>
                        </div>

                        <div className="inv-table-scroll">
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Tipo</th>
                                        <th>Cantidad</th>
                                        <th>Indicador</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {resistencias.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="inv-empty">
                                                No hay resistencias registradas.
                                            </td>
                                        </tr>
                                    ) : (
                                        resistencias.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.id}</td>
                                                <td>{item.tipo}</td>
                                                <td className={claseCantidad(item.cantidad)}>
                                                    {item.cantidad}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`stock-dot ${claseCantidad(item.cantidad)}`}
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <div className="inv-right-column">
                    <section className="inv-panel">
                        <div className="inv-panel-header">
                            <h2>Movimientos</h2>
                            {modoPanel !== "ninguno" && (
                                <button className="btn btn-gray" onClick={cerrarPanel}>
                                    Cerrar
                                </button>
                            )}
                        </div>

                        {modoPanel === "ninguno" && (
                            <div className="inv-panel-placeholder">
                                Selecciona una acción:
                                <br />
                                agregar material o ingresar stock.
                            </div>
                        )}

                        {modoPanel === "agregar_almacen" && (
                            <div className="inv-form">
                                <h3>Agregar material a almacén</h3>

                                <label>Descripción</label>
                                <input
                                    value={nuevaDescripcion}
                                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                                    placeholder="Ej. TORNILLO 3/16"
                                />

                                <label>Cantidad inicial</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={nuevaCantidadAlmacen}
                                    onChange={(e) => setNuevaCantidadAlmacen(e.target.value)}
                                    placeholder="0"
                                />

                                <button className="btn btn-green" onClick={agregarMaterialAlmacen}>
                                    Guardar material
                                </button>
                            </div>
                        )}

                        {modoPanel === "ingresar_almacen" && (
                            <div className="inv-form">
                                <h3>Ingresar stock a almacén</h3>

                                <label>Material</label>
                                <select
                                    value={descripcionSeleccionada}
                                    onChange={(e) => setDescripcionSeleccionada(e.target.value)}
                                >
                                    <option value="">Selecciona material</option>
                                    {almacen.map((item) => (
                                        <option key={item.id} value={item.descripcion}>
                                            {item.descripcion}
                                        </option>
                                    ))}
                                </select>

                                <label>Cantidad a ingresar</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidadEntradaAlmacen}
                                    onChange={(e) => setCantidadEntradaAlmacen(e.target.value)}
                                    placeholder="0"
                                />

                                <button className="btn btn-blue" onClick={ingresarStockAlmacen}>
                                    Guardar movimiento
                                </button>
                            </div>
                        )}

                        {modoPanel === "agregar_resistencia" && (
                            <div className="inv-form">
                                <h3>Agregar tipo de resistencia</h3>

                                <label>Tipo</label>
                                <input
                                    value={nuevoTipoResistencia}
                                    onChange={(e) => setNuevoTipoResistencia(e.target.value)}
                                    placeholder="Ej. VAPOR CHICA 220V 2000W"
                                />

                                <label>Cantidad inicial</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={nuevaCantidadResistencia}
                                    onChange={(e) => setNuevaCantidadResistencia(e.target.value)}
                                    placeholder="0"
                                />

                                <button className="btn btn-green" onClick={agregarResistencia}>
                                    Guardar tipo
                                </button>
                            </div>
                        )}

                        {modoPanel === "ingresar_resistencia" && (
                            <div className="inv-form">
                                <h3>Ingresar stock a resistencias</h3>

                                <label>Tipo</label>
                                <select
                                    value={tipoSeleccionado}
                                    onChange={(e) => setTipoSeleccionado(e.target.value)}
                                >
                                    <option value="">Selecciona tipo</option>
                                    {resistencias.map((item) => (
                                        <option key={item.id} value={item.tipo}>
                                            {item.tipo}
                                        </option>
                                    ))}
                                </select>

                                <label>Cantidad a ingresar</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidadEntradaResistencia}
                                    onChange={(e) => setCantidadEntradaResistencia(e.target.value)}
                                    placeholder="0"
                                />

                                <button
                                    className="btn btn-blue"
                                    onClick={ingresarStockResistencia}
                                >
                                    Guardar movimiento
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default InvAlmacen;