// src/GestionOT.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate,useLocation  } from "react-router-dom";
import { getDatabase, ref, get, remove, update, onValue } from "firebase/database";
import { app, auth } from "./firebase/config";
import { generarPDFOTCliente } from "./plantillas/plantillaOTCliente";
import { generarPDFOTProduccion } from "./plantillas/plantillaOTProduccion";
import { generarPDFOTCotizacion } from"./plantillas/plantillaOTCotizacion_Cliente";

interface ClienteSnapshot {
    nombre?: string;
    razonSocial?: string;
    telefono?: string;
    empresa?: string;
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
    estadoProduccion?: string;
}

interface FacturaItem {
    factura?: number | string;
}

interface OrdenTrabajo {
    ot: string;
    otLabel?: string;
    tipoDocumento?: "cotizacion" | "orden_trabajo";
    pagado?: boolean;
    facturas?: Record<string, FacturaItem>;
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
    const otSeleccionadaRef = useRef<OrdenTrabajoConClave | null>(null);
    // 🔹 tipo de documento (cotización / OT)
    const [tipoDocumento, setTipoDocumento] = useState<"cotizacion" | "orden_trabajo">("cotizacion");

    // 🔹 input factura
    //const [facturaInput, setFacturaInput] = useState("");
    // 🔹 facturas del modal
    const [facturasInput, setFacturasInput] = useState<string[]>([""]);
    const [mostrarModalFacturas, setMostrarModalFacturas] = useState(false);
    const [guardandoFacturas, setGuardandoFacturas] = useState(false);
    // 🔹 username real del usuario logueado
    const [usernameActual, setUsernameActual] = useState("");
    //Seleccionar si es cotizacion o orden de trabajo
    const [filtroCotizaciones, setFiltroCotizaciones] = useState(false);
    const [filtroOrdenesTrabajo, setFiltroOrdenesTrabajo] = useState(false);

