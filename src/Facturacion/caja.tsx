import React, { useState, useEffect } from "react";
import { getDatabase, ref, set, update, onValue } from "firebase/database";
import { app } from "../firebase/config";
import { formatearMoneda, procesarInputMoneda } from "../funciones/formato_moneda";
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

const CorteCaja: React.FC = () => {
    const db = getDatabase(app);

    const hoy = new Date();
    const fecha =
        hoy.getDate().toString().padStart(2, "0") +
        (hoy.getMonth() + 1).toString().padStart(2, "0") +
        hoy.getFullYear().toString();

    const [transaccion, setTransaccion] = useState<number>(1);
    const [cantidad, setCantidad] = useState<number>(0);
    const [metodo, setMetodo] = useState<string>("efectivo");
    const [factura, setFactura] = useState<string>("");

    const [pagos, setPagos] = useState<Pago[]>([]);
    const [mostrarCaja, setMostrarCaja] = useState(false);

    const [errorCantidad, setErrorCantidad] = useState(false);
    const [errorFactura, setErrorFactura] = useState(false);

    // Estado del modal de cancelación
    const [mostrarCancelar, setMostrarCancelar] = useState(false);
    const [motivoCancelacion, setMotivoCancelacion] = useState("");


    //para escribir en monedas con comas
    const [cantidadInput, setCantidadInput] = useState("");

    useEffect(() => {
        const pagosRef = ref(db, `corte-caja/${fecha}`);

        onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const lista = Object.values(data) as Pago[];

                // Encontrar la transacción más alta
                const maxTransaccion = lista.reduce(
                    (max, p) => (p.transaccion > max ? p.transaccion : max),
                    0
                );

                setPagos(lista);
                setTransaccion(maxTransaccion + 1); // ← ya no se repite
            } else {
                setPagos([]);
                setTransaccion(1);
            }
        });
    }, [db, fecha]);

    // ------------------- GUARDAR PAGO --------------------
    const handleGuardar = async () => {
        let valid = true;

        if (!cantidad || cantidad <= 0) {
            valid = false;
            setErrorCantidad(true);
        } else {
            setErrorCantidad(false);
        }

        if (!factura.trim()) {
            valid = false;
            setErrorFactura(true);
        } else {
            setErrorFactura(false);
        }

        if (!valid)
            return alert("❌ Ingresa una cantidad válida y una factura correcta");

        // Verificar factura duplicada
        const pagosRef = ref(db, `corte-caja/${fecha}`);
        let data: any;

        await new Promise((resolve) =>
            onValue(
                pagosRef,
                (snap) => {
                    data = snap.val();
                    resolve(null);
                },
                { onlyOnce: true }
            )
        );

        if (data) {
            const lista: Pago[] = Object.values(data);
            const existe = lista.some(
                (p) => p.factura.trim().toLowerCase() === factura.trim().toLowerCase()
            );

            if (existe) {
                return alert(`❌ La factura "${factura}" ya existe.`);
            }
        }

        const id = `${fecha}-${transaccion.toString().padStart(2, "0")}`;

        const nuevoPago: Pago = {
            id,
            transaccion,
            cantidad,
            metodo,
            factura,
            fecha: new Date().toLocaleDateString(),
            estatus: true,
            comentarios: "-",
        };

        await set(ref(db, `corte-caja/${fecha}/${id}`), nuevoPago);
        alert("💾 Pago registrado correctamente");

        setCantidad(0);
        setFactura("");
        setMetodo("efectivo");
    };

    // ------------------- CANCELAR PAGO --------------------
    const abrirModalCancelacion = () => {
        if (!cantidad || !factura.trim()) {
            return alert("Primero escribe la cantidad y la factura para cancelar.");
        }
        setMostrarCancelar(true);
    };

    const confirmarCancelacion = async () => {
        if (!motivoCancelacion.trim()) {
            return alert("Debes escribir el motivo de cancelación.");
        }

        const id = `${fecha}-${transaccion.toString().padStart(2, "0")}`;

        await set(ref(db, `corte-caja/${fecha}/${id}`), {
            id,
            transaccion,
            cantidad,
            metodo,
            factura,
            fecha: new Date().toLocaleDateString(),
            estatus: false,
            comentarios: motivoCancelacion,
        });

        setMostrarCancelar(false);
        setMotivoCancelacion("");

        alert("❌ Pago cancelado correctamente");

        setCantidad(0);
        setCantidadInput("");
        setFactura("");
        setMetodo("efectivo");
    };

    // ------------------- TOTALES --------------------
    const totalEfectivo = pagos
        .filter((p) => p.metodo === "efectivo")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalCheque = pagos
        .filter((p) => p.metodo === "cheque")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalCredito = pagos
        .filter((p) => p.metodo === "tarjeta_credito")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalDebito = pagos
        .filter((p) => p.metodo === "tarjeta_debito")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalTransferencia = pagos
        .filter((p) => p.metodo === "transferencia")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalCreditoClientes = pagos
        .filter((p) => p.metodo === "credito")
        .reduce((a, b) => a + b.cantidad, 0);

    const totalGeneral =
        totalEfectivo +
        totalCheque +
        totalCredito +
        totalDebito +
        totalTransferencia +
        totalCreditoClientes;

    return (
        <div className="form-container">
            <div className="caja-header">
                <h1>💵 Caja</h1>

                <div className="encabezado-cotizador">
                    <label>
                        <strong>Transacción:</strong> #{transaccion}
                    </label>
                    <label>
                        <strong>Fecha:</strong> {new Date().toLocaleDateString()}
                    </label>
                </div>

                <div className="grid-inputs">
                    <input
                        type="text"
                        placeholder="Cantidad"
                        value={cantidadInput}
                        onChange={(e) => {
                            const { texto, numero } = procesarInputMoneda(e.target.value);

                            setCantidadInput(texto ? `$${texto}` : "");  // visual → "1,000"
                            setCantidad(numero);     // real → 1000
                        }}
                        className={`input-caja1 ${errorCantidad ? "input-caja1-error" : ""}`}
                    />
            

                    <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                        <option value="efectivo">Efectivo</option>
                        <option value="cheque">Cheque</option>
                        <option value="tarjeta_credito">Tarjeta Crédito</option>
                        <option value="tarjeta_debito">Tarjeta Débito</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="credito">Crédito Clientes</option>
                        <option value="otro">Otro</option>
                    </select>
                   
                    <input
                        type="text"
                        placeholder="Factura"
                        value={factura}
                        onChange={(e) => setFactura(e.target.value)}
                        className={`input-caja1 ${errorFactura ? "input-caja1-error" : ""}`}
                    />
                </div>

                <div className="btn-container">
                    <button onClick={handleGuardar} className="btn btn-blue">
                        Guardar Pago
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
            </div>

            {mostrarCaja && (
                <div className="caja-table-container">
                    <h3>Movimientos del día</h3>

                    <table className="caja-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Método</th>
                                <th>Cantidad</th>
                                <th>Factura</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagos.map((p, i) => (
                                <tr key={i}>
                                    <td>{p.transaccion}</td>
                                    <td>{p.metodo.replace("_", " ")}</td>
                                    <td>${formatearMoneda(p.cantidad)}</td>
                                    <td>{p.factura || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>


                </div>
            )}
            <div className="caja-totales">
                <p>
                    <strong>Efectivo:</strong> ${formatearMoneda(totalEfectivo)}
                </p>
                <p>
                    <strong>Cheque:</strong> ${formatearMoneda(totalCheque)}
                </p>
                <p>
                    <strong>Tarjeta Crédito:</strong> ${formatearMoneda(totalCredito)}
                </p>
                <p>
                    <strong>Tarjeta Débito:</strong> ${formatearMoneda(totalDebito)}
                </p>
                <p>
                    <strong>Transferencia:</strong> $
                    {formatearMoneda(totalTransferencia)}
                </p>
                <p>
                    <strong>Crédito Clientes:</strong> $
                    {formatearMoneda(totalCreditoClientes)}
                </p>

                <p className="caja-total-final">
                    Total: ${formatearMoneda(totalGeneral)}
                </p>
            </div>

            {/* ---------------- MODAL DE CANCELACIÓN ---------------- */}
            {mostrarCancelar && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Cancelar Pago</h3>
                        <p>Escribe el motivo de cancelación:</p>

                        <textarea
                            value={motivoCancelacion}
                            onChange={(e) => setMotivoCancelacion(e.target.value)}
                        />

                        <div className="modal-actions">
                            <button className="btn btn-red" onClick={confirmarCancelacion}>
                                Confirmar Cancelación
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

export default CorteCaja;
