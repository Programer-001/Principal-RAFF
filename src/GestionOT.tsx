// src/GestionOT.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get, remove, update } from "firebase/database";
import { app, auth } from "./firebase/config";
import { generarPDFOTCliente } from "./plantillas/plantillaOTCliente";
import { generarPDFOTProduccion } from "./plantillas/plantillaOTProduccion";

interface ClienteSnapshot {
    nombre?: string;
    razonSocial?: string;
    telefono?: string;
}
interface AsesorSnapshot {
    id?: string;
    uid?: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
}

interface TrabajoItem {
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number;
    datos?: any;
}

interface OrdenTrabajo {
    ot: string;
    otLabel?: string;
    tipoDocumento?: "cotizacion" | "orden_trabajo";
    pagado?: boolean;
    factura?: number | null;
    fecha?: string;
    clienteId?: string | null;
    clienteSnapshot?: ClienteSnapshot;
    credito?: boolean;
    envio?: boolean;
    subtotal?: number;
    descuentoCliente?: number;
    totalConDescuento?: number;
    totalConIva?: number;
    trabajos?: Record<string, TrabajoItem>;
    envioFolio?: string;
    envioGenerado?: boolean;
    envioEnviado?: boolean;
    asesorId?: string | null;
    asesorSnapshot?: AsesorSnapshot | null;
}

type OrdenTrabajoConClave = OrdenTrabajo & {
    firebaseKey: string;
};

