import React, { useState, useEffect } from "react";
import { getDatabase, ref, set, onValue } from "firebase/database";
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
}

const CorteCajaPorFecha: React.FC = () => {
    const db = getDatabase(app);

    const [fechaSeleccionada, setFechaSeleccionada] = useState("");
    const [fechaFormateada, setFechaFormateada] = useState("");

    const [pagos, setPagos] = useState<Pago[]>([]);
    const [transaccion, setTransaccion] = useState(1);

    const [cantidad, setCantidad] = useState(0);
    const [metodo, setMetodo] = useState("efectivo");
    const [factura, setFactura] = useState("");

    const [errorCantidad, setErrorCantidad] = useState(false);
    const [errorFactura, setErrorFactura] = useState(false);

    const [mostrarCancelar, setMostrarCancelar] = useState(false);
    const [motivoCancelacion, setMotivoCancelacion] = useState("");

    const [mostrarCaja, setMostrarCaja] = useState(false);

    // -------- CONVERTIR FECHA YYYY-MM-DD → DDMMYYYY ----------
    const formatearFolder = (f: string) => {
        const [yyyy, mm, dd] = f.split("-");
        return `${dd}${mm}${yyyy}`;
    };

    // -------- CONVERTIR FECHA YYYY-MM-DD → DD/MM/YYYY -------- 🔥 MODIFICADO
    const formatearFechaCampo = (f: string) => {
        const [yyyy, mm, dd] = f.split("-");
        return `${dd}/${mm}/${yyyy}`;
    };

    // ---------------- CONSULTAR PAGOS DE ESA FECHA ----------------
    const cargarPagos = (fecha: string) => {
        if (!fecha) return;

        const f = formatearFolder(fecha);
        setFechaFormateada(f);

        const pagosRef = ref(db, `corte-caja/${f}`);

        onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const lista = Object.values(data) as Pago[];

                const maxTrans = lista.reduce(
                    (max, p) => (p.transaccion > max ? p.transaccion : max),
                    0
                );

                setPagos(lista);
                setTransaccion(maxTrans + 1);
            } else {
                setPagos([]);
                setTransaccion(1);
            }
        });
    };

    // --------------------- GUARDAR PAGO ---------------------
    const handleGuardar = async () => {
        if (!fechaFormateada) return alert("Seleccione una fecha primero.");

        let valid = true;

        if (!cantidad || cantidad <= 0) {
            valid = false;
            setErrorCantidad(true);
        } else setErrorCantidad(false);

        if (!factura.trim()) {
            valid = false;
            setErrorFactura(true);
        } else setErrorFactura(false);

        if (!valid) return;

        // verificar factura duplicada
        const existe = pagos.some(
            (p) => p.factura.trim().toLowerCase() === factura.trim().toLowerCase()
        );

        if (existe)
            return alert(`La factura "${factura}" ya existe en esta fecha.`);

        const id = `${fechaFormateada}-${transaccion.toString().padStart(2, "0")}`;

        // 🔥 MODIFICADO — Fecha formateada correctamente
        const fechaCorrecta = formatearFechaCampo(fechaSeleccionada);

        const nuevoPago: Pago = {
            id,
            transaccion,
            cantidad,
            metodo,
            factura,
            fecha: fechaCorrecta, // 🔥 YA CORREGIDO
            estatus: true,
            comentarios: "-",
        };

        await set(ref(db, `corte-caja/${fechaFormateada}/${id}`), nuevoPago);

        alert("Pago registrado.");
        setCantidad(0);
        setFactura("");
        setMetodo("efectivo");
    };

    // --------------- CANCELACIÓN DE PAGO -----------------
    const abrirModalCancelacion = () => {
        if (!cantidad || !factura.trim())
            return alert("Primero escribe cantidad y factura antes de cancelar.");

        setMostrarCancelar(true);
    };

    const confirmarCancelacion = async () => {
        if (!motivoCancelacion.trim()) return alert("Escribe un motivo.");

        const id = `${fechaFormateada}-${transaccion.toString().padStart(2, "0")}`;

        // 🔥 MODIFICADO — Fecha en formato correcto
        const fechaCorrecta = formatearFechaCampo(fechaSeleccionada);

        await set(ref(db, `corte-caja/${fechaFormateada}/${id}`), {
            id,
            transaccion,
            cantidad,
            metodo,
            factura,
            fecha: fechaCorrecta, // 🔥 YA CORREGIDO
            estatus: false,
            comentarios: motivoCancelacion,
        });

        setMostrarCancelar(false);
        setMotivoCancelacion("");
        alert("Pago cancelado.");
        setCantidad(0);
        setFactura("");
        setMetodo("efectivo");
    };
    // ------------------- FECHA H3 --------------------
    const formatearFecha = (fechaStr: string) => {
        const [yyyy, mm, dd] = fechaStr.split("-");
        return `${dd}/${mm}/${yyyy}`;
    };

    // ------------------- TOTALES --------------------
    const totalEfectivo = pagos
        .filter((p) => p.metodo === "efectivo")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalTransferencia = pagos
        .filter((p) => p.metodo === "transferencia")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalTarjeta = pagos
        .filter((p) => p.metodo.includes("tarjeta"))
        .reduce((a, b) => a + b.cantidad, 0);

    const totalGeneral = totalEfectivo + totalTransferencia + totalTarjeta;

    return (
        <div className="caja-container">
            <h1 className="caja-title">📅 Agregar Factura</h1>
            <p>
                Aquí puedes agregar facturas que no se capturaron en su día
                correspondiente.
            </p>

            {/* Fecha */}
            <label>
                <strong>Selecciona la Fecha:</strong>
            </label>
            <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => {
                    setFechaSeleccionada(e.target.value);
                    cargarPagos(e.target.value);
                }}
            />

            {/* Info */}
            {fechaSeleccionada && (
                <>
                    <div className="grid-info">
                        <p>
                            <strong>Fecha:</strong> {fechaSeleccionada}
                        </p>
                        <p>
                            <strong>Siguiente Transacción:</strong> #{transaccion}
                        </p>
                    </div>

                    {/* Inputs */}
                    <div className="grid-inputs">
                        <input
                            type="number"
                            placeholder="Cantidad"
                            value={cantidad === 0 ? "" : cantidad}
                            onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                            className={`input-caja1 ${errorCantidad ? "input-caja1-error" : ""
                                }`}
                        />

                        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta_credito">Tarjeta Crédito</option>
                            <option value="tarjeta_debito">Tarjeta Débito</option>
                            <option value="cheque">Cheque</option>
                            <option value="credito">Crédito Clientes</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Factura"
                            value={factura}
                            onChange={(e) => setFactura(e.target.value)}
                            className={`input-caja1 ${errorFactura ? "input-caja1-error" : ""
                                }`}
                        />
                    </div>

                    {/* Botones */}
                    <div className="btn-container">
                        <button onClick={handleGuardar} className="btn btn-blue">
                            Guardar
                        </button>

                        <button
                            onClick={() => setMostrarCaja(!mostrarCaja)}
                            className="btn btn-green"
                        >
                            {mostrarCaja ? "Ocultar Caja" : "Mostrar Caja"}
                        </button>

                        <button onClick={abrirModalCancelacion} className="btn btn-red">
                            Cancelar Factura
                        </button>
                    </div>
                </>
            )}

            {/* Tabla */}
            {mostrarCaja && (
                <>
                    <h3>Movimientos del {formatearFecha(fechaSeleccionada)}</h3>

                    <table className="caja-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Método</th>
                                <th>Cantidad</th>
                                <th>Factura</th>
                                <th>Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagos.map((p, i) => (
                                <tr key={i}>
                                    <td>{p.transaccion}</td>
                                    <td>{p.metodo}</td>
                                    <td>${p.cantidad}</td>
                                    <td>{p.factura}</td>
                                    <td style={{ color: p.estatus ? "green" : "red" }}>
                                        {p.estatus ? "Vigente" : "Cancelada"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="caja-totales">
                        <p>
                            <strong>Efectivo:</strong> ${totalEfectivo.toFixed(2)}
                        </p>
                        <p>
                            <strong>Transferencia:</strong> ${totalTransferencia.toFixed(2)}
                        </p>
                        <p>
                            <strong>Tarjetas:</strong> ${totalTarjeta.toFixed(2)}
                        </p>

                        <p className="caja-total-final">
                            Total: ${totalGeneral.toFixed(2)}
                        </p>
                    </div>
                </>
            )}

            {/* Modal cancelación */}
            {mostrarCancelar && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Cancelar Pago</h3>
                        <textarea
                            value={motivoCancelacion}
                            onChange={(e) => setMotivoCancelacion(e.target.value)}
                        />

                        <div className="modal-actions">
                            <button className="btn btn-red" onClick={confirmarCancelacion}>
                                Confirmar
                            </button>
                            <button
                                className="btn btn-yellow"
                                onClick={() => setMostrarCancelar(false)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorteCajaPorFecha;
