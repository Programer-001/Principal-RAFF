// src/Tienda/Gestion_Tienda.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, onValue, ref, update } from "firebase/database";
import { db } from "../firebase/config";
import { useLocation, useNavigate } from "react-router-dom";
import { generarPDFFolioCompra } from "../plantillas/plantillaFolioCompra";
import { ReactComponent as LogoNegro } from "../Imagenes/svg/logo_negro.svg";
import { ReactComponent as MaterialEntregado } from "../Imagenes/svg/sello_material_entregado.svg";
import { formatearMoneda } from "../funciones/formato_moneda";

interface ItemTienda {
    partida?: string;
    origen?: "servicio" | "articulo";
    tipo?: string;
    descripcion?: string;
    total?: number;
    cantidad?: number;
    precioUnitario?: number;
    materialEntregado?: boolean;
}

interface FolioCompra {
    key: string;
    folio: string;
    fecha?: string;
    envio?: boolean;
    clienteSnapshot?: any;
    asesorSnapshot?: any;
    subtotal?: number;
    iva?: number;
    descuentoMonto?: number;
    total?: number;
    otGenerada?: string;
    firebaseKeyOT?: string;
    items?: Record<string, ItemTienda>;
    materialEntregado?: boolean;
    materialEntregadoParcial?: boolean;

    facturas?: Record<string, { factura?: string | number }>;

}

