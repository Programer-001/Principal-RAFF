// src/Tienda.tsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase/config";
import { get, ref, runTransaction, set } from "firebase/database";

import Tubular from "../cotizadores/Tubular";
import Banda from "../cotizadores/Banda";
import CartuchoBaja from "../cotizadores/cartuchobaja";
import CartuchoAlta from "../cotizadores/cartuchoalta";
import Resorte from "../cotizadores/Resorte";
import Termopar from "../cotizadores/termopares";
import Cuarzo from "../cotizadores/cuarzo";

import { formatearMoneda } from "../funciones/formato_moneda";

interface Cliente {
    id?: string;
    nombre?: string;
    razonSocial?: string;
    rfc?: string;
    direccion?: string;
    numeroExterior?: string;
    numeroInterior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
    telefono?: string;
    email?: string;
    empresa?: string;
    giro?: string;
    regimenFiscal?: string;
    notas?: string;
    descuentoDefault?: number;
    descuento?: number;
    busqueda?: string;
    credito?: {
        activo: boolean;
        limite?: number;
        dias?: number;
    };
}

interface AsesorSnapshot {
    id?: string;
    uid?: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
}

interface ItemServicio {
    id: string;
    tipo: string;
    descripcion: string;
    total: number;
    datos: any;
    partida?: string;
}

interface ProductoFirebase {
    id: string;
    Cantidad?: number | string;
    Categoria?: string;
    Producto?: string;
    habilitado?: boolean;
    ["Precio base"]?: number | string;
    ["Precio neto"]?: number | string;
    PrecioNeto?: number | string;
    PrecioProveedor?: number | string;
}

type TipoOrigen = "servicio" | "articulo";

interface ItemTienda {
    id: string;
    origen: TipoOrigen;
    tipo: string;
    descripcion: string;
    total: number;
    partida?: string;
    datos?: any;

    productoId?: string;
    cantidad?: number;
    precioUnitario?: number;
    categoria?: string;
}

type TabPrincipal = "servicios" | "articulos";
type ServicioActivo =
    | "tubular"
    | "banda"
    | "CartuchoB"
    | "CartuchoA"
    | "Resorte"
    | "termopar"
    | "cuarzo";

