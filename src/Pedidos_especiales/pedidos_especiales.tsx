// src/Pedidos_especiales/pedidos_especiales.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    get,
    ref,
    runTransaction,
    set,
    update,
} from "firebase/database";
import { db } from "../firebase/config";
import { formatearMoneda } from "../funciones/formato_moneda";

type TipoPermitido = "cuarzo" | "CartuchoA";
interface Proveedor {
    key: string;
    id?: string;
    alias?: string;
    nombre?: string;
    domicilio?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
    pais?: string;
    rfc?: string;
    vendedor?: string;
    notas?: string;
}
interface TrabajoOriginal {
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number;
    precio_proveedor?: number | string;
    datos?: any;
    estadoProduccion?: string;
    pedido_realizado?: string;
    pedido_recibido?: string;
    numeroSerie?: string;
    folio_pedido_especial?: string;
    pedidoEspecialActivo?: boolean;
}
interface OTFirebase {
    ot?: string;
    otLabel?: string;
    fecha?: string;
    tipoDocumento?: string;
    clienteId?: string | null;
    clienteSnapshot?: any;
    trabajos?: Record<string, TrabajoOriginal>;
    [key: string]: any;
}

interface PartidaEspecial {
    otFirebaseKey: string;
    ot: string;
    otLabel: string;
    partidaKey: string;
    partida: string;
    tipo: TipoPermitido;
    descripcion: string;
    cantidad: number;
    voltaje: number;
    potencia: number;
    totalOriginal: number;
    precioProveedorConfirmado: number;
    precioProveedor: number;
    totalCapturado: number;
    totalCalculado: number;
    confirmada: boolean;
    pedido_realizado?: string;
    pedido_recibido?: string;
    numeroSerie?: string;
    folio_pedido_especial?: string;
    pedidoEspecialActivo?: boolean;
    datos: any;
}

interface OTEspecial {
    otFirebaseKey: string;
    ot: string;
    otLabel: string;
    fecha?: string;
    tipoDocumento?: string;
    clienteId?: string | null;
    clienteSnapshot?: any;
    raw: OTFirebase;
    partidas: PartidaEspecial[];
}

const TIPOS_VALIDOS: TipoPermitido[] = ["cuarzo", "CartuchoA"];

const obtenerFechaHoy = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
};

const obtenerFechaCompacta = () => {
    const hoy = new Date();
    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const anio = hoy.getFullYear();
    return `${dia}${mes}${anio}`;
};

const normalizarNumeroOT = (texto: string) => {
    const soloNumeros = texto.replace(/\D/g, "");
    return soloNumeros.padStart(5, "0").slice(-5);
};

const obtenerCantidad = (trabajo: TrabajoOriginal) => {
    if (typeof trabajo?.datos?.cantidad === "number") {
        return trabajo.datos.cantidad;
    }

    if (typeof trabajo?.datos?.cantidad === "string") {
        return Number(trabajo.datos.cantidad) || 0;
    }

    if (typeof trabajo?.datos?.cantidadResistencias === "number") {
        return trabajo.datos.cantidadResistencias;
    }

    if (typeof trabajo?.datos?.cantidadResistencias === "string") {
        return Number(trabajo.datos.cantidadResistencias) || 0;
    }

    const descripcion = (trabajo.descripcion || "").trim();
    const match = descripcion.match(/^(\d+)/);

    if (match) {
        return Number(match[1]) || 0;
    }

    return 0;
};

const obtenerVoltaje = (trabajo: TrabajoOriginal) => {
    if (typeof trabajo?.datos?.voltaje === "number") {
        return trabajo.datos.voltaje;
    }

    if (typeof trabajo?.datos?.voltaje === "string") {
        return Number(trabajo.datos.voltaje) || 0;
    }

    const descripcion = (trabajo.descripcion || "").toUpperCase();
    const matchVolt = descripcion.match(/(\d+(?:\.\d+)?)\s*V\b/);

    if (matchVolt) {
        return Number(matchVolt[1]) || 0;
    }

    return 0;
};

const obtenerPotencia = (trabajo: TrabajoOriginal) => {
    if (typeof trabajo?.datos?.potencia === "number") {
        return trabajo.datos.potencia;
    }

    if (typeof trabajo?.datos?.potencia === "string") {
        return Number(trabajo.datos.potencia) || 0;
    }

    if (typeof trabajo?.datos?.watts === "number") {
        return trabajo.datos.watts;
    }

    if (typeof trabajo?.datos?.watts === "string") {
        return Number(trabajo.datos.watts) || 0;
    }

    const descripcion = (trabajo.descripcion || "").toUpperCase();
    const matchPot = descripcion.match(/(\d+(?:\.\d+)?)\s*W\b/);

    if (matchPot) {
        return Number(matchPot[1]) || 0;
    }

    return 0;
};

const PedidosEspeciales: React.FC = () => {
    const [folioId, setFolioId] = useState("");
    const [fechaCotizacion, setFechaCotizacion] = useState("");
    const [buscarOT, setBuscarOT] = useState("");
    const [otsAgregadas, setOtsAgregadas] = useState<OTEspecial[]>([]);
    const [cotizacion, setCotizacion] = useState(false);

    const [pedidoRealizado, setPedidoRealizado] = useState(false);
    const [pedidoRecibido, setPedidoRecibido] = useState(false);

    const pedidoRealizadoFecha = pedidoRealizado ? obtenerFechaHoy() : "";
    const pedidoRecibidoFecha = pedidoRecibido ? obtenerFechaHoy() : "";

    const folioVisual = folioId ? `P-${folioId}` : "P-SIN GUARDAR";
    const tfolioVisual = folioId ? `T-${folioId}` : "T-SIN GUARDAR";

    const [buscarProveedor, setBuscarProveedor] = useState("");
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);



    const totalPartidas = useMemo(() => {
        return otsAgregadas.reduce((acc, ot) => acc + ot.partidas.length, 0);
    }, [otsAgregadas]);

    const totalProveedor = useMemo(() => {
        return otsAgregadas.reduce((acc, ot) => {
            return (
                acc +
                ot.partidas.reduce((sub, p) => {
                    return sub + (p.confirmada ? Number(p.precioProveedorConfirmado || 0) : 0);
                }, 0)
            );
        }, 0);
    }, [otsAgregadas]);

    const generarNuevoFolio = async () => {
        const baseFecha = obtenerFechaCompacta();

        const contadorRef = ref(db, `contadores/pedidos_especiales/${baseFecha}`);
        const tx = await runTransaction(contadorRef, (actual) => {
            return (actual || 0) + 1;
        });

        const consecutivo = String(tx.snapshot.val() || 1).padStart(2, "0");
        return `${baseFecha}${consecutivo}`;
    };

    const construirPartidasEspeciales = (
        otFirebaseKey: string,
        otData: OTFirebase
    ): PartidaEspecial[] => {
        const trabajos = otData.trabajos || {};

        return Object.entries(trabajos)
            .filter(([, trabajo]) => {
                return TIPOS_VALIDOS.includes(trabajo.tipo as TipoPermitido);
            })
            .map(([partidaKey, trabajo]) => {
                const totalOriginal = Number(trabajo.total || 0);
                const precioProveedor = Number(trabajo.precio_proveedor || 0);
                return {
                    otFirebaseKey,
                    ot: otData.ot || "",
                    otLabel: otData.otLabel || `OT-${otData.ot || ""}`,
                    partidaKey,
                    partida: trabajo.partida || partidaKey,
                    tipo: trabajo.tipo as TipoPermitido,
                    descripcion: trabajo.descripcion || "",
                    cantidad: obtenerCantidad(trabajo),
                    voltaje: obtenerVoltaje(trabajo),
                    potencia: obtenerPotencia(trabajo),
                    totalOriginal,
                    precioProveedor,
                    precioProveedorConfirmado: precioProveedor,
                    totalCapturado: precioProveedor,
                    totalCalculado: totalOriginal,
                    confirmada: precioProveedor > 0,
                    pedido_realizado: trabajo.pedido_realizado || "",
                    pedido_recibido: trabajo.pedido_recibido || "",
                    numeroSerie: trabajo.numeroSerie || "",
                    folio_pedido_especial: trabajo.folio_pedido_especial || "",
                    pedidoEspecialActivo: trabajo.pedidoEspecialActivo === true,
                    datos: trabajo.datos || {},
                };
            });
    };

    const agregarOT = async () => {
        const numero = normalizarNumeroOT(buscarOT);

        if (!numero || numero === "00000") {
            alert("Escribe un número de OT válido.");
            return;
        }

        const otFirebaseKey = `ot${numero}`;

        if (otsAgregadas.some((ot) => ot.otFirebaseKey === otFirebaseKey)) {
            alert("Esa OT ya fue agregada.");
            return;
        }

        try {
            const snapshot = await get(ref(db, `ordenes_trabajo/${otFirebaseKey}`));

            if (!snapshot.exists()) {
                alert(`No existe la OT ${numero}`);
                return;
            }

            const otData = snapshot.val() as OTFirebase;
            const partidasFiltradas = construirPartidasEspeciales(otFirebaseKey, otData);

            if (partidasFiltradas.length === 0) {
                alert("La OT no tiene partidas de tipo cuarzo o CartuchoA.");
                return;
            }

            const partidasYaLigadas = partidasFiltradas.filter(
                (p) => p.pedidoEspecialActivo && p.folio_pedido_especial
            );

            if (partidasYaLigadas.length > 0) {
                const folios = [...new Set(partidasYaLigadas.map((p) => p.folio_pedido_especial))];
                alert(
                    `Esta OT ya tiene partidas ligadas a pedido especial.\n\nFolio(s): ${folios.join(", ")}`
                );
                return;
            }

            const nuevaOT: OTEspecial = {
                otFirebaseKey,
                ot: otData.ot || numero,
                otLabel: otData.otLabel || `OT-${numero}`,
                fecha: otData.fecha || "",
                tipoDocumento: otData.tipoDocumento || "",
                clienteId: otData.clienteId || null,
                clienteSnapshot: otData.clienteSnapshot || null,
                raw: otData,
                partidas: partidasFiltradas,
            };

            setOtsAgregadas((prev) => [...prev, nuevaOT]);
            setBuscarOT("");
        } catch (error) {
            console.error("Error agregando OT:", error);
            alert("Ocurrió un error al consultar la OT.");
        }
    };

    const actualizarCampoPartida = (
        otFirebaseKey: string,
        partidaKey: string,
        campo: keyof PartidaEspecial,
        valor: any
    ) => {
        setOtsAgregadas((prev) =>
            prev.map((ot) => {
                if (ot.otFirebaseKey !== otFirebaseKey) return ot;

                return {
                    ...ot,
                    partidas: ot.partidas.map((partida) => {
                        if (partida.partidaKey !== partidaKey) return partida;

                        return {
                            ...partida,
                            [campo]: valor,
                        };
                    }),
                };
            })
        );
    };

    const quitarOT = (otFirebaseKey: string) => {
        setOtsAgregadas((prev) =>
            prev.filter((ot) => ot.otFirebaseKey !== otFirebaseKey)
        );
    };

    const construirPayloadPedidoEspecial = (folioParaGuardar: string) => {
        return {
            folio: folioParaGuardar,
            pedido_realizado: pedidoRealizadoFecha,
            pedido_recibido: pedidoRecibidoFecha,
            fecha_cotizacion: fechaCotizacion || obtenerFechaHoy(),
            cotizacion,
            proveedorKey: proveedorSeleccionado?.key || "",
            proveedorSnapshot: proveedorSeleccionado || null,
            ots: otsAgregadas.map((ot) => ({
                otFirebaseKey: ot.otFirebaseKey,
                ot: ot.ot,
                otLabel: ot.otLabel,
                fecha: ot.fecha || "",
                tipoDocumento: ot.tipoDocumento || "",
                clienteId: ot.clienteId || null,
                clienteSnapshot: ot.clienteSnapshot || null,
                raw: ot.raw,
                partidas: ot.partidas.map((partida) => ({
                    otFirebaseKey: partida.otFirebaseKey,
                    ot: partida.ot,
                    otLabel: partida.otLabel,
                    partidaKey: partida.partidaKey,
                    partida: partida.partida,
                    tipo: partida.tipo,
                    descripcion: partida.descripcion,
                    cantidad: partida.cantidad,
                    voltaje: partida.voltaje,
                    potencia: partida.potencia,
                    precio_proveedor: partida.precioProveedorConfirmado,
                    totalOriginal: partida.totalOriginal,
                    totalCapturado: partida.totalCapturado,
                    totalCalculado: partida.totalCalculado,
                    confirmada: partida.confirmada,
                    pedido_realizado: pedidoRealizadoFecha || partida.pedido_realizado || "",
                    pedido_recibido: pedidoRecibidoFecha || partida.pedido_recibido || "",
                    numeroSerie: partida.numeroSerie || "",
                    folio_pedido_especial: folioParaGuardar,
                    pedidoEspecialActivo: true,
                    datos: partida.datos || {},
                })),
            })),
        };
    };

    const sincronizarPedidoEspecial = async (folioParaGuardar: string, fechaBase: string) => {
        const payload = construirPayloadPedidoEspecial(folioParaGuardar);

        await set(ref(db, `pedidos_especiales/${folioParaGuardar}`), {
            ...payload,
            fecha_cotizacion: fechaBase,
        });
    };

    //suma totas las partidas incluyendo la que cotice
    const recalcularTotalesOT = async (otFirebaseKey: string) => {
        try {
            const snapshot = await get(ref(db, `ordenes_trabajo/${otFirebaseKey}`));
            if (!snapshot.exists()) return;

            const otData = snapshot.val();
            const trabajos = otData.trabajos || {};

            const otLocal = otsAgregadas.find((ot) => ot.otFirebaseKey === otFirebaseKey);

            const subtotal = Object.entries(trabajos).reduce((acc, [trabajoKey, trabajo]: [string, any]) => {
                const partidaLocal = otLocal?.partidas.find(
                    (p) => p.partidaKey === trabajoKey
                );

                if (partidaLocal) {
                    return acc + Number(partidaLocal.totalCalculado || 0);
                }

                return acc + Number(trabajo.total || 0);
            }, 0);

            const descuentoCliente = Number(otData.descuentoCliente || 0);
            const totalConDescuento = subtotal * (1 - descuentoCliente);
            const totalConIva = totalConDescuento * 1.16;

            await update(ref(db, `ordenes_trabajo/${otFirebaseKey}`), {
                subtotal: Number(subtotal.toFixed(2)),
                totalConDescuento: Number(totalConDescuento.toFixed(2)),
                totalConIva: Number(totalConIva.toFixed(2)),
            });
        } catch (error) {
            console.error("Error recalculando totales de la OT:", error);
        }
    };
    const confirmarPartida = async (partida: PartidaEspecial) => {
        if (!cotizacion) {
            alert("Primero activa el check de cotización.");
            return;
        }

        const precioCapturado = Number(partida.precioProveedor || 0);

        if (precioCapturado <= 0) {
            alert("Debes capturar un total válido para la partida.");
            return;
        }

        const esPorPieza = window.confirm(
            `¿El precio capturado corresponde a UNA sola pieza?\n\n` +
            `Aceptar = Sí, es por una pieza.\n` +
            `Cancelar = No, ya es por toda la cantidad (${partida.cantidad}).`
        );
        //sirve para ver si entra en cada caso de la ventana emergente
        //console.log("precioCapturado:", precioCapturado);
        //console.log("cantidad:", partida.cantidad);
        //console.log("esPorPieza:", esPorPieza);

        const subtotalBase = esPorPieza
            ? precioCapturado * Number(partida.cantidad || 1)
            : precioCapturado;

        const totalFinal = Number((subtotalBase * 1.75).toFixed(2));

        try {
            const payloadActualizacion: Record<string, any> = {
                precio_proveedor: subtotalBase,
                total: totalFinal,
                estadoProduccion: "cotizando",
                folio_pedido_especial: folioId || "",
                pedidoEspecialActivo: true,
            };

            if (pedidoRealizadoFecha) {
                payloadActualizacion.pedido_realizado = pedidoRealizadoFecha;
            }

            if (pedidoRecibidoFecha) {
                payloadActualizacion.pedido_recibido = pedidoRecibidoFecha;
                payloadActualizacion.estadoProduccion = "terminada";
            }

            await update(
                ref(
                    db,
                    `ordenes_trabajo/${partida.otFirebaseKey}/trabajos/${partida.partidaKey}`
                ),
                payloadActualizacion
            );
            await recalcularTotalesOT(partida.otFirebaseKey);

            setOtsAgregadas((prev) =>
                prev.map((ot) => {
                    if (ot.otFirebaseKey !== partida.otFirebaseKey) return ot;

                    return {
                        ...ot,
                        partidas: ot.partidas.map((p) => {
                            if (p.partidaKey !== partida.partidaKey) return p;

                            return {
                                ...p,
                                precioProveedor: precioCapturado,
                                precioProveedorConfirmado: subtotalBase,
                                totalOriginal: totalFinal,
                                totalCalculado: totalFinal,
                                confirmada: true,
                                pedido_realizado:
                                    pedidoRealizadoFecha || p.pedido_realizado || "",
                                pedido_recibido:
                                    pedidoRecibidoFecha || p.pedido_recibido || "",
                            };
                        }),
                    };
                })
            );

            alert(
                `Partida ${partida.partida} confirmada.\n` +
                `Base usada: $${formatearMoneda(subtotalBase)}\n` +
                `Total guardado: $${formatearMoneda(totalFinal)}`
            );
        } catch (error) {
            console.error("Error confirmando partida:", error);
            alert("No se pudo confirmar la partida.");
        }
    };
    const guardarPedidoEspecial = async () => {
        if (otsAgregadas.length === 0) {
            alert("Agrega al menos una OT.");
            return;
        }
        if (!proveedorSeleccionado?.alias) {
            alert("Debes seleccionar un proveedor.");
            return;
        }
        try {
            let folioParaGuardar = folioId;
            let fechaBase = fechaCotizacion;

            if (!folioParaGuardar) {
                folioParaGuardar = await generarNuevoFolio();
                fechaBase = obtenerFechaHoy();
                setFolioId(folioParaGuardar);
                setFechaCotizacion(fechaBase);
            }

            for (const ot of otsAgregadas) {
                for (const partida of ot.partidas) {
                    const payloadActualizacion: Record<string, any> = {};

                    if (cotizacion) {
                        payloadActualizacion.estadoProduccion = "cotizando";
                    }

                    if (pedidoRealizadoFecha) {
                        payloadActualizacion.pedido_realizado = pedidoRealizadoFecha;
                    }

                    if (pedidoRecibidoFecha) {
                        payloadActualizacion.pedido_recibido = pedidoRecibidoFecha;
                        payloadActualizacion.estadoProduccion = "terminada";
                    }

                    if (partida.confirmada && partida.totalCalculado > 0) {
                        payloadActualizacion.total = partida.totalCalculado;
                        payloadActualizacion.precio_proveedor = partida.precioProveedorConfirmado;
                    }
                    payloadActualizacion.folio_pedido_especial = folioParaGuardar;
                    payloadActualizacion.pedidoEspecialActivo = true;

                    if (Object.keys(payloadActualizacion).length > 0) {
                        await update(
                            ref(
                                db,
                                `ordenes_trabajo/${ot.otFirebaseKey}/trabajos/${partida.partidaKey}`
                            ),
                            payloadActualizacion
                        );
                    }

                }
                await recalcularTotalesOT(ot.otFirebaseKey);//aqui no se si esta bien el bloque o es adentro
            }

            await sincronizarPedidoEspecial(folioParaGuardar, fechaBase);
            
            alert(folioId ? "Pedido especial actualizado." : "Pedido especial guardado.");
        } catch (error) {
            console.error("Error guardando pedido especial:", error);
            alert("No se pudo guardar el pedido especial.");
        }
    };

    //borrar pedido
    const borrarPedidoActual = () => {
        const confirmar = window.confirm(
            "¿Seguro que deseas borrar todo el pedido especial actual?"
        );

        if (!confirmar) return;

        setFolioId("");
        setFechaCotizacion("");
        setBuscarOT("");
        setOtsAgregadas([]);
        setCotizacion(false);
        setPedidoRealizado(false);
        setPedidoRecibido(false);

        setBuscarProveedor("");
        setProveedores([]);
        setProveedorSeleccionado(null);
    };
    //Buscar proveedores
    const buscarProveedores = async (texto: string) => {
        try {
            const snapshot = await get(ref(db, "proveedores"));

            if (!snapshot.exists()) {
                setProveedores([]);
                return;
            }

            const data = snapshot.val();

            const lista: Proveedor[] = Object.keys(data).map((key) => ({
                key,
                id: data[key].id || "",
                alias: data[key].alias || "",
                nombre: data[key].nombre || "",
                domicilio: data[key].domicilio || "",
                colonia: data[key].colonia || "",
                municipio: data[key].municipio || "",
                estado: data[key].estado || "",
                cp: data[key].cp || "",
                pais: data[key].pais || "",
                rfc: data[key].rfc || "",
                vendedor: data[key].vendedor || "",
                notas: data[key].notas || "",
            }));

            const textoBusqueda = texto.toLowerCase().trim();

            const filtrados = lista.filter((p) => {
                const alias = (p.alias || "").toLowerCase();
                const nombre = (p.nombre || "").toLowerCase();
                const rfc = (p.rfc || "").toLowerCase();
                const vendedor = (p.vendedor || "").toLowerCase();

                return (
                    alias.includes(textoBusqueda) ||
                    nombre.includes(textoBusqueda) ||
                    rfc.includes(textoBusqueda) ||
                    vendedor.includes(textoBusqueda)
                );
            });

            setProveedores(filtrados);
        } catch (error) {
            console.error("Error buscando proveedores:", error);
            setProveedores([]);
        }
    };
    useEffect(() => {
        if (proveedorSeleccionado) return;

        if (buscarProveedor.trim() === "") {
            setProveedores([]);
            return;
        }

        const timeout = setTimeout(() => {
            buscarProveedores(buscarProveedor);
        }, 300);

        return () => clearTimeout(timeout);
    }, [buscarProveedor, proveedorSeleccionado]);


    useEffect(() => {
        if (!pedidoRealizado) {
            setPedidoRecibido(false);
        }
    }, [pedidoRealizado]);

    //---------------------------------------------------------------------------HTML------------------------------------------------------------------------------------------------------------------->>

    return (
        <div style={{ padding: "20px" }}>
            <h1>Pedidos Especiales</h1>

            {/* ENCABEZADO */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "20px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div style={{ fontSize: "22px", fontWeight: 700 }}>{folioVisual}</div>
                    <div style={{ color: "#666" }}>
                        Fecha cotización: {fechaCotizacion || "--"}
                    </div>
                </div>
            </div>

            {/* BUSCADOR */}
            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    marginBottom: "20px",
                }}
            >
                <input
                    type="text"
                    placeholder="Número de OT"
                    value={buscarOT}
                    onChange={(e) =>
                        setBuscarOT(e.target.value.replace(/\D/g, "").slice(0, 5))
                    }
                    onKeyDown={(e) => {
                        if (e.key === "Enter") agregarOT();
                    }}
                    style={{
                        padding: "10px 12px",
                        minWidth: "220px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                    }}
                />

                <button onClick={agregarOT}>Agregar OT</button>
            </div>

            {/* LAYOUT */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2.2fr 1fr",
                    gap: "20px",
                    alignItems: "start",
                }}
            >
                {/* IZQUIERDA */}
                <div>
                    {otsAgregadas.length === 0 && (
                        <div
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "10px",
                                padding: "20px",
                                background: "#fafafa",
                            }}
                        >
                            No hay OTs agregadas.
                        </div>
                    )}

                    {otsAgregadas.map((ot) => (
                        <div
                            key={ot.otFirebaseKey}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "10px",
                                padding: "15px",
                                marginBottom: "16px",
                                background: "#fff",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "10px",
                                    flexWrap: "wrap",
                                    gap: "10px",
                                }}
                            >
                                <div>
                                    <strong>OT general:</strong> {ot.otLabel}
                                    <div style={{ color: "#666", fontSize: "13px" }}>
                                        {ot.tipoDocumento || "--"} | {ot.fecha || "--"}
                                    </div>
                                </div>

                                <button onClick={() => quitarOT(ot.otFirebaseKey)}>Quitar OT</button>
                            </div>

                            <div style={{ overflowX: "auto" }}>
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        minWidth: cotizacion ? "980px" : "760px",
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            <th
                                                colSpan={cotizacion ? 7 : 4}
                                                style={{
                                                    border: "1px solid #ccc",
                                                    padding: "10px",
                                                    background: "#f2f2f2",
                                                    textAlign: "left",
                                                }}
                                            >
                                                {ot.partidas[0]?.partida || "--"}
                                            </th>
                                        </tr>
                                        <tr>
                                            <th style={thStyle}>Cantidad</th>
                                            <th style={thStyle}>Descripción</th>
                                            <th style={thStyle}>Voltaje</th>
                                            <th style={thStyle}>Potencia</th>
                                            {cotizacion && <th style={thStyle}>Precio proveedor</th>}
                                            {cotizacion && <th style={thStyle}>Total</th>}
                                            {cotizacion && <th style={thStyle}>Acción</th>}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {ot.partidas.map((partida) => (
                                            <tr key={partida.partidaKey}>

                                                <td style={tdStyle}>{partida.cantidad || "--"}</td>

                                                <td style={tdStyle}>{partida.descripcion || "--"}</td>

                                                <td style={tdStyle}>
                                                    {partida.voltaje > 0 ? partida.voltaje : "--"}
                                                </td>

                                                <td style={tdStyle}>
                                                    {partida.potencia > 0 ? partida.potencia : "--"}
                                                </td>

                                                {cotizacion && (
                                                    <td style={tdStyle}>
                                                        <input
                                                            type="number"
                                                            disabled={pedidoRealizado}
                                                            value={
                                                                partida.precioProveedor === 0
                                                                    ? ""
                                                                    : partida.precioProveedor
                                                            }
                                                            onChange={(e) =>
                                                                actualizarCampoPartida(
                                                                    ot.otFirebaseKey,
                                                                    partida.partidaKey,
                                                                    "precioProveedor",
                                                                    parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            style={{
                                                                width: "120px",
                                                                padding: "6px 8px",
                                                                background: pedidoRealizado ? "#f3f4f6" : "white",
                                                                cursor: pedidoRealizado ? "not-allowed" : "text",
                                                            }}
                                                        />
                                                    </td>
                                                )}

                                                {cotizacion && (
                                                    <td style={tdStyle}>
                                                        ${formatearMoneda(partida.totalCalculado || 0)}
                                                    </td>
                                                )}

                                                {cotizacion && (
                                                    <td style={tdStyle}>
                                                        <button onClick={() => confirmarPartida(partida)}>
                                                            Confirmar
                                                        </button>

                                                        {partida.confirmada && (
                                                            <div
                                                                style={{
                                                                    marginTop: "6px",
                                                                    color: "green",
                                                                    fontSize: "12px",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                Confirmada
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DERECHA */}
                <div
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        padding: "16px",
                        background: "#fff",
                        position: "sticky",
                        top: "20px",
                    }}
                >
                    <h2>Acciones</h2>
                    {/*--------------------------------------------------BUSCADOR DE PROVEEDOR-------------------------------------------------------------------------------------*/}
                    <div style={{ marginTop: "16px", marginBottom: "16px" }}>
                        <h3 style={{ marginBottom: "10px" }}>Proveedor:</h3>

                        {!proveedorSeleccionado && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Buscar proveedor"
                                    value={buscarProveedor}
                                    onChange={(e) => setBuscarProveedor(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "8px 10px",
                                        borderRadius: "8px",
                                        border: "1px solid #ccc",
                                        marginBottom: "10px",
                                        boxSizing: "border-box",
                                    }}
                                />

                                {buscarProveedor.trim() !== "" && proveedores.length > 0 && (
                                    <div
                                        style={{
                                            border: "1px solid #ddd",
                                            borderRadius: "8px",
                                            maxHeight: "220px",
                                            overflowY: "auto",
                                            background: "#fff",
                                        }}
                                    >
                                        {proveedores.map((prov) => (
                                            <div
                                                key={prov.key}
                                                onClick={() => {
                                                    setProveedorSeleccionado(prov);
                                                    setBuscarProveedor("");
                                                    setProveedores([]);
                                                }}
                                                style={{
                                                    padding: "10px",
                                                    borderBottom: "1px solid #eee",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <div>
                                                    <strong>{prov.alias || "--"}</strong>
                                                </div>
                                                <div style={{ fontSize: "13px", color: "#666" }}>
                                                    {prov.nombre || "--"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {buscarProveedor.trim() !== "" && proveedores.length === 0 && (
                                    <div style={{ color: "#666", fontSize: "13px" }}>
                                        No se encontraron proveedores.
                                    </div>
                                )}
                            </>
                        )}

                        {proveedorSeleccionado && (
                            <div
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: "8px",
                                    padding: "10px",
                                    background: "#fafafa",
                                    position: "relative",
                                }}
                            >
                                <button
                                    onClick={() => {
                                        setProveedorSeleccionado(null);
                                        setBuscarProveedor("");
                                        setProveedores([]);
                                    }}
                                    style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        background: "red",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "50%",
                                        width: "22px",
                                        height: "22px",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                    }}
                                >
                                    ✕
                                </button>

                                <div style={{ marginBottom: "6px" }}>
                                    {proveedorSeleccionado.alias || "--"}
                                </div>

                            </div>
                        )}
                    </div>
                    {/*--------------------------------------------------------------------------------------------------------------------------------------*/}

                    <div style={{ marginTop: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>

                            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="checkbox"
                                    checked={cotizacion}
                                    onChange={(e) => setCotizacion(e.target.checked)}
                                />
                                Cotización
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="checkbox"
                                    checked={pedidoRealizado}
                                    onChange={(e) => setPedidoRealizado(e.target.checked)}
                                />
                                Pedido realizado
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="checkbox"
                                    checked={pedidoRecibido}
                                    disabled={!pedidoRealizado}
                                    onChange={(e) => setPedidoRecibido(e.target.checked)}
                                />
                                Pedido recibido
                            </label>

                        </div>
                    </div>

                    <div style={{ marginBottom: "18px", color: "#666", fontSize: "13px" }}>
                        <div>
                            Pedido realizado: {pedidoRealizadoFecha || "--"}
                        </div>
                        <div>
                            Pedido recibido: {pedidoRecibidoFecha || "--"}
                        </div>
                    </div>

                    <hr />

                    <div style={{ marginTop: "14px", marginBottom: "14px" }}>
                        <div>
                            <strong>OTs:</strong> {otsAgregadas.length}
                        </div>
                        <div>
                            <strong>Partidas:</strong> {totalPartidas}
                        </div>
                        <div>
                            <strong>Total proveedor:</strong> $
                            {formatearMoneda(totalProveedor)}
                        </div>

                        <div style={{ marginTop: "12px" }}>
                            <strong>Partidas confirmadas:</strong>
                            <div style={{ marginTop: "8px" }}>
                                {otsAgregadas.flatMap((ot) =>
                                    ot.partidas
                                        .filter((p) => p.confirmada && Number(p.precioProveedorConfirmado || 0) > 0)
                                        .map((p) => (
                                            <div key={p.partida} style={{ marginBottom: "6px", fontSize: "14px" }}>
                                                {p.partida} ${formatearMoneda(Number(p.precioProveedorConfirmado || 0) )}
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={guardarPedidoEspecial}
                        style={{ width: "100%", marginBottom: "10px" }}
                    >
                        {folioId ? "Actualizar pedido especial" : "Guardar pedido especial"}
                    </button>

                    <button
                        onClick={() => {
                            alert("Aquí luego conectamos el PDF de Pedido Especial");
                        }}
                        style={{ width: "100%" }}
                    >
                        Generar PDF
                    </button>
                    <button
                        onClick={borrarPedidoActual}
                        style={{
                            width: "100%",
                            marginTop: "10px",
                            background: "#b91c1c",
                            color: "white",
                        }}
                    >
                        Borrar pedido
                    </button>
                </div>
            </div>
        </div>
    );
};

const thStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "10px",
    background: "#f8f8f8",
    textAlign: "left",
};

const tdStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    padding: "10px",
    verticalAlign: "top",
};

const checkRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
};

export default PedidosEspeciales;