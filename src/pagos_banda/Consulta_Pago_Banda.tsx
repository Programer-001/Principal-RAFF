import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import { ref, get, onValue, set } from "firebase/database";
import { formatearMoneda } from "../funciones/formato_moneda";

type TrabajoPagoBanda = {
    otKey?: string;
    otLabel?: string;
    partida?: string;
    tipo?: string;
    tipoBanda?: string;
    cliente?: string;
    descripcion?: string;
    cantidad?: number;
    precioBase?: number;
    pagoBarrenos?: number;
    usarLaminas?: boolean;
    laminasCantidad?: number;
    laminasPrecio?: number;
    pagoLaminas?: number;
    usarDobleces?: boolean;
    doblecesCantidad?: number;
    doblecesPrecio?: number;
    pagoDobleces?: number;
    fabricar440?: boolean;
    pago440?: number;
    usarCeramica?: boolean;
    ceramicaPorcentaje?: number;
    pagoCeramica?: number;
    precioUnitario?: number;
    total?: number;
    pagadoBanda?: boolean;
    fechaPagoBanda?: string;
    datosOriginales?: any;
};

type PagoBanda = {
    pago: string;
    pagoLabel: string;
    fecha: string;
    registradoPor: string;
    registradoPorUid: string;
    total: number;
    cantidadTrabajos: number;
    observaciones?: string;
    pagadoBanda?: boolean;
    fechaPagoBanda?: string;
    trabajos?: Record<string, TrabajoPagoBanda>;
};

