import React, { useEffect, useMemo, useState } from "react";
import { onValue, ref, remove } from "firebase/database";
import { db } from "../firebase/config";
import { generarPDFPedidoProveedor } from "../plantillas/plantillaPedidoEspecial";
//import "../css/consulta_pedidos_especiales.css";

interface ProveedorSnapshot {
    alias?: string;
    nombre?: string;
}

interface ClienteSnapshot {
    nombre?: string;
    razonSocial?: string;
}

interface PartidaPedidoEspecial {
    partida?: string;
    tipo?: string;
    descripcion?: string;
    cantidad?: number;
    voltaje?: string | number;
    potencia?: string | number;
    precio_proveedor?: number;
    totalCalculado?: number;
    confirmada?: boolean;
    pedido_realizado?: boolean;
    pedido_recibido?: boolean;
    folio_pedido_especial?: string;
    pedidoEspecialActivo?: boolean;
}

interface OTPedidoEspecial {
    otLabel?: string;
    fecha?: string;
    tipoDocumento?: string;
    clienteSnapshot?: ClienteSnapshot;
    partidas?: PartidaPedidoEspecial[];
}

interface PedidoEspecial {
    folio: string;
    fecha_cotizacion?: string;
    pedido_realizado?: boolean;
    pedido_recibido?: boolean;
    cotizacion?: string;
    proveedorSnapshot?: ProveedorSnapshot;
    ots?: OTPedidoEspecial[];
}