    //coleccion de facturas
    const obtenerFacturasArray = (ot?: OrdenTrabajo | null): string[] => {
        if (!ot?.facturas) return [];

        return Object.keys(ot.facturas)
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => ot.facturas?.[key]?.factura)
            .filter((f): f is string | number => f !== null && f !== undefined && String(f).trim() !== "")
            .map((f) => String(f).trim());
    };

    const obtenerTextoFacturas = (ot?: OrdenTrabajo | null): string => {
        const facturas = obtenerFacturasArray(ot);

        if (facturas.length === 0) return "--";
        if (facturas.length === 1) return facturas[0];

        return facturas.join(", ");
    };

    const obtenerEtiquetaFacturas = (ot?: OrdenTrabajo | null): string => {
        const facturas = obtenerFacturasArray(ot);
        return facturas.length <= 1 ? "Factura" : "Facturas";
    };
    const obtenerTextoFacturasPDF = (ot?: OrdenTrabajo | null): string | undefined => {
        const texto = obtenerTextoFacturas(ot);
        return texto === "--" ? undefined : texto;
    };

    const construirFacturasDesdeInputs = (inputs: string[]) => {
        const limpias = inputs
            .map((f) => f.trim())
            .filter((f) => f !== "");

        const resultado: Record<string, FacturaItem> = {};

        limpias.forEach((factura, index) => {
            resultado[String(index + 1)] = {
                factura,
            };
        });

        return resultado;
    };

    const limpiarFacturasInput = () => {
        setFacturasInput([""]);
    };
    //Actualizar facturas
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

    const cerrarModalFacturas = () => {
        setMostrarModalFacturas(false);
        setGuardandoFacturas(false);

        if (otSeleccionada) {
            const facturas = obtenerFacturasArray(otSeleccionada);
            setFacturasInput(facturas.length > 0 ? facturas : [""]);
        } else {
            limpiarFacturasInput();
        }
    };

    const abrirModalFacturas = (facturasIniciales?: string[]) => {
        if (facturasIniciales && facturasIniciales.length > 0) {
            setFacturasInput(facturasIniciales);
        } else {
            setFacturasInput([""]);
        }

        setMostrarModalFacturas(true);
    };

    const finalizarCambioAOrdenTrabajo = async () => {
        if (!otSeleccionada) return;

        const facturasLimpias = facturasInput
            .map((f) => f.trim())
            .filter((f) => f !== "");

        if (facturasLimpias.length === 0) {
            alert("Debes capturar al menos una factura");
            return;
        }

        try {
            setGuardandoFacturas(true);

            const db = getDatabase(app);

            await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`), {
                tipoDocumento: "orden_trabajo",
                facturas: construirFacturasDesdeInputs(facturasLimpias),
                pagado: true,
            });

            setTipoDocumento("orden_trabajo");
            setFacturasInput(facturasLimpias);
            setMostrarModalFacturas(false);
            setGuardandoFacturas(false);
        } catch (error) {
            console.error(error);
            setGuardandoFacturas(false);
            alert("Error al guardar las facturas");
        }
    };
    
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
    useEffect(() => {
        otSeleccionadaRef.current = otSeleccionada;
    }, [otSeleccionada]);

    useEffect(() => {
        const db = getDatabase(app);
        const refOT = ref(db, "ordenes_trabajo");

        const unsubscribe = onValue(refOT, (snapshot) => {
            if (!snapshot.exists()) {
                setOrdenes([]);
                return;
            }

            const data = snapshot.val();

            const lista: OrdenTrabajoConClave[] = Object.keys(data).map((key) => ({
                firebaseKey: key,
                ...data[key],
            }));

            lista.sort((a, b) => {
                const na = Number(a.ot || 0);
                const nb = Number(b.ot || 0);
                return nb - na;
            });

            setOrdenes(lista);

            const actualSeleccionada = otSeleccionadaRef.current;

            if (actualSeleccionada) {
                const actualizada = lista.find(
                    (ot) => ot.firebaseKey === actualSeleccionada.firebaseKey
                );

                if (actualizada) {
                    setOtSeleccionada(actualizada);
                }
            }
        });

        return () => unsubscribe();
    }, []);


    //ORDENES FILTRADAS
    const ordenesFiltradas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return ordenes.filter((ot) => {
            const clienteNombre =
                ot.clienteSnapshot?.nombre || ot.clienteSnapshot?.razonSocial || "";

            const facturasTexto = obtenerTextoFacturas(ot).toLowerCase();

            const asesorUsername = (
                ot.asesorSnapshot?.username ||
                ot.asesorSnapshot?.nombre ||
                ""
            ).toLowerCase().trim();

            const coincideBusqueda =
                !texto ||
                ot.firebaseKey.toLowerCase().includes(texto) ||
                (ot.otLabel || "").toLowerCase().includes(texto) ||
                String(ot.ot || "").toLowerCase().includes(texto) ||
                (ot.fecha || "").toLowerCase().includes(texto) ||
                facturasTexto.includes(texto) ||
                clienteNombre.toLowerCase().includes(texto) ||
                asesorUsername.includes(texto);

            const esMia = !mostrarSoloMias
                ? true
                : asesorUsername === usernameActual;

            const tipoDoc = ot.tipoDocumento || "cotizacion";

            let coincideTipo = true;

            if (!filtroCotizaciones && !filtroOrdenesTrabajo) {
                coincideTipo = true;
            } else if (filtroCotizaciones && filtroOrdenesTrabajo) {
                coincideTipo = true;
            } else if (filtroCotizaciones) {
                coincideTipo = tipoDoc === "cotizacion";
            } else if (filtroOrdenesTrabajo) {
                coincideTipo = tipoDoc === "orden_trabajo";
            }

            return coincideBusqueda && esMia && coincideTipo;
        });
    }, [
        busqueda,
        ordenes,
        mostrarSoloMias,
        usernameActual,
        filtroCotizaciones,
        filtroOrdenesTrabajo,
    ]);

    // 🔹 carga tipo y factura desde Firebase
    // 🔹 carga tipo y facturas desde Firebase
    useEffect(() => {
        if (!otSeleccionada) return;

        if (otSeleccionada.tipoDocumento === "orden_trabajo") {
            setTipoDocumento("orden_trabajo");
        } else {
            setTipoDocumento("cotizacion");
        }

        const facturas = obtenerFacturasArray(otSeleccionada);

        if (facturas.length > 0) {
            setFacturasInput(facturas);
        } else {
            setFacturasInput([""]);
        }
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
            factura: obtenerTextoFacturasPDF(otSeleccionada) as any,
            fecha: formatearFecha(otSeleccionada.fecha),
            asesor:
                otSeleccionada.asesorSnapshot?.username ||
                otSeleccionada.asesorSnapshot?.nombre ||
                "",
            clienteNombre:
                otSeleccionada.clienteSnapshot?.nombre || "",
            razonSocial:otSeleccionada.clienteSnapshot?.razonSocial ||"",
            empresa: otSeleccionada.clienteSnapshot?.empresa || "",
            telefono: otSeleccionada.clienteSnapshot?.telefono || "",
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
    //Nota: si agregas mas tipos de resistenias en el cotizador pon el tipo en minusculas
    const generarPDFProduccion = async () => {
        if (!otSeleccionada) return;

        const trabajos = Object.values(otSeleccionada.trabajos || {});

        const gruposMap: Record<string, { titulo: string; items: any[] }> = {
            tubular: { titulo: "Tubular", items: [] },
            banda: { titulo: "Banda", items: [] },
            cartuchob: { titulo: "Cartucho baja concentración", items: [] },
            cartuchoa: { titulo: "Cartucho alta concentración", items: [] },
            Resorte: { titulo: "Resorte", items: [] },
            termopar: { titulo: "Termopar", items: [] },
            cuarzo: { titulo: "Cuarzo", items: [] },
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
                otSeleccionada.clienteSnapshot?.nombre || "",
            razonSocial: otSeleccionada.clienteSnapshot?.razonSocial || "",
            factura: obtenerTextoFacturasPDF(otSeleccionada) as any,
            telefono: otSeleccionada.clienteSnapshot?.telefono || "",    
            envio: otSeleccionada.envio ?? false,
            grupos,
        });
    };
    //--------------Guardar------------------------------------------------>>
    const CotizacionPDF = async () => {
        if (!otSeleccionada) return;

        const conceptos = Object.values(otSeleccionada.trabajos || {}).map(
            (t: any) => ({
                cantidad: 1,
                descripcion: t.descripcion || "--",
                descuento: 0,
                subtotal: Number(t.total || 0),
            })
        );

        const subtotal = Number(otSeleccionada.subtotal || 0);
        const totalConDescuento = Number(
            otSeleccionada.totalConDescuento ?? subtotal
        );
        const totalConIva = Number(otSeleccionada.totalConIva || 0);

        const descuento = subtotal - totalConDescuento;
        const iva = totalConIva - totalConDescuento;

        await generarPDFOTCotizacion({
            otLabel: otSeleccionada.otLabel || otSeleccionada.firebaseKey,
            fecha: formatearFecha(otSeleccionada.fecha),

            // primero razón social, si no existe entonces nombre
            clienteNombre:
                otSeleccionada.clienteSnapshot?.razonSocial ||
                otSeleccionada.clienteSnapshot?.nombre ||
                "PUBLICO GENERAL",

            telefono: otSeleccionada.clienteSnapshot?.telefono || "--",

            conceptos,
            subtotal,
            descuento,
            iva,
            total: totalConIva,
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
    //-------------------FINALIZAR OT ABRA EN SU OT----------------------------------------->>

    const location = useLocation();
    useEffect(() => {
        const state = location.state as any;

        if (!state?.abrirOT || !state?.firebaseKeyOT || ordenes.length === 0) return;

        const encontrada = ordenes.find(
            (ot) => ot.firebaseKey === state.firebaseKeyOT
        );

        if (encontrada) {
            setOtSeleccionada(encontrada);
        }
    }, [location.state, ordenes]);
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
                    facturas: null,
                    pagado: false,
                });

                setTipoDocumento("cotizacion");
                limpiarFacturasInput();
                setMostrarModalFacturas(false);
                return;
            }

            const facturasActuales = obtenerFacturasArray(otSeleccionada);
            abrirModalFacturas(facturasActuales.length > 0 ? facturasActuales : [""]);
        } catch (error) {
            console.error(error);
            alert("Error al preparar el cambio de tipo de documento");
        }
    };
    //ESTADOS
    const formatearEstadoProduccion = (estado?: string) => {
        switch (estado) {
            case "en_fila":
                return "En fila";
            case "en_proceso":
                return "En proceso";
            case "inspeccion":
                return "Inspección";
            case "terminada":
                return "Terminada";
            case "contactado":
                return "Contactado";
            case "lista_para_entrega":
                return "Lista para entrega";
            default:
                return estado || "--";
        }
    };
    //colores de las partidas
    const obtenerColorEstado = (estado?: string) => {
        switch (estado) {
            case "cotizando":
                return { bg: "#e5e7eb", color: "#374151" };

            case "en_fila":
                return { bg: "#fde68a", color: "#92400e" };

            case "en_proceso":
                return { bg: "#facc15", color: "#78350f" };

            case "inspeccion":
                return { bg: "#93c5fd", color: "#1e3a8a" };

            case "terminada":
                return { bg: "#86efac", color: "#065f46" };

            case "contactado":
                return { bg: "#c4b5fd", color: "#4c1d95" };

            case "lista_para_entrega":
                return { bg: "#34d399", color: "#064e3b" };

            default:
                return { bg: "#e5e7eb", color: "#111827" };
        }
    };
    //Barra de progreso
    const obtenerPorcentajeEstado = (estado?: string) => {
        switch (estado) {
            case "cotizando":
                return 0;
            case "en_fila":
                return 20;
            case "en_proceso":
                return 50;
            case "inspeccion":
                return 75;
            case "terminada":
                return 90;
            case "lista_para_entrega":
                return 100;
            default:
                return 0;
        }
    };

    const calcularProgresoOT = (trabajos: any[]) => {
        if (!trabajos || trabajos.length === 0) return 0;

        const total = trabajos.reduce((acc, trabajo) => {
            return acc + obtenerPorcentajeEstado(trabajo.estadoProduccion);
        }, 0);

        return Math.round(total / trabajos.length);
    };
    const progresoOT = calcularProgresoOT(trabajosArray);
    //---------------------HTML------------------------------------------------------------------->>

    return (
        <div style={{ padding: 40 }}>
            <h2>Gestión de OT</h2>

            {!otSeleccionada && (
                <>
                    {/* BUSCADOR */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 12,
                            marginBottom: 20,
                            alignItems: "center",
                        }}
                    >
                        <input
                            type="text"
                            placeholder='Buscar por OT, fecha, factura o cliente. Ej: "ot001"'
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: 260,
                                padding: 8,
                                border: "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        />

                        <button onClick={() => window.location.reload()}>Recargar</button>

                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                                type="checkbox"
                                checked={mostrarSoloMias}
                                onChange={(e) => setMostrarSoloMias(e.target.checked)}
                            />
                            Mostrar mis órdenes
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                                type="checkbox"
                                checked={filtroCotizaciones}
                                onChange={(e) => setFiltroCotizaciones(e.target.checked)}
                            />
                            Cotizaciones
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                                type="checkbox"
                                checked={filtroOrdenesTrabajo}
                                onChange={(e) => setFiltroOrdenesTrabajo(e.target.checked)}
                            />
                            Órdenes de trabajo
                        </label>
                    </div>

                    {/* TABLA */}
                    <div className="table-scroll-gestion">
                        <table className="gestionot-table">
                            <thead>
                                <tr>
                                    <th>OT</th>
                                    <th>Fecha</th>
                                    <th>Factura</th>
                                    <th>Cliente</th>
                                    <th>Asesor</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Seleccionar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr>
                                        <td colSpan={8}>Cargando...</td>
                                    </tr>
                                ) : ordenesFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>No hay resultados</td>
                                    </tr>
                                ) : (
                                    ordenesFiltradas.map((ot) => {
                                        const otCompleta = Object.values(ot.trabajos || {}).every(
                                            (t: any) => t.estadoProduccion === "lista_para_entrega"
                                        );

                                        return (
                                            <tr
                                                key={ot.firebaseKey}
                                                style={{
                                                    background: otCompleta ? "#d9f7be" : "transparent",
                                                }}
                                            >
                                                <td>{ot.otLabel || ot.firebaseKey}</td>
                                                <td>{formatearFecha(ot.fecha)}</td>
                                                <td>{obtenerTextoFacturas(ot)}</td>
                                                <td>
                                                    {ot.clienteSnapshot?.nombre ||
                                                        ot.clienteSnapshot?.razonSocial ||
                                                        "PUBLICO GENERAL"}
                                                </td>
                                                <td>
                                                    {ot.asesorSnapshot?.username ||
                                                        ot.asesorSnapshot?.nombre ||
                                                        "--"}
                                                </td>

                                                <td>
                                                    {ot.tipoDocumento === "orden_trabajo"
                                                        ? "Orden de trabajo"
                                                        : "Cotización"}
                                                </td>

                                                {/* 🔥 COLUMNA ESTADO */}
                                                <td>
                                                    {otCompleta ? (
                                                        <span
                                                            style={{
                                                                color: "green",
                                                                fontSize: 18,
                                                                fontWeight: "bold",
                                                            }}
                                                        >
                                                            ✔
                                                        </span>
                                                    ) : (
                                                        "--"
                                                    )}
                                                </td>

                                                <td>
                                                    <button onClick={() => seleccionarOT(ot)}>
                                                        Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
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
                    {/*Insertar Facturas*/ }
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
                                    Insertar número de factura
                                </h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {facturasInput.map((factura, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: "flex",
                                                gap: 10,
                                                alignItems: "center",
                                            }}
                                        >
                                            <input
                                                type="text"
                                                value={factura}
                                                onChange={(e) =>
                                                    actualizarFacturaInput(index, e.target.value)
                                                }
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

                                <div
                                    style={{
                                        marginTop: 20,
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 10,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={cerrarModalFacturas}
                                        disabled={guardandoFacturas}
                                        style={{
                                            background: "#f3f4f6",
                                            color: "#111827",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            padding: "10px 16px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={finalizarCambioAOrdenTrabajo}
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
                                        {guardandoFacturas ? "Guardando..." : "Finalizar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/*fin insertar facturas*/ }
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
                            <b>{obtenerEtiquetaFacturas(otSeleccionada)}:</b>{" "}
                            {obtenerTextoFacturas(otSeleccionada)}
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
                        <div style={{  marginBottom: 10}}>
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
                        {/*Totales */} 
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", width: 200, marginBottom: 10 }}>
                                <b>Subtotal:</b>
                                <span>
                                    ${Number(otSeleccionada.totalConDescuento || 0).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", width: 200, marginBottom: 10 }}>
                                <b>Total:</b>
                                <span>
                                    ${Number(otSeleccionada.totalConIva || 0).toLocaleString("es-MX", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                        {/* 🔥 BARRA DE PROGRESO */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ marginBottom: 6, fontWeight: "bold" }}>
                                Progreso: {progresoOT}%
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    maxWidth: 400,
                                    height: 18,
                                    background: "#e5e7eb",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${progresoOT}%`,
                                        height: "100%",
                                        background:
                                            progresoOT === 100
                                                ? "#22c55e"
                                                : progresoOT >= 75
                                                    ? "#84cc16"
                                                    : progresoOT >= 40
                                                        ? "#facc15"
                                                        : "#fb923c",
                                        transition: "width 0.3s ease",
                                    }}
                                />
                            </div>
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
                                trabajosArray.map((trabajo, index) => {
                                    const colores = obtenerColorEstado(trabajo.estadoProduccion);

                                    return (
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

                                            <div>
                                                {trabajo.descripcion || "--"}
                                            </div>

                                            {/* 🔥 ESTADO BONITO Colores de estados*/}
                                            <div
                                                style={{
                                                    display: "inline-block",
                                                    marginTop: 6,
                                                    padding: "4px 10px",
                                                    borderRadius: 999,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    backgroundColor: colores.bg,
                                                    color: colores.color,
                                                }}
                                            >
                                                {formatearEstadoProduccion(trabajo.estadoProduccion)}
                                            </div>
                                        </div>
                                    );
                                })
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
                                <button onClick={CotizacionPDF}>Cotización</button>
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
                                onClick={() => {
                                    const actuales = obtenerFacturasArray(otSeleccionada);
                                    abrirModalFacturas(actuales.length > 0 ? actuales : [""]);
                                }}
                            >
                                Editar facturas
                            </button>
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
