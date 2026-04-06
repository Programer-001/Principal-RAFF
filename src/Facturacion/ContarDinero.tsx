import React, { useState } from "react";
import { generarPDF } from "../plantillas/pdf_contador_dinero";
//import "../css/caja.css";

// 🔹 Billetes
const denominaciones = [20, 50, 100, 200, 500, 1000];

// 🔹 Monedas
const monedas_deno = [0.5, 1, 2, 5, 10, 20];

const ContarDinero: React.FC = () => {
    // Estados separados
    const [cantidadesBilletes, setCantidadesBilletes] = useState<{
        [key: number]: number;
    }>({});
    const [cantidadesMonedas, setCantidadesMonedas] = useState<{
        [key: number]: number;
    }>({});

    const [resultadoBilletes, setResultadoBilletes] = useState<
        { denom: number; cantidad: number; subtotal: number }[]
    >([]);
    const [resultadoMonedas, setResultadoMonedas] = useState<
        { denom: number; cantidad: number; subtotal: number }[]
    >([]);

    const [total, setTotal] = useState(0);

    // 🔹 Manejo de cambios por separado
    const handleBilleteChange = (denom: number, value: string) => {
        setCantidadesBilletes((prev) => ({
            ...prev,
            [denom]: parseFloat(value) || 0,
        }));
    };

    const handleMonedaChange = (denom: number, value: string) => {
        setCantidadesMonedas((prev) => ({
            ...prev,
            [denom]: parseFloat(value) || 0,
        }));
    };

    // 🔹 Calcular totales
    const calcular = () => {
        const detalleBilletes = denominaciones.map((denom) => {
            const cantidad = cantidadesBilletes[denom] || 0;
            return { denom, cantidad, subtotal: denom * cantidad };
        });

        const detalleMonedas = monedas_deno.map((denom) => {
            const cantidad = cantidadesMonedas[denom] || 0;
            return { denom, cantidad, subtotal: denom * cantidad };
        });

        const totalBilletes = detalleBilletes.reduce(
            (acc, f) => acc + f.subtotal,
            0
        );
        const totalMonedas = detalleMonedas.reduce((acc, f) => acc + f.subtotal, 0);

        setResultadoBilletes(detalleBilletes);
        setResultadoMonedas(detalleMonedas);
        setTotal(totalBilletes + totalMonedas);
    };

    return (
        <div className="caja-container">
            <h1 className="caja-title">Contador de Dinero</h1>

            {/* ==================== CONTENEDOR EN 2 COLUMNAS ==================== */}
            <div className="caja-billetes">
                {/* ----------- BILLETES ----------- */}
                <div>
                    <h2>💵 Billetes</h2>
                    {denominaciones.map((denom) => (
                        <div key={denom} className="caja-row">
                            <strong style={{ width: 70 }}>${denom}</strong>
                            <span>Cantidad:</span>
                            <input
                                className="input-cantidad"
                                type="number"
                                min={0}
                                value={cantidadesBilletes[denom] || ""}
                                onChange={(e) => handleBilleteChange(denom, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                {/* ----------- MONEDAS ----------- */}
                <div>
                    <h2>🪙 Monedas</h2>
                    {monedas_deno.map((denom) => (
                        <div key={denom} className="caja-row">
                            <strong style={{ width: 70 }}>${denom}</strong>
                            <span>Cantidad:</span>
                            <input
                                className="input-cantidad"
                                type="number"
                                min={0}
                                value={cantidadesMonedas[denom] || ""}
                                onChange={(e) => handleMonedaChange(denom, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="botones-linea">
                <button onClick={calcular} className="btn btn-blue">
                    Calcular
                </button>

                <button
                    onClick={() => generarPDF(resultadoBilletes, resultadoMonedas, total)}
                    className="btn btn-green"
                >
                    Descargar PDF
                </button>
            </div>

            {/* ======================== RESULTADOS ======================== */}
            <h3 style={{ marginTop: 20 }}>Resultados - Billetes</h3>
            <table className="caja-table">
                <thead>
                    <tr>
                        <th>Denominación</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {resultadoBilletes.map((fila) => (
                        <tr key={fila.denom}>
                            <td>${fila.denom}</td>
                            <td>{fila.cantidad}</td>
                            <td>${fila.subtotal.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 style={{ marginTop: 20 }}>Resultados - Monedas</h3>
            <table className="caja-table">
                <thead>
                    <tr>
                        <th>Denominación</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {resultadoMonedas.map((fila) => (
                        <tr key={fila.denom}>
                            <td>${fila.denom}</td>
                            <td>{fila.cantidad}</td>
                            <td>${fila.subtotal.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2>Total General: ${total.toLocaleString()}</h2>
        </div>
    );
};

export default ContarDinero;
