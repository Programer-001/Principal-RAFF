// src/DevolucionesMercancia/CrearDevolucion.tsx
//este archivo contiene el componente para crear un documento de devolución de mercancía, saldo a favor o garantía. Se puede seleccionar un cliente existente o capturar uno temporal. Se puede buscar clientes por nombre, razón social o RFC. Al guardar, se genera un folio único y se almacena en Firebase Realtime Database.
import React, { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { obtenerFechaLocal } from "../funciones/formato_fechas";

import SaldoAFavor from "./SaldoAFavor";
import Devolucion from "./Devolucion";
import Garantia from "./Garantia";

import "../css/DevolucionMercancia.css";

type TipoFormulario = "devolucion" | "saldo" | "garantia";

type Cliente = {
    id?: string;
    nombre?: string;
    razonSocial?: string;
    rfc?: string;
    busqueda?: string;
};

export type ProductoDevolucionMercancia = {
    id: string;
    origen: "tienda" | "taller" | "otro";
    descripcion: string;
    precio: number;
    cantidad: number;
};

const CrearDevolucion: React.FC = () => {
    const [tipo, setTipo] = useState<TipoFormulario>("saldo");

    const [fecha, setFecha] = useState(obtenerFechaLocal());
    const [folio, setFolio] = useState<string>("SIN ASIGNAR");

    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [buscar, setBuscar] = useState("");
    const [clientes, setClientes] = useState<Cliente[]>([]);

    // SALDO A FAVOR
    const [productosSaldo, setProductosSaldo] = useState<ProductoDevolucionMercancia[]>([]);
    const [motivoSaldo, setMotivoSaldo] = useState("");
    const [vigenciaSaldo, setVigenciaSaldo] = useState("");

    const importeSaldo = productosSaldo.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0
    );

    // DEVOLUCIÓN
    const [productosDevolucion, setProductosDevolucion] = useState<ProductoDevolucionMercancia[]>([]);
    const [motivoDevolucion, setMotivoDevolucion] = useState("");
    const [metodoPagoDevolucion, setMetodoPagoDevolucion] = useState("");
    const [fechaPagoDevolucion, setFechaPagoDevolucion] = useState("");

    const importeDevolucion = productosDevolucion.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0
    );

    const cargarFolio = async () => {
        const snap = await get(ref(db, "contadores/devolucion_mercancia"));
        const actual = snap.exists() ? Number(snap.val()) : 0;
        setFolio(String(actual + 1));
    };

    useEffect(() => {
        cargarFolio();
    }, []);

    const buscarClientes = async (texto: string) => {
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
            busqueda:
                data[id].busqueda ||
                `${data[id].nombre || ""} ${data[id].razonSocial || ""} ${data[id].rfc || ""}`.toUpperCase(),
        }));

        const textoBusqueda = texto.toLowerCase().trim();

        const filtrados = lista.filter((c) => {
            const nombre = (c.nombre || "").toLowerCase();
            const razon = (c.razonSocial || "").toLowerCase();
            const rfc = (c.rfc || "").toLowerCase();
            const busqueda = (c.busqueda || "").toLowerCase();

            return (
                nombre.includes(textoBusqueda) ||
                razon.includes(textoBusqueda) ||
                rfc.includes(textoBusqueda) ||
                busqueda.includes(textoBusqueda)
            );
        });

        setClientes(filtrados);
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

    const obtenerNombreCliente = () => {
        return cliente?.nombre || cliente?.razonSocial || "";
    };

    const guardar = () => {
        if (!cliente) {
            alert("Debes seleccionar o capturar un cliente.");
            return;
        }

        if (!obtenerNombreCliente().trim()) {
            alert("Escribe el nombre del cliente.");
            return;
        }

        if (tipo === "saldo") {
            if (productosSaldo.length === 0) {
                alert("Agrega al menos un producto al saldo a favor.");
                return;
            }

            if (!motivoSaldo.trim()) {
                alert("Escribe el motivo de la devolución.");
                return;
            }

            if (importeSaldo <= 0) {
                alert("El importe del saldo a favor debe ser mayor a 0.");
                return;
            }

            const datosSaldoFavor = {
                productos: productosSaldo,
                motivo: motivoSaldo,
                importe: importeSaldo,
                vigencia: vigenciaSaldo,
            };

            console.log("Saldo a favor:", datosSaldoFavor);
        }

        if (tipo === "devolucion") {
            if (productosDevolucion.length === 0) {
                alert("Agrega al menos un producto a la devolución.");
                return;
            }

            if (!motivoDevolucion.trim()) {
                alert("Escribe el motivo de la devolución.");
                return;
            }

            if (importeDevolucion <= 0) {
                alert("El importe de devolución debe ser mayor a 0.");
                return;
            }

            if (!metodoPagoDevolucion.trim()) {
                alert("Selecciona el método de pago.");
                return;
            }

            if (!fechaPagoDevolucion) {
                alert("Selecciona la fecha de pago.");
                return;
            }

            const datosDevolucion = {
                productos: productosDevolucion,
                motivo: motivoDevolucion,
                importe: importeDevolucion,
                metodoPago: metodoPagoDevolucion,
                fechaPago: fechaPagoDevolucion,
            };

            console.log("Devolución:", datosDevolucion);
        }

        alert("Guardar pendiente de conectar con Firebase.");
    };

    const imprimir = () => {
        // Pendiente: aquí irá la plantilla PDF
    };

    return (
        <div className="devolucion-crear">
            <h2>Crear documento</h2>

            <div className="devolucion-encabezado">
                <div>
                    <b>Folio:</b> {folio}
                </div>

                <div>
                    <b>Fecha:</b>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                    />
                </div>
            </div>

            <h2>Cliente</h2>

            {!cliente && (
                <div className="devolucion-search-bar">
                    <input
                        className="devolucion-search-input"
                        placeholder="Buscar nombre del cliente"
                        value={buscar}
                        onChange={(e) => setBuscar(e.target.value)}
                    />

                    <button
                        type="button"
                        onClick={() =>
                            setCliente({
                                id: "TEMP",
                                nombre: "",
                            })
                        }
                    >
                        Cliente temporal
                    </button>
                </div>
            )}

            {!cliente && buscar.trim() !== "" && clientes.length > 0 && (
                <div className="devolucion-clientes-scroll">
                    <table className="devolucion-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Acción</th>
                            </tr>
                        </thead>

                        <tbody>
                            {clientes.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.nombre || c.razonSocial || "SIN NOMBRE"}</td>
                                    <td>
                                        <button
                                            type="button"
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
                <div className="devolucion-sin-resultados">
                    No se encontraron clientes.
                </div>
            )}

            {cliente && (
                <div className="devolucion-cliente-card">
                    <button
                        type="button"
                        className="devolucion-cliente-cerrar"
                        onClick={() => {
                            setCliente(null);
                            setClientes([]);
                            setBuscar("");
                        }}
                    >
                        ✕
                    </button>

                    {cliente.id === "TEMP" ? (
                        <div className="devolucion-cliente-grid">
                            <div>
                                <b>Nombre:</b>
                                <input
                                    value={cliente.nombre || ""}
                                    onChange={(e) =>
                                        setCliente((prev) =>
                                            prev ? { ...prev, nombre: e.target.value } : prev
                                        )
                                    }
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="devolucion-cliente-grid">
                            <div>
                                <b>Nombre:</b>{" "}
                                {cliente.nombre || cliente.razonSocial || "SIN NOMBRE"}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <h2>Tipo de documento</h2>

            <div className="devolucion-radio-group">
                <label className={`devolucion-radio-card ${tipo === "devolucion" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "devolucion"}
                        onChange={() => setTipo("devolucion")}
                    />
                    📦 Devoluciones
                </label>

                <label className={`devolucion-radio-card ${tipo === "saldo" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "saldo"}
                        onChange={() => setTipo("saldo")}
                    />
                    💳 Saldos a favor
                </label>

                <label className={`devolucion-radio-card ${tipo === "garantia" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "garantia"}
                        onChange={() => setTipo("garantia")}
                    />
                    🛡️ Garantías
                </label>
            </div>

            <div className="devolucion-formulario">
                {tipo === "saldo" && (
                    <SaldoAFavor
                        productos={productosSaldo}
                        setProductos={setProductosSaldo}
                        motivo={motivoSaldo}
                        setMotivo={setMotivoSaldo}
                        vigencia={vigenciaSaldo}
                        setVigencia={setVigenciaSaldo}
                        importe={importeSaldo}
                    />
                )}

                {tipo === "devolucion" && (
                    <Devolucion
                        productos={productosDevolucion}
                        setProductos={setProductosDevolucion}
                        motivo={motivoDevolucion}
                        setMotivo={setMotivoDevolucion}
                        metodoPago={metodoPagoDevolucion}
                        setMetodoPago={setMetodoPagoDevolucion}
                        fechaPago={fechaPagoDevolucion}
                        setFechaPago={setFechaPagoDevolucion}
                        importe={importeDevolucion}
                    />
                )}

                {tipo === "garantia" && <Garantia />}
            </div>

            <div className="btn-container">
                <button type="button" className="btn btn-blue" onClick={guardar}>
                    Guardar
                </button>

                <button type="button" className="btn btn-green" onClick={imprimir} disabled>
                    Imprimir
                </button>
            </div>
        </div>
    );
};

export default CrearDevolucion;