const GestionOT = () => {
    const [busqueda, setBusqueda] = useState("");
    const [ordenes, setOrdenes] = useState<OrdenTrabajoConClave[]>([]);
    const [cargando, setCargando] = useState(false);
    // 🔹 mostrar solo mis OTs
    const [mostrarSoloMias, setMostrarSoloMias] = useState(false);
    const [otSeleccionada, setOtSeleccionada] = useState<OrdenTrabajoConClave | null>(null);
    // 🔹 tipo de documento (cotización / OT)
    const [tipoDocumento, setTipoDocumento] = useState<"cotizacion" | "orden_trabajo">("cotizacion");

    // 🔹 input factura
    const [facturaInput, setFacturaInput] = useState("");
    // 🔹 username real del usuario logueado
    const [usernameActual, setUsernameActual] = useState("");

    // 🔹 obtener username real desde RH/Empleados usando el correo del auth
    useEffect(() => {
        const cargarUsernameActual = async () => {
            try {
                const correo = auth.currentUser?.email?.toLowerCase().trim();

                if (!correo) {
                    setUsernameActual("");
                    return;
                }

                const db = getDatabase(app);
                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) {
                    setUsernameActual("");
                    return;
                }

                const empleados = snapshot.val();

                const empleadoEncontrado = Object.values(empleados).find((emp: any) => {
                    const emailEmpleado = (emp.email || "").toLowerCase().trim();
                    return emailEmpleado === correo;
                }) as any;

                if (empleadoEncontrado?.username) {
                    setUsernameActual(
                        String(empleadoEncontrado.username).toLowerCase().trim()
                    );
                } else {
                    setUsernameActual("");
                }
            } catch (error) {
                console.error("Error obteniendo username actual:", error);
                setUsernameActual("");
            }
        };

        cargarUsernameActual();
    }, []);

    const cargarOrdenes = async () => {
        try {
            setCargando(true);
            const db = getDatabase(app);
            const snapshot = await get(ref(db, "ordenes_trabajo"));

            if (!snapshot.exists()) {
                setOrdenes([]);
                return;
            }

            const data = snapshot.val();

            const lista: OrdenTrabajoConClave[] = Object.keys(data).map((key) => ({
                firebaseKey: key,
                ...data[key],
            }));

            // Orden más nueva arriba, usando ot numérica si existe
            lista.sort((a, b) => {
                const na = Number(a.ot || 0);
                const nb = Number(b.ot || 0);
                return nb - na;
            });

            setOrdenes(lista);
            if (otSeleccionada) {
                const actualizada = lista.find(
                    (ot) => ot.firebaseKey === otSeleccionada.firebaseKey
                );

                if (actualizada) {
                    setOtSeleccionada(actualizada);
                }
            }
        } catch (error) {
            console.error("Error cargando OTs:", error);
            alert("Error al cargar órdenes de trabajo");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarOrdenes();
    }, []);

    const ordenesFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return ordenes.filter((ot) => {
            const clienteNombre =
                ot.clienteSnapshot?.nombre || ot.clienteSnapshot?.razonSocial || "";

            const facturaTexto =
                ot.factura === null || ot.factura === undefined
                    ? ""
                    : String(ot.factura);

            const asesorUsername = (
                ot.asesorSnapshot?.username ||
                ot.asesorSnapshot?.nombre ||
                ""
            ).toLowerCase().trim();

            const coincideBusqueda =
                !texto ||
                ot.firebaseKey.toLowerCase().includes(texto) ||
                (ot.otLabel || "").toLowerCase().includes(texto) ||
                (ot.ot || "").toLowerCase().includes(texto) ||
                (ot.fecha || "").toLowerCase().includes(texto) ||
                facturaTexto.toLowerCase().includes(texto) ||
                clienteNombre.toLowerCase().includes(texto) ||
                asesorUsername.includes(texto);

            const esMia = !mostrarSoloMias
                ? true
                : asesorUsername === usernameActual;

            return coincideBusqueda && esMia;
        });
    }, [busqueda, ordenes, mostrarSoloMias, usernameActual]);

    // 🔹 carga tipo y factura desde Firebase
    useEffect(() => {
        if (!otSeleccionada) return;

        setTipoDocumento(otSeleccionada.tipoDocumento || "cotizacion");

        setFacturaInput(
            otSeleccionada.factura === null || otSeleccionada.factura === undefined
                ? ""
                : String(otSeleccionada.factura)
        );
    }, [otSeleccionada]);

    const seleccionarOT = (ot: OrdenTrabajoConClave) => {
        setOtSeleccionada(ot);
        setBusqueda("");
    };

    const cerrarConsulta = () => {
        setOtSeleccionada(null);
    };

    const borrarOT = async () => {
        if (!otSeleccionada) return;

        const confirmar = window.confirm(
            `¿Seguro que deseas borrar la OT ${otSeleccionada.otLabel || otSeleccionada.firebaseKey
            }?`
        );
        if (!confirmar) return;

        try {
            const db = getDatabase(app);
            await remove(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`));

            alert("OT borrada correctamente");
            setOtSeleccionada(null);
            await cargarOrdenes();
        } catch (error) {
            console.error("Error al borrar OT:", error);
            alert("No se pudo borrar la OT");
        }
    };

    const trabajosArray = otSeleccionada?.trabajos
        ? Object.values(otSeleccionada.trabajos)
        : [];

    const formatearFecha = (fecha?: string) => {
        if (!fecha) return "--";

        // Si ya viene en formato dd/mm/yyyy, la deja igual
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            return fecha;
        }

        const f = new Date(fecha);

        if (isNaN(f.getTime())) return fecha;

        const dia = String(f.getDate()).padStart(2, "0");
        const mes = String(f.getMonth() + 1).padStart(2, "0");
        const anio = f.getFullYear();

        return `${dia}/${mes}/${anio}`;
    };

    //--------------Guardar------------------------------------------>>
    const generarPDF = async () => {
        if (!otSeleccionada) return;

        const conceptos = Object.values(otSeleccionada.trabajos || {}).map(
            (t: any) => ({
                partida: t.partida,
                descripcion: t.descripcion,
                subtotal: t.total,
            })
        );

        generarPDFOTCliente({
            otLabel: otSeleccionada.otLabel || otSeleccionada.firebaseKey,
            factura: otSeleccionada.factura ?? undefined,
            fecha: formatearFecha(otSeleccionada.fecha),
            asesor:
                otSeleccionada.asesorSnapshot?.username ||
                otSeleccionada.asesorSnapshot?.nombre ||
                "",
            clienteNombre:
                otSeleccionada.clienteSnapshot?.nombre ||
                otSeleccionada.clienteSnapshot?.razonSocial ||
                "PUBLICO GENERAL",
            telefono: otSeleccionada.clienteSnapshot?.telefono,
            envio: otSeleccionada.envio ?? false,

            conceptos,
            subtotal: otSeleccionada.subtotal || 0,
            iva:
                (otSeleccionada.totalConIva || 0) -
                (otSeleccionada.totalConDescuento || 0),
            total: otSeleccionada.totalConIva || 0,
        });
    };
    //Guardar ordenes de produccion------>
    const generarPDFProduccion = async () => {
        if (!otSeleccionada) return;

        const trabajos = Object.values(otSeleccionada.trabajos || {});

        const gruposMap: Record<string, { titulo: string; items: any[] }> = {
            tubular: { titulo: "Tubular", items: [] },
            banda: { titulo: "Banda", items: [] },
            baja_concentracion: { titulo: "Cartucho baja concentración", items: [] },
            alta_concentracion: { titulo: "Cartucho alta concentración", items: [] },
            resorte: { titulo: "Resorte", items: [] },
        };
        trabajos.forEach((t: any) => {
            const tipo = (t.tipo || "").toLowerCase();

            if (gruposMap[tipo]) {
                gruposMap[tipo].items.push({
                    partida: t.partida || "--",
                    descripcion: t.descripcion || "--",
                });
            } else {
                // Si aparece un tipo no contemplado, lo mandamos a su propio grupo
                if (!gruposMap["_otros"]) {
                    gruposMap["_otros"] = { titulo: "Otros", items: [] };
                }

                gruposMap["_otros"].items.push({
                    partida: t.partida || "--",
                    descripcion: t.descripcion || "--",
                });
            }
        });

        const grupos = Object.values(gruposMap).filter((g) => g.items.length > 0);

        await generarPDFOTProduccion({
            otLabel: otSeleccionada.otLabel || otSeleccionada.firebaseKey,
            fecha: formatearFecha(otSeleccionada.fecha),
            asesor:
                otSeleccionada.asesorSnapshot?.username ||
                otSeleccionada.asesorSnapshot?.nombre ||
                "",
            clienteNombre:
                otSeleccionada.clienteSnapshot?.nombre ||
                otSeleccionada.clienteSnapshot?.razonSocial ||
                "PUBLICO GENERAL",
            envio: otSeleccionada.envio ?? false,
            grupos,
        });
    };

    //------------WhatsApp-------------------------------------------------->>
    const enviarWhatsAppCliente = () => {
        const telefonoOriginal = otSeleccionada?.clienteSnapshot?.telefono || "";
        const asesor =
            otSeleccionada?.asesorSnapshot?.username ||
            otSeleccionada?.asesorSnapshot?.nombre ||
            "el asesor de ventas";

        if (!telefonoOriginal) {
            alert("Esta OT no tiene teléfono de cliente");
            return;
        }

        // quitar todo lo que no sea número
        let telefonoLimpio = telefonoOriginal.replace(/\D/g, "");

        // Si viene a 10 dígitos, asumimos México y agregamos 52
        if (telefonoLimpio.length === 10) {
            telefonoLimpio = `52${telefonoLimpio}`;
        }

        // Mensaje opcional
        const mensaje = encodeURIComponent(
            `Hola, le habla ${asesor}. Le contacto sobre su orden de trabajo ${otSeleccionada?.otLabel || ""
            }.`
        );

        const url = `https://wa.me/${telefonoLimpio}?text=${mensaje}`;
        window.open(url, "_blank");
    };
    //-------------------Boton editar----------------------------------------->>

    const navigate = useNavigate();
    const editarOTCompleta = () => {
        if (!otSeleccionada) return;

        navigate("/cotizador", {
            state: {
                modoEditarOT: true,
                otData: otSeleccionada,
            },
        });
    };

    //------------------------------------------------------------>>
    // 🔹 guardar tipo y factura
    const guardarTipoDocumento = async (
        nuevoTipo: "cotizacion" | "orden_trabajo"
    ) => {
        if (!otSeleccionada) return;

        try {
            const db = getDatabase(app);

            // 👉 volver a cotización
            if (nuevoTipo === "cotizacion") {
                await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`), {
                    tipoDocumento: "cotizacion",
                    factura: null,
                    pagado: false,
                });

                setTipoDocumento("cotizacion");
                setFacturaInput("");
                await cargarOrdenes();
                return;
            }

            // 👉 cambiar a orden de trabajo
            const numeroFactura = window.prompt("Pon el número de factura");

            if (!numeroFactura || !numeroFactura.trim()) {
                return;
            }

            await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`), {
                tipoDocumento: "orden_trabajo",
                factura: Number(numeroFactura),
                pagado: true,
            });

            setTipoDocumento("orden_trabajo");
            setFacturaInput(numeroFactura);
            await cargarOrdenes();
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
    };

  
    //---------------------HTML------------------------------------------------------------------->>

    return (
        <div style={{ padding: 20 }}>
            <h2>Gestión de OT</h2>

            {!otSeleccionada && (
                <>
                    {/* BUSCADOR */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <input
                            type="text"
                            placeholder='Buscar por OT, fecha, factura o cliente. Ej: "ot001"'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{
                                flex: 1,
                                padding: 8,
                                border: "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        />
                        <button onClick={cargarOrdenes}>Recargar</button>
                        {/* 🔹 filtro solo mis OTs */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={mostrarSoloMias}
                                    onChange={(e) => setMostrarSoloMias(e.target.checked)}
                                />
                                Mostrar mis órdenes de trabajo
                            </label>
                        </div>
                    </div>

                    {/* TABLA */}
                    <div
                        style={{
                            border: "1px solid #ccc",
                            borderRadius: 8,
                            overflow: "hidden",
                            background: "#fff",
                        }}
                    >
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f5f5f5" }}>
                                    <th style={thStyle}>OT</th>
                                    <th style={thStyle}>Fecha</th>
                                    <th style={thStyle}>Factura</th>
                                    <th style={thStyle}>Cliente</th>
                                    <th style={thStyle}>Asesor</th>
                                    <th style={thStyle}>Seleccionar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr>
                                        <td style={tdStyle} colSpan={6}>
                                            Cargando...
                                        </td>
                                    </tr>
                                ) : ordenesFiltradas.length === 0 ? (
                                    <tr>
                                        <td style={tdStyle} colSpan={5}>
                                            No hay resultados
                                        </td>
                                    </tr>
                                ) : (
                                            ordenesFiltradas.map((ot) => (
                                                <tr key={ot.firebaseKey}>
                                                    <td style={tdStyle}>{ot.otLabel || ot.firebaseKey}</td>
                                                    <td style={tdStyle}>{formatearFecha(ot.fecha)}</td>
                                                    <td style={tdStyle}>
                                                        {ot.factura === null || ot.factura === undefined
                                                            ? "--"
                                                            : ot.factura}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {ot.clienteSnapshot?.nombre ||
                                                            ot.clienteSnapshot?.razonSocial ||
                                                            "PUBLICO GENERAL"}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        {ot.asesorSnapshot?.username ||
                                                            ot.asesorSnapshot?.nombre ||
                                                            "--"}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button onClick={() => seleccionarOT(ot)}>
                                                            Seleccionar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* DETALLE */}
            {otSeleccionada && (
                <div
                    style={{
                        border: "1px solid #999",
                        borderRadius: 10,
                        padding: 20,
                        background: "#fff",
                        position: "relative",
                        marginTop: 10,
                    }}
                >
                    {/* X cerrar */}
                    <button
                        onClick={cerrarConsulta}
                        style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            background: "#ff4d4f",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        ✕
                    </button>
                    {/* 🔹 sello pagado */}
                    {otSeleccionada.tipoDocumento === "orden_trabajo" && otSeleccionada.pagado && (
                        <img
                            src="/svg/sello_pagado.svg"
                            alt="pagado"
                            style={{
                                width: 200,
                                position: "absolute",
                                top: 10,
                                right: 60,
                                opacity: 0.8,
                            }}
                        />
                    )}

                    <div style={{ width: "80%" }}>
                        <div style={{ marginBottom: 10 }}>
                            <h1>{otSeleccionada.otLabel || otSeleccionada.firebaseKey} </h1>
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <b>Fecha:</b> {formatearFecha(otSeleccionada.fecha)}
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <b>Factura:</b>{" "}
                            {otSeleccionada.factura === null ||
                                otSeleccionada.factura === undefined
                                ? "--"
                                : otSeleccionada.factura}
                        </div>
                        {/*EL SELECT COTIZACION ORDEN DE COMPRA*/}
                        {/* 🔹 Tipo de documento */}
                        <div style={{ marginBottom: 10 }}>
                            <b>Tipo:</b>{" "}
                            <select
                                value={tipoDocumento}
                                onChange={(e) => {
                                    const nuevoTipo = e.target.value as "cotizacion" | "orden_trabajo";
                                    guardarTipoDocumento(nuevoTipo);
                                }}
                                style={{ marginLeft: 10 }}
                            >
                                <option value="cotizacion">Cotización</option>
                                <option value="orden_trabajo">Orden de trabajo</option>
                            </select>
                        </div>

                        {/*----------------------------------------------------*/}
                        <div style={{ marginBottom: 10 }}>
                            <b>Asesor de ventas:</b>{" "}
                            {otSeleccionada.asesorSnapshot?.username ||
                                otSeleccionada.asesorSnapshot?.nombre ||
                                "--"}
                        </div>

                        <div style={{ marginBottom: 10 }}>
                            <b>Cliente:</b>{" "}
                            {otSeleccionada.clienteSnapshot?.nombre ||
                                otSeleccionada.clienteSnapshot?.razonSocial ||
                                "PUBLICO GENERAL"}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <b>Teléfono:</b>{" "}
                            {otSeleccionada.clienteSnapshot?.telefono || "--"}
                        </div>
                        {otSeleccionada.credito && (
                            <div style={{ marginBottom: 10, color: "blue" }}>
                                <b>CRÉDITO</b>
                            </div>
                        )}
                        <div style={{ marginBottom: 10 }}>
                            <b>Envío:</b> {otSeleccionada.envio ? "Sí" : "No"}
                            {otSeleccionada.envioFolio && (
                                <div
                                    style={{
                                        marginBottom: 10,
                                        color: otSeleccionada.envioEnviado
                                            ? "green"
                                            : otSeleccionada.envioGenerado
                                                ? "#d48806"
                                                : "#666",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {otSeleccionada.envioEnviado
                                        ? `ENVIADO: ${otSeleccionada.envioFolio}`
                                        : otSeleccionada.envioGenerado
                                            ? `ENVÍO CREADO: ${otSeleccionada.envioFolio}`
                                            : `ENVÍO RESERVADO: ${otSeleccionada.envioFolio}`}
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 20, marginBottom: 10 }}>
                            <b>Conceptos:</b>
                        </div>

                        <div
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: 12,
                                background: "#fafafa",
                            }}
                        >
                            {trabajosArray.length === 0 ? (
                                <div>No hay partidas</div>
                            ) : (
                                trabajosArray.map((trabajo, index) => (
                                    <div
                                        key={trabajo.partida || index}
                                        style={{
                                            padding: "8px 0",
                                            borderBottom:
                                                index < trabajosArray.length - 1
                                                    ? "1px dashed #ccc"
                                                    : "none",
                                        }}
                                    >
                                        <div>
                                            <b>{trabajo.partida || `Partida ${index + 1}`}</b>
                                        </div>
                                        <div>{trabajo.descripcion || "--"}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div
                            style={{
                                marginTop: 20,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                            }}
                        >
                            <button onClick={editarOTCompleta}>Editar</button>
                            {tipoDocumento === "cotizacion" ? (
                                <button onClick={generarPDF}>Cotización</button>
                            ) : (
                                <>
                                    <button onClick={generarPDF}>PDF cliente</button>
                                    <button onClick={generarPDFProduccion}>PDF Producción</button>
                                </>
                            )}

                            {otSeleccionada.clienteSnapshot?.telefono && (
                                <button onClick={enviarWhatsAppCliente}>
                                    Mandar WhatsApp
                                </button>
                            )}

                            {otSeleccionada.envio && (
                                <button
                                    onClick={() => {
                                        navigate("/envios", {
                                            state: {
                                                desdeOT: true,
                                                cliente: otSeleccionada?.clienteSnapshot,
                                                clienteId: otSeleccionada?.clienteId,
                                                otKey: otSeleccionada?.firebaseKey,
                                                otLabel: otSeleccionada?.otLabel,
                                                envioFolio: otSeleccionada?.envioFolio,
                                            },
                                        });
                                    }}
                                >
                                    Generar envío
                                </button>
                            )}

                            <button
                                onClick={borrarOT}
                                style={{
                                    background: "red",
                                    color: "white",
                                    border: "none",
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                }}
                            >
                                Borrar OT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: 10,
    borderBottom: "1px solid #ddd",
    textAlign: "left",
};

const tdStyle: React.CSSProperties = {
    padding: 10,
    borderBottom: "1px solid #eee",
};

export default GestionOT;
