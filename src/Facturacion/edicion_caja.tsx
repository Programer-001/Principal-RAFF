// src/components/ModificarCaja.tsx
import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, update, remove } from "firebase/database";
import { app } from "../firebase/config";
//import "../css/caja.css";

interface Pago {
    id: string;
    transaccion: number;
    cantidad: number;
    metodo: string;
    factura: string;
    fecha: string;
    estatus: boolean;
    comentarios: string;
    fechaKey?: string;
}

const ModificarCaja: React.FC = () => {
    const db = getDatabase(app);

    const [pagos, setPagos] = useState<Pago[]>([]);
    const [pagosOriginales, setPagosOriginales] = useState<Pago[]>([]);
    const [busqueda, setBusqueda] = useState<string>("");

    const [mostrarTabla, setMostrarTabla] = useState(false);

    // Cancelación
    const [resultado, setResultado] = useState<Pago | null>(null);
    const [comentarioCancelacion, setComentarioCancelacion] = useState("");
    const [mostrarCancelacion, setMostrarCancelacion] = useState(false);

    // Paginación
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;
    const datosPaginados = pagos.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );
    const totalPages = Math.ceil(pagos.length / itemsPerPage);

    // Cargar toda la DB de corte-caja
    useEffect(() => {
        const pagosRef = ref(db, "corte-caja");
        onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const lista: Pago[] = [];
            Object.keys(data).forEach((diaKey) => {
                Object.keys(data[diaKey]).forEach((pagoKey) => {
                    lista.push({
                        id: pagoKey,
                        fechaKey: diaKey,
                        ...data[diaKey][pagoKey],
                    });
                });
            });

            setPagosOriginales(lista);
        });
    }, [db]);

    // 🔥 LIMPIAR TODO
    const limpiarTodo = () => {
        setResultado(null);
        setBusqueda("");
        setComentarioCancelacion("");
        setMostrarCancelacion(false);
        setMostrarTabla(false);
        setPagos([]);
        setPage(1);
    };

    // 🔍 Buscar factura (llamado por el Botón de Cancelar)
    const buscarParaCancelar = () => {
        if (!busqueda.trim()) {
            alert("⚠️ Primero escribe un número de factura.");
            return;
        }

        const encontrados = pagosOriginales.filter(
            (p) => p.factura.toLowerCase() === busqueda.toLowerCase()
        );

        if (encontrados.length === 0) {
            alert("❌ No se encontró la factura.");
            limpiarTodo();
            return;
        }

        const factura = encontrados[0];

        if (factura.estatus === false) {
            alert("⚠️ Esta factura ya está cancelada.");
            limpiarTodo();
            return;
        }

        // Mostrar información
        setResultado(factura);
        setPagos([factura]);
        setMostrarTabla(true);
        setPage(1);
        setMostrarCancelacion(true);
    };

    // Cancelar factura
    const cancelarFactura = async () => {
        if (!resultado) {
            alert("⚠️ No hay factura válida para cancelar.");
            return;
        }

        if (!comentarioCancelacion.trim()) {
            alert("⚠️ Escribe un comentario de cancelación.");
            return;
        }

        if (!confirm("❗¿Seguro que deseas CANCELAR esta factura?")) return;

        await update(ref(db, `corte-caja/${resultado.fechaKey}/${resultado.id}`), {
            estatus: false,
            comentarios: comentarioCancelacion,
        });

        alert("❌ Factura cancelada correctamente");
        limpiarTodo();
    };

    // Buscar normal (botón buscar)
    const buscarFactura = () => {
        if (busqueda.trim() === "") {
            alert("Ingresa un número de factura para buscar.");
            return;
        }

        const filtrados = pagosOriginales.filter((p) =>
            p.factura.toLowerCase().includes(busqueda.toLowerCase())
        );

        if (filtrados.length === 0) {
            alert("❌ No se encontró esa factura.");
            limpiarTodo();
            return;
        }

        setPagos(filtrados);
        setResultado(filtrados[0]);
        setMostrarTabla(true);
        setPage(1);
    };

    // Guardar
    const actualizarPago = (pago: Pago) => {
        if (!pago.fechaKey) {
            alert("No se puede actualizar un pago sin fechaKey");
            return;
        }

        update(ref(db, `corte-caja/${pago.fechaKey}/${pago.id}`), pago)
            .then(() => alert("Pago actualizado ✔"))
            .catch(console.error);
    };

    // Eliminar
    const eliminarPago = (pago: Pago) => {
        if (!window.confirm("⚠️ ¿Eliminar este pago?")) return;

        remove(ref(db, `corte-caja/${pago.fechaKey}/${pago.id}`))
            .then(() => {
                setPagos((prev) => prev.filter((p) => p.id !== pago.id));
                alert("Pago eliminado ❌");
            })
            .catch(console.error);
    };

    const handleChange = (
        id: string,
        campo: keyof Pago,
        valor: string | number | boolean
    ) => {
        setPagos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
        );
    };

    return (
        <div>
            <h2 className="caja-title">🛠 Modificar Pagos</h2>

            {/* BUSCADOR */}
            <div className="caja-container">
                <input
                    className="input-caja1"
                    type="number"
                    placeholder="Buscar factura..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />

                <div className="btn-container">
                    <button className="btn btn-green" onClick={buscarFactura}>
                        Buscar
                    </button>

                    {/* Borrar */}
                    <button className="btn btn-red" onClick={limpiarTodo}>
                        Borrar
                    </button>

                    {/* Mostrar Todo */}
                    <button
                        className="btn btn-blue"
                        onClick={() => {
                            if (!mostrarTabla) {
                                setPagos(pagosOriginales);
                                setPage(1);
                                setMostrarTabla(true);
                            } else {
                                setMostrarTabla(false);
                            }
                        }}
                    >
                        {mostrarTabla ? "Ocultar Tabla" : "Mostrar Todo"}
                    </button>

                    {/* CANCELAR FACTURA */}
                    <button className="btn btn-red" onClick={buscarParaCancelar}>
                        Cancelar Factura
                    </button>
                </div>
            </div>

            {/* FORMULARIO CANCELACIÓN */}
            {mostrarCancelacion && resultado && (
                <div className="caja-bloque">
                    <h3>Cancelar factura: {resultado.factura}</h3>

                    <label>Motivo de cancelación:</label>
                    <input
                        type="text"
                        value={comentarioCancelacion}
                        onChange={(e) => setComentarioCancelacion(e.target.value)}
                        placeholder="Ej: Cliente devolvió la pieza"
                    />

                    <button className="btn btn-red" onClick={cancelarFactura}>
                        Confirmar Cancelación
                    </button>
                </div>
            )}

            {/* TABLA */}
            {mostrarTabla && (
                <div className="caja-scroll">
                    <table className="caja-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Transacción</th>
                                <th>Método</th>
                                <th>Cantidad</th>
                                <th>Factura</th>
                                <th>Estatus</th>
                                <th>Comentarios</th>
                                <th>Guardar</th>
                                <th>Eliminar</th>
                            </tr>
                        </thead>

                        <tbody>
                            {datosPaginados.map((p) => (
                                <tr key={p.id} className="border-t text-center">
                                    <td>
                                        <input
                                            type="date"
                                            value={
                                                p.fecha
                                                    ? new Date(p.fecha.split("/").reverse().join("-"))
                                                        .toISOString()
                                                        .substring(0, 10)
                                                    : ""
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    p.id,
                                                    "fecha",
                                                    new Date(e.target.value).toLocaleDateString("es-ES")
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            value={p.transaccion}
                                            onChange={(e) =>
                                                handleChange(
                                                    p.id,
                                                    "transaccion",
                                                    Number(e.target.value)
                                                )
                                            }
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={p.metodo}
                                            onChange={(e) =>
                                                handleChange(p.id, "metodo", e.target.value)
                                            }
                                        >
                                            <option value="efectivo">Efectivo</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="tarjeta_credito">Tarjeta Crédito</option>
                                            <option value="tarjeta_debito">Tarjeta Débito</option>
                                            <option value="transferencia">Transferencia</option>
                                            <option value="credito">Crédito Clientes</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            value={p.cantidad}
                                            onChange={(e) =>
                                                handleChange(p.id, "cantidad", Number(e.target.value))
                                            }
                                        />
                                    </td>

                                    <td>
                                        <input
                                            type="text"
                                            value={p.factura}
                                            onChange={(e) =>
                                                handleChange(p.id, "factura", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <select
                                            value={p.estatus ? "Vigente" : "Cancelada"}
                                            onChange={(e) =>
                                                handleChange(
                                                    p.id,
                                                    "estatus",
                                                    e.target.value === "Vigente"
                                                )
                                            }
                                        >
                                            <option value="Vigente">Vigente</option>
                                            <option value="Cancelada">Cancelada</option>
                                        </select>
                                    </td>

                                    <td>
                                        <input
                                            type="text"
                                            value={p.comentarios}
                                            onChange={(e) =>
                                                handleChange(p.id, "comentarios", e.target.value)
                                            }
                                        />
                                    </td>

                                    <td>
                                        <button
                                            className="btn btn-blue"
                                            onClick={() => actualizarPago(p)}
                                        >
                                            Guardar
                                        </button>
                                    </td>

                                    <td>
                                        <button
                                            className="btn btn-red"
                                            onClick={() => eliminarPago(p)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="paginacion">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="btn btn-gray"
                            >
                                ‹ Anterior
                            </button>

                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i + 1)}
                                    className={`btn-page ${page === i + 1 ? "btn-page-active" : ""
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="btn btn-gray"
                            >
                                Siguiente ›
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ModificarCaja;
