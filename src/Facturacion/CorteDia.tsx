// src/components/CorteDia.tsx
import React, { useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { app } from "../firebase/config";

interface CorteData {
    efectivo: number;
    creditoTarjeta: number;
    creditoClientes: number;
    debito: number;
    transferencia: number;
}

const CorteDia: React.FC = () => {
    const db = getDatabase(app);
    const [fecha, setFecha] = useState<string>("");
    const [resumen, setResumen] = useState<CorteData | null>(null);

    const handleBuscar = () => {
        if (!fecha) {
            alert("Selecciona una fecha");
            return;
        }

        // Convertir fecha (YYYY-MM-DD) → (DDMMYYYY)
        const [y, m, d] = fecha.split("-");
        const fechaKey = `${d}${m}${y}`; // Ej: 14/11/2025 → 14112025

        const rootRef = ref(db, "corte-caja");

        onValue(
            rootRef,
            (snapshot) => {
                const data = snapshot.val();
                if (!data) {
                    setResumen(null);
                    return;
                }

                // Filtrar nodos del día
                const nodos = Object.keys(data).filter((n) => n.startsWith(fechaKey));

                let totalEfectivo = 0;
                let totalCreditoTarjeta = 0;
                let totalCreditoClientes = 0;
                let totalDebito = 0;
                let totalTransferencia = 0;

                // Recorrer cada nodo del día
                nodos.forEach((nodo) => {
                    const movimientos = data[nodo];
                    Object.values(movimientos).forEach((p: any) => {
                        if (!p.estatus) return;

                        const metodo = p.metodo?.toLowerCase();
                        const cantidad = Number(p.cantidad) || 0;

                        if (metodo.includes("efectivo")) totalEfectivo += cantidad;
                        else if (metodo === "tarjeta_credito")
                            totalCreditoTarjeta += cantidad;
                        else if (metodo === "credito") totalCreditoClientes += cantidad;
                        else if (metodo.includes("debito")) totalDebito += cantidad;
                        else if (metodo.includes("transferencia"))
                            totalTransferencia += cantidad;
                    });
                });

                setResumen({
                    efectivo: totalEfectivo,
                    creditoTarjeta: totalCreditoTarjeta,
                    creditoClientes: totalCreditoClientes,
                    debito: totalDebito,
                    transferencia: totalTransferencia,
                });
            },
            { onlyOnce: true }
        );
    };

    const total =
        (resumen?.efectivo || 0) +
        (resumen?.creditoTarjeta || 0) +
        (resumen?.creditoClientes || 0) +
        (resumen?.debito || 0) +
        (resumen?.transferencia || 0);

    return (
        <div className="caja-container">
            <h1 className="caja-title">🧾 Corte por Día</h1>

            <label>
                Selecciona la fecha:
                <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="border rounded px-2 py-1 ml-2"
                />
            </label>

            <button onClick={handleBuscar} disabled={!fecha} className="btn btn-blue">
                Buscar
            </button>

            {resumen && (
                <div className="mt-6 bg-gray-100 p-4 rounded shadow">
                    <h2 className="text-lg font-semibold mb-3">
                        Resultados del {fecha.split("-").reverse().join("/")}
                    </h2>

                    <table className="caja-table">
                        <thead>
                            <tr>
                                <th>Tipo de Pago</th>
                                <th>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Efectivo</td>
                                <td>${resumen.efectivo.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Crédito (Tarjeta)</td>
                                <td>${resumen.creditoTarjeta.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Crédito Clientes</td>
                                <td>${resumen.creditoClientes.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Débito</td>
                                <td>${resumen.debito.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Transferencia</td>
                                <td>${resumen.transferencia.toFixed(2)}</td>
                            </tr>

                            <tr className="total-row">
                                <td>
                                    <strong>Total</strong>
                                </td>
                                <td>
                                    <strong>${total.toFixed(2)}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CorteDia;