const Consulta_Pago_Banda: React.FC = () => {
    const [busqueda, setBusqueda] = useState("");
    const [ultimosPagos, setUltimosPagos] = useState<PagoBanda[]>([]);
    const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoBanda | null>(null);
    const [loading, setLoading] = useState(false);

    const cargarPagos = async () => {
        try {
            setLoading(true);

            const snapshot = await get(ref(db, "pagos_banda"));

            if (!snapshot.exists()) {
                setUltimosPagos([]);
                setPagoSeleccionado(null);
                return;
            }

            const data = snapshot.val();

            const lista: PagoBanda[] = Object.entries(data).map(([key, value]: any) => ({
                pago: value.pago || "",
                pagoLabel: value.pagoLabel || key,
                fecha: value.fecha || "",
                registradoPor: value.registradoPor || "",
                registradoPorUid: value.registradoPorUid || "",
                total: Number(value.total) || 0,
                cantidadTrabajos: Number(value.cantidadTrabajos) || 0,
                observaciones: value.observaciones || "",
                pagadoBanda: Boolean(value.pagadoBanda),
                fechaPagoBanda: value.fechaPagoBanda || "",
                trabajos: value.trabajos || {},
            }));

            lista.sort((a, b) => Number(b.pago || 0) - Number(a.pago || 0));

            setUltimosPagos(lista.slice(0, 10));

            if (pagoSeleccionado) {
                const actualizado = lista.find((p) => p.pagoLabel === pagoSeleccionado.pagoLabel);

                if (actualizado) {
                    setPagoSeleccionado(actualizado);
                } else {
                    setPagoSeleccionado(null);
                }
            }
        } catch (error) {
            console.error("Error al cargar pagos_banda:", error);
            alert("Error al cargar pagos de banda");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const pagosRef = ref(db, "pagos_banda");

        const unsubscribe = onValue(pagosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setUltimosPagos([]);
                setPagoSeleccionado(null);
                return;
            }

            const data = snapshot.val();

            const lista: PagoBanda[] = Object.entries(data).map(([key, value]: any) => ({
                pago: value.pago || "",
                pagoLabel: value.pagoLabel || key,
                fecha: value.fecha || "",
                registradoPor: value.registradoPor || "",
                registradoPorUid: value.registradoPorUid || "",
                total: Number(value.total) || 0,
                cantidadTrabajos: Number(value.cantidadTrabajos) || 0,
                observaciones: value.observaciones || "",
                pagadoBanda: Boolean(value.pagadoBanda),
                fechaPagoBanda: value.fechaPagoBanda || "",
                trabajos: value.trabajos || {},
            }));

            lista.sort((a, b) => Number(b.pago || 0) - Number(a.pago || 0));

            setUltimosPagos(lista.slice(0, 10));

            if (pagoSeleccionado) {
                const actualizado = lista.find((p) => p.pagoLabel === pagoSeleccionado.pagoLabel);

                if (actualizado) {
                    setPagoSeleccionado(actualizado);
                } else {
                    setPagoSeleccionado(null);
                }
            }
        });

        return () => unsubscribe();
    }, [pagoSeleccionado?.pagoLabel]);

    const pagosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return ultimosPagos;

        return ultimosPagos.filter((pago) => {
            const coincideEncabezado =
                (pago.pagoLabel || "").toLowerCase().includes(texto) ||
                (pago.fecha || "").toLowerCase().includes(texto) ||
                (pago.registradoPor || "").toLowerCase().includes(texto);

            const trabajosArray = Object.values(pago.trabajos || {});

            const coincideTrabajos = trabajosArray.some((trabajo) => {
                return (
                    (trabajo.otLabel || "").toLowerCase().includes(texto) ||
                    (trabajo.partida || "").toLowerCase().includes(texto) ||
                    (trabajo.cliente || "").toLowerCase().includes(texto) ||
                    (trabajo.descripcion || "").toLowerCase().includes(texto) ||
                    (trabajo.tipoBanda || "").toLowerCase().includes(texto)
                );
            });

            return coincideEncabezado || coincideTrabajos;
        });
    }, [ultimosPagos, busqueda]);

    const seleccionarPago = (pago: PagoBanda) => {
        if (pagoSeleccionado?.pagoLabel === pago.pagoLabel) {
            setPagoSeleccionado(null);
        } else {
            setPagoSeleccionado(pago);
        }
    };
    const trabajosArray = Object.entries(pagoSeleccionado?.trabajos || {});
    //Eliminar pago
    const eliminarPago = async (pagoLabel: string) => {
        const confirmar = window.confirm("⚠ ¿Seguro que deseas eliminar este pago?");

        if (!confirmar) return;

        try {
            await set(ref(db, `pagos_banda/${pagoLabel}`), null);

            // Si el que borraste estaba abierto, lo limpias
            if (pagoSeleccionado?.pagoLabel === pagoLabel) {
                setPagoSeleccionado(null);
            }

        } catch (error) {
            console.error("Error al eliminar pago:", error);
            alert("Error al eliminar el pago");
        }
    };
    //----------------------------------HTML----------------------------------------------->>
    return (
        <div style={{
            display: "flex", gap: 30, padding: 20, maxWidth: 1200, margin: "0 auto", }}>
            {/* LADO IZQUIERDO */}
            <div style={{ flex: 3 }}>
                <h2>Consulta de pagos de banda</h2>

                <div className="busqueda_folio" style={{ marginBottom: 20 }}>
                    <input
                        type="text"
                        placeholder="Buscar por PB-00001, OT, partida, cliente o registrado por"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />

                    <button className="btn btn-blue" onClick={cargarPagos}>
                        Recargar
                    </button>
                </div>

                {loading && <p>Cargando pagos...</p>}

                {!loading && !pagoSeleccionado && (
                    <p>No hay pagos de banda para mostrar.</p>
                )}

                {pagoSeleccionado && (
                    <div
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: 10,
                            padding: 16,
                            background: "#fff",
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <h2 style={{ marginBottom: 10 }}>{pagoSeleccionado.pagoLabel}</h2>

                            <p><strong>Fecha:</strong> {pagoSeleccionado.fecha || "--"}</p>
                            <p><strong>Registrado por:</strong> {pagoSeleccionado.registradoPor || "--"}</p>
                            <p><strong>Pagado:</strong> {pagoSeleccionado.pagadoBanda ? "Sí" : "No"}</p>
                            <p><strong>Fecha de pago:</strong> {pagoSeleccionado.fechaPagoBanda || "--"}</p>
                            <p><strong>Cantidad de trabajos:</strong> {pagoSeleccionado.cantidadTrabajos || 0}</p>
                            <p><strong>Total:</strong> {formatearMoneda(pagoSeleccionado.total || 0)}</p>
                            <p><strong>Observaciones:</strong> {pagoSeleccionado.observaciones || "--"}</p>
                        </div>

                        <hr />

                        <h3 style={{ marginTop: 12 }}>Trabajos</h3>

                        <div
                            style={{
                                maxHeight: 420,
                                overflowY: "auto",
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: 10,
                                background: "#fafafa",
                            }}
                        >
                            {trabajosArray.length === 0 ? (
                                <p>No hay trabajos guardados.</p>
                            ) : (
                                trabajosArray.map(([trabajoKey, trabajo]) => (
                                    <div
                                        key={trabajoKey}
                                        style={{
                                            borderTop: "1px solid #eee",
                                            paddingTop: 10,
                                            marginTop: 10,
                                            background: "#fff",
                                            borderRadius: 6,
                                            padding: 12,
                                            marginBottom: 10,
                                        }}
                                    >
                                        <p><strong>OT:</strong> {trabajo.otLabel || "--"}</p>
                                        <p><strong>Partida:</strong> {trabajo.partida || "--"}</p>
                                        <p><strong>Tipo:</strong> {trabajo.tipoBanda || "--"}</p>
                                        <p><strong>Cliente:</strong> {trabajo.cliente || "--"}</p>
                                        <p><strong>Descripción:</strong> {trabajo.descripcion || "--"}</p>
                                        <p><strong>Cantidad:</strong> {trabajo.cantidad || 0}</p>

                                        <p><strong>Precio base:</strong> {formatearMoneda(trabajo.precioBase || 0)}</p>
                                        <p><strong>Barrenos:</strong> {formatearMoneda(trabajo.pagoBarrenos || 0)}</p>
                                        <p>
                                            <strong>Láminas:</strong>{" "}
                                            {trabajo.usarLaminas ? "Sí" : "No"}{" "}
                                            {formatearMoneda(trabajo.pagoLaminas || 0)}
                                        </p>
                                        <p>
                                            <strong>Dobleces:</strong>{" "}
                                            {trabajo.usarDobleces ? "Sí" : "No"}{" "}
                                            {formatearMoneda(trabajo.pagoDobleces || 0)}
                                        </p>
                                        <p><strong>440V:</strong> {formatearMoneda(trabajo.pago440 || 0)}</p>
                                        <p>
                                            <strong>Cerámica:</strong>{" "}
                                            {trabajo.usarCeramica ? "Sí" : "No"}{" "}
                                            {formatearMoneda(trabajo.pagoCeramica || 0)}
                                        </p>

                                        <p><strong>Precio unitario:</strong> {formatearMoneda(trabajo.precioUnitario || 0)}</p>
                                        <p><strong>Total:</strong> {formatearMoneda(trabajo.total || 0)}</p>
                                        <p><strong>Pagado banda:</strong> {trabajo.pagadoBanda ? "Sí" : "No"}</p>
                                        <p><strong>Fecha pago banda:</strong> {trabajo.fechaPagoBanda || "--"}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* LADO DERECHO */}
            <div
                style={{
                    flex: 1,
                    borderLeft: "1px solid #ccc",
                    paddingLeft: 20,
                    minWidth: 240,
                }}
            >
                <h3>Últimos pagos</h3>

                {pagosFiltrados.length === 0 ? (
                    <p>No hay resultados.</p>
                ) : (
                        pagosFiltrados.map((pago, index) => (
                            <div
                                key={pago.pagoLabel}
                                style={{
                                    padding: 10,
                                    marginBottom: 10,
                                    border: "1px solid #ccc",
                                    cursor: "pointer",
                                    background:
                                        pagoSeleccionado?.pagoLabel === pago.pagoLabel
                                            ? "#dbeafe"
                                            : index === 0
                                                ? "#f5f5f5"
                                                : "#fff",
                                    borderRadius: 8,
                                    position: "relative",
                                }}
                                onClick={() => seleccionarPago(pago)}
                            >
                                {/* ❌ BOTÓN ELIMINAR */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // 🔴 IMPORTANTE (evita que abra el pago)
                                        eliminarPago(pago.pagoLabel);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: 5,
                                        right: 5,
                                        background: "red",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: 22,
                                        height: 22,
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: "bold",
                                    }}
                                >
                                    X
                                </button>

                                <strong>{pago.pagoLabel}</strong>
                                <br />
                                <small>{pago.fecha || "--"}</small>
                                <br />
                                <small>{pago.registradoPor || "--"}</small>
                                <br />
                                <small>{formatearMoneda(pago.total || 0)}</small>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
};

export default Consulta_Pago_Banda;