const ConsultaPedidosEspeciales: React.FC = () => {
    const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
    const [busquedaFolio, setBusquedaFolio] = useState("");
    const [folioAbierto, setFolioAbierto] = useState<string | null>(null);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState<PedidoEspecial | null>(null);
    const [loading, setLoading] = useState(true);
    const [indicesSlider, setIndicesSlider] = useState<Record<string, number>>({});

    useEffect(() => {
        const pedidosRef = ref(db, "pedidos_especiales");

        const unsubscribe = onValue(pedidosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                const lista: PedidoEspecial[] = Object.entries(data).map(
                    ([folio, pedido]: [string, any]) => ({
                        folio,
                        fecha_cotizacion: pedido?.fecha_cotizacion || "",
                        pedido_realizado: !!pedido?.pedido_realizado,
                        pedido_recibido: !!pedido?.pedido_recibido,
                        cotizacion: pedido?.cotizacion || "",
                        proveedorSnapshot: {
                            alias: pedido?.proveedorSnapshot?.alias || "",
                            nombre: pedido?.proveedorSnapshot?.nombre || "",
                        },
                        ots: Array.isArray(pedido?.ots)
                            ? pedido.ots.map((ot: any) => ({
                                otLabel: ot?.otLabel || "",
                                fecha: ot?.fecha || "",
                                tipoDocumento: ot?.tipoDocumento || "",
                                clienteSnapshot: {
                                    nombre: ot?.clienteSnapshot?.nombre || "",
                                    razonSocial: ot?.clienteSnapshot?.razonSocial || "",
                                },
                                partidas: Array.isArray(ot?.partidas)
                                    ? ot.partidas.map((partida: any) => ({
                                        partida: partida?.partida || "",
                                        tipo: partida?.tipo || "",
                                        descripcion: partida?.descripcion || "",
                                        cantidad: Number(partida?.cantidad || 0),
                                        voltaje: partida?.voltaje || "",
                                        potencia: partida?.potencia || "",
                                        precio_proveedor: Number(partida?.precio_proveedor || 0),
                                        totalCalculado: Number(partida?.totalCalculado || 0),
                                        confirmada: !!partida?.confirmada,
                                        pedido_realizado: !!partida?.pedido_realizado,
                                        pedido_recibido: !!partida?.pedido_recibido,
                                        folio_pedido_especial:
                                            partida?.folio_pedido_especial || "",
                                        pedidoEspecialActivo:
                                            !!partida?.pedidoEspecialActivo,
                                    }))
                                    : [],
                            }))
                            : [],
                    })
                );

                lista.sort((a, b) => {
                    const fa = (a.fecha_cotizacion || "").toString();
                    const fb = (b.fecha_cotizacion || "").toString();
                    return fb.localeCompare(fa);
                });

                setPedidos(lista);
            } else {
                setPedidos([]);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const pedidosFiltrados = useMemo(() => {
        const texto = busquedaFolio.toLowerCase().trim();

        if (!texto) return pedidos;

        return pedidos.filter((pedido) => {
            const folio = String(pedido.folio || "").toLowerCase();
            const alias = String(pedido.proveedorSnapshot?.alias || "").toLowerCase();
            const nombre = String(pedido.proveedorSnapshot?.nombre || "").toLowerCase();
            const cotizacion = String(pedido.cotizacion || "").toLowerCase();

            const coincideOT = (pedido.ots || []).some((ot) =>
                String(ot.otLabel || "").toLowerCase().includes(texto) ||
                String(ot.clienteSnapshot?.nombre || "").toLowerCase().includes(texto) ||
                String(ot.clienteSnapshot?.razonSocial || "").toLowerCase().includes(texto) ||
                (ot.partidas || []).some((p) =>
                    String(p.partida || "").toLowerCase().includes(texto) ||
                    String(p.descripcion || "").toLowerCase().includes(texto) ||
                    String(p.tipo || "").toLowerCase().includes(texto)
                )
            );

            return (
                folio.includes(texto) ||
                alias.includes(texto) ||
                nombre.includes(texto) ||
                cotizacion.includes(texto) ||
                coincideOT
            );
        });
    }, [pedidos, busquedaFolio]);

    const toggleFolio = (folio: string, pedido: PedidoEspecial) => {
        if (folioAbierto === folio) {
            setFolioAbierto(null);
            setPedidoSeleccionado(null);
            return;
        }

        setFolioAbierto(folio);
        setPedidoSeleccionado(pedido);
    };

    const totalOTs = pedidoSeleccionado?.ots?.length || 0;

    const totalPartidas =
        pedidoSeleccionado?.ots?.reduce((accOT, ot) => {
            return accOT + (ot.partidas?.length || 0);
        }, 0) || 0;

    const totalProveedor =
        pedidoSeleccionado?.ots?.reduce((accOT, ot) => {
            const subtotal =
                ot.partidas?.reduce((accPartida, partida) => {
                    if (partida.confirmada) {
                        return accPartida + Number(partida.precio_proveedor || 0);
                    }
                    return accPartida;
                }, 0) || 0;

            return accOT + subtotal;
        }, 0) || 0;

    const formatearMoneda = (valor: number) => {
        return valor.toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
        });
    };
    //elimina el folio
    const eliminarPedido = async (folio: string) => {
        const confirmar = window.confirm(
            `¿Seguro que deseas eliminar el pedido ${folio}? Esta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        try {
            const pedidoRef = ref(db, `pedidos_especiales/${folio}`);
            await remove(pedidoRef);

            // Si el que borraste estaba abierto → limpiar visor
            if (folioAbierto === folio) {
                setFolioAbierto(null);
                setPedidoSeleccionado(null);
            }

        } catch (error) {
            console.error("Error al eliminar pedido:", error);
            alert("Error al eliminar el pedido");
        }
    };
    //SLIDER MANUAL
    const irAnterior = (otKey: string, total: number) => {
        setIndicesSlider((prev) => {
            const actual = prev[otKey] ?? 0;
            const nuevo = actual === 0 ? total - 1 : actual - 1;
            return { ...prev, [otKey]: nuevo };
        });
    };

    const irSiguiente = (otKey: string, total: number) => {
        setIndicesSlider((prev) => {
            const actual = prev[otKey] ?? 0;
            const nuevo = actual === total - 1 ? 0 : actual + 1;
            return { ...prev, [otKey]: nuevo };
        });
    };
    //PDF
    const handleGuardarPDFProveedor = () => {
        if (!pedidoSeleccionado) {
            alert("Selecciona un pedido primero");
            return;
        }

        generarPDFPedidoProveedor({
            folio: pedidoSeleccionado.folio,
            proveedor:
                pedidoSeleccionado.proveedorSnapshot?.nombre ||
                pedidoSeleccionado.proveedorSnapshot?.alias ||
                "",
            partidas: (pedidoSeleccionado.ots || []).flatMap((ot) =>
                (ot.partidas || []).map((p) => ({
                    cantidad: p.cantidad || 0,
                    descripcion: p.descripcion || "",
                    potencia: String(p.potencia || ""),
                    voltaje: String(p.voltaje || ""),
                }))
            ),
        });
    };
    return (
        <div className="consulta-pedidos-layout">
            {/* VISOR IZQUIERDO CUANDO NO TENEMOS SELECCIONADO NADA */}
            <div className="consulta-pedidos-visor">
                {!pedidoSeleccionado ? (
                    <div className="visor-vacio">
                        <h2>Consulta de pedidos especiales</h2>
                        <p>Selecciona un folio del lado derecho para ver su detalle.</p>
                    </div>
                ) : (
                    <div className="visor-documento">
                        {/* ENCABEZADO */}
                        <div className="documento-header">
                            <div>
                                <h1 className="documento-titulo">
                                    Pedido especial:
                                </h1>
                                <h2 className="documento-subtitulo">
                                    {pedidoSeleccionado.folio}
                                </h2>
                            </div>
                        </div>

                        {/* DATOS GENERALES */}
                        <div className="documento-bloque">
                            <div className="documento-grid">
                                <div>
                                    <b>Fecha cotización:</b>{" "}
                                    {pedidoSeleccionado.fecha_cotizacion || "--"}
                                </div>

                                <div>
                                    <b>Pedido realizado:</b>{" "}
                                    {pedidoSeleccionado.pedido_realizado ? "Sí" : "No"}
                                </div>

                                <div>
                                    <b>Pedido recibido:</b>{" "}
                                    {pedidoSeleccionado.pedido_recibido ? "Sí" : "No"}
                                </div>

                                <div>
                                    <b>Proveedor:</b>{" "}
                                    {pedidoSeleccionado.proveedorSnapshot?.alias ||
                                        pedidoSeleccionado.proveedorSnapshot?.nombre ||
                                        "--"}
                                </div>

                                <div className="resumen-card">
                                    <b>Total proveedor</b>{" "}
                                    {formatearMoneda(totalProveedor)}
                                </div>
                            </div>
                        </div>

                        {/* DETALLE */}
                        <div className="documento-bloque">
                            <h2>Detalle por OT</h2>

                            {!pedidoSeleccionado.ots || pedidoSeleccionado.ots.length === 0 ? (
                                <h3>No hay OTs guardadas en este pedido.</h3>
                            ) : (
                                pedidoSeleccionado.ots.map((ot, indexOT) => {
                                    const nombreCliente =
                                        ot.clienteSnapshot?.nombre ||
                                        ot.clienteSnapshot?.razonSocial ||
                                        "--";

                                    const partidas = ot.partidas || [];
                                    const otKey = ot.otLabel || `ot-${indexOT}`;
                                    const indiceActual = indicesSlider[otKey] ?? 0;
                                    const partidaActual = partidas[indiceActual];

                                    return (
                                        <div className="bloque-ot" key={indexOT}>
                                            <div className="bloque-ot-header">
                                                <div>
                                                    <h2>{ot.otLabel || "OT sin folio"}</h2>
                                                    <p>
                                                        <b>Fecha:</b> {ot.fecha || "--"}
                                                    </p>
                                                    <p>
                                                        <b>Tipo documento:</b> {ot.tipoDocumento || "--"}
                                                    </p>
                                                    <p>
                                                        <b>Cliente:</b> {nombreCliente}
                                                    </p>
                                                </div>
                                            </div>

                                            {!partidas.length ? (
                                                <p>No hay partidas en esta OT.</p>
                                            ) : partidas.length === 1 ? (
                                                <div className="partida-ficha">
                                                    <div className="partida-ficha-top">
                                                        <h3>{partidas[0].partida || "--"}</h3>
                                                        <span className="partida-tipo-chip">
                                                            {partidas[0].tipo || "--"}
                                                        </span>
                                                    </div>

                                                    <div className="partida-ficha-body">
                                                        <p className="partida-descripcion">
                                                            <b>Descripción:</b>
                                                            <br />
                                                            {partidas[0].descripcion || "--"}
                                                        </p>

                                                        <p>
                                                            <b>Precio calculado:</b>{" "}
                                                            {formatearMoneda(
                                                                Number(partidas[0].totalCalculado || 0)
                                                            )}
                                                        </p>

                                                        <p>
                                                            <b>Confirmada:</b>{" "}
                                                            {partidas[0].confirmada ? "Sí" : "No"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="slider-partidas">
                                                    <div className="slider-header-simple">
                                                        <button
                                                            type="button"
                                                            className="slider-btn"
                                                            onClick={() =>
                                                                irAnterior(otKey, partidas.length)
                                                            }
                                                        >
                                                            ◀
                                                        </button>

                                                        <span className="slider-indicador">
                                                            {indiceActual + 1} / {partidas.length}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            className="slider-btn"
                                                            onClick={() =>
                                                                irSiguiente(otKey, partidas.length)
                                                            }
                                                        >
                                                            ▶
                                                        </button>
                                                    </div>

                                                    <div className="partida-ficha">
                                                        <div className="partida-ficha-top">
                                                            <h4>{partidaActual?.partida || "--"}</h4>
                                                            <span className="partida-tipo-chip">
                                                                {partidaActual?.tipo || "--"}
                                                            </span>
                                                        </div>

                                                        <div className="partida-ficha-body">
                                                            <p className="partida-descripcion">
                                                                <b>Descripción:</b>
                                                                <br />
                                                                {partidaActual?.descripcion || "--"}
                                                            </p>

                                                            <p>
                                                                <b>Precio calculado:</b>{" "}
                                                                {formatearMoneda(
                                                                    Number(
                                                                        partidaActual?.totalCalculado || 0
                                                                    )
                                                                )}
                                                            </p>

                                                            <p>
                                                                <b>Confirmada:</b>{" "}
                                                                {partidaActual?.confirmada ? "Sí" : "No"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* PANEL DERECHO */}
            <div className="consulta-pedidos-lista">
                <h3>Folios</h3>

                <input
                    type="text"
                    placeholder="Buscar folio, proveedor o cotización..."
                    value={busquedaFolio}
                    onChange={(e) => setBusquedaFolio(e.target.value)}
                    className="input-buscar-folio"
                />

                <div className="folios-scroll">
                    {loading ? (
                        <p>Cargando pedidos...</p>
                    ) : pedidosFiltrados.length === 0 ? (
                        <p>No se encontraron folios.</p>
                    ) : (
                        pedidosFiltrados.map((pedido) => (
                            <div key={pedido.folio} className="folio-card">
                                <div
                                    className={`folio-header ${folioAbierto === pedido.folio ? "activo" : ""
                                        }`}
                                >
                                    <div className="folio-header-content">
                                        <span
                                            onClick={() => toggleFolio(pedido.folio, pedido)}
                                            className="folio-titulo"
                                        >
                                            <strong>{pedido.folio}</strong>
                                        </span>

                                        <span
                                            className="folio-eliminar"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                eliminarPedido(pedido.folio);
                                            }}
                                        >
                                            ✕
                                        </span>
                                    </div>
                                </div>

                                {folioAbierto === pedido.folio && (
                                    <div className="folio-body">
                                        <p>
                                            <b>Proveedor:</b>{" "}
                                            {pedido.proveedorSnapshot?.alias ||
                                                pedido.proveedorSnapshot?.nombre ||
                                                "--"}
                                        </p>

                                        <p>
                                            <b>Fecha:</b>{" "}
                                            {pedido.fecha_cotizacion || "--"}
                                        </p>

                                        <p>
                                            <b>Pedido realizado:</b>{" "}
                                            {pedido.pedido_realizado ? "Sí" : "No"}
                                        </p>

                                        <p>
                                            <b>Pedido recibido:</b>{" "}
                                            {pedido.pedido_recibido ? "Sí" : "No"}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                generarPDFPedidoProveedor({
                                                    folio: pedido.folio,
                                                    proveedor:
                                                        pedido.proveedorSnapshot?.nombre ||
                                                        pedido.proveedorSnapshot?.alias ||
                                                        "",
                                                    partidas: (pedido.ots || []).flatMap((ot) =>
                                                        (ot.partidas || []).map((p) => ({
                                                            cantidad: p.cantidad || 0,
                                                            descripcion: p.descripcion || "",
                                                            potencia: String(p.potencia || ""),
                                                            voltaje: String(p.voltaje || ""),
                                                        }))
                                                    ),
                                                });
                                            }}
                                        >
                                            Guardar PDF
                                        </button>
                                    </div>
                                )}
                                {/*--------------*/ }
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsultaPedidosEspeciales;