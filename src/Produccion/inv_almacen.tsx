// src/produccion/inv_almacen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, getDatabase, onValue, ref, set, update } from "firebase/database";
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

interface ItemSolicitud {
    id: string;
    descripcion: string;
    cantidadSolicitada: number;
}

interface ItemOrdenCompra {
    partida: number;
    idMaterial?: string;
    descripcion: string;
    cantidad: number;
    cantidadRecibida: number;
    noTienen: boolean;
}

type ModoEntradaStock = "manual" | "orden_compra" | "";

type PanelModo =
    | "ninguno"
    | "agregar_almacen"
    | "ingresar_almacen"
    | "solicitar_almacen"
    | "agregar_resistencia"
    | "ingresar_resistencia";

const InvAlmacen: React.FC = () => {
    const db = getDatabase(app);

    const [almacen, setAlmacen] = useState<ItemAlmacen[]>([]);
    const [resistencias, setResistencias] = useState<ItemResistencia[]>([]);
    const [modoPanel, setModoPanel] = useState<PanelModo>("ninguno");

    const [nuevaDescripcion, setNuevaDescripcion] = useState("");
    const [nuevaCantidadAlmacen, setNuevaCantidadAlmacen] = useState("");
    const [nuevoProveedor, setNuevoProveedor] = useState("");
    const [nuevaDescripcionProveedor, setNuevaDescripcionProveedor] = useState("");

    const [descripcionSeleccionada, setDescripcionSeleccionada] = useState("");
    const [cantidadEntradaAlmacen, setCantidadEntradaAlmacen] = useState("");

    const [seleccionadosAlmacen, setSeleccionadosAlmacen] = useState<string[]>([]);
    const [solicitudItems, setSolicitudItems] = useState<ItemSolicitud[]>([]);
    const [ticketPreview, setTicketPreview] = useState("");

    const [nuevoTipoResistencia, setNuevoTipoResistencia] = useState("");
    const [nuevaCantidadResistencia, setNuevaCantidadResistencia] = useState("");

    const [tipoSeleccionado, setTipoSeleccionado] = useState("");
    const [cantidadEntradaResistencia, setCantidadEntradaResistencia] = useState("");

    const [modoEntradaStock, setModoEntradaStock] = useState<ModoEntradaStock>("");
    const [folioOrdenCompra, setFolioOrdenCompra] = useState("");
    const [ordenCompraCargada, setOrdenCompraCargada] = useState<any | null>(null);
    const [itemsOrdenCompra, setItemsOrdenCompra] = useState<ItemOrdenCompra[]>([]);

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
                .sort((a, b) => extraerNumeroId(a.id) - extraerNumeroId(b.id));

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
                .sort((a, b) => extraerNumeroId(a.id) - extraerNumeroId(b.id));

            setResistencias(lista);
        });

        return () => {
            offAlmacen();
            offResistencias();
        };
    }, [db]);

    const extraerNumeroId = (id: string) => {
        const match = String(id || "").match(/(\d+)/);
        return match ? Number(match[1]) : 0;
    };

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

    const fechaId = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = String(hoy.getFullYear()).slice(-2);
        return `${dia}${mes}${anio}`;
    };

    const generarSiguienteId = (
        items: { id: string }[],
        prefijo: string,
        digitos = 4
    ) => {
        const numeros = items
            .map((item) => item.id || "")
            .filter((id) => id.startsWith(prefijo))
            .map((id) => Number(id.replace(prefijo, "")))
            .filter((n) => !isNaN(n));

        const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1;
        return `${prefijo}${String(siguiente).padStart(digitos, "0")}`;
    };

    const generarIdOrdenCompraProduccion = async () => {
        const base = fechaId();
        const ordenesRef = ref(db, "produccion/Orden_compra_produccion");
        const snap = await get(ordenesRef);
        const data = snap.val() || {};
        const claves = Object.keys(data);

        const delDia = claves
            .filter((id) => id.startsWith(base))
            .map((id) => Number(id.slice(base.length)))
            .filter((n) => !isNaN(n));

        const siguiente = delDia.length ? Math.max(...delDia) + 1 : 1;
        return `${base}${String(siguiente).padStart(2, "0")}`;
    };

    const guardarMovimiento = async (payload: any) => {
        const tiempo = fechaCompleta();
        const movimientosRef = ref(
            db,
            `produccion/movimientos_inventario/${Date.now()}_${Math.floor(Math.random() * 1000)}`
        );

        await set(movimientosRef, {
            ...tiempo,
            ...payload,
        });
    };

    const limpiarFormularios = () => {
        setNuevaDescripcion("");
        setNuevaCantidadAlmacen("");
        setNuevoProveedor("");
        setNuevaDescripcionProveedor("");
        setDescripcionSeleccionada("");
        setCantidadEntradaAlmacen("");

        setNuevoTipoResistencia("");
        setNuevaCantidadResistencia("");
        setTipoSeleccionado("");
        setCantidadEntradaResistencia("");

        setModoEntradaStock("");
        setFolioOrdenCompra("");
        setOrdenCompraCargada(null);
        setItemsOrdenCompra([]);
        setTicketPreview("");
    };

    const abrirPanel = async (modo: PanelModo) => {
        limpiarFormularios();
        setModoPanel(modo);

        if (modo !== "solicitar_almacen") {
            setSeleccionadosAlmacen([]);
        }

        if (modo === "solicitar_almacen") {
            const siguienteTicket = await generarIdOrdenCompraProduccion();
            setTicketPreview(siguienteTicket);
        }
    };

    const cerrarPanel = () => {
        limpiarFormularios();
        setModoPanel("ninguno");
        setSeleccionadosAlmacen([]);
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
            proveedor: nuevoProveedor.trim().toUpperCase(),
            descripcion_proveedor: nuevaDescripcionProveedor.trim().toUpperCase(),
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

    const ingresarStockAlmacenManual = async () => {
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
            accion: "entrada_stock_manual",
            itemId: item.id,
            descripcion: item.descripcion,
            cantidadMovimiento: cantidadAgregar,
            cantidadAnterior,
            cantidadNueva,
        });

        alert("Stock actualizado correctamente.");
        cerrarPanel();
    };

    const toggleSeleccionAlmacen = (id: string) => {
        setSeleccionadosAlmacen((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const agregarSeleccionadosASolicitud = () => {
        const itemsSeleccionados = almacen.filter((item) =>
            seleccionadosAlmacen.includes(item.id)
        );

        if (itemsSeleccionados.length === 0) {
            alert("Selecciona al menos un material.");
            return;
        }

        setSolicitudItems((prev) => {
            const mapa = new Map(prev.map((item) => [item.id, item]));

            itemsSeleccionados.forEach((item) => {
                if (!mapa.has(item.id)) {
                    mapa.set(item.id, {
                        id: item.id,
                        descripcion: item.descripcion,
                        cantidadSolicitada: 1,
                    });
                }
            });

            return Array.from(mapa.values());
        });
    };

    const cambiarCantidadSolicitud = (id: string, valor: string) => {
        const cantidad = Math.max(1, Number(valor || 1));

        setSolicitudItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, cantidadSolicitada: cantidad } : item
            )
        );
    };

    const eliminarDeSolicitud = (id: string) => {
        setSolicitudItems((prev) => prev.filter((item) => item.id !== id));
        setSeleccionadosAlmacen((prev) => prev.filter((x) => x !== id));
    };

    const guardarSolicitud = async () => {
        if (solicitudItems.length === 0) {
            alert("No hay materiales en la solicitud.");
            return;
        }

        const hayCantidadInvalida = solicitudItems.some(
            (item) => !item.cantidadSolicitada || item.cantidadSolicitada <= 0
        );

        if (hayCantidadInvalida) {
            alert("Todas las cantidades deben ser mayores a 0.");
            return;
        }

        const id = ticketPreview || (await generarIdOrdenCompraProduccion());
        const ordenRef = ref(db, `produccion/Orden_compra_produccion/${id}`);
        const tiempo = fechaCompleta();

        await set(ordenRef, {
            id,
            ...tiempo,
            fechaSimple: fechaHoy(),
            estatus: "pendiente",
            ingresado: false,
            items: solicitudItems.map((item, index) => ({
                partida: index + 1,
                idMaterial: item.id,
                descripcion: item.descripcion,
                cantidad: Number(item.cantidadSolicitada),
                descripcion_proveedor: "",
                proveedor: "",
            })),
        });

        alert(`Solicitud guardada correctamente: ${id}`);
        setSolicitudItems([]);
        setSeleccionadosAlmacen([]);
        setTicketPreview("");
        setModoPanel("ninguno");
    };

    const cargarOrdenCompra = async () => {
        const folio = folioOrdenCompra.trim();

        if (!folio) {
            alert("Escribe el folio de la orden de compra.");
            return;
        }

        const ordenRef = ref(db, `produccion/Orden_compra_produccion/${folio}`);
        const snap = await get(ordenRef);

        if (!snap.exists()) {
            alert("No se encontró la orden de compra.");
            setOrdenCompraCargada(null);
            setItemsOrdenCompra([]);
            return;
        }

        const data = snap.val();

        const itemsRaw = Array.isArray(data.items)
            ? data.items
            : Object.values(data.items || {});

        const itemsMapeados: ItemOrdenCompra[] = itemsRaw.map((item: any, index: number) => ({
            partida: Number(item.partida || index + 1),
            idMaterial: item.idMaterial || "",
            descripcion: item.descripcion || "",
            cantidad: Number(item.cantidad || 0),
            cantidadRecibida: Number(item.cantidad || 0),
            noTienen: false,
        }));

        setOrdenCompraCargada(data);
        setItemsOrdenCompra(itemsMapeados);
    };

    const cambiarCantidadRecibidaOC = (partida: number, valor: string) => {
        const cantidad = Math.max(0, Number(valor || 0));

        setItemsOrdenCompra((prev) =>
            prev.map((item) =>
                item.partida === partida ? { ...item, cantidadRecibida: cantidad } : item
            )
        );
    };

    const toggleNoTienenOC = (partida: number) => {
        setItemsOrdenCompra((prev) =>
            prev.map((item) =>
                item.partida === partida
                    ? {
                        ...item,
                        noTienen: !item.noTienen,
                        cantidadRecibida: !item.noTienen ? 0 : item.cantidad,
                    }
                    : item
            )
        );
    };

    const guardarIngresoDesdeOC = async () => {
        if (!folioOrdenCompra.trim()) {
            alert("Escribe el folio de la orden.");
            return;
        }

        if (!ordenCompraCargada || itemsOrdenCompra.length === 0) {
            alert("Primero carga una orden de compra.");
            return;
        }

        for (const item of itemsOrdenCompra) {
            if (item.noTienen) continue;
            if (!item.descripcion) continue;

            const cantidadAgregar = Number(item.cantidadRecibida || 0);
            if (cantidadAgregar <= 0) continue;

            const material = almacen.find(
                (x) => x.descripcion.trim().toUpperCase() === item.descripcion.trim().toUpperCase()
            );

            if (!material) {
                alert(`No se encontró en almacén: ${item.descripcion}`);
                return;
            }

            const cantidadAnterior = Number(material.cantidad || 0);
            const cantidadNueva = cantidadAnterior + cantidadAgregar;
            const itemRef = ref(db, `produccion/almacen_inventario/${material.id}`);

            await update(itemRef, {
                cantidad: cantidadNueva,
                fecha: fechaHoy(),
                tipoMovimiento: "entrada_oc",
                activo: true,
            });

            await guardarMovimiento({
                modulo: "almacen_inventario",
                accion: "entrada_stock_oc",
                folioOrdenCompra: folioOrdenCompra.trim(),
                itemId: material.id,
                descripcion: material.descripcion,
                cantidadMovimiento: cantidadAgregar,
                cantidadAnterior,
                cantidadNueva,
                noTienen: false,
            });
        }

        const itemsGuardados = itemsOrdenCompra.map((item) => ({
            partida: item.partida,
            idMaterial: item.idMaterial || "",
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            cantidadRecibida: item.noTienen ? 0 : Number(item.cantidadRecibida || 0),
            noTienen: item.noTienen,
            colorEstado: item.noTienen ? "rojo" : "verde",
            descripcion_proveedor: "",
            proveedor: "",
        }));

        const ordenRef = ref(db, `produccion/Orden_compra_produccion/${folioOrdenCompra.trim()}`);

        await update(ordenRef, {
            ingresado: true,
            fechaIngreso: fechaHoy(),
            items: itemsGuardados,
        });

        await Promise.all(
            itemsOrdenCompra
                .filter((item) => item.noTienen)
                .map((item, idx) =>
                    guardarMovimiento({
                        modulo: "almacen_inventario",
                        accion: "entrada_stock_oc_sin_existencia",
                        folioOrdenCompra: folioOrdenCompra.trim(),
                        itemId: item.idMaterial || `SINID_${idx + 1}`,
                        descripcion: item.descripcion,
                        cantidadMovimiento: 0,
                        noTienen: true,
                    })
                )
        );

        alert("Ingreso desde orden de compra guardado correctamente.");
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

    const mostrarChecksSolicitud = modoPanel === "solicitar_almacen";

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

                                <button
                                    className="btn btn-orange"
                                    onClick={() => abrirPanel("solicitar_almacen")}
                                >
                                    Solicitar
                                </button>

                                {mostrarChecksSolicitud && (
                                    <button
                                        className="btn btn-dark"
                                        onClick={agregarSeleccionadosASolicitud}
                                    >
                                        Agregar a solicitud
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="inv-table-scroll">
                            <table className="inv-table">
                                <thead>
                                    <tr>
                                        {mostrarChecksSolicitud && <th>Sel.</th>}
                                        <th>ID</th>
                                        <th>Material</th>
                                        <th>Cantidad</th>
                                        <th>Indicador</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {almacen.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={mostrarChecksSolicitud ? 5 : 4}
                                                className="inv-empty"
                                            >
                                                No hay materiales registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        almacen.map((item) => (
                                            <tr key={item.id}>
                                                {mostrarChecksSolicitud && (
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={seleccionadosAlmacen.includes(item.id)}
                                                            onChange={() => toggleSeleccionAlmacen(item.id)}
                                                        />
                                                    </td>
                                                )}
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
                            <h2>
                                {modoPanel === "solicitar_almacen"
                                    ? "Solicitud de compra"
                                    : "Movimientos"}
                            </h2>

                            {modoPanel !== "ninguno" && (
                                <button className="btn btn-orange" onClick={cerrarPanel}>
                                    Cerrar
                                </button>
                            )}
                        </div>

                        {modoPanel === "ninguno" && (
                            <div className="inv-panel-placeholder">
                                Selecciona una acción:
                                <br />
                                agregar material, ingresar stock o solicitar.
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

                                <label>Proveedor</label>
                                <input
                                    value={nuevoProveedor}
                                    onChange={(e) => setNuevoProveedor(e.target.value)}
                                    placeholder="Proveedor"
                                />

                                <label>Descripción proveedor</label>
                                <input
                                    value={nuevaDescripcionProveedor}
                                    onChange={(e) => setNuevaDescripcionProveedor(e.target.value)}
                                    placeholder="Descripción igual o la del proveedor"
                                />

                                <button className="btn btn-green" onClick={agregarMaterialAlmacen}>
                                    Guardar material
                                </button>
                            </div>
                        )}

                        {modoPanel === "ingresar_almacen" && (
                            <div className="inv-form">
                                <h3>Ingresar stock a almacén</h3>

                                {!modoEntradaStock && (
                                    <div className="inv-form">
                                        <button
                                            className="btn btn-blue"
                                            type="button"
                                            onClick={() => setModoEntradaStock("orden_compra")}
                                        >
                                            Viene de orden de compra
                                        </button>

                                        <button
                                            className="btn btn-green"
                                            type="button"
                                            onClick={() => setModoEntradaStock("manual")}
                                        >
                                            Es manual
                                        </button>
                                    </div>
                                )}

                                {modoEntradaStock === "manual" && (
                                    <>
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

                                        <button
                                            className="btn btn-blue"
                                            onClick={ingresarStockAlmacenManual}
                                        >
                                            Guardar movimiento
                                        </button>
                                    </>
                                )}

                                {modoEntradaStock === "orden_compra" && (
                                    <>
                                        <label>Folio de orden de compra</label>
                                        <input
                                            value={folioOrdenCompra}
                                            onChange={(e) => setFolioOrdenCompra(e.target.value)}
                                            placeholder="Ej. 07042601"
                                        />

                                        <button className="btn btn-blue" type="button" onClick={cargarOrdenCompra}>
                                            Cargar orden
                                        </button>

                                        {itemsOrdenCompra.length > 0 && (
                                            <>
                                                {itemsOrdenCompra.map((item) => (
                                                    <div
                                                        key={item.partida}
                                                        className={`solicitud-item-card ${item.noTienen ? "fila-roja" : "fila-verde"
                                                            }`}
                                                    >
                                                        <div className="solicitud-item-top">
                                                            <div>
                                                                <strong>{item.descripcion}</strong>
                                                                <div className="solicitud-item-id">
                                                                    Partida {item.partida} | Pedido: {item.cantidad}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <label>Cantidad recibida</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.cantidadRecibida}
                                                            disabled={item.noTienen}
                                                            onChange={(e) =>
                                                                cambiarCantidadRecibidaOC(item.partida, e.target.value)
                                                            }
                                                        />

                                                        <label className="check-linea">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.noTienen}
                                                                onChange={() => toggleNoTienenOC(item.partida)}
                                                            />
                                                            No tienen
                                                        </label>
                                                    </div>
                                                ))}

                                                <button className="btn btn-green" onClick={guardarIngresoDesdeOC}>
                                                    Agregar
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {modoPanel === "solicitar_almacen" && (
                            <div className="inv-form">
                                <h3>
                                    Ticket de solicitud: {ticketPreview || "Generando..."}
                                </h3>

                                {solicitudItems.length === 0 ? (
                                    <div className="inv-panel-placeholder">
                                        Selecciona materiales en la tabla de almacén y da clic en
                                        <br />
                                        <b>Agregar a solicitud</b>.
                                    </div>
                                ) : (
                                    <>
                                        {solicitudItems.map((item) => (
                                            <div key={item.id} className="solicitud-item-card">
                                                <div className="solicitud-item-top">
                                                    <div>
                                                        <strong>{item.descripcion}</strong>
                                                        <div className="solicitud-item-id">{item.id}</div>
                                                    </div>

                                                    <button
                                                        className="btn btn-red"
                                                        type="button"
                                                        onClick={() => eliminarDeSolicitud(item.id)}
                                                    >
                                                        Quitar
                                                    </button>
                                                </div>

                                                <label>Cantidad</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.cantidadSolicitada}
                                                    onChange={(e) =>
                                                        cambiarCantidadSolicitud(item.id, e.target.value)
                                                    }
                                                />
                                            </div>
                                        ))}

                                        <button className="btn btn-orange" onClick={guardarSolicitud}>
                                            Guardar solicitud
                                        </button>
                                    </>
                                )}
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