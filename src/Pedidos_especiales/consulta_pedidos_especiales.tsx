import React, { useEffect, useMemo, useState } from "react";
import { onValue, ref, remove } from "firebase/database";
import { db } from "../firebase/config";
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
            const folio = (pedido.folio || "").toLowerCase();
            const alias = (pedido.proveedorSnapshot?.alias || "").toLowerCase();
            const nombre = (pedido.proveedorSnapshot?.nombre || "").toLowerCase();
            const cotizacion = (pedido.cotizacion || "").toLowerCase();

            return (
                folio.includes(texto) ||
                alias.includes(texto) ||
                nombre.includes(texto) ||
                cotizacion.includes(texto)
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

    return (
        <div className="consulta-pedidos-layout">
            {/* VISOR IZQUIERDO */}
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
                                <h2 className="documento-titulo">
                                    {pedidoSeleccionado.folio}
                                </h2>
                                <p className="documento-subtitulo">
                                    Pedido especial
                                </p>
                            </div>
                        </div>

                        {/* DATOS GENERALES */}
                        <div className="documento-bloque">
                            <h3>Encabezado</h3>

                            <div className="documento-grid">
                                <div>
                                    <b>Folio:</b> {pedidoSeleccionado.folio || "--"}
                                </div>
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
                                <div>
                                    <b>Cotización:</b>{" "}
                                    {pedidoSeleccionado.cotizacion || "--"}
                                </div>
                            </div>
                        </div>

                        {/* RESUMEN */}
                        <div className="documento-bloque">
                            <h3>Resumen</h3>

                            <div className="documento-grid resumen-grid">
                                <div className="resumen-card">
                                    <span className="resumen-label">Número de OTs</span>
                                    <strong>{totalOTs}</strong>
                                </div>

                                <div className="resumen-card">
                                    <span className="resumen-label">
                                        Número de partidas
                                    </span>
                                    <strong>{totalPartidas}</strong>
                                </div>

                                <div className="resumen-card">
                                    <span className="resumen-label">
                                        Total proveedor
                                    </span>
                                    <strong>{formatearMoneda(totalProveedor)}</strong>
                                </div>
                            </div>
                        </div>

                        {/* DETALLE */}
                        <div className="documento-bloque">
                            <h3>Detalle por OT</h3>

                            {!pedidoSeleccionado.ots ||
                            pedidoSeleccionado.ots.length === 0 ? (
                                <p>No hay OTs guardadas en este pedido.</p>
                            ) : (
                                pedidoSeleccionado.ots.map((ot, indexOT) => {
                                    const nombreCliente =
                                        ot.clienteSnapshot?.nombre ||
                                        ot.clienteSnapshot?.razonSocial ||
                                        "--";

                                    return (
                                        <div className="bloque-ot" key={indexOT}>
                                            <div className="bloque-ot-header">
                                                <div>
                                                    <h4>{ot.otLabel || "OT sin folio"}</h4>
                                                    <p>
                                                        <b>Fecha:</b> {ot.fecha || "--"}
                                                    </p>
                                                    <p>
                                                        <b>Tipo documento:</b>{" "}
                                                        {ot.tipoDocumento || "--"}
                                                    </p>
                                                    <p>
                                                        <b>Cliente:</b> {nombreCliente}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="table-scroll">
                                                <table className="caja-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Partida</th>
                                                            <th>Tipo</th>
                                                            <th>Descripción</th>
                                                            <th>Cantidad</th>
                                                            <th>Voltaje</th>
                                                            <th>Potencia</th>
                                                            <th>Precio proveedor</th>
                                                            <th>Total calculado</th>
                                                            <th>Confirmada</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {!ot.partidas ||
                                                        ot.partidas.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={9}>
                                                                    No hay partidas en esta OT.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            ot.partidas.map(
                                                                (partida, indexPartida) => (
                                                                    <tr
                                                                        key={`${ot.otLabel}-${indexPartida}`}
                                                                    >
                                                                        <td>
                                                                            {partida.partida || "--"}
                                                                        </td>
                                                                        <td>{partida.tipo || "--"}</td>
                                                                        <td>
                                                                            {partida.descripcion || "--"}
                                                                        </td>
                                                                        <td>
                                                                            {partida.cantidad || 0}
                                                                        </td>
                                                                        <td>
                                                                            {partida.voltaje || "--"}
                                                                        </td>
                                                                        <td>
                                                                            {partida.potencia || "--"}
                                                                        </td>
                                                                        <td>
                                                                            {formatearMoneda(
                                                                                Number(
                                                                                    partida.precio_proveedor || 0
                                                                                )
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            {formatearMoneda(
                                                                                Number(
                                                                                    partida.totalCalculado || 0
                                                                                )
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            {partida.confirmada
                                                                                ? "Sí"
                                                                                : "No"}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
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
                                                e.stopPropagation(); // 🔥 evita que abra/cierre el folio
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
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsultaPedidosEspeciales;