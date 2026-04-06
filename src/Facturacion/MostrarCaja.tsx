// src/components/MostrarCaja.tsx
import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { app } from "../firebase/config";
import { generarExcelCorteCaja } from "../plantillas/excel";
//import "../css/caja.css";

interface Pago {
    id: string;
    transaccion: string | number;
    cantidad: number;
    metodo: string;
    factura: string;
    fecha: string;
    estatus: boolean;
}

const MostrarCaja: React.FC = () => {
    const db = getDatabase(app);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [filtrados, setFiltrados] = useState<Pago[]>([]);
    const [orden, setOrden] = useState<keyof Pago>("fecha");
    const [asc, setAsc] = useState(true);

    const [totales, setTotales] = useState({
        efectivo: 0,
        cheque: 0,
        credito_tarjeta: 0,
        credito_clientes: 0,
        debito: 0,
        transferencia: 0,
        total: 0,
    });

    // 🔹 Cargar todos los pagos al inicio
    useEffect(() => {
        const pagosRef = ref(db, "corte-caja");
        onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const todos: Pago[] = [];

            // ✔ NUEVO método confiable que no pierde claves
            Object.entries(data).forEach(([fechaKey, dia]: any) => {
                Object.entries(dia).forEach(([pagoKey, p]: any) => {
                    todos.push(p as Pago);
                });
            });

            setPagos(todos);
            setFiltrados(todos);
        });
    }, [db]);

    // 🔹 Filtrar por rango de fechas + calcular totales
    const filtrarFechas = () => {
        if (!desde || !hasta) return alert("Selecciona ambas fechas");

        const desdeTimestamp = new Date(desde).getTime();
        const hastaTimestamp = new Date(hasta).getTime() + 24 * 60 * 60 * 1000 - 1;

        const filtrados = pagos.filter((p) => {
            const [dia, mes, anio] = p.fecha.split("/").map(Number);
            const fechaPago = new Date(anio, mes - 1, dia).getTime();
            return fechaPago >= desdeTimestamp && fechaPago <= hastaTimestamp;
        });

        setFiltrados(filtrados);

        // 🔹 Calcular totales por método
        const t = {
            efectivo: 0,
            cheque: 0,
            credito_tarjeta: 0,
            credito_clientes: 0,
            debito: 0,
            transferencia: 0,
            total: 0,
        };

        filtrados.forEach((p) => {
            if (!p.estatus) return;

            const metodo = p.metodo.toLowerCase();

            if (metodo === "efectivo") t.efectivo += p.cantidad;
            if (metodo === "cheque") t.cheque += p.cantidad;
            if (metodo === "tarjeta_credito") t.credito_tarjeta += p.cantidad;
            if (metodo === "credito") t.credito_clientes += p.cantidad; // 🔹 Nuevo método
            if (metodo === "tarjeta_debito") t.debito += p.cantidad;
            if (metodo === "transferencia") t.transferencia += p.cantidad;

            t.total += p.cantidad;
        });

        setTotales(t);
    };

    // 🔹 Ordenar tabla
    const ordenarPor = (campo: keyof Pago) => {
        const sorted = [...filtrados].sort((a, b) => {
            if (a[campo] < b[campo]) return asc ? -1 : 1;
            if (a[campo] > b[campo]) return asc ? 1 : -1;
            return 0;
        });
        setFiltrados(sorted);
        setAsc(!asc);
        setOrden(campo);
    };

    return (
        <div className="caja-layout">
            {/* ================= RESUMEN A LA DERECHA ================= */}
            <div className="resumen-caja">
                <h3>Totales por Método</h3>

                <p>Efectivo: ${totales.efectivo.toFixed(2)}</p>
                <p>Tarjeta de débito: ${totales.debito.toFixed(2)}</p>
                <p>Tarjeta de crédito: ${totales.credito_tarjeta.toFixed(2)}</p>
                <p>Crédito de Clientes: ${totales.credito_clientes.toFixed(2)}</p>
                <p>Transferencias: ${totales.transferencia.toFixed(2)}</p>
                <p>Cheque: ${totales.cheque.toFixed(2)}</p>
                <hr />
                <h4>Total General: ${totales.total.toFixed(2)}</h4>
            </div>

            {/* ================= TABLA ================= */}
            <div className="form-container">
                <h2 className="caja-title">📅 Mostrar Caja por Fecha</h2>

                <div className="fechas-container">
                    <label>
                        Desde:
                        <input
                            type="date"
                            value={desde}
                            onChange={(e) => setDesde(e.target.value)}
                        />
                    </label>
                    <label>
                        Hasta:
                        <input
                            type="date"
                            value={hasta}
                            onChange={(e) => setHasta(e.target.value)}
                        />
                    </label>
                </div>

                <div className="btn-container">
                    <button onClick={filtrarFechas} className="btn btn-blue">
                        Filtrar
                    </button>

                    <button
                        onClick={() => generarExcelCorteCaja(desde, hasta)}
                        className="btn btn-green"
                    >
                        Exportar a Excel
                    </button>
                </div>
                <br />
                <div className="table-scroll">
                    <table className="caja-table">
                        <thead className="bg-gray-100 cursor-pointer">
                            <tr>
                                <th
                                    className="sticky top-0"
                                    onClick={() => ordenarPor("fecha")}
                                >
                                    Fecha
                                </th>
                                <th
                                    className="sticky top-0"
                                    onClick={() => ordenarPor("factura")}
                                >
                                    Factura
                                </th>
                                <th
                                    className="sticky top-0"
                                    onClick={() => ordenarPor("metodo")}
                                >
                                    Método
                                </th>
                                <th
                                    className="sticky top-0"
                                    onClick={() => ordenarPor("cantidad")}
                                >
                                    Cantidad
                                </th>
                                <th
                                    className="sticky top-0"
                                    onClick={() => ordenarPor("estatus")}
                                >
                                    Estatus
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filtrados.map((p, i) => (
                                <tr key={i} className="border-t text-center hover:bg-blue-100">
                                    <td>{p.fecha || "-"}</td>
                                    <td>{p.factura || "-"}</td>
                                    <td>{p.metodo.replace("_", " ")}</td>
                                    <td>${p.cantidad.toFixed(2)}</td>
                                    <td
                                        className={
                                            p.estatus ? "estatus-vigente" : "estatus-cancelada"
                                        }
                                    >
                                        {p.estatus ? "Vigente" : "Cancelada"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MostrarCaja;
