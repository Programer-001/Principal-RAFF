// src/Tienda/Gestion_Tienda.tsx
import React, { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase/config";
import { useLocation } from "react-router-dom";
import { ReactComponent as LogoNegro } from "../Imagenes/svg/logo_negro.svg";
import { formatearMoneda } from "../funciones/formato_moneda";

interface ItemTienda {
    partida?: string;
    origen?: "servicio" | "articulo";
    tipo?: string;
    descripcion?: string;
    total?: number;
    cantidad?: number;
    precioUnitario?: number;
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
}

const GestionTienda: React.FC = () => {
    const [folios, setFolios] = useState<FolioCompra[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [folioAbierto, setFolioAbierto] = useState<string | null>(null);
    const [folioSeleccionado, setFolioSeleccionado] = useState<FolioCompra | null>(null);
    const [loading, setLoading] = useState(true);

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
    const articulos = items.filter((item) => item.origen === "articulo");

    const cliente = folioSeleccionado?.clienteSnapshot || {};
    const asesor = folioSeleccionado?.asesorSnapshot || {};

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
                    <div
                        className="visor-documento"
                        style={{
                            background: "#fff",
                            maxWidth: 820,
                            margin: "0 auto",
                            padding: 28,
                            border: "1px solid #d1d5db",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                        }}
                    >
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
                                <table className="caja-table" style={{ width: "100%" }}>
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
                                                <td style={{ whiteSpace: "pre-line" }}>
                                                    {item.descripcion || "--"}
                                                </td>
                                                <td>{formatearMoneda(Number(item.total || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* ARTÍCULOS */}
                        <div style={{ marginTop: 25 }}>
                            <h3>Artículos</h3>

                            {articulos.length === 0 ? (
                                <p>No hay artículos en este folio.</p>
                            ) : (
                                <table className="caja-table" style={{ width: "100%" }}>
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
                                        {articulos.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.partida || "--"}</td>
                                                <td>{item.descripcion || "--"}</td>
                                                <td>{item.cantidad || 0}</td>
                                                <td>
                                                    {formatearMoneda(Number(item.precioUnitario || 0))}
                                                </td>
                                                <td>{formatearMoneda(Number(item.total || 0))}</td>
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
                        </div>
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

export default GestionTienda;