const Tienda: React.FC = () => {
    const [folio, setFolio] = useState("FC-001");
    const [fecha, setFecha] = useState("");
    const [guardando, setGuardando] = useState(false);

    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [buscar, setBuscar] = useState("");
    const [clientes, setClientes] = useState<Cliente[]>([]);

    const [asesor, setAsesor] = useState<AsesorSnapshot | null>(null);

    const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>("servicios");
    const [servicioActivo, setServicioActivo] = useState<ServicioActivo>("tubular");

    const [items, setItems] = useState<ItemTienda[]>([]);
    const [itemServicioEditando, setItemServicioEditando] = useState<ItemTienda | null>(null);
    const [formDirty, setFormDirty] = useState(false);

    // -------------------- ARTÍCULOS --------------------
    const [busquedaProducto, setBusquedaProducto] = useState("");
    const [productos, setProductos] = useState<ProductoFirebase[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoFirebase | null>(null);
    const [cantidadProducto, setCantidadProducto] = useState<number>(1);
    const [precioProducto, setPrecioProducto] = useState<number>(0);

    // -------------------- DESCUENTO --------------------
    const [usarDescuento, setUsarDescuento] = useState(false);
    const [tipoDescuento, setTipoDescuento] = useState<"manual" | "cliente">("manual");
    const [descuentoManual, setDescuentoManual] = useState<number>(0);

    // -------------------- FECHA --------------------
    useEffect(() => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = hoy.getFullYear();
        setFecha(`${dia}/${mes}/${anio}`);
    }, []);

    // -------------------- FOLIO PREVIO --------------------
    useEffect(() => {
        const cargarFolio = async () => {
            try {
                const snap = await get(ref(db, "contadores/folios_compra"));
                const actual = snap.exists() ? Number(snap.val()) || 0 : 0;
                const siguiente = actual + 1;
                setFolio(`FC-${String(siguiente).padStart(3, "0")}`);
            } catch (error) {
                console.error("Error cargando folio:", error);
                setFolio("FC-001");
            }
        };

        cargarFolio();
    }, []);

    // -------------------- ASESOR --------------------
    useEffect(() => {
        const cargarAsesorActual = async () => {
            try {
                const usuario = auth.currentUser;

                if (!usuario?.uid) {
                    setAsesor(null);
                    return;
                }

                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) {
                    setAsesor(null);
                    return;
                }

                const empleados = snapshot.val();
                let encontrado: AsesorSnapshot | null = null;

                for (const key in empleados) {
                    const emp = empleados[key];

                    if (emp?.uid === usuario.uid) {
                        encontrado = {
                            id: emp.id || key,
                            uid: emp.uid || usuario.uid,
                            nombre: emp.nombre || "",
                            username: emp.username || "",
                            area: emp.area || "",
                            puesto: emp.puesto || "",
                        };
                        break;
                    }
                }

                setAsesor(encontrado);
            } catch (error) {
                console.error("Error cargando asesor actual:", error);
                setAsesor(null);
            }
        };

        cargarAsesorActual();
    }, []);

    // -------------------- CLIENTES --------------------
    const buscarClientes = async (texto: string) => {
        try {
            const snapshot = await get(ref(db, "Clientes"));

            if (!snapshot.exists()) {
                setClientes([]);
                return;
            }

            const data = snapshot.val();

            const lista: Cliente[] = Object.keys(data).map((id) => ({
                id,
                nombre: data[id].nombre || "",
                razonSocial: data[id].razonSocial || "",
                rfc: data[id].rfc || "",
                telefono: data[id].telefono || "",
                email: data[id].email || "",
                direccion: data[id].direccion || "",
                numeroExterior: data[id].numeroExterior || "",
                numeroInterior: data[id].numeroInterior || "",
                colonia: data[id].colonia || "",
                municipio: data[id].municipio || "",
                estado: data[id].estado || "",
                cp: data[id].cp || "",
                empresa: data[id].empresa || "",
                giro: data[id].giro || "",
                regimenFiscal: data[id].regimenFiscal || "",
                notas: data[id].notas || "",
                credito: data[id].credito || {
                    activo: false,
                    dias: 0,
                    limite: 0,
                },
                descuento: data[id].descuentoDefault ?? 0,
                busqueda:
                    data[id].busqueda ||
                    `${data[id].nombre || ""} ${data[id].razonSocial || ""} ${data[id].rfc || ""}`.toUpperCase(),
            }));

            const textoBusqueda = texto.toLowerCase().trim();

            const filtrados = lista.filter((c) => {
                const nombre = (c.nombre || "").toLowerCase();
                const razon = (c.razonSocial || "").toLowerCase();
                const rfc = (c.rfc || "").toLowerCase();
                const busquedaCompuesta = (c.busqueda || "").toLowerCase();

                return (
                    nombre.includes(textoBusqueda) ||
                    razon.includes(textoBusqueda) ||
                    rfc.includes(textoBusqueda) ||
                    busquedaCompuesta.includes(textoBusqueda)
                );
            });

            setClientes(filtrados);
        } catch (error) {
            console.error("Error buscando clientes:", error);
            setClientes([]);
        }
    };

    useEffect(() => {
        if (cliente) return;

        if (buscar.trim() === "") {
            setClientes([]);
            return;
        }

        const timeout = setTimeout(() => {
            buscarClientes(buscar);
        }, 300);

        return () => clearTimeout(timeout);
    }, [buscar, cliente]);

    const esClienteTemporal = cliente?.id === "TEMP";

    // -------------------- PRODUCTOS --------------------
    useEffect(() => {
        const cargarProductos = async () => {
            try {
                const snapshot = await get(ref(db, "Productos"));

                if (!snapshot.exists()) {
                    setProductos([]);
                    return;
                }

                const data = snapshot.val();

                const arreglo = Object.entries(data)
                    .map(([id, value]: [string, any]) => ({
                        id,
                        ...value,
                    }))
                    .filter((producto) => {
                        const tieneNombre = String(producto.Producto || "").trim() !== "";
                        const estaHabilitado =
                            producto.habilitado === true ||
                            producto.habilitado === "true" ||
                            typeof producto.habilitado === "undefined";

                        return tieneNombre && estaHabilitado;
                    });

                setProductos(arreglo);
            } catch (error) {
                console.error("Error cargando productos:", error);
                setProductos([]);
            }
        };

        cargarProductos();
    }, []);

    const productosFiltrados = useMemo(() => {
        if (!busquedaProducto.trim()) return [];

        return productos.filter((p) =>
            (p.Producto || "").toLowerCase().includes(busquedaProducto.toLowerCase())
        );
    }, [busquedaProducto, productos]);

    const seleccionarProducto = (producto: ProductoFirebase) => {
        const precio = Number(producto["Precio base"] || 0);

        setProductoSeleccionado(producto);
        setCantidadProducto(1);
        setPrecioProducto(precio);
        setBusquedaProducto(producto.Producto || "");
    };

    // -------------------- PARTIDAS --------------------
    const recalcularPartidas = (lista: ItemTienda[]) => {
        return lista.map((item, index) => ({
            ...item,
            partida: `${folio}.${index + 1}`,
        }));
    };

    const guardarServicio = (item: ItemServicio) => {
        setItems((prev) => {
            const index = prev.findIndex((p) => p.id === item.id && p.origen === "servicio");

            let nuevaLista: ItemTienda[];

            if (index >= 0) {
                nuevaLista = [...prev];
                nuevaLista[index] = {
                    ...nuevaLista[index],
                    origen: "servicio",
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    total: item.total,
                    datos: item.datos,
                };
            } else {
                nuevaLista = [
                    ...prev,
                    {
                        id: item.id,
                        origen: "servicio",
                        tipo: item.tipo,
                        descripcion: item.descripcion,
                        total: item.total,
                        datos: item.datos,
                    },
                ];
            }

            return recalcularPartidas(nuevaLista);
        });

        setItemServicioEditando(null);
        setFormDirty(false);
    };

    const agregarProductoATicket = () => {
        if (!productoSeleccionado) return;
        if (!cantidadProducto || cantidadProducto <= 0) return;

        const subtotal = cantidadProducto * precioProducto;

        const nuevoArticulo: ItemTienda = {
            id: `${productoSeleccionado.id}-${Date.now()}`,
            origen: "articulo",
            tipo: "articulo",
            descripcion: productoSeleccionado.Producto || "Sin descripción",
            total: subtotal,
            productoId: productoSeleccionado.id,
            cantidad: cantidadProducto,
            precioUnitario: precioProducto,
            categoria: productoSeleccionado.Categoria || "",
            datos: {
                productoId: productoSeleccionado.id,
                categoria: productoSeleccionado.Categoria || "",
            },
        };

        setItems((prev) => recalcularPartidas([...prev, nuevoArticulo]));

        setProductoSeleccionado(null);
        setBusquedaProducto("");
        setCantidadProducto(1);
        setPrecioProducto(0);
    };

    const eliminarItem = (id: string) => {
        setItems((prev) => recalcularPartidas(prev.filter((item) => item.id !== id)));

        if (itemServicioEditando?.id === id) {
            setItemServicioEditando(null);
        }
    };

    const editarServicio = (item: ItemTienda) => {
        setTabPrincipal("servicios");
        setServicioActivo(item.tipo as ServicioActivo);
        setItemServicioEditando(item);
    };

    const cambiarServicioActivo = (nuevo: ServicioActivo) => {
        if (formDirty) {
            const confirmar = window.confirm(
                "¿Deseas guardar la cotización actual antes de cambiar de servicio?"
            );

            if (confirmar) {
                alert("Da click en ACTUALIZAR antes de cambiar");
                return;
            }
        }

        setItemServicioEditando(null);
        setServicioActivo(nuevo);
    };

    // -------------------- TOTALES --------------------
    const itemsServicios = items.filter((item) => item.origen === "servicio");
    const itemsArticulos = items.filter((item) => item.origen === "articulo");

    const subtotal = items.reduce((acc, item) => acc + item.total, 0);
    const iva = subtotal * 0.16;

    const descuentoCliente = cliente?.descuento ?? 0;
    const porcentajeDescuento =
        !usarDescuento
            ? 0
            : tipoDescuento === "manual"
                ? descuentoManual / 100
                : descuentoCliente;

    const totalAntesDescuento = subtotal + iva;
    const montoDescuento = totalAntesDescuento * porcentajeDescuento;
    const totalPagar = totalAntesDescuento - montoDescuento;

    // -------------------- GUARDAR --------------------
    const finalizarTienda = async () => {
        if (items.length === 0) {
            alert("No hay partidas en el ticket.");
            return;
        }

        if (!cliente) {
            alert("Debes seleccionar o capturar un cliente.");
            return;
        }

        try {
            setGuardando(true);

            const contadorRef = ref(db, "contadores/folios_compra");
            const resultado = await runTransaction(contadorRef, (valorActual) => {
                return (Number(valorActual) || 0) + 1;
            });

            const numeroConsecutivo = Number(resultado.snapshot.val()) || 1;
            const folioFinal = `FC-${String(numeroConsecutivo).padStart(3, "0")}`;
            const keyVenta = `fc${String(numeroConsecutivo).padStart(5, "0")}`;

            const itemsObj = items.reduce((acc, item, index) => {
                const key = `item_${index + 1}`;
                acc[key] = {
                    partida: `${folioFinal}.${index + 1}`,
                    origen: item.origen,
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    total: item.total,
                    cantidad: item.cantidad ?? null,
                    precioUnitario: item.precioUnitario ?? null,
                    productoId: item.productoId ?? null,
                    categoria: item.categoria ?? null,
                    datos: item.datos ?? null,
                };
                return acc;
            }, {} as Record<string, any>);

            const payload = {
                folio: folioFinal,
                fecha,
                clienteId: cliente?.id && cliente.id !== "TEMP" ? cliente.id : null,
                clienteSnapshot: cliente,
                asesorId: asesor?.id || null,
                asesorSnapshot: asesor
                    ? {
                        id: asesor.id || null,
                        uid: asesor.uid || null,
                        nombre: asesor.nombre || "",
                        username: asesor.username || "",
                        area: asesor.area || "",
                        puesto: asesor.puesto || "",
                    }
                    : null,
                subtotal,
                iva,
                usarDescuento,
                tipoDescuento: usarDescuento ? tipoDescuento : "",
                descuentoPorcentaje: porcentajeDescuento,
                descuentoMonto: montoDescuento,
                total: totalPagar,
                items: itemsObj,
            };

            await set(ref(db, `tienda_ventas/${keyVenta}`), payload);

            alert(`Venta guardada correctamente: ${folioFinal}`);

            setItems([]);
            setCliente(null);
            setBuscar("");
            setClientes([]);
            setTabPrincipal("servicios");
            setServicioActivo("tubular");
            setItemServicioEditando(null);
            setFormDirty(false);

            setProductoSeleccionado(null);
            setBusquedaProducto("");
            setCantidadProducto(1);
            setPrecioProducto(0);

            setUsarDescuento(false);
            setTipoDescuento("manual");
            setDescuentoManual(0);

            const siguiente = numeroConsecutivo + 1;
            setFolio(`FC-${String(siguiente).padStart(3, "0")}`);
        } catch (error) {
            console.error("Error al guardar venta de tienda:", error);
            alert("Error al guardar la venta.");
        } finally {
            setGuardando(false);
        }
    };

    const borrarTicket = () => {
        const confirmar = window.confirm("¿Seguro que deseas borrar todo el ticket?");
        if (!confirmar) return;

        setItems([]);
        setItemServicioEditando(null);
        setFormDirty(false);

        setProductoSeleccionado(null);
        setBusquedaProducto("");
        setCantidadProducto(1);
        setPrecioProducto(0);

        setUsarDescuento(false);
        setTipoDescuento("manual");
        setDescuentoManual(0);
    };
    const dataServicioEditando: ItemServicio | undefined =
        itemServicioEditando && itemServicioEditando.origen === "servicio"
            ? {
                id: itemServicioEditando.id,
                tipo: itemServicioEditando.tipo,
                descripcion: itemServicioEditando.descripcion,
                total: itemServicioEditando.total,
                datos: itemServicioEditando.datos ?? {},
                partida: itemServicioEditando.partida,
            }
            : undefined;

    // -------------------- RENDER --------------------
    return (
        <div className="tienda-layout" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            {/* IZQUIERDA */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="encabezado-cotizador" style={{ marginBottom: 20 }}>
                    <div className="encabezado-item">
                        <b>Folio de compra: </b>
                        <span>{folio}</span>
                    </div>

                    <div className="encabezado-item encabezado-centro">
                        <b>Fecha: </b>
                        <span>{fecha}</span>
                    </div>

                    <div className="encabezado-item encabezado-factura">
                        <b>Tipo: </b>
                        <span>Tienda</span>
                    </div>
                </div>

                <h2>Clientes</h2>

                {!cliente && (
                    <div className="search-bar">
                        <input
                            className="search-input"
                            placeholder="Buscar nombre, razón social o RFC"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            style={{ flex: 1 }}
                        />

                        <button
                            onClick={() =>
                                setCliente({
                                    id: "TEMP",
                                    nombre: "",
                                    razonSocial: "",
                                    rfc: "",
                                    telefono: "",
                                    email: "",
                                    direccion: "",
                                    numeroExterior: "",
                                    numeroInterior: "",
                                    colonia: "",
                                    municipio: "",
                                    estado: "",
                                    cp: "",
                                    descuento: 0,
                                })
                            }
                        >
                            Cliente temporal
                        </button>
                    </div>
                )}

                {!cliente && buscar.trim() !== "" && clientes.length > 0 && (
                    <div className="clientes-resultados-scroll">
                        <table className="caja-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Razón Social</th>
                                    <th>RFC</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.nombre || "--"}</td>
                                        <td>{c.razonSocial || "--"}</td>
                                        <td>{c.rfc || "--"}</td>
                                        <td>
                                            <button
                                                onClick={() => {
                                                    setCliente(c);
                                                    setClientes([]);
                                                    setBuscar("");
                                                }}
                                            >
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!cliente && buscar.trim() !== "" && clientes.length === 0 && (
                    <div style={{ marginTop: 10 }}>No se encontraron clientes.</div>
                )}

                {cliente && (
                    <div
                        style={{
                            marginBottom: 20,
                            border: "1px solid #ccc",
                            borderRadius: 8,
                            padding: 15,
                            position: "relative",
                            background: "#f9f9f9",
                        }}
                    >
                        <button
                            onClick={() => {
                                setCliente(null);
                                setClientes([]);
                                setBuscar("");
                            }}
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "#ff4d4f",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: 25,
                                height: 25,
                                cursor: "pointer",
                                fontSize: 12,
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {esClienteTemporal ? (
                                <>
                                    <div style={{ minWidth: 220 }}>
                                        <b>Nombre:</b>
                                        <input
                                            type="text"
                                            value={cliente.nombre || ""}
                                            onChange={(e) =>
                                                setCliente((prev) =>
                                                    prev ? { ...prev, nombre: e.target.value } : prev
                                                )
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <div style={{ minWidth: 220 }}>
                                        <b>Razón social:</b>
                                        <input
                                            type="text"
                                            value={cliente.razonSocial || ""}
                                            onChange={(e) =>
                                                setCliente((prev) =>
                                                    prev ? { ...prev, razonSocial: e.target.value } : prev
                                                )
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <div style={{ minWidth: 220 }}>
                                        <b>Teléfono:</b>
                                        <input
                                            type="text"
                                            value={cliente.telefono || ""}
                                            onChange={(e) =>
                                                setCliente((prev) =>
                                                    prev ? { ...prev, telefono: e.target.value } : prev
                                                )
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <div style={{ minWidth: 220 }}>
                                        <b>RFC:</b>
                                        <input
                                            type="text"
                                            value={cliente.rfc || ""}
                                            onChange={(e) =>
                                                setCliente((prev) =>
                                                    prev ? { ...prev, rfc: e.target.value } : prev
                                                )
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>

                                    <div style={{ minWidth: 220 }}>
                                        <b>Email:</b>
                                        <input
                                            type="text"
                                            value={cliente.email || ""}
                                            onChange={(e) =>
                                                setCliente((prev) =>
                                                    prev ? { ...prev, email: e.target.value } : prev
                                                )
                                            }
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <b>Nombre:</b> {cliente.nombre || cliente.razonSocial || "SIN NOMBRE"}
                                    </div>
                                    <div>
                                        <b>Teléfono:</b> {cliente.telefono || "--"}
                                    </div>
                                    <div>
                                        <b>Descuento:</b>{" "}
                                        {cliente.descuento
                                            ? `${(cliente.descuento * 100).toFixed(0)}%`
                                            : "0%"}
                                    </div>
                                    <div>
                                        <b>Crédito:</b> {cliente.credito?.activo ? "ACTIVO" : "NO"}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* TABS PRINCIPALES */}
                <div className="cotizador-tabs" style={{ marginBottom: 12 }}>
                    <div
                        className={`cotizador-tab ${tabPrincipal === "servicios" ? "active" : ""}`}
                        onClick={() => setTabPrincipal("servicios")}
                    >
                        Servicios
                    </div>

                    <div
                        className={`cotizador-tab ${tabPrincipal === "articulos" ? "active" : ""}`}
                        onClick={() => setTabPrincipal("articulos")}
                    >
                        Artículos
                    </div>
                </div>

                {/* ÁREA SERVICIOS */}
                {tabPrincipal === "servicios" && (
                    <>
                        <div className="cotizador-tabs" style={{ marginBottom: 16 }}>
                            <div
                                className={`cotizador-tab ${servicioActivo === "tubular" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("tubular")}
                            >
                                Tubular
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "banda" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("banda")}
                            >
                                Banda
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "CartuchoB" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("CartuchoB")}
                            >
                                Cartucho Baja
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "CartuchoA" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("CartuchoA")}
                            >
                                Cartucho Alta
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "Resorte" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("Resorte")}
                            >
                                Resorte
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "termopar" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("termopar")}
                            >
                                Termopar
                            </div>

                            <div
                                className={`cotizador-tab ${servicioActivo === "cuarzo" ? "active" : ""}`}
                                onClick={() => cambiarServicioActivo("cuarzo")}
                            >
                                Cuarzo
                            </div>
                        </div>

                        {servicioActivo === "tubular" && (
                            <Tubular
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                                perfil={asesor || undefined}
                            />
                        )}

                        {servicioActivo === "banda" && (
                            <Banda
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                            />
                        )}

                        {servicioActivo === "CartuchoB" && (
                            <CartuchoBaja
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                                perfil={asesor || undefined}
                            />
                        )}

                        {servicioActivo === "CartuchoA" && (
                            <CartuchoAlta
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                                perfil={asesor || undefined}
                            />
                        )}

                        {servicioActivo === "Resorte" && (
                            <Resorte
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                                perfil={asesor || undefined}
                            />
                        )}

                        {servicioActivo === "termopar" && (
                            <Termopar
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                                perfil={asesor || undefined}
                            />
                        )}

                        {servicioActivo === "cuarzo" && (
                            <Cuarzo
                                data={dataServicioEditando}
                                onGuardar={guardarServicio}
                                setDirty={setFormDirty}
                            />
                        )}
                    </>
                )}

                {/* ÁREA ARTÍCULOS */}
                {tabPrincipal === "articulos" && (
                    <div>
                        <h2>Buscador de productos</h2>

                        {!productoSeleccionado && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    value={busquedaProducto}
                                    onChange={(e) => setBusquedaProducto(e.target.value)}
                                    className="tienda-input"
                                    style={{ width: "100%", marginBottom: 10 }}
                                />

                                {busquedaProducto.trim() && (
                                    <div
                                        className="resultados-busqueda"
                                        style={{
                                            maxHeight: 320,
                                            overflowY: "auto",
                                            border: "1px solid #ddd",
                                            borderRadius: 8,
                                            padding: 8,
                                            background: "#fff",
                                        }}
                                    >
                                        {productosFiltrados.length > 0 ? (
                                            productosFiltrados.map((producto) => (
                                                <div
                                                    key={producto.id}
                                                    className="resultado-item"
                                                    onClick={() => seleccionarProducto(producto)}
                                                    style={{
                                                        padding: 10,
                                                        borderBottom: "1px solid #eee",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <strong>{producto.Producto || "Sin nombre"}</strong>
                                                    <br />
                                                    <span>
                                                        Precio:{" "}
                                                        {formatearMoneda(
                                                            Number(producto["Precio base"]) || 0
                                                        )}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No se encontraron productos.</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {productoSeleccionado && (
                            <div
                                className="producto-seleccionado"
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                    padding: 15,
                                    background: "#fff",
                                }}
                            >
                                <p>
                                    <strong>Descripción:</strong> {productoSeleccionado.Producto}
                                </p>

                                <div
                                    className="fila-captura"
                                    style={{
                                        display: "flex",
                                        gap: 12,
                                        alignItems: "flex-end",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div>
                                        <label>Cantidad</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={cantidadProducto}
                                            onChange={(e) =>
                                                setCantidadProducto(Number(e.target.value))
                                            }
                                            className="tienda-input"
                                        />
                                    </div>

                                    <div>
                                        <label>Precio</label>
                                        <p>{formatearMoneda(precioProducto)}</p>
                                    </div>

                                    <div>
                                        <label>Subtotal</label>
                                        <p>{formatearMoneda(cantidadProducto * precioProducto)}</p>
                                    </div>

                                    <div className="boton-agregar-wrap">
                                        <button onClick={agregarProductoATicket} className="btn-agregar">
                                            Agregar
                                        </button>
                                    </div>

                                    <div>
                                        <button
                                            onClick={() => {
                                                setProductoSeleccionado(null);
                                                setBusquedaProducto("");
                                                setCantidadProducto(1);
                                                setPrecioProducto(0);
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* DERECHA / TICKET */}
            <div
                className="tienda-ticket"
                style={{
                    width: 360,
                    minWidth: 360,
                    border: "1px solid #000",
                    borderRadius: 8,
                    padding: 16,
                    background: "#fff",
                    position: "sticky",
                    top: 16,
                    maxHeight: "calc(100vh - 32px)",
                    overflowY: "auto",
                }}
            >
                <h2 style={{ marginTop: 0 }}>Ticket simple</h2>
                <p><strong>Folio:</strong> {folio}</p>
                <p><strong>Fecha:</strong> {fecha}</p>

                {cliente && (
                    <div style={{ marginBottom: 12 }}>
                        <strong>Cliente:</strong>{" "}
                        {cliente.nombre || cliente.razonSocial || "Cliente temporal"}
                    </div>
                )}

                <hr />

                <h3>Servicios</h3>
                {itemsServicios.length === 0 ? (
                    <p>No hay servicios agregados.</p>
                ) : (
                    itemsServicios.map((item) => (
                        <div key={item.id} style={{ marginBottom: 12 }}>
                            <div>
                                <b>{item.partida}</b>
                            </div>
                            <div style={{ whiteSpace: "pre-line" }}>{item.descripcion}</div>
                            <div>
                                <b>{formatearMoneda(item.total)}</b>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                <button onClick={() => editarServicio(item)}>Editar</button>
                                <button
                                    onClick={() => eliminarItem(item.id)}
                                    style={{
                                        background: "red",
                                        color: "#fff",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))
                )}

                <hr />

                <h3>Artículos</h3>
                {itemsArticulos.length === 0 ? (
                    <p>No hay artículos agregados.</p>
                ) : (
                    itemsArticulos.map((item) => (
                        <div key={item.id} style={{ marginBottom: 12 }}>
                            <div>
                                <b>{item.partida}</b>
                            </div>
                            <div>{item.descripcion}</div>
                            <div>Cantidad: {item.cantidad || 0}</div>
                            <div>Precio: {formatearMoneda(item.precioUnitario || 0)}</div>
                            <div>
                                <b>{formatearMoneda(item.total)}</b>
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <button
                                    onClick={() => eliminarItem(item.id)}
                                    style={{
                                        background: "red",
                                        color: "#fff",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))
                )}

                <hr />

                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                            type="checkbox"
                            checked={usarDescuento}
                            onChange={(e) => setUsarDescuento(e.target.checked)}
                        />
                        Descuento
                    </label>

                    {usarDescuento && (
                        <div style={{ marginTop: 10 }}>
                            <select
                                value={tipoDescuento}
                                onChange={(e) =>
                                    setTipoDescuento(e.target.value as "manual" | "cliente")
                                }
                                className="tienda-input"
                                style={{ width: "100%", marginBottom: 8 }}
                            >
                                <option value="manual">Manual</option>
                                <option value="cliente">Cliente</option>
                            </select>

                            {tipoDescuento === "manual" ? (
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={descuentoManual}
                                    onChange={(e) => setDescuentoManual(Number(e.target.value))}
                                    placeholder="Porcentaje"
                                    className="tienda-input"
                                    style={{ width: "100%" }}
                                />
                            ) : (
                                <div>
                                    Descuento del cliente:{" "}
                                    <strong>{(descuentoCliente * 100).toFixed(0)}%</strong>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div><strong>Subtotal:</strong> {formatearMoneda(subtotal)}</div>
                <div><strong>IVA:</strong> {formatearMoneda(iva)}</div>
                <div><strong>Descuento:</strong> {formatearMoneda(montoDescuento)}</div>

                <div style={{ marginTop: 10, fontSize: 18 }}>
                    <strong>Total a pagar:</strong> {formatearMoneda(totalPagar)}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
                    <button onClick={finalizarTienda} disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>

                    <button onClick={borrarTicket}>Borrar</button>
                </div>
            </div>
        </div>
    );
};

export default Tienda;