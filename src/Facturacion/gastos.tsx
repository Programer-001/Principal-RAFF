// src/Facturacion/gastos.tsx
// Componente para registrar, editar y eliminar gastos y entradas de dinero en caja

import React, { useEffect, useState } from "react";
import { getDatabase,ref,set,onValue,push,update,remove} from "firebase/database";
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
    tipo: "entrada" | "gasto";
    cantidad: number;
    descripcion: string;
    fecha: string;
    fechaMovimiento: string;
}

const Gastos: React.FC = () => {
    const db = getDatabase(app);

    // Fecha donde se guardan los movimientos registrados hoy
    const fechaReporte = formatearFechaFirebase(obtenerFechaLocal());

    // Fecha seleccionada para indicar cuándo ocurrió el gasto
    const [fechaGasto, setFechaGasto] = useState(obtenerFechaLocal());

    const [cantidadEntrada, setCantidadEntrada] = useState<number>(0);
    const [cantidadGasto, setCantidadGasto] = useState<number>(0);
    const [descripcion, setDescripcion] = useState("");

    const [movimientos, setMovimientos] = useState<MovimientoGasto[]>([]);
    const [fondo, setFondo] = useState(0);

    // Movimiento que actualmente se está editando
    const [movimientoEditandoId, setMovimientoEditandoId] = useState<
        string | null
    >(null);

    // Valores temporales del movimiento en edición
    const [edicionTipo, setEdicionTipo] = useState<"entrada" | "gasto">(
        "gasto"
    );
    const [edicionCantidad, setEdicionCantidad] = useState<number>(0);
    const [edicionDescripcion, setEdicionDescripcion] = useState("");
    const [edicionFechaMovimiento, setEdicionFechaMovimiento] = useState("");

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
                if (mov.tipo === "entrada") {
                    return acc + Number(mov.cantidad || 0);
                }

                if (mov.tipo === "gasto") {
                    return acc - Number(mov.cantidad || 0);
                }

                return acc;
            }, 0);

            setFondo(total);
        });

        return () => unsubscribe();
    }, [db, fechaReporte]);

    const agregarEntrada = async () => {
        if (cantidadEntrada <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }

        const nuevoId = push(ref(db, `gastos/${fechaReporte}`)).key;

        if (!nuevoId) {
            alert("No se pudo generar el movimiento");
            return;
        }

        const nuevo: MovimientoGasto = {
            id: nuevoId,
            tipo: "entrada",
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
            alert("Selecciona una fecha");
            return;
        }

        if (cantidadGasto <= 0) {
            alert("Ingresa un gasto válido");
            return;
        }

        if (!descripcion.trim()) {
            alert("Ingresa una descripción del gasto");
            return;
        }

        if (cantidadGasto > fondo) {
            alert("❌ No puedes gastar más de lo disponible");
            return;
        }

        const nuevoId = push(ref(db, `gastos/${fechaReporte}`)).key;

        if (!nuevoId) {
            alert("No se pudo generar el movimiento");
            return;
        }

        const nuevo: MovimientoGasto = {
            id: nuevoId,
            tipo: "gasto",
            cantidad: cantidadGasto,
            descripcion: descripcion.trim(),
            fecha: new Date().toLocaleTimeString(),
            fechaMovimiento: fechaGasto,
        };

        await set(ref(db, `gastos/${fechaReporte}/${nuevo.id}`), nuevo);

        setCantidadGasto(0);
        setDescripcion("");
        setFechaGasto(obtenerFechaLocal());
    };

    const iniciarEdicion = (movimiento: MovimientoGasto) => {
        setMovimientoEditandoId(movimiento.id);
        setEdicionTipo(movimiento.tipo);
        setEdicionCantidad(movimiento.cantidad);
        setEdicionDescripcion(movimiento.descripcion);
        setEdicionFechaMovimiento(
            movimiento.fechaMovimiento || obtenerFechaLocal()
        );
    };

    const cancelarEdicion = () => {
        setMovimientoEditandoId(null);
        setEdicionTipo("gasto");
        setEdicionCantidad(0);
        setEdicionDescripcion("");
        setEdicionFechaMovimiento("");
    };

    const guardarEdicion = async (movimientoOriginal: MovimientoGasto) => {
        if (edicionCantidad <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }

        if (!edicionFechaMovimiento) {
            alert("Selecciona una fecha");
            return;
        }

        if (!edicionDescripcion.trim()) {
            alert("Ingresa una descripción");
            return;
        }

        /*
         * Calculamos cuánto dinero habría disponible sin contar
         * el movimiento que estamos editando.
         */
        const fondoSinMovimientoOriginal =
            movimientoOriginal.tipo === "entrada"
                ? fondo - movimientoOriginal.cantidad
                : fondo + movimientoOriginal.cantidad;

        /*
         * Si el movimiento editado será un gasto, validamos que
         * no supere el fondo disponible sin contar la fila original.
         */
        if (
            edicionTipo === "gasto" &&
            edicionCantidad > fondoSinMovimientoOriginal
        ) {
            alert(
                `❌ El gasto no puede ser mayor al fondo disponible: ${formatearMoneda(
                    fondoSinMovimientoOriginal
                )}`
            );
            return;
        }

        try {
            await update(
                ref(db, `gastos/${fechaReporte}/${movimientoOriginal.id}`),
                {
                    tipo: edicionTipo,
                    cantidad: edicionCantidad,
                    descripcion: edicionDescripcion.trim(),
                    fechaMovimiento: edicionFechaMovimiento,
                }
            );

            cancelarEdicion();
        } catch (error) {
            console.error("Error al actualizar movimiento:", error);
            alert("No se pudo actualizar el movimiento");
        }
    };

    const eliminarMovimiento = async (movimiento: MovimientoGasto) => {
        const tipoTexto =
            movimiento.tipo === "entrada" ? "la entrada" : "el gasto";

        const confirmar = window.confirm(
            `¿Seguro que deseas eliminar ${tipoTexto} de ${formatearMoneda(
                movimiento.cantidad
            )}?\n\nEsta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        try {
            await remove(
                ref(db, `gastos/${fechaReporte}/${movimiento.id}`)
            );

            if (movimientoEditandoId === movimiento.id) {
                cancelarEdicion();
            }
        } catch (error) {
            console.error("Error al eliminar movimiento:", error);
            alert("No se pudo eliminar el movimiento");
        }
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
                    min="0"
                    step="0.01"
                    placeholder="Cantidad para fondo"
                    value={cantidadEntrada || ""}
                    onKeyDown={(e) => {
                        if (["-", "+", "e", "E"].includes(e.key)) {
                            e.preventDefault();
                        }
                    }}
                    onChange={(e) =>
                        setCantidadEntrada(
                            Math.max(0, parseFloat(e.target.value) || 0)
                        )
                    }
                    className="gastos-input"
                />

                <button
                    type="button"
                    onClick={agregarEntrada}
                    className="btn btn-green"
                >
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
                            min="0"
                            step="0.01"
                            placeholder="Cantidad"
                            value={cantidadGasto || ""}
                            onKeyDown={(e) => {
                                if (["-", "+", "e", "E"].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) =>
                                setCantidadGasto(
                                    Math.max(
                                        0,
                                        parseFloat(e.target.value) || 0
                                    )
                                )
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

                        <button
                            type="button"
                            onClick={agregarGasto}
                            className="btn btn-red gastos-btn"
                        >
                            ➖ Registrar gasto
                        </button>
                    </div>
                </>
            )}

            {/* =========================
                TABLA DE MOVIMIENTOS
            ========================= */}
            {movimientos.length > 0 && (
                <>
                    <h3 className="gastos-subtitle">
                        Movimientos del{" "}
                        {formatearFechaMX(obtenerFechaLocal())}
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
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {movimientos.map((movimiento) => {
                                        const estaEditando =
                                            movimientoEditandoId ===
                                            movimiento.id;

                                        return (
                                            <tr key={movimiento.id}>
                                                <td>
                                                    {estaEditando ? (
                                                        <select
                                                            value={edicionTipo}
                                                            onChange={(e) =>
                                                                setEdicionTipo(
                                                                    e.target
                                                                        .value as
                                                                        | "entrada"
                                                                        | "gasto"
                                                                )
                                                            }
                                                            className="gastos-input gastos-input-tabla"
                                                        >
                                                            <option value="entrada">
                                                                Entrada
                                                            </option>

                                                            <option value="gasto">
                                                                Gasto
                                                            </option>
                                                        </select>
                                                    ) : movimiento.tipo ===
                                                      "entrada" ? (
                                                        "Entrada"
                                                    ) : (
                                                        "Gasto"
                                                    )}
                                                </td>

                                                <td
                                                    style={{
                                                        color: estaEditando
                                                            ? undefined
                                                            : movimiento.tipo ===
                                                                "gasto"
                                                              ? "red"
                                                              : "green",
                                                    }}
                                                >
                                                    {estaEditando ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={
                                                                edicionCantidad ||
                                                                ""
                                                            }
                                                            onKeyDown={(e) => {
                                                                if (
                                                                    [
                                                                        "-",
                                                                        "+",
                                                                        "e",
                                                                        "E",
                                                                    ].includes(
                                                                        e.key
                                                                    )
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            onChange={(e) =>
                                                                setEdicionCantidad(
                                                                    Math.max(
                                                                        0,
                                                                        parseFloat(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) || 0
                                                                    )
                                                                )
                                                            }
                                                            className="gastos-input gastos-input-tabla"
                                                        />
                                                    ) : (
                                                        formatearMoneda(
                                                            movimiento.cantidad
                                                        )
                                                    )}
                                                </td>

                                                <td>
                                                    {estaEditando ? (
                                                        <input
                                                            type="text"
                                                            value={
                                                                edicionDescripcion
                                                            }
                                                            onChange={(e) =>
                                                                setEdicionDescripcion(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="gastos-input gastos-input-tabla"
                                                        />
                                                    ) : (
                                                        movimiento.descripcion
                                                    )}
                                                </td>

                                                <td>
                                                    {estaEditando ? (
                                                        <input
                                                            type="date"
                                                            value={
                                                                edicionFechaMovimiento
                                                            }
                                                            max={obtenerFechaLocal()}
                                                            onChange={(e) =>
                                                                setEdicionFechaMovimiento(
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="gastos-input gastos-input-tabla"
                                                        />
                                                    ) : movimiento.fechaMovimiento ? (
                                                        formatearFechaMX(
                                                            movimiento.fechaMovimiento
                                                        )
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>

                                                <td>{movimiento.fecha}</td>

                                                <td>
                                                    <div className="gastos-acciones">
                                                        {estaEditando ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-green gastos-btn-accion"
                                                                    onClick={() =>
                                                                        guardarEdicion(
                                                                            movimiento
                                                                        )
                                                                    }
                                                                >
                                                                    💾 Guardar
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn gastos-btn-cancelar gastos-btn-accion"
                                                                    onClick={
                                                                        cancelarEdicion
                                                                    }
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-blue gastos-btn-accion"
                                                                    onClick={() =>
                                                                        iniciarEdicion(
                                                                            movimiento
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        movimientoEditandoId !==
                                                                        null
                                                                    }
                                                                >
                                                                    ✏️ Editar
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-red gastos-btn-accion"
                                                                    onClick={() =>
                                                                        eliminarMovimiento(
                                                                            movimiento
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        movimientoEditandoId !==
                                                                        null
                                                                    }
                                                                >
                                                                    🗑️ Eliminar
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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