import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { generarExcelGastos } from "../plantillas/excel_gastos";
import { generarPDFGastos } from "../plantillas/pdf_gastos";
import { formatearMoneda } from "../funciones/formato_moneda";
import { formatearFechaMX } from "../funciones/formato_fechas";
import { app } from "../firebase/config";
import "../css/animacion_calendario.css";

interface Movimiento {
    id: string;

    // Fecha seleccionada al registrar el gasto
    fechaMovimiento: string; // YYYY-MM-DD

    // Fecha de la carpeta de Firebase: gastos/30072026
    fechaRegistro: string; // YYYY-MM-DD

    horaRegistro: string;
    tipo: "entrada" | "gasto";
    cantidad: number;
    descripcion: string;
}

/**
 * Convierte la carpeta de Firebase:
 * 30072026 -> 2026-07-30
 */
const formatearFechaRegistro = (fechaFirebase: string): string => {
    if (fechaFirebase.length !== 8) return "";

    const dia = fechaFirebase.substring(0, 2);
    const mes = fechaFirebase.substring(2, 4);
    const anio = fechaFirebase.substring(4, 8);

    return `${anio}-${mes}-${dia}`;
};

const ConsultaGastos: React.FC = () => {
    const db = getDatabase(app);

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [filtrados, setFiltrados] = useState<Movimiento[]>([]);

    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");

    const [tipoFiltro, setTipoFiltro] = useState<
        "todos" | "entrada" | "gasto"
    >("todos");

    const [totalEntradas, setTotalEntradas] = useState(0);
    const [totalGastos, setTotalGastos] = useState(0);

    /**
     * Aplica los filtros usando fechaMovimiento.
     */
    const aplicarFiltros = (
        listaMovimientos: Movimiento[] = movimientos,
        tipoSeleccionado:
            | "todos"
            | "entrada"
            | "gasto" = tipoFiltro
    ) => {
        /*
         * Ahora el rango de fechas se compara contra
         * fechaMovimiento y no contra la carpeta de Firebase.
         */
        const filtradosPorFecha = listaMovimientos.filter((movimiento) => {
            const cumpleDesde =
                !desde || movimiento.fechaMovimiento >= desde;

            const cumpleHasta =
                !hasta || movimiento.fechaMovimiento <= hasta;

            return cumpleDesde && cumpleHasta;
        });

        /*
         * Los totales se calculan con todos los movimientos
         * encontrados dentro del rango de fechas.
         */
        const entradas = filtradosPorFecha
            .filter((movimiento) => movimiento.tipo === "entrada")
            .reduce(
                (acumulado, movimiento) =>
                    acumulado + movimiento.cantidad,
                0
            );

        const gastos = filtradosPorFecha
            .filter((movimiento) => movimiento.tipo === "gasto")
            .reduce(
                (acumulado, movimiento) =>
                    acumulado + Math.abs(movimiento.cantidad),
                0
            );

        setTotalEntradas(entradas);
        setTotalGastos(gastos);

        /*
         * El filtro por tipo solamente modifica la tabla.
         */
        const movimientosTabla =
            tipoSeleccionado === "todos"
                ? filtradosPorFecha
                : filtradosPorFecha.filter(
                      (movimiento) =>
                          movimiento.tipo === tipoSeleccionado
                  );

        movimientosTabla.sort((a, b) => {
            /*
             * Primero ordenamos por fecha del movimiento.
             */
            const comparacionFecha =
                a.fechaMovimiento.localeCompare(b.fechaMovimiento);

            if (comparacionFecha !== 0) {
                return comparacionFecha;
            }

            /*
             * Si tienen la misma fecha, se ordenan
             * por fecha y hora de registro.
             */
            const comparacionRegistro =
                a.fechaRegistro.localeCompare(b.fechaRegistro);

            if (comparacionRegistro !== 0) {
                return comparacionRegistro;
            }

            return a.horaRegistro.localeCompare(b.horaRegistro);
        });

        setFiltrados(movimientosTabla);
    };

    // ==============================
    // CARGAR MOVIMIENTOS DE FIREBASE
    // ==============================
    useEffect(() => {
        const refGastos = ref(db, "gastos");

        const unsubscribe = onValue(refGastos, (snapshot) => {
            if (!snapshot.exists()) {
                setMovimientos([]);
                setFiltrados([]);
                setTotalEntradas(0);
                setTotalGastos(0);
                return;
            }

            const data = snapshot.val();
            const lista: Movimiento[] = [];

            /*
             * diaKey sería, por ejemplo:
             * 30072026
             */
            Object.keys(data).forEach((diaKey) => {
                const fechaRegistro =
                    formatearFechaRegistro(diaKey);

                const movimientosDia = data[diaKey];

                if (
                    !movimientosDia ||
                    typeof movimientosDia !== "object"
                ) {
                    return;
                }

                Object.keys(movimientosDia).forEach((idMovimiento) => {
                    const movimiento = movimientosDia[idMovimiento];

                    if (
                        !movimiento ||
                        typeof movimiento !== "object"
                    ) {
                        return;
                    }

                    /*
                     * Registros antiguos posiblemente no tengan
                     * fechaMovimiento.
                     *
                     * En ese caso se usa fechaRegistro para evitar
                     * que desaparezcan de la consulta.
                     */
                    const fechaMovimiento =
                        movimiento.fechaMovimiento ||
                        fechaRegistro;

                    lista.push({
                        id: movimiento.id || idMovimiento,
                        fechaMovimiento,
                        fechaRegistro,
                        horaRegistro: movimiento.fecha || "",
                        tipo: movimiento.tipo,
                        cantidad: Number(movimiento.cantidad || 0),
                        descripcion:
                            movimiento.descripcion || "—",
                    });
                });
            });

            setMovimientos(lista);

            /*
             * Al cargar Firebase mostramos todos los registros
             * y calculamos los totales generales.
             */
            const entradas = lista
                .filter(
                    (movimiento) =>
                        movimiento.tipo === "entrada"
                )
                .reduce(
                    (acumulado, movimiento) =>
                        acumulado + movimiento.cantidad,
                    0
                );

            const gastos = lista
                .filter(
                    (movimiento) =>
                        movimiento.tipo === "gasto"
                )
                .reduce(
                    (acumulado, movimiento) =>
                        acumulado +
                        Math.abs(movimiento.cantidad),
                    0
                );

            lista.sort((a, b) => {
                const comparacionFecha =
                    a.fechaMovimiento.localeCompare(
                        b.fechaMovimiento
                    );

                if (comparacionFecha !== 0) {
                    return comparacionFecha;
                }

                return a.fechaRegistro.localeCompare(
                    b.fechaRegistro
                );
            });

            setFiltrados(lista);
            setTotalEntradas(entradas);
            setTotalGastos(gastos);
        });

        return () => unsubscribe();
    }, [db]);

    // Cuando se cambia el tipo, actualizar la tabla
    useEffect(() => {
        aplicarFiltros(movimientos, tipoFiltro);
    }, [tipoFiltro]);

    return (
        <div className="caja-container">
            <h1 className="caja-title">
                <span className="emoji-calendario">📅</span>
                Consulta de Gastos
            </h1>

            {/* ==============================
                FILTRO POR FECHA MOVIMIENTO
            ============================== */}
            <div className="fechas-container">
                <div>
                    <label>Desde:</label>

                    <input
                        type="date"
                        value={desde}
                        onChange={(e) =>
                            setDesde(e.target.value)
                        }
                    />
                </div>

                <div>
                    <label>Hasta:</label>

                    <input
                        type="date"
                        value={hasta}
                        min={desde || undefined}
                        onChange={(e) =>
                            setHasta(e.target.value)
                        }
                    />
                </div>
            </div>

            <div className="btn-container">
                <button
                    type="button"
                    onClick={() => aplicarFiltros()}
                    className="btn btn-blue"
                >
                    FILTRAR
                </button>
            </div>

            {/* ==============================
                RESUMEN
            ============================== */}
            <hr />

            <h2>Resumen del período</h2>

            <p>
                <strong>Entradas totales:</strong>{" "}
                {formatearMoneda(totalEntradas)}
            </p>

            <p>
                <strong>Gastos totales:</strong>{" "}
                {formatearMoneda(totalGastos)}
            </p>

            <p>
                <strong>Fondo final:</strong>{" "}
                {formatearMoneda(
                    totalEntradas - totalGastos
                )}
            </p>

            <div className="btn-container">
                <button
                    type="button"
                    onClick={() =>
                        generarExcelGastos(desde, hasta)
                    }
                    className="btn btn-green"
                >
                    Exportar Excel
                </button>

                <button
                    type="button"
                    onClick={() =>
                        generarPDFGastos(desde, hasta)
                    }
                    className="btn btn-red"
                >
                    Exportar PDF
                </button>
            </div>

            <hr />

            {/* ==============================
                FILTRO POR TIPO
            ============================== */}
            <div>
                <label>
                    <strong>Tipo:</strong>
                </label>

                <select
                    value={tipoFiltro}
                    onChange={(e) =>
                        setTipoFiltro(
                            e.target.value as
                                | "todos"
                                | "entrada"
                                | "gasto"
                        )
                    }
                >
                    <option value="todos">Todos</option>
                    <option value="entrada">Entradas</option>
                    <option value="gasto">Gastos</option>
                </select>
            </div>

            {/* ==============================
                TABLA
            ============================== */}
            <hr />

            <h3>Tabla de resultados</h3>

            <div className="table-scroll">
                <table className="caja-table">
                    <thead>
                        <tr>
                            <th>Fecha movimiento</th>
                            <th>Fecha registro</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Descripción</th>
                            <th>Hora registro</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtrados.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    style={{ textAlign: "center" }}
                                >
                                    No hay resultados
                                </td>
                            </tr>
                        ) : (
                            filtrados.map((movimiento) => (
                                <tr
                                    key={`${movimiento.fechaRegistro}-${movimiento.id}`}
                                >
                                    <td>
                                        {movimiento.fechaMovimiento
                                            ? formatearFechaMX(
                                                  movimiento.fechaMovimiento
                                              )
                                            : "—"}
                                    </td>

                                    <td>
                                        {movimiento.fechaRegistro
                                            ? formatearFechaMX(
                                                  movimiento.fechaRegistro
                                              )
                                            : "—"}
                                    </td>

                                    <td>
                                        {movimiento.tipo ===
                                        "entrada"
                                            ? "Entrada"
                                            : "Gasto"}
                                    </td>

                                    <td
                                        style={{
                                            color:
                                                movimiento.tipo ===
                                                "gasto"
                                                    ? "red"
                                                    : "green",
                                        }}
                                    >
                                        {formatearMoneda(
                                            movimiento.cantidad
                                        )}
                                    </td>

                                    <td>
                                        {movimiento.descripcion}
                                    </td>

                                    <td>
                                        {movimiento.horaRegistro}
                                    </td>
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