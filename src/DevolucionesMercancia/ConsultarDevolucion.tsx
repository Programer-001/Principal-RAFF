//src/DevolucionesMercancia/ConsultarDevolucion.tsx
//este archivo contiene el componente para consultar devoluciones de mercancía. Se puede buscar por folio, cliente o fecha. Se muestran los detalles de la devolución, incluyendo productos, motivo y estado. Se puede actualizar el estado de la devolución si es necesario.

// src/DevolucionesMercancia/ConsultarDevolucion.tsx

// src/DevolucionesMercancia/ConsultarDevolucion.tsx

import React, { useEffect, useState } from "react";
import { get, ref,remove  } from "firebase/database";
import { db } from "../firebase/config";
import { formatearFechaMX } from "../funciones/formato_fechas";
import { generarPDFDevolucion } from "../plantillas/plantilla_devolucion";

type TipoConsulta = "saldo" | "devolucion" | "garantia";

type Registro = {
    folio: string;
    fecha: string;
    clienteNombre: string;
    productos?: any[];
    motivo?: string;
    importe?: number;
    vigencia?: string;
    metodoPago?: string;
    fechaAplicacion?: string;
    observaciones?: string;
};

const rutas = {
    saldo: "Devolucion_de_mercancia/Saldos_a_favor",
    devolucion: "Devolucion_de_mercancia/Devoluciones",
    garantia: "Devolucion_de_mercancia/Garantias",
};

const titulos = {
    saldo: "💳 Saldo a favor",
    devolucion: "📦 Devolución",
    garantia: "🛡️ Garantía",
};

const ConsultarDevolucion: React.FC = () => {
    const [tipo, setTipo] = useState<TipoConsulta>("saldo");
    const [registros, setRegistros] = useState<Registro[]>([]);
    const [seleccionado, setSeleccionado] = useState<Registro | null>(null);
    const [abierto, setAbierto] = useState(true);

    const cargarRegistros = async () => {
        const snap = await get(ref(db, rutas[tipo]));

        if (!snap.exists()) {
            setRegistros([]);
            setSeleccionado(null);
            return;
        }

        const data = snap.val();

        const lista: Registro[] = Object.keys(data)
            .map((key) => ({
                folio: data[key].folio || key,
                ...data[key],
            }))
            .sort((a, b) => Number(b.folio) - Number(a.folio));

        setRegistros(lista);
        setSeleccionado(lista[0] || null);
        setAbierto(true);
    };

    useEffect(() => {
        cargarRegistros();
    }, [tipo]);
        // Función para imprimir el registro seleccionado
        const imprimirSeleccionado = async () => {
        if (!seleccionado) return;

        await generarPDFDevolucion({
            tipo,
            folio: seleccionado.folio,
            fecha: formatearFechaMX(seleccionado.fecha),
            clienteNombre: seleccionado.clienteNombre || "--",
            productos: (seleccionado.productos || []).map((p) => ({
                descripcion: p.descripcion || "",
                cantidad: Number(p.cantidad || 0),
                precio: Number(p.precio || 0),
            })),
            motivo: seleccionado.motivo || "--",
            importe: Number(seleccionado.importe || 0),
            vigencia: seleccionado.vigencia || "",
            metodoPago: seleccionado.metodoPago || "",
            fechaAplicacion: formatearFechaMX(seleccionado.fechaAplicacion || ""),
            observaciones: seleccionado.observaciones || "",
        });
    };
    // Función para eliminar el registro seleccionado
    const eliminarSeleccionado = async () => {
        if (!seleccionado) return;

        const confirmar = window.confirm(
            `¿Eliminar el folio ${seleccionado.folio}?`
        );

        if (!confirmar) return;

        try {
            await remove(
                ref(
                    db,
                    `${rutas[tipo]}/${seleccionado.folio}`
                )
            );

            await cargarRegistros();

            alert("Documento eliminado correctamente.");
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el documento.");
        }
    };

    return (
        <div className="consulta-devolucion">
            <h2>Consultar devoluciones</h2>

            <div className="devolucion-radio-group">
                <label className={`devolucion-radio-card ${tipo === "devolucion" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "devolucion"}
                        onChange={() => setTipo("devolucion")}
                    />
                    📦 Devoluciones
                </label>

                <label className={`devolucion-radio-card ${tipo === "saldo" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "saldo"}
                        onChange={() => setTipo("saldo")}
                    />
                    💳 Saldos a favor
                </label>

                <label className={`devolucion-radio-card ${tipo === "garantia" ? "activo" : ""}`}>
                    <input
                        type="radio"
                        checked={tipo === "garantia"}
                        onChange={() => setTipo("garantia")}
                    />
                    🛡️ Garantías
                </label>
            </div>

            <div className="consulta-layout">
                <div className="consulta-detalle">
                    {!seleccionado ? (
                        <p>No hay registros para consultar.</p>
                    ) : (
                        <div className="consulta-card">
                            <div
                                className="consulta-card-header"
                                onClick={() => setAbierto(!abierto)}
                            >
                                <h3>
                                    {abierto ? "▼" : "▶"} {titulos[tipo]}
                                </h3>
                            </div>

                            {abierto && (
                                <div className="consulta-card-body">
                                    <p><b>Cliente:</b> {seleccionado.clienteNombre || "--"}</p>
                                    <p><b>Folio:</b> {seleccionado.folio}</p>
                                    <p><b>Fecha:</b> {formatearFechaMX(seleccionado.fecha)}</p>
                                    <p><b>Motivo:</b> {seleccionado.motivo || "--"}</p>
                                    <p><b>Importe:</b> ${Number(seleccionado.importe || 0).toFixed(2)}</p>

                                    {tipo === "saldo" && (
                                        <p><b>Vigencia:</b> {seleccionado.vigencia || "--"}</p>
                                    )}

                                    {tipo === "devolucion" && (
                                        <>
                                            <p><b>Método de pago:</b> {seleccionado.metodoPago || "--"}</p>
                                            <p><b>Fecha de aplicación:</b> {formatearFechaMX(seleccionado.fechaAplicacion || "")}</p>
                                        </>
                                    )}

                                    {tipo === "garantia" && (
                                        <p><b>Observaciones:</b> {seleccionado.observaciones || "--"}</p>
                                    )}

                                    <h4>Productos</h4>

                                    <table className="devolucion-table">
                                        <thead>
                                            <tr>
                                                <th>Descripción</th>
                                                <th>Cantidad</th>
                                                <th>Precio</th>
                                                <th>Subtotal</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {(seleccionado.productos || []).map((p, index) => (
                                                <tr key={index}>
                                                    <td>{p.descripcion}</td>
                                                    <td>{p.cantidad}</td>
                                                    <td>${Number(p.precio || 0).toFixed(2)}</td>
                                                    <td>${Number((p.precio || 0) * (p.cantidad || 0)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="btn-container">
                                      <button
                                          type="button"
                                          className="btn btn-green"
                                          onClick={imprimirSeleccionado}
                                      >
                                          Imprimir
                                      </button>
                                        <button
                                          type="button"
                                          className="btn btn-red"
                                          onClick={eliminarSeleccionado}
                                      >
                                          Eliminar
                                      </button>
                                  </div>
                                </div>
                                
                            )}
                            
                        </div>
                    )}
                </div>

                <div className="consulta-folios">
                    <h3>Folios</h3>

                    {registros.map((registro) => (
                      <button
                          key={registro.folio}
                          type="button"
                          className={
                              seleccionado?.folio === registro.folio && abierto
                                  ? "folio-activo"
                                  : ""
                          }
                          onClick={() => {
                              if (seleccionado?.folio === registro.folio) {
                                  setAbierto(!abierto);
                                  return;
                              }

                              setSeleccionado(registro);
                              setAbierto(true);
                          }}
                      >
                          #{registro.folio}
                      </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ConsultarDevolucion;