import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import { get, ref } from "firebase/database";
import { formatearMoneda } from "../funciones/formato_moneda";

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

interface ItemCompra {
    id: string;
    productoId: string;
    descripcion: string;
    cantidad: number;
    precio: number;
    subtotal: number;
}



const TiendaProductos: React.FC = () => {
    const [busqueda, setBusqueda] = useState("");
    const [productos, setProductos] = useState<ProductoFirebase[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoFirebase | null>(null);

    const [cantidad, setCantidad] = useState<number>(1);
    const [precioEditable, setPrecioEditable] = useState<number>(0);

    const [listaCompras, setListaCompras] = useState<ItemCompra[]>([]);

    const [usarDescuento, setUsarDescuento] = useState(false);
    const [tipoDescuento, setTipoDescuento] = useState<"manual" | "cliente">("manual");
    const [descuentoManual, setDescuentoManual] = useState<number>(0);
    const [descuentoCliente, setDescuentoCliente] = useState<number>(0);

    useEffect(() => {
        const cargarProductos = async () => {
            try {
                const snapshot = await get(ref(db, "Productos"));

                if (snapshot.exists()) {
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
                }
            } catch (error) {
                console.error("Error cargando productos:", error);
            }
        };

        cargarProductos();
    }, []);

    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return [];
        return productos.filter((p) =>
            (p.Producto || "").toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [busqueda, productos]);

    const seleccionarProducto = (producto: ProductoFirebase) => {
        const precio = Number(producto["Precio base"] || 0);

        setProductoSeleccionado(producto);
        setCantidad(1);
        setPrecioEditable(precio);
        setBusqueda(producto.Producto || "");
    };

    const agregarProducto = () => {
        if (!productoSeleccionado) return;
        if (!cantidad || cantidad <= 0) return;

        const subtotal = cantidad * precioEditable;

        const nuevoItem: ItemCompra = {
            id: `${productoSeleccionado.id}-${Date.now()}`,
            productoId: productoSeleccionado.id,
            descripcion: productoSeleccionado.Producto || "Sin descripción",
            cantidad,
            precio: precioEditable,
            subtotal,
        };

        setListaCompras((prev) => [...prev, nuevoItem]);

        setProductoSeleccionado(null);
        setBusqueda("");
        setCantidad(1);
        setPrecioEditable(0);
    };

    const eliminarItem = (id: string) => {
        setListaCompras((prev) => prev.filter((item) => item.id !== id));
    };

    const subtotal = listaCompras.reduce((acc, item) => acc + item.subtotal, 0);
    const iva = subtotal * 0.16;

    const porcentajeDescuento = !usarDescuento
        ? 0
        : tipoDescuento === "manual"
            ? descuentoManual
            : descuentoCliente;

    const totalAntesDescuento = subtotal + iva;
    const montoDescuento = totalAntesDescuento * (porcentajeDescuento / 100);
    const totalPagar = totalAntesDescuento - montoDescuento;

    return (
        <div className="tienda-layout">
            {/* BUSCADOR */}
            <div className="tienda-top">
                <h2>Buscador</h2>

                {!productoSeleccionado && (
                    <>
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="tienda-input"
                        />

                        {busqueda.trim() && (
                            <div className="resultados-busqueda">
                                {productosFiltrados.length > 0 ? (
                                    productosFiltrados.map((producto) => (
                                        <div
                                            key={producto.id}
                                            className="resultado-item"
                                            onClick={() => seleccionarProducto(producto)}
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
                {/*Resultado para poner cantidad*/ }
                {productoSeleccionado && (
                    <div className="producto-seleccionado">
                        <p>
                            <strong>Descripción:</strong> {productoSeleccionado.Producto}
                        </p>

                        <div className="fila-captura">
                            <div>
                                <label>Cantidad</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={cantidad}
                                    onChange={(e) => setCantidad(Number(e.target.value))}
                                    className="tienda-input"
                                />
                            </div>

                            <div>
                                <label>Precio</label>
                                <p>{formatearMoneda(precioEditable)}</p>
                            </div>

                            <div className="boton-agregar-wrap">
                                <button onClick={agregarProducto} className="btn-agregar">
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* LISTA DE COMPRAS */}
            <div className="tienda-lista">
                <h2>Lista de compras</h2>

                <div className="lista-scroll">
                    {listaCompras.length === 0 ? (
                        <p>No hay productos agregados.</p>
                    ) : (
                        listaCompras.map((item) => (
                            <div key={item.id} className="compra-item">
                                <p><strong>Descripción:</strong> {item.descripcion}</p>
                                <p><strong>Cantidad:</strong> {item.cantidad}</p>
                                <p><strong>Precio:</strong> {formatearMoneda(item.precio)}</p>
                                <p><strong>Subtotal:</strong> {formatearMoneda(item.subtotal)}</p>

                                <button
                                    onClick={() => eliminarItem(item.id)}
                                    className="btn-eliminar"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* TICKET */}
            <div className="tienda-ticket">
                <h2>Ticket</h2>

                <p><strong>Subtotal:</strong> {formatearMoneda(subtotal)}</p>
                <p><strong>IVA:</strong> {formatearMoneda(iva)}</p>

                <div className="descuento-box">
                    <label className="check-descuento">
                        <input
                            type="checkbox"
                            checked={usarDescuento}
                            onChange={(e) => setUsarDescuento(e.target.checked)}
                        />
                        Aplicar descuento
                    </label>

                    {usarDescuento && (
                        <>
                            <select
                                value={tipoDescuento}
                                onChange={(e) =>
                                    setTipoDescuento(e.target.value as "manual" | "cliente")
                                }
                                className="tienda-input"
                            >
                                <option value="manual">Manual</option>
                                <option value="cliente">Del cliente</option>
                            </select>

                            {tipoDescuento === "manual" ? (
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={descuentoManual}
                                    onChange={(e) => setDescuentoManual(Number(e.target.value))}
                                    placeholder="Porcentaje de descuento"
                                    className="tienda-input"
                                />
                            ) : (
                                <div>
                                    <p>
                                        Descuento del cliente: <strong>{descuentoCliente}%</strong>
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <p><strong>Descuento:</strong> {formatearMoneda(montoDescuento)}</p>
                <p className="total-final">
                    <strong>Total a pagar:</strong> {formatearMoneda(totalPagar)}
                </p>
            </div>
        </div>
    );
};

export default TiendaProductos;