const GestionTienda: React.FC = () => {
    const [folios, setFolios] = useState<FolioCompra[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [folioAbierto, setFolioAbierto] = useState<string | null>(null);
    const [folioSeleccionado, setFolioSeleccionado] = useState<FolioCompra | null>(null);
    const [loading, setLoading] = useState(true);

    const [mostrarModalMaterial, setMostrarModalMaterial] = useState(false);
    const [materialCompleto, setMaterialCompleto] = useState<"si" | "no">("si");
    const [materialSeleccionado, setMaterialSeleccionado] = useState<Record<string, boolean>>({});

    const [mostrarModalFacturas, setMostrarModalFacturas] = useState(false);
    const [facturasInput, setFacturasInput] = useState<string[]>([""]);
    const [guardandoFacturas, setGuardandoFacturas] = useState(false);

    const navigate = useNavigate();

    const [facturaHover, setFacturaHover] = useState<string | null>(null);
    const [previewFactura, setPreviewFactura] = useState<{
        factura: string;
        cantidad?: number | string;
        metodo?: string;
        fecha?: string;
        encontrado: boolean;
    } | null>(null);
    const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
    const [cargandoPreviewFactura, setCargandoPreviewFactura] = useState(false);
    const textoTerminos = `
Tiempo de entrega para resistencias tubulares, de banda y cartucho de baja concentración: de 15 a 20 días hábiles.

Tiempo de entrega para resistencias de cartucho de alta concentración: 25 días hábiles.

En caso de que el producto sea terminado antes del plazo indicado, se notificará oportunamente al cliente.

Cualquier validación de garantía deberá solicitarse dentro de un periodo máximo de 5 días hábiles a partir de la entrega del trabajo.

La garantía aplica únicamente por defectos de fabricación, quedando excluidos los daños ocasionados por instalación incorrecta, puesta en marcha inadecuada, manipulación o alteración del producto, o uso distinto al recomendado.

No aplica garantía en productos fabricados conforme a especificaciones del cliente cuando se hayan recomendado previamente otras características de diseño o fabricación.
`;

    const location = useLocation();

    useEffect(() => {
        const ventasRef = ref(db, "tienda_ventas");

        const unsubscribe = onValue(ventasRef, (snapshot) => {
            if (!snapshot.exists()) {
                setFolios([]);
                setLoading(false);
                return;
            }

            const data = snapshot.val();

            const lista: FolioCompra[] = Object.entries(data).map(
                ([key, value]: [string, any]) => ({
                    key,
                    folio: value.folio || key,
                    fecha: value.fecha || "",
                    envio: !!value.envio,
                    facturas: value.facturas || null,
                    materialEntregado: !!value.materialEntregado,
                    materialEntregadoParcial: !!value.materialEntregadoParcial,
                    clienteSnapshot: value.clienteSnapshot || {},
                    asesorSnapshot: value.asesorSnapshot || {},
                    subtotal: Number(value.subtotal || 0),
                    iva: Number(value.iva || 0),
                    descuentoMonto: Number(value.descuentoMonto || 0),
                    total: Number(value.total || 0),
                    otGenerada: value.otGenerada || "",
                    firebaseKeyOT: value.firebaseKeyOT || "",
                    items: value.items || {},
                })
            );

            lista.sort((a, b) => String(b.folio).localeCompare(String(a.folio)));

            setFolios(lista);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const state = location.state as any;

        if (!state?.abrirFolioCompra) return;

        const folioBuscado = state.folioCompra || "";
        const keyBuscado = state.folioCompraKey || "";

        const encontrado = folios.find(
            (f) => f.folio === folioBuscado || f.key === keyBuscado
        );

        if (encontrado) {
            setFolioAbierto(encontrado.folio);
            setFolioSeleccionado(encontrado);
        }
    }, [location.state, folios]);

    const foliosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        if (!texto) return folios;

        return folios.filter((folio) => {
            const cliente =
                folio.clienteSnapshot?.nombre ||
                folio.clienteSnapshot?.razonSocial ||
                "";

            return (
                String(folio.folio).toLowerCase().includes(texto) ||
                String(folio.otGenerada || "").toLowerCase().includes(texto) ||
                String(cliente).toLowerCase().includes(texto)
            );
        });
    }, [folios, busqueda]);

    const toggleFolio = (folio: FolioCompra) => {
        if (folioAbierto === folio.folio) {
            setFolioAbierto(null);
            setFolioSeleccionado(null);
            return;
        }

        setFolioAbierto(folio.folio);
        setFolioSeleccionado(folio);
    };

    const items = Object.values(folioSeleccionado?.items || {});

    const servicios = items.filter((item) => item.origen === "servicio");

    const articulosEntries = Object.entries(folioSeleccionado?.items || {})
        .filter(([, item]) => item.origen === "articulo");

    const cliente = folioSeleccionado?.clienteSnapshot || {};
    const asesor = folioSeleccionado?.asesorSnapshot || {};
    useEffect(() => {
        if (!folioSeleccionado) return;

        const actualizado = folios.find((f) => f.key === folioSeleccionado.key);

        if (actualizado) {
            setFolioSeleccionado(actualizado);
        }
    }, [folios]);
    // =========================
    //FACTURAS Y MATERAIL ENTREGADO
    // =========================

    const obtenerFacturasArray = (folio?: FolioCompra | null): string[] => {
        if (!folio?.facturas) return [];

        return Object.keys(folio.facturas)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => folio.facturas?.[key]?.factura)
            .filter((f): f is string | number => f !== null && f !== undefined && String(f).trim() !== "")
            .map((f) => String(f).trim());
    };

    const construirFacturasDesdeInputs = (inputs: string[]) => {
        const limpias = inputs.map((f) => f.trim()).filter((f) => f !== "");

        const resultado: Record<string, { factura: string }> = {};

        limpias.forEach((factura, index) => {
            resultado[String(index + 1)] = { factura };
        });

        return resultado;
    };

    const abrirModalFacturas = (facturasIniciales?: string[]) => {
        setFacturasInput(facturasIniciales && facturasIniciales.length > 0 ? facturasIniciales : [""]);
        setMostrarModalFacturas(true);
    };

    const cerrarModalFacturas = () => {
        setMostrarModalFacturas(false);
        setGuardandoFacturas(false);
    };

    const actualizarFacturaInput = (index: number, value: string) => {
        setFacturasInput((prev) => {
            const copia = [...prev];
            copia[index] = value;
            return copia;
        });
    };

    const agregarFacturaInput = () => {
        setFacturasInput((prev) => [...prev, ""]);
    };

    const eliminarFacturaInput = (index: number) => {
        setFacturasInput((prev) => {
            if (prev.length === 1) return [""];
            return prev.filter((_, i) => i !== index);
        });
    };

    const guardarFacturasFolio = async () => {
        if (!folioSeleccionado) return;

        const limpias = facturasInput.map((f) => f.trim()).filter((f) => f !== "");

        if (limpias.length === 0) {
            alert("Debes capturar al menos una factura");
            return;
        }

        try {
            setGuardandoFacturas(true);

            await update(ref(db, `tienda_ventas/${folioSeleccionado.key}`), {
                facturas: construirFacturasDesdeInputs(limpias),
            });

            setMostrarModalFacturas(false);
            setGuardandoFacturas(false);
        } catch (error) {
            console.error("Error guardando facturas:", error);
            setGuardandoFacturas(false);
            alert("Error al guardar facturas");
        }
    };

    const abrirModalMaterial = (folioActual?: FolioCompra) => {
        const folioBase = folioActual || folioSeleccionado;
        if (!folioBase) return;

        const actuales: Record<string, boolean> = {};

        Object.entries(folioBase.items || {}).forEach(([key, item]) => {
            if (item.origen === "articulo") {
                actuales[key] = !!item.materialEntregado;
            }
        });

        setMaterialSeleccionado(actuales);
        setMaterialCompleto("si");
        setMostrarModalMaterial(true);
    };

    const guardarMaterialEntregado = async () => {
        if (!folioSeleccionado) return;

        try {
            const updates: Record<string, any> = {};

            if (materialCompleto === "si") {
                updates.materialEntregado = true;
                updates.materialEntregadoParcial = false;

                Object.entries(folioSeleccionado.items || {}).forEach(([key, item]) => {
                    if (item.origen === "articulo") {
                        updates[`items/${key}/materialEntregado`] = true;
                    }
                });
            } else {
                updates.materialEntregado = false;
                updates.materialEntregadoParcial = true;

                Object.entries(folioSeleccionado.items || {}).forEach(([key, item]) => {
                    if (item.origen === "articulo") {
                        updates[`items/${key}/materialEntregado`] = !!materialSeleccionado[key];
                    }
                });
            }

            await update(ref(db, `tienda_ventas/${folioSeleccionado.key}`), updates);

            setMostrarModalMaterial(false);
        } catch (error) {
            console.error("Error guardando material entregado:", error);
            alert("Error al guardar material entregado");
        }
    };

    const eliminarAccionMaterial = async () => {
        if (!folioSeleccionado) return;

        const confirmar = window.confirm("¿Deseas borrar la acción de material entregado?");
        if (!confirmar) return;

        try {
            const updates: Record<string, any> = {
                materialEntregado: null,
                materialEntregadoParcial: null,
            };

            Object.entries(folioSeleccionado.items || {}).forEach(([key, item]) => {
                if (item.origen === "articulo") {
                    updates[`items/${key}/materialEntregado`] = null;
                }
            });

            await update(ref(db, `tienda_ventas/${folioSeleccionado.key}`), updates);
        } catch (error) {
            console.error("Error eliminando acción de material:", error);
            alert("Error al eliminar acción");
        }
    };

    const buscarPreviewFactura = async (numeroFactura: string) => {
        const facturaBuscada = String(numeroFactura || "").trim();

        if (!facturaBuscada) {
            setPreviewFactura(null);
            return;
        }

        try {
            setCargandoPreviewFactura(true);

            const snapshot = await get(ref(db, "corte-caja"));

            if (!snapshot.exists()) {
                setPreviewFactura({
                    factura: facturaBuscada,
                    encontrado: false,
                });
                return;
            }

            const data = snapshot.val();
            let encontrada: any = null;

            for (const grupoKey of Object.keys(data || {})) {
                const grupo = data[grupoKey] || {};

                for (const movKey of Object.keys(grupo || {})) {
                    const mov = grupo[movKey];
                    const facturaMovimiento = String(mov?.factura ?? "").trim();

                    if (facturaMovimiento === facturaBuscada) {
                        encontrada = mov;
                        break;
                    }
                }

                if (encontrada) break;
            }

            if (encontrada) {
                setPreviewFactura({
                    factura: facturaBuscada,
                    cantidad: encontrada.cantidad,
                    metodo: encontrada.metodo,
                    fecha: encontrada.fecha,
                    encontrado: true,
                });
            } else {
                setPreviewFactura({
                    factura: facturaBuscada,
                    encontrado: false,
                });
            }
        } catch (error) {
            console.error("Error buscando factura:", error);
            setPreviewFactura({
                factura: facturaBuscada,
                encontrado: false,
            });
        } finally {
            setCargandoPreviewFactura(false);
        }
    };

    const manejarMouseEnterFactura = async (
        factura: string,
        event: React.MouseEvent<HTMLSpanElement>
    ) => {
        setFacturaHover(factura);
        setPreviewPos({
            x: event.clientX + 12,
            y: event.clientY + 12,
        });

        await buscarPreviewFactura(factura);
    };

    const manejarMouseMoveFactura = (event: React.MouseEvent<HTMLSpanElement>) => {
        setPreviewPos({
            x: event.clientX + 12,
            y: event.clientY + 12,
        });
    };

    const manejarMouseLeaveFactura = () => {
        setFacturaHover(null);
        setPreviewFactura(null);
        setCargandoPreviewFactura(false);
    };

    // =====================================================================================
    // Generar folio de compra pdf
    // =====================================================================================
    const generarPDFFolioCompraDesdeFolio = async (folio: FolioCompra) => {
        const items = Object.values(folio.items || {});

        const servicios = items
            .filter((item) => item.origen === "servicio")
            .map((item) => ({
                partida: item.partida || "--",
                descripcion: item.descripcion || "--",
                total: Number(item.total || 0),
            }));

        const articulos = items
            .filter((item) => item.origen === "articulo")
            .map((item) => ({
                partida: item.partida || "--",
                descripcion: item.descripcion || "--",
                cantidad: Number(item.cantidad || 0),
                precioUnitario: Number(item.precioUnitario || 0),
                total: Number(item.total || 0),
                materialEntregado: !!item.materialEntregado,
            }));

        await generarPDFFolioCompra({
            folio: folio.folio,
            fecha: folio.fecha || "--",
            asesor:
                folio.asesorSnapshot?.username ||
                folio.asesorSnapshot?.nombre ||
                "--",
            clienteNombre:
                folio.clienteSnapshot?.nombre ||
                folio.clienteSnapshot?.razonSocial ||
                "--",
            razonSocial: folio.clienteSnapshot?.razonSocial || "",
            telefono: folio.clienteSnapshot?.telefono || "",
            facturas: obtenerFacturasArray(folio),
            envio: !!folio.envio,
            otGenerada: folio.otGenerada ? `OT-${folio.otGenerada}` : "--",

            servicios,
            articulos,

            subtotal: Number(folio.subtotal || 0),
            iva: Number(folio.iva || 0),
            descuento: Number(folio.descuentoMonto || 0),
            total: Number(folio.total || 0),
            materialEntregado: !!folio.materialEntregado,
        });
    };
    // =====================================================================================
    // HTML
    // =====================================================================================
    return (
        <div className="consulta-pedidos-layout">
            {/* VISOR IZQUIERDO */}
            <div className="consulta-pedidos-visor">
                {!folioSeleccionado ? (
                    <div className="visor-vacio">
                        <h2>Gestión de Folios de Compra</h2>
                        <p>Selecciona un folio del lado derecho para ver su detalle.</p>
                    </div>
                ) : (
                        <div className="documento-word-fondo">
                            <div className="documento-hoja">
                        {/* ENCABEZADO TIPO HOJA */}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", gap: 18 }}>
                                    <LogoNegro style={{ width: 140 }} />

                                <div>
                                    <h2 style={{ margin: 0 }}>RAFF Especialistas térmicos</h2>
                                    <p style={{ margin: "4px 0" }}>RFC: RET231130AN2</p>
                                    <p style={{ margin: "4px 0" }}>
                                        Reforma 1462, Santa Tere, 44600
                                    </p>
                                    <p style={{ margin: "4px 0" }}>
                                        Guadalajara, Jalisco, México
                                    </p>
                                    <p style={{ margin: "4px 0" }}>Tel (33)40409058</p>
                                </div>
                            </div>

                            <div
                                style={{
                                    width: 110,
                                    height: 58,
                                    border: "1px solid #000",
                                    textAlign: "center",
                                }}
                            >
                                <div
                                    style={{
                                        background: "#000",
                                        color: "#fff",
                                        fontWeight: "bold",
                                        padding: 4,
                                    }}
                                >
                                    FOLIO
                                </div>
                                <div style={{ fontWeight: "bold", fontSize: 18, marginTop: 10 }}>
                                    {folioSeleccionado.folio}
                                </div>
                            </div>
                        </div>

                        <hr style={{ margin: "24px 0" }} />

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <h2>FOLIO DE COMPRA</h2>
                            <p>
                                <b>Fecha:</b> {folioSeleccionado.fecha || "--"}
                            </p>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 10,
                                marginBottom: 20,
                            }}
                        >
                            <div>
                                <b>Asesor:</b>{" "}
                                {asesor.username || asesor.nombre || "--"}
                            </div>

                            <div>
                                <b>OT generada:</b>{" "}
                                {folioSeleccionado.otGenerada
                                    ? `OT-${folioSeleccionado.otGenerada}`
                                    : "--"}
                            </div>

                            <div>
                                <b>Razón social:</b> {cliente.razonSocial || "--"}
                            </div>

                            <div>
                                <b>Cliente:</b>{" "}
                                {cliente.nombre || cliente.razonSocial || "--"}
                            </div>

                            <div>
                                <b>Teléfono:</b> {cliente.telefono || "--"}
                            </div>

                            <div>
                                <b>Envío:</b> {folioSeleccionado.envio ? "Sí" : "No"}
                            </div>
                        </div>

                        {/* SERVICIOS */}
                        <div style={{ marginTop: 20 }}>
                            <h3>Servicios</h3>

                            {servicios.length === 0 ? (
                                <p>No hay servicios en este folio.</p>
                                    ) : (
                                        
                                        <table className="caja-table">
                                            <thead>
                                                <tr>
                                                    <th>Partida</th>
                                                    <th>Descripción</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {servicios.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.partida || "--"}</td>

                                                        <td style={{ whiteSpace: "pre-line", textAlign: "left" }}>
                                                            {item.descripcion || "--"}
                                                        </td>

                                                        <td
                                                            style={{
                                                                display: "table-cell", // 🔥 IMPORTANTE
                                                                textAlign: "right",
                                                            }}
                                                        >
                                                            {formatearMoneda(Number(item.total || 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                            )}
                        </div>

                        {/* ARTÍCULOS */}
                            <div style={{ marginTop: 25, position: "relative" }}>
                                <h3>Artículos</h3>
                                {folioSeleccionado.materialEntregado && (
                                    <MaterialEntregado
                                        style={{
                                            position: "absolute",
                                            top: 45,
                                            left: "28%",
                                            width: 280,
                                            transform: "rotate(-18deg)",
                                            opacity: 0.8,
                                            pointerEvents: "none",
                                            zIndex: 2,
                                        }}
                                    />
                                )}

                                {articulosEntries.length === 0 ? (
                                <p>No hay artículos en este folio.</p>
                            ) : (
                                        <table className="caja-table">
                                            <thead>
                                                <tr>
                                                    <th>Partida</th>
                                                    <th>Descripción</th>
                                                    <th>Cantidad</th>
                                                    <th>Precio</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {articulosEntries.map(([key, item]) => (
                                                    <tr key={key}>
                                                        <td>{item.partida || "--"}</td>

                                                        <td style={{ textAlign: "left" }}>
                                                            {item.materialEntregado && (
                                                                <span style={{ color: "green", fontWeight: "bold", marginRight: 6 }}>
                                                                    ✓
                                                                </span>
                                                            )}
                                                            {item.descripcion || "--"}
                                                        </td>

                                                        <td style={{ textAlign: "center" }}>
                                                            {item.cantidad || 0}
                                                        </td>

                                                        <td
                                                            style={{
                                                                display: "table-cell",
                                                                textAlign: "right",
                                                            }}
                                                        >
                                                            {formatearMoneda(Number(item.precioUnitario || 0))}
                                                        </td>

                                                        <td
                                                            style={{
                                                                display: "table-cell", // 🔥 CLAVE
                                                                textAlign: "right",
                                                            }}
                                                        >
                                                            {formatearMoneda(Number(item.total || 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                            )}
                        </div>

                        {/* TOTALES */}
                        <div
                            style={{
                                marginTop: 30,
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <div style={{ minWidth: 260 }}>
                                <p>
                                    <b>Subtotal:</b>{" "}
                                    {formatearMoneda(Number(folioSeleccionado.subtotal || 0))}
                                </p>
                                <p>
                                    <b>IVA:</b>{" "}
                                    {formatearMoneda(Number(folioSeleccionado.iva || 0))}
                                </p>
                                <p>
                                    <b>Descuento:</b>{" "}
                                    {formatearMoneda(
                                        Number(folioSeleccionado.descuentoMonto || 0)
                                    )}
                                </p>
                                <h3>
                                    Total:{" "}
                                    {formatearMoneda(Number(folioSeleccionado.total || 0))}
                                </h3>
                                    </div>
                                    {/*FIN TOTALES*/ }
                                </div>
                                {/*TERMINOS Y CONDICIONES*/ }
                                <div className="terminos-box">
                                    <h3>Términos y condiciones</h3>
                                    <p style={{ whiteSpace: "pre-line" }}>
                                        {textoTerminos}
                                    </p>
                                </div>
                                {/*documento-hoja*/}
                            </div>
                            {/*documento-word-fondo*/ }
                        </div>
                )}
            </div>

            {/* PANEL DERECHO */}
            <div className="consulta-pedidos-lista">
                <h3>Folios de compra</h3>

                <input
                    type="text"
                    placeholder="Buscar FC, cliente u OT..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="input-buscar-folio"
                />

                <div className="folios-scroll">
                    {loading ? (
                        <p>Cargando folios...</p>
                    ) : foliosFiltrados.length === 0 ? (
                        <p>No se encontraron folios.</p>
                    ) : (
                        foliosFiltrados.map((folio) => (
                            <div key={folio.key} className="folio-card">
                                <div
                                    className={`folio-header ${folioAbierto === folio.folio ? "activo" : ""
                                        }`}
                                >
                                    <div className="folio-header-content">
                                        <span
                                            onClick={() => toggleFolio(folio)}
                                            className="folio-titulo"
                                        >
                                            <strong>{folio.folio}</strong>
                                        </span>
                                    </div>
                                </div>

                                {folioAbierto === folio.folio && (
                                    <div className="folio-body">
                                        <p>
                                            <b>Cliente:</b>{" "}
                                            {folio.clienteSnapshot?.nombre ||
                                                folio.clienteSnapshot?.razonSocial ||
                                                "--"}
                                        </p>
                                        <p>
                                            <b>Fecha:</b> {folio.fecha || "--"}
                                        </p>
                                        <p>
                                            <b>OT:</b>{" "}
                                            {folio.otGenerada ? `OT-${folio.otGenerada}` : "--"}
                                        </p>
                                        <p>
                                            <b>Total:</b>{" "}
                                            {formatearMoneda(Number(folio.total || 0))}
                                        </p>
                                        {obtenerFacturasArray(folioSeleccionado).length > 0 && (
                                            <div style={{ marginTop: 20 }}>
                                                <h3 style={{ marginBottom: 8 }}>
                                                    {obtenerFacturasArray(folioSeleccionado).length === 1
                                                        ? "Factura"
                                                        : "Facturas"}
                                                </h3>

                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {obtenerFacturasArray(folioSeleccionado).map((factura, index) => (
                                                        <span
                                                            key={`${factura}-${index}`}
                                                            onMouseEnter={(e) => manejarMouseEnterFactura(factura, e)}
                                                            onMouseMove={manejarMouseMoveFactura}
                                                            onMouseLeave={manejarMouseLeaveFactura}
                                                            style={{
                                                                fontSize: 14,
                                                                cursor: "pointer",
                                                                textDecoration: "underline",
                                                                textUnderlineOffset: 2,
                                                                width: "fit-content",
                                                            }}
                                                        >
                                                           {factura}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ marginTop: 14, borderTop: "1px solid #ddd", paddingTop: 12 }}>
                                            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!folio.materialEntregado || !!folio.materialEntregadoParcial}
                                                    onChange={() => {
                                                        setFolioSeleccionado(folio);
                                                        abrirModalMaterial(folio);
                                                    }}
                                                />
                                                Se entregó material
                                            </label>
                                            <div style={{ height: 14 }} />
                                            {(folio.materialEntregado || folio.materialEntregadoParcial) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFolioSeleccionado(folio);
                                                        eliminarAccionMaterial();
                                                    }}
                                                    className="btn btn-red"
                                                >
                                                    Eliminar acción
                                                </button>
                                            )}

                                            <div style={{ height: 14 }} />

                                            <button
                                                type="button"
                                                className="btn btn-orange"
                                                onClick={() => {
                                                    setFolioSeleccionado(folio);
                                                    abrirModalFacturas(obtenerFacturasArray(folio));
                                                }}
                                            >
                                                Insertar factura(s)
                                            </button>



                                            <div style={{ height: 14 }} />
                                            {folio.otGenerada && (
                                                <button
                                                    className="btn btn-purple"
                                                    onClick={() => {
                                                        navigate("/consultaot", {
                                                            state: {
                                                                abrirOT: true,
                                                                firebaseKeyOT: folio.firebaseKeyOT,
                                                            },
                                                        });
                                                    }}
                                                >
                                                    Ir a OT-{folio.otGenerada}
                                                </button>
                                            )}
                                            <div style={{ height: 14 }} />
                                            <button
                                                type="button"
                                                className="btn btn-green"
                                                onClick={() => generarPDFFolioCompraDesdeFolio(folio)}
                                            >
                                                Generar Folio de compra
                                            </button>

                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/*FIN DEL PROGRAMA GENERAL. EMPIEZAN VENTANAS EMERGENTES*/}
            {mostrarModalMaterial && folioSeleccionado && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: 20,
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 560,
                            background: "#fff",
                            borderRadius: 12,
                            padding: 20,
                            boxShadow: "0 12px 35px rgba(0,0,0,0.22)",
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>¿Se entregó todo el material?</h3>

                        <div style={{ display: "flex", gap: 18, marginBottom: 16 }}>
                            <label>
                                <input
                                    type="radio"
                                    checked={materialCompleto === "si"}
                                    onChange={() => setMaterialCompleto("si")}
                                />{" "}
                                Sí
                            </label>

                            <label>
                                <input
                                    type="radio"
                                    checked={materialCompleto === "no"}
                                    onChange={() => setMaterialCompleto("no")}
                                />{" "}
                                No
                            </label>
                        </div>

                        {materialCompleto === "no" && (
                            <div
                                style={{
                                    border: "1px solid #ddd",
                                    borderRadius: 8,
                                    padding: 12,
                                    maxHeight: 260,
                                    overflowY: "auto",
                                }}
                            >
                                <h4>Selecciona los materiales entregados</h4>

                                {Object.entries(folioSeleccionado.items || {})
                                    .filter(([, item]) => item.origen === "articulo")
                                    .map(([key, item]) => (
                                        <label
                                            key={key}
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                alignItems: "center",
                                                marginBottom: 8,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!materialSeleccionado[key]}
                                                onChange={(e) =>
                                                    setMaterialSeleccionado((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.checked,
                                                    }))
                                                }
                                            />
                                            {item.partida || "--"} - {item.descripcion || "--"}
                                        </label>
                                    ))}
                            </div>
                        )}

                        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={() => setMostrarModalMaterial(false)}>Cancelar</button>
                            <button
                                onClick={guardarMaterialEntregado}
                                style={{
                                    background: "#16a34a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 16px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalFacturas && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: 20,
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 520,
                            background: "#fff",
                            borderRadius: 12,
                            padding: 20,
                            boxShadow: "0 12px 35px rgba(0,0,0,0.22)",
                        }}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                            Insertar factura(s)
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {facturasInput.map((factura, index) => (
                                <div key={index} style={{ display: "flex", gap: 10 }}>
                                    <input
                                        type="text"
                                        value={factura}
                                        onChange={(e) => actualizarFacturaInput(index, e.target.value)}
                                        placeholder={`Factura ${index + 1}`}
                                        style={{
                                            flex: 1,
                                            padding: 10,
                                            border: "1px solid #ccc",
                                            borderRadius: 8,
                                        }}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => eliminarFacturaInput(index)}
                                        style={{
                                            background: "#ff4d4f",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            padding: "10px 12px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Quitar
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 14 }}>
                            <button
                                type="button"
                                onClick={agregarFacturaInput}
                                style={{
                                    background: "#1677ff",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 14px",
                                    cursor: "pointer",
                                }}
                            >
                                Ingresar otra factura
                            </button>
                        </div>

                        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button onClick={cerrarModalFacturas} disabled={guardandoFacturas}>
                                Cancelar
                            </button>

                            <button
                                onClick={guardarFacturasFolio}
                                disabled={guardandoFacturas}
                                style={{
                                    background: "#16a34a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: "10px 16px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                {guardandoFacturas ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {facturaHover && (
                <div
                    style={{
                        position: "fixed",
                        top: previewPos.y,
                        left: previewPos.x,
                        zIndex: 10000,
                        background: "#fff",
                        border: "1px solid #d1d5db",
                        borderRadius: 10,
                        padding: 12,
                        minWidth: 220,
                        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
                        pointerEvents: "none",
                    }}
                >
                    {cargandoPreviewFactura ? (
                        <div>Cargando factura...</div>
                    ) : !previewFactura || !previewFactura.encontrado ? (
                        <>
                            <div style={{ fontWeight: "bold", marginBottom: 6 }}>
                                Factura: {facturaHover}
                            </div>
                            <div>No encontrada en las facturas</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
                                Factura: {previewFactura.factura}
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <b>Cantidad:</b>{" "}
                                {previewFactura.cantidad !== undefined && previewFactura.cantidad !== null
                                    ? `$${Number(previewFactura.cantidad).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}`
                                    : "--"}
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <b>Método:</b> {previewFactura.metodo || "--"}
                            </div>
                            <div>
                                <b>Fecha:</b> {previewFactura.fecha || "--"}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default GestionTienda;