import React, { useState, useEffect } from "react";
import { getDatabase, ref, set, onValue, push } from "firebase/database";
import { app } from "../firebase/config";
//import "../css/caja.css";

interface MovimientoGasto {
    id: string;
    tipo: "entrada" | "gasto"; // entrada = dinero agregado
    cantidad: number;
    descripcion: string;
    fecha: string;
}

const Gastos: React.FC = () => {
    const db = getDatabase(app);

    const hoy = new Date();
    const fecha =
        hoy.getDate().toString().padStart(2, "0") +
        (hoy.getMonth() + 1).toString().padStart(2, "0") +
        hoy.getFullYear().toString();

    const [cantidad, setCantidad] = useState<number>(0);
    const [descripcion, setDescripcion] = useState("");
    const [movimientos, setMovimientos] = useState<MovimientoGasto[]>([]);
    const [fondo, setFondo] = useState(0);

    useEffect(() => {
        const gastosRef = ref(db, `gastos/${fecha}`);
        onValue(gastosRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                setMovimientos([]);
                setFondo(0);
                return;
            }

            const lista = Object.values(data) as MovimientoGasto[];
            setMovimientos(lista);

            const total = lista.reduce((acc, mov) => {
                if (mov.tipo === "entrada") return acc + mov.cantidad;
                if (mov.tipo === "gasto") return acc - mov.cantidad;
                return acc;
            }, 0);
            setFondo(total);
        });
    }, [db, fecha]);

    const agregarEntrada = async () => {
        if (cantidad <= 0) return alert("Ingresa un valor válido");

        const nuevo = {
            id: push(ref(db, `gastos/${fecha}`)).key!,
            tipo: "entrada",
            cantidad,
            descripcion: descripcion || "Dinero agregado",
            fecha: new Date().toLocaleTimeString(),
        };

        await set(ref(db, `gastos/${fecha}/${nuevo.id}`), nuevo);

        setCantidad(0);
        setDescripcion("");
    };

    const agregarGasto = async () => {
        if (cantidad <= 0) return alert("Ingresa un gasto válido");
        if (cantidad > fondo)
            return alert("❌ No puedes gastar más de lo disponible");

        const nuevo = {
            id: push(ref(db, `gastos/${fecha}`)).key!,
            tipo: "gasto",
            cantidad: cantidad,
            descripcion: descripcion || "Gasto",
            fecha: new Date().toLocaleTimeString(),
        };

        await set(ref(db, `gastos/${fecha}/${nuevo.id}`), nuevo);

        setCantidad(0);
        setDescripcion("");
    };

    return (
        <div className="caja-container">
            <h1 className="caja-title">💸 Gastos del Día</h1>

            <h2>Fondo disponible: ${fondo.toFixed(2)}</h2>

            <div className="input-gasto">
                <input
                    type="number"
                    placeholder="Cantidad"
                    onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                    className="input-custom_gasto"
                />

                <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="input-custom_gasto"
                />
            </div>
            <div className="btn-container">
                <button onClick={agregarEntrada} className="btn btn-green">
                    ➕ Agregar dinero
                </button>

                <button
                    onClick={agregarGasto}
                    className="btn btn-red"
                    style={{ marginLeft: 10 }}
                >
                    ➖ Registrar gasto
                </button>
            </div>

            <h3 style={{ marginTop: 30 }}>Movimientos</h3>
            <table className="caja-table">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Descripción</th>
                        <th>Hora</th>
                    </tr>
                </thead>
                <tbody>
                    {movimientos.map((m) => (
                        <tr key={m.id}>
                            <td>{m.tipo === "entrada" ? "Entrada" : "Gasto"}</td>
                            <td style={{ color: m.tipo === "gasto" ? "red" : "green" }}>
                                ${m.cantidad.toFixed(2)}
                            </td>
                            <td>{m.descripcion}</td>
                            <td>{m.fecha}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Gastos;
