import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { generarExcelGastos } from "../plantillas/excel_gastos";
import { generarPDFGastos } from "../plantillas/pdf_gastos";
import { formatearMoneda, procesarInputMoneda } from "../funciones/formato_moneda";
import { app } from "../firebase/config";
import "../css/animacion_calendario.css";

interface Movimiento {
    id: string;
    fecha: string; // YYYY-MM-DD
    hora: string; // "6:31:15 p.m."
    tipo: "entrada" | "gasto";
    cantidad: number;
    descripcion: string;
}

// Convierte "14112025" → "2025-11-14"
const formatearFecha = (num: string): string => {
    if (num.length !== 8) return "";
    const dia = num.substring(0, 2);
    const mes = num.substring(2, 4);
    const anio = num.substring(4);
    return `${anio}-${mes}-${dia}`;
};

const ConsultaGastos: React.FC = () => {
    const db = getDatabase(app);

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [filtrados, setFiltrados] = useState<Movimiento[]>([]);

    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");

    const [tipoFiltro, setTipoFiltro] = useState("todos");

    const [totalEntradas, setTotalEntradas] = useState(0);
    const [totalGastos, setTotalGastos] = useState(0);

    // -----------------------
    // Cargar datos reales de Firebase
    // -----------------------
    useEffect(() => {
        const refGastos = ref(db, "gastos");

        onValue(refGastos, (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.val();
            const lista: Movimiento[] = [];

            // Recorrer días
            Object.keys(data).forEach((diaKey) => {
                const fechaFormateada = formatearFecha(diaKey);
                const movimientosDia = data[diaKey];

                if (typeof movimientosDia !== "object") return;

                // Recorrer movimientos del día
                Object.keys(movimientosDia).forEach((idMov) => {
                    const mov = movimientosDia[idMov];

                    lista.push({
                        id: idMov,
                        fecha: fechaFormateada,
                        hora: mov.fecha || "",
                        tipo: mov.tipo, // entrada | gasto
                        cantidad: Number(mov.cantidad),
                        descripcion: mov.descripcion || "—",
                    });
                });
            });

            setMovimientos(lista);
            setFiltrados(lista);
        });
    }, []);

    // ---------------------------------
    // FILTRAR DATOS
    // ---------------------------------
    const filtrar = () => {
        // Filtrar por fecha (para tabla y totales)
        const filtradosPorFecha = movimientos.filter(
            (m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta)
        );

        // Calcular totales solo por fecha
        const totalE = filtradosPorFecha
            .filter((m) => m.tipo === "entrada")
            .reduce((sum, m) => sum + m.cantidad, 0);

        const totalG = filtradosPorFecha
            .filter((m) => m.tipo === "gasto")
            .reduce((sum, m) => sum + Math.abs(m.cantidad), 0);

        setTotalEntradas(totalE);
        setTotalGastos(totalG);

        // Filtrar por tipo para la tabla
        const filtradosTabla =
            tipoFiltro === "todos"
                ? filtradosPorFecha
                : filtradosPorFecha.filter((m) => m.tipo === tipoFiltro);

        setFiltrados(filtradosTabla);
    };
    //filtrado
    useEffect(() => {
        filtrar();
    }, [tipoFiltro]);
    return (
        <div className="caja-container">
            <h1 className="caja-title">
                <span className="emoji-calendario">📅</span>
                Consulta de Gastos
            </h1>

            {/* FECHAS */}
            <div className="fechas-container">
                <div>
                    <label>Desde:</label>
                    <input
                        type="date"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                    />
                </div>

                <div>
                    <label>Hasta:</label>
                    <input
                        type="date"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                    />
                </div>
            </div>
            <div className="btn-container">
                <button onClick={filtrar} className="btn btn-blue">
                    FILTRAR
                </button>
            </div>
            {/* RESUMEN */}
            <hr />
            <h2>Resumen del período</h2>

            <p>
                <strong>Entradas totales:</strong> ${totalEntradas.toFixed(2)}
            </p>
            <p>
                <strong>Gastos totales:</strong> ${totalGastos.toFixed(2)}
            </p>
            <p>
                <strong>Fondo final:</strong> $
                {(totalEntradas - totalGastos).toFixed(2)}
            </p>
            <div className="btn-container">
                <button
                    onClick={() => generarExcelGastos(desde, hasta)}
                    className="btn btn-green"
                >
                    Exportar Excel
                </button>
                <button
                    onClick={() => generarPDFGastos(desde, hasta)}
                    className="btn btn-red"
                >
                    Exportar PDF
                </button>
            </div>
            <hr />

            {/* SELECT TIPO */}
            <div>
                <label>
                    <strong>Tipo:</strong>
                </label>
                <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                >
                    <option value="todos">Todos</option>
                    <option value="entrada">Entradas</option>
                    <option value="gasto">Gastos</option>
                </select>
            </div>

            {/* TABLA */}
            <hr />
            <h3>Tabla de resultados</h3>
            <div className="table-scroll">
            <table className="caja-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Cantidad</th>
                        <th>Descripción</th>
                        <th>Hora</th>
                    </tr>
                </thead>
                <tbody>
                    {filtrados.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: "center" }}>
                                No hay resultados
                            </td>
                        </tr>
                    ) : (
                        filtrados.map((m) => (
                            <tr key={m.id}>
                                <td>{m.fecha}</td>
                                <td>{m.tipo}</td>
                                <td>${m.cantidad.toFixed(2)}</td>
                                <td>{m.descripcion}</td>
                                <td>{m.hora}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            </div>
        </div>
    );
};

export default ConsultaGastos;
