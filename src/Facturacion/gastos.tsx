//src/Facturacion/gastos.tsx
// Componente para registrar gastos y entradas de dinero en caja
import React, { useState, useEffect } from "react";
import { getDatabase, ref, set, onValue, push } from "firebase/database";
import { app } from "../firebase/config";
import {
    obtenerFechaLocal,
    formatearFechaFirebase,
    formatearFechaMX,
} from "../funciones/formato_fechas";
import { formatearMoneda } from "../funciones/formato_moneda";
import "../css/gastos.css";

interface MovimientoGasto {
    id: string;
    tipo: "entrada" | "gasto"; // entrada = dinero agregado
    cantidad: number;
    descripcion: string;
    fecha: string;
    fechaMovimiento: string;
}

const Gastos: React.FC = () => {
    const db = getDatabase(app);

    // Fecha del reporte (siempre hoy)
    const fechaReporte =formatearFechaFirebase(obtenerFechaLocal());

    // Fecha que el usuario selecciona para indicar
    // cuándo ocurrió el gasto
    const [fechaGasto, setFechaGasto] =useState(obtenerFechaLocal());

    const [cantidadEntrada, setCantidadEntrada] = useState<number>(0);
    const [cantidadGasto, setCantidadGasto] = useState<number>(0);
    const [descripcion, setDescripcion] = useState("");
    const [movimientos, setMovimientos] = useState<MovimientoGasto[]>([]);
    const [fondo, setFondo] = useState(0);

useEffect(() => {
    const gastosRef = ref(db, `gastos/${fechaReporte}`);

    const unsubscribe = onValue(gastosRef, (snapshot) => {
        const data = snapshot.val();

        if (!data) {
            setMovimientos([]);
            setFondo(0);
            return;
        }

        const lista = Object.values(data) as MovimientoGasto[];

        lista.sort((a, b) => a.fecha.localeCompare(b.fecha));

        setMovimientos(lista);

        const total = lista.reduce((acc, mov) => {
            if (mov.tipo === "entrada") return acc + mov.cantidad;
            if (mov.tipo === "gasto") return acc - mov.cantidad;
            return acc;
        }, 0);

        setFondo(total);
    });

    return () => unsubscribe();
}, [db, fechaReporte]);

const agregarEntrada = async () => {
    if (cantidadEntrada <= 0) {
        return alert("Ingresa una cantidad válida");
    }

    const nuevo = {
        id: push(ref(db, `gastos/${fechaReporte}`)).key!,
        tipo: "entrada" as const,
        cantidad: cantidadEntrada,
        descripcion: "Dinero agregado",
        fecha: new Date().toLocaleTimeString(),
        fechaMovimiento: obtenerFechaLocal(),
    };

    await set(ref(db, `gastos/${fechaReporte}/${nuevo.id}`), nuevo);

    setCantidadEntrada(0);
};

const agregarGasto = async () => {
    if (!fechaGasto) {
        return alert("Selecciona una fecha");
    }

    if (cantidadGasto <= 0) {
        return alert("Ingresa un gasto válido");
    }

    if (!descripcion.trim()) {
        return alert("Ingresa una descripción del gasto");
    }

    if (cantidadGasto > fondo) {
        return alert("❌ No puedes gastar más de lo disponible");
    }

    const nuevo = {
        id: push(ref(db, `gastos/${fechaReporte}`)).key!,
        tipo: "gasto" as const,
        cantidad: cantidadGasto,
        descripcion,
        fecha: new Date().toLocaleTimeString(),
        fechaMovimiento: fechaGasto,
    };

    await set(ref(db, `gastos/${fechaReporte}/${nuevo.id}`), nuevo);

    setCantidadGasto(0);
    setDescripcion("");
};

        return (
            <div className="gastos-container">
                <h1 className="gastos-title">💸 Gastos del Día</h1>

                {/* =========================
                    INGRESAR DINERO
                ========================= */}
                <div className="gastos-form">
                    <input
                        type="number"
                        placeholder="Cantidad para fondo"
                        value={cantidadEntrada || ""}
                        onChange={(e) =>
                            setCantidadEntrada(parseFloat(e.target.value) || 0)
                        }
                        className="gastos-input"
                    />

                    <button onClick={agregarEntrada} className="btn btn-green">
                        ➕ Ingresar dinero
                    </button>
                </div>

                <h2 className="gastos-fondo">
                    Fondo disponible: {formatearMoneda(fondo)}
                </h2>

                {/* =========================
                    INGRESAR GASTOS
                ========================= */}
                {fondo > 0 && (
                    <>
                        <h3 className="gastos-subtitle">Ingresar gastos</h3>

                        <div className="gastos-form gastos-form-gasto">
                            <input
                                type="date"
                                value={fechaGasto}
                                max={obtenerFechaLocal()}
                                onChange={(e) => setFechaGasto(e.target.value)}
                                className="gastos-input"
                            />

                            <input
                                type="number"
                                placeholder="Cantidad"
                                value={cantidadGasto || ""}
                                onChange={(e) =>
                                    setCantidadGasto(parseFloat(e.target.value) || 0)
                                }
                                className="gastos-input"
                            />

                            <input
                                type="text"
                                placeholder="Descripción"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className="gastos-input"
                            />

                            <button onClick={agregarGasto} className="btn btn-red gastos-btn">
                                ➖ Registrar gasto
                            </button>
                        </div>

                        <h3 className="gastos-subtitle">
                            Movimientos del {formatearFechaMX(obtenerFechaLocal())}
                        </h3>

                        <div className="gastos-table-wrap">
                            <div className="gastos-table-scroll">
                                <table className="caja-table">
                                    <thead>
                                        <tr>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                            <th>Descripción</th>
                                            <th>Fecha Gasto</th>
                                            <th>Hora Registro</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {movimientos.map((m) => (
                                            <tr key={m.id}>
                                                <td>
                                                    {m.tipo === "entrada"
                                                        ? "Entrada"
                                                        : "Gasto"}
                                                </td>

                                                <td
                                                    style={{
                                                        color:
                                                            m.tipo === "gasto"
                                                                ? "red"
                                                                : "green",
                                                    }}
                                                >
                                                    {formatearMoneda(m.cantidad)}
                                                </td>

                                                <td>{m.descripcion}</td>

                                                <td>
                                                    {m.fechaMovimiento
                                                        ? formatearFechaMX(m.fechaMovimiento)
                                                        : "-"}
                                                </td>

                                                <td>{m.fecha}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
};

export default Gastos;