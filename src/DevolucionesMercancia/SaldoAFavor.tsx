// src/DevolucionesMercancia/SaldoAFavor.tsx
//este archivo contiene el componente para capturar productos y detalles de un saldo a favor. Se puede seleccionar el origen del producto (tienda, taller u otro), buscar productos en la tienda o capturar manualmente. También se puede buscar partidas de una OT y agregarlas al saldo a favor. Al guardar, se genera un folio único y se almacena en Firebase Realtime Database.

import React, { useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import type { ProductoDevolucionMercancia  } from "./CrearDevolucion";

type Props = {
    productos: ProductoDevolucionMercancia[];
    setProductos: React.Dispatch<React.SetStateAction<ProductoDevolucionMercancia[]>>;
    motivo: string;
    setMotivo: React.Dispatch<React.SetStateAction<string>>;
    vigencia: string;
    setVigencia: React.Dispatch<React.SetStateAction<string>>;
    importe: number;
};

type OrigenProducto = "tienda" | "taller" | "otro";

type PartidaOT = {
    id: string;
    descripcion: string;
    precio: number;
};

const SaldoAFavor: React.FC<Props> = ({
    productos,
    setProductos,
    motivo,
    setMotivo,
    vigencia,
    setVigencia,
    importe,
}) => {
    const [origen, setOrigen] = useState<OrigenProducto | "">("");

    const [descripcion, setDescripcion] = useState("");
    const [precio, setPrecio] = useState(0);
    const [cantidad, setCantidad] = useState(1);

    const [busquedaProducto, setBusquedaProducto] = useState("");
    const [resultadosTienda, setResultadosTienda] = useState<any[]>([]);

    const [otBuscar, setOtBuscar] = useState("");
    const [modalOT, setModalOT] = useState(false);
    const [partidasOT, setPartidasOT] = useState<PartidaOT[]>([]);
    const [partidasSeleccionadas, setPartidasSeleccionadas] = useState<string[]>([]);

    const seleccionarOrigen = (nuevoOrigen: OrigenProducto) => {
        setOrigen((prev) => (prev === nuevoOrigen ? "" : nuevoOrigen));
        setDescripcion("");
        setPrecio(0);
        setCantidad(1);
        setBusquedaProducto("");
        setResultadosTienda([]);
        setOtBuscar("");
    };

    const buscarProductosTienda = async () => {
        if (!busquedaProducto.trim()) {
            alert("Escribe algo para buscar.");
            return;
        }

        const snap = await get(ref(db, "Productos"));

        if (!snap.exists()) {
            alert("No se encontraron productos en Firebase.");
            return;
        }

        const data = snap.val();

        const lista = Object.keys(data).map((id) => ({
            id,
            ...data[id],
        }));

        const texto = busquedaProducto.toLowerCase().trim();

        const filtrados = lista.filter((p: any) => {
            const producto = String(p.Producto || "").toLowerCase();
            const categoria = String(p.Categoria || "").toLowerCase();

            return (
                producto.includes(texto) ||
                categoria.includes(texto)
            );
        });

        setResultadosTienda(filtrados);
    };

    const seleccionarProductoTienda = (producto: any) => {
    setDescripcion(producto.Producto || "");
    setPrecio(
        Number(
            producto.PrecioNeto ||
            producto["Precio neto"] ||
            producto["Precio base"] ||
            0
        )
    );

    setResultadosTienda([]);
    setBusquedaProducto(producto.Producto || "");
};

    const buscarOT = async () => {
        if (!otBuscar.trim()) {
            alert("Escribe el número de OT.");
            return;
        }

        const numero = otBuscar.replace(/\D/g, "").padStart(5, "0");
        const claveOT = `ot${numero}`;

        const snap = await get(ref(db, `ordenes_trabajo/${claveOT}`));

        if (!snap.exists()) {
            alert("No se encontró la OT.");
            return;
        }

        const data = snap.val();
        const trabajos = data.trabajos || {};

        const partidas: PartidaOT[] = Object.keys(trabajos).map((key) => ({
            id: key,
            descripcion: trabajos[key].descripcion || "Sin descripción",
            precio: Number(trabajos[key].total || 0),
        }));

        setPartidasOT(partidas);
        setPartidasSeleccionadas([]);
        setModalOT(true);
    };

    const aceptarPartidasOT = () => {
        const seleccionadas = partidasOT.filter((p) =>
            partidasSeleccionadas.includes(p.id)
        );

        if (seleccionadas.length === 0) {
            alert("Selecciona al menos una partida.");
            return;
        }

        const nuevosProductos: ProductoDevolucionMercancia[] = seleccionadas.map((p) => ({
            id: `${Date.now()}_${p.id}`,
            origen: "taller",
            descripcion: p.descripcion,
            precio: p.precio,
            cantidad: 1,
        }));

        setProductos((prev) => [...prev, ...nuevosProductos]);

        setModalOT(false);
        setPartidasOT([]);
        setPartidasSeleccionadas([]);
        setOtBuscar("");
    };

    const agregarProducto = () => {
        if (!origen) {
            alert("Selecciona Tienda, Taller u Otro.");
            return;
        }

        if (origen === "taller") {
            buscarOT();
            return;
        }

        if (!descripcion.trim()) {
            alert("Escribe la descripción del producto.");
            return;
        }

        if (precio <= 0) {
            alert("El precio debe ser mayor a 0.");
            return;
        }

        if (cantidad <= 0) {
            alert("La cantidad debe ser mayor a 0.");
            return;
        }

        const nuevoProducto: ProductoDevolucionMercancia = {
            id: Date.now().toString(),
            origen,
            descripcion,
            precio,
            cantidad,
        };

        setProductos((prev) => [...prev, nuevoProducto]);

        setDescripcion("");
        setPrecio(0);
        setCantidad(1);
        setBusquedaProducto("");
        setResultadosTienda([]);
    };

    const eliminarProducto = (id: string) => {
        setProductos((prev) => prev.filter((p) => p.id !== id));
    };

    return (
        <div className="saldo-favor-form">
            <h3>💳 Saldo a Favor</h3>

            <div className="saldo-productos-box">
                <h4>Productos</h4>

                <div className="saldo-origenes">
                    <label>
                        <input
                            type="checkbox"
                            checked={origen === "tienda"}
                            onChange={() => seleccionarOrigen("tienda")}
                        />
                        Tienda
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={origen === "taller"}
                            onChange={() => seleccionarOrigen("taller")}
                        />
                        Taller
                    </label>

                    <label>
                        <input
                            type="checkbox"
                            checked={origen === "otro"}
                            onChange={() => seleccionarOrigen("otro")}
                        />
                        Otro
                    </label>
                </div>

                {origen === "tienda" && (
                    <div className="saldo-producto-captura">
                        <input
                            type="text"
                            placeholder="Buscar producto de tienda"
                            value={busquedaProducto}
                            onChange={(e) => setBusquedaProducto(e.target.value)}
                        />

                        <button type="button" onClick={buscarProductosTienda}>
                            Buscar
                        </button>

                        {resultadosTienda.length > 0 && (
                            <div className="saldo-resultados">
                                {resultadosTienda.map((p) => (
                                    <button
                                        type="button"
                                        key={p.id}
                                        onClick={() => seleccionarProductoTienda(p)}
                                    >
                                        {p.Producto || "Sin nombre"} - $
                                        {Number(
                                            p.PrecioNeto ||
                                            p["Precio neto"] ||
                                            p["Precio base"] ||
                                            0
                                        ).toFixed(2)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {origen === "taller" && (
                    <div className="saldo-producto-captura">
                        <input
                            type="text"
                            placeholder="Número de OT"
                            value={otBuscar}
                            onChange={(e) => setOtBuscar(e.target.value)}
                        />

                        <button type="button" onClick={buscarOT}>
                            Buscar OT
                        </button>
                    </div>
                )}

                {(origen === "tienda" || origen === "otro") && (
                    <div className="saldo-producto-grid">
                        <input
                            type="text"
                            placeholder="Descripción"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                        />

                        <input
                            type="number"
                            min={0}
                            placeholder="Precio"
                            value={precio === 0 ? "" : precio}
                            onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) =>
                                setPrecio(Math.max(0, Number(e.target.value)))
                            }
                        />

                        <input
                            type="number"
                            min={1}
                            placeholder="Cantidad"
                            value={cantidad === 0 ? "" : cantidad}
                            onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) =>
                                setCantidad(Math.max(1, Number(e.target.value)))
                            }
                        />

                        <button type="button" onClick={agregarProducto}>
                            +
                        </button>
                    </div>
                )}
            </div>

            {productos.length > 0 && (
                <div className="saldo-lista-productos">
                    <h4>Productos agregados</h4>

                    <table className="devolucion-table">
                        <thead>
                            <tr>
                                <th>Origen</th>
                                <th>Descripción</th>
                                <th>Precio</th>
                                <th>Cantidad</th>
                                <th>Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>

                        <tbody>
                            {productos.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.origen}</td>
                                    <td>{p.descripcion}</td>
                                    <td>${p.precio.toFixed(2)}</td>
                                    <td>{p.cantidad}</td>
                                    <td>${(p.precio * p.cantidad).toFixed(2)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => eliminarProducto(p.id)}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="form-row">
                <label>Motivo de la devolución</label>
                <textarea
                    rows={4}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo..."
                />
            </div>

            <div className="form-row">
                <label>Importe del vale</label>
                <input
                    type="text"
                    value={`$ ${importe.toFixed(2)}`}
                    disabled
                />
            </div>

            <div className="form-row">
                <label>Vigencia</label>
                <input
                    type="date"
                    value={vigencia}
                    onChange={(e) => setVigencia(e.target.value)}
                />
            </div>

            {modalOT && (
                <div className="saldo-modal-fondo">
                    <div className="saldo-modal">
                        <h3>Seleccionar partidas de OT</h3>

                        {partidasOT.map((p) => (
                            <label key={p.id} className="saldo-modal-partida">
                                <input
                                    type="checkbox"
                                    checked={partidasSeleccionadas.includes(p.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setPartidasSeleccionadas((prev) => [
                                                ...prev,
                                                p.id,
                                            ]);
                                        } else {
                                            setPartidasSeleccionadas((prev) =>
                                                prev.filter((id) => id !== p.id)
                                            );
                                        }
                                    }}
                                />
                                {p.descripcion} - ${p.precio.toFixed(2)}
                            </label>
                        ))}

                        <div className="btn-container">
                            <button
                                type="button"
                                className="btn btn-blue"
                                onClick={aceptarPartidasOT}
                            >
                                Aceptar
                            </button>

                            <button
                                type="button"
                                className="btn btn-red"
                                onClick={() => setModalOT(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaldoAFavor;