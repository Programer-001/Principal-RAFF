import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, update, remove } from "firebase/database";
import { app } from "../firebase/config";

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

const ModificarPago: React.FC = () => {
    const db = getDatabase(app);

    const hoy = new Date();
    const fecha =
        hoy.getDate().toString().padStart(2, "0") +
        (hoy.getMonth() + 1).toString().padStart(2, "0") +
        hoy.getFullYear().toString();

    const [pagos, setPagos] = useState<Pago[]>([]);
    const [filtro, setFiltro] = useState<string>("");
    const [resultado, setResultado] = useState<Pago | null>(null);

    const [nuevaCantidad, setNuevaCantidad] = useState<string>("");
    const [nuevoMetodo, setNuevoMetodo] = useState<string>("");

    const [comentarioCancelacion, setComentarioCancelacion] =
        useState<string>("");

    useEffect(() => {
        const pagosRef = ref(db, `corte-caja/${fecha}`);
        onValue(pagosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setPagos(Object.values(data));
            }
        });
    }, [db, fecha]);

    const buscar = () => {
        const pago = pagos.find(
            (p) => p.factura && p.factura.toLowerCase() === filtro.toLowerCase()
        );

        if (!pago) {
            alert("⚠️ No se encontró ninguna factura con ese número.");
            setResultado(null);
            return;
        }

        setResultado(pago);
        setNuevaCantidad(pago.cantidad.toString());
        setNuevoMetodo(pago.metodo);
        setComentarioCancelacion("");
    };

    const guardarCambios = async () => {
        if (!resultado) return;

        const id = resultado.id;
        const refPago = ref(db, `corte-caja/${fecha}/${id}`);

        let cantidadFinal = Number(nuevaCantidad);

        if (nuevoMetodo === "gasto") {
            cantidadFinal = -Math.abs(cantidadFinal);
        } else {
            cantidadFinal = Math.abs(cantidadFinal);
        }

        await update(refPago, {
            cantidad: cantidadFinal,
            metodo: nuevoMetodo,
        });

        alert("✔️ Pago actualizado correctamente");
        setResultado(null);
    };

    const cancelarPago = async () => {
        if (!resultado) return;

        if (!comentarioCancelacion.trim()) {
            alert("⚠️ Debes agregar un comentario de cancelación.");
            return;
        }

        if (!confirm("❗¿Seguro que deseas CANCELAR esta factura?")) return;

        const id = resultado.id;

        await update(ref(db, `corte-caja/${fecha}/${id}`), {
            estatus: false,
            comentarios: comentarioCancelacion,
        });

        alert("❌ Factura cancelada correctamente");
        setResultado(null);
        setFiltro("");
    };

    const eliminarPago = async () => {
        if (!resultado) return;

        if (!confirm("❗¿Seguro que deseas ELIMINAR esta factura definitivamente?"))
            return;

        const id = resultado.id;
        await remove(ref(db, `corte-caja/${fecha}/${id}`));

        alert("🗑 Registro eliminado");
        setResultado(null);
        setFiltro("");
    };

    return (
        <div className="caja-container">
            <h1 className="caja-title">✏️ Modificar Pago</h1>
            <p className="texto-cuerpo">
                ⚠️ Esta sección permite buscar, modificar, cancelar y eliminar facturas
                registradas en el día de hoy.
            </p>

            {/* Buscar */}
            <div className="input-gasto">
                <label className="input-gasto label">
                    Factura:
                    <input
                        type="text"
                        placeholder="Ej: A132"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        className="input-custom_gasto"
                    />
                </label>

                <button onClick={buscar} className="btn btn-red">
                    Buscar
                </button>
            </div>

            {resultado && (
                <>
                    <h2>Resultado encontrado</h2>

                    <table className="caja-table">
                        <thead>
                            <tr>
                                <th>Transacción</th>
                                <th>Cantidad</th>
                                <th>Método</th>
                                <th>Factura</th>
                                <th>Fecha</th>
                                <th>Estatus</th>
                                <th>Comentarios</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>{resultado.transaccion}</td>
                                <td>${resultado.cantidad}</td>
                                <td>{resultado.metodo}</td>
                                <td>{resultado.factura}</td>
                                <td>{resultado.fecha}</td>
                                <td style={{ color: resultado.estatus ? "green" : "red" }}>
                                    {resultado.estatus ? "Vigente" : "Cancelado"}
                                </td>
                                <td>{resultado.comentarios}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Editar */}
                    <div>
                        <div className="caja-modificar">
                            <div className="caja-item">
                                <label>Cantidad:</label>
                                <input
                                    type="number"
                                    value={nuevaCantidad}
                                    onChange={(e) => setNuevaCantidad(e.target.value)}
                                />
                            </div>

                            <div className="caja-item">
                                <label>Método:</label>
                                <select
                                    value={nuevoMetodo}
                                    onChange={(e) => setNuevoMetodo(e.target.value)}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="tarjeta_credito">Tarjeta Crédito</option>
                                    <option value="tarjeta_debito">Tarjeta Débito</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="gasto">Gasto</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={guardarCambios} className="btn btn-green">
                            Guardar Cambios
                        </button>
                        {/* CANCELAR FACTURA */}
                        <div className="caja-bloque">
                            <label>Comentario de cancelación:</label>

                            <input
                                type="text"
                                value={comentarioCancelacion}
                                onChange={(e) => setComentarioCancelacion(e.target.value)}
                                placeholder="Ej: Se canceló por.."
                            />

                            <button onClick={cancelarPago} className="btn btn-red">
                                Cancelar Factura
                            </button>
                        </div>

                        {/* Eliminar */}
                        <button onClick={eliminarPago} className="btn btn-blue">
                            Eliminar Registro
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ModificarPago;
