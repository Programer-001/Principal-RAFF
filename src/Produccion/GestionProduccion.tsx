// src/GestionProduccion.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get, remove, update, onValue } from "firebase/database";
import { app } from "../firebase/config";
import { generarPDFOTCliente } from "../plantillas/plantillaOTCliente";
import { generarPDFOTProduccion } from "../plantillas/plantillaOTProduccion";

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
    key?: string;
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number;
    datos?: any;
    estadoProduccion?: string;
    trabajador?: string;
    fechaInicio?: string;
    fechaFin?: string;
}

interface EmpleadoProduccion {
    id?: string;
    nombre?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
}

interface OrdenTrabajo {
    ot: string;
    otLabel?: string;
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
    taller?: boolean;
}

type OrdenTrabajoConClave = OrdenTrabajo & {
    firebaseKey: string;
};

const GestionProduccion: React.FC = () => {
    // =========================
    // ESTADOS
    // =========================
    const [numeroOT, setNumeroOT] = useState("");
    const [ordenesAgregadas, setOrdenesAgregadas] = useState<OrdenTrabajoConClave[]>([]);
    const [otSeleccionada, setOtSeleccionada] = useState<OrdenTrabajoConClave | null>(null);
    const [cargando, setCargando] = useState(false);
    const [partidaSeleccionada, setPartidaSeleccionada] = useState<TrabajoItem | null>(null);

    const [operadores, setOperadores] = useState<EmpleadoProduccion[]>([]);
    const [trabajador, setTrabajador] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [estado, setEstado] = useState("en_fila");

    // =========================
    // FORMATEAR NÚMERO OT
    // Ejemplo: 36 -> 00036
    // =========================
    const formatearNumeroOT = (valor: string) => {
        const soloNumeros = valor.replace(/\D/g, "");
        return soloNumeros.padStart(5, "0");
    };

    // =========================
    // AGREGAR OT
    // Busca la OT, evita duplicados y la manda a taller
    // =========================
    const agregarOT = async () => {
        const numeroLimpio = numeroOT.replace(/\D/g, "");

        if (!numeroLimpio) {
            alert("Escribe un número de OT");
            return;
        }

        const numeroFormateado = formatearNumeroOT(numeroLimpio);
        const otLabelBuscada = `OT-${numeroFormateado}`;

        // Validar si ya fue agregada en la tabla local
        const yaExiste = ordenesAgregadas.some(
            (ot) =>
                ot.firebaseKey === `ot${numeroFormateado}` ||
                ot.ot === numeroFormateado ||
                ot.otLabel === otLabelBuscada
        );

        if (yaExiste) {
            alert(`La ${otLabelBuscada} ya está agregada en la tabla`);
            return;
        }

        try {
            setCargando(true);
            const db = getDatabase(app);
            const snapshot = await get(ref(db, "ordenes_trabajo"));

            if (!snapshot.exists()) {
                alert("No existe el nodo ordenes_trabajo");
                return;
            }

            const data = snapshot.val();

            const encontradaKey = Object.keys(data).find((key) => {
                const item = data[key];
                return (
                    key === `ot${numeroFormateado}` ||
                    item.ot === numeroFormateado ||
                    item.otLabel === otLabelBuscada
                );
            });

            if (!encontradaKey) {
                alert(`No se encontró la ${otLabelBuscada}`);
                return;
            }

            // 👇 marcar la OT como enviada a taller
            await update(ref(db, `ordenes_trabajo/${encontradaKey}`), {
                taller: true,
            });

            setNumeroOT("");
            alert(`${otLabelBuscada} agregada a producción`);
        } catch (error) {
            console.error("Error al buscar/agregar la OT:", error);
            alert("Ocurrió un error al agregar la OT");
        } finally {
            setCargando(false);
        }
    };

    // =========================
    // SELECCIONAR OT
    // =========================
    const seleccionarOT = (ot: OrdenTrabajoConClave) => {
        setOtSeleccionada(ot);
    };

    // =========================
    // CERRAR OT
    // =========================
    const cerrarOT = () => {
        setOtSeleccionada(null);
    };

    // =========================
    // CONVERTIR TRABAJOS A ARRAY
    // =========================
    const trabajosArray = otSeleccionada?.trabajos
        ? Object.entries(otSeleccionada.trabajos).map(([key, value]) => ({
            key,
            ...value,
        }))
        : [];

    // =========================
    // SELECCIONAR PARTIDA
    // =========================
    const seleccionarPartida = (trabajo: TrabajoItem) => {
        setPartidaSeleccionada(trabajo);

        setTrabajador(trabajo.trabajador || "");
        setFechaInicio(trabajo.fechaInicio || "");
        setFechaFin(trabajo.fechaFin || "");
        setEstado(trabajo.estadoProduccion || "en_fila");
    };

    // =========================
    // CERRAR PARTIDA
    // =========================
    const cerrarPartida = () => {
        setPartidaSeleccionada(null);
        setTrabajador("");
        setFechaInicio("");
        setFechaFin("");
        setEstado("en_fila");
    };
    // =========================
    // CARGAR OPERADORES DE PRODUCCIÓN
    // Solo activos, área Producción y puesto Operador
    // =========================
    const cargarOperadores = async () => {
        try {
            const db = getDatabase(app);
            const snapshot = await get(ref(db, "RH/Empleados"));

            if (!snapshot.exists()) {
                console.log("No existe RH/Empleados");
                setOperadores([]);
                return;
            }

            const data = snapshot.val();
            console.log("EMPLEADOS RAW:", data);

            const normalizarTexto = (valor: any) =>
                (valor || "")
                    .toString()
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

            const lista: EmpleadoProduccion[] = Object.keys(data)
                .map((key) => ({
                    id: key,
                    ...data[key],
                }))
                .filter((emp: any) => {
                    const area = normalizarTexto(emp.area);
                    const puesto = normalizarTexto(emp.puesto);

                    const activo =
                        emp.activo === true ||
                        emp.activo === "true" ||
                        emp.activo === 1 ||
                        emp.activo === "1";

                    return (
                        activo &&
                        area === "produccion" &&
                        puesto === "operador"
                    );
                })
                .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

            console.log("OPERADORES FILTRADOS:", lista);
            setOperadores(lista);
        } catch (error) {
            console.error("Error al cargar operadores:", error);
            alert("No se pudieron cargar los operadores");
        }
    };
    // =========================
    // FUNCION useEffect
    // =========================
    useEffect(() => {
        cargarOperadores();
    }, []);

    useEffect(() => {
        const unsubscribe = cargarOTsProduccion();

        return () => {
            unsubscribe();
        };
    }, []);
    // =========================
    // FUNCION GUARDAR
    // =========================

    const guardarPartida = async () => {
        if (!otSeleccionada || !partidaSeleccionada) return;

        if (!partidaSeleccionada.key) {
            alert("No se encontró la clave de la partida");
            return;
        }

        try {
            const db = getDatabase(app);

            const ruta = `ordenes_trabajo/${otSeleccionada.firebaseKey}/trabajos/${partidaSeleccionada.key}`;

            // 🔥 1. Guardar en Firebase
            await update(ref(db, ruta), {
                trabajador,
                fechaInicio,
                fechaFin,
                estadoProduccion: estado,
            });

            // 🔥 2. Refrescar estado LOCAL (AQUI VA LO QUE ME PREGUNTASTE)
            setOtSeleccionada((prev) => {
                if (!prev || !prev.trabajos) return prev;

                return {
                    ...prev,
                    trabajos: {
                        ...prev.trabajos,
                        [partidaSeleccionada.key!]: {
                            ...prev.trabajos[partidaSeleccionada.key!],
                            trabajador,
                            fechaInicio,
                            fechaFin,
                            estadoProduccion: estado,
                        },
                    },
                };
            });

            alert("Partida guardada correctamente ✅");

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar la partida");
        }
    };

    // =========================
    // CARGAR OTS DE PRODUCCIÓN
    // Solo muestra OTs con taller = true
    // =========================
    const cargarOTsProduccion = () => {
        const db = getDatabase(app);
        const ordenesRef = ref(db, "ordenes_trabajo");

        return onValue(ordenesRef, (snapshot) => {
            if (!snapshot.exists()) {
                setOrdenesAgregadas([]);
                return;
            }

            const data = snapshot.val();

            const lista: OrdenTrabajoConClave[] = Object.keys(data)
                .map((key) => ({
                    firebaseKey: key,
                    ...data[key],
                }))
                .filter((ot: any) => ot.taller === true)
                .sort((a, b) => Number(b.ot || 0) - Number(a.ot || 0));

            setOrdenesAgregadas(lista);

            // si la OT seleccionada cambió en Firebase, se refresca
            setOtSeleccionada((prev) => {
                if (!prev) return prev;

                const actualizada = lista.find(
                    (ot) => ot.firebaseKey === prev.firebaseKey
                );

                return actualizada || prev;
            });
        });
    };


    // =========================
    // SACAR OT DE TALLER
    // =========================
    const quitarDeTaller = async () => {
        if (!otSeleccionada) return;

        const confirmar = window.confirm(
            `¿Deseas quitar la ${otSeleccionada.otLabel || otSeleccionada.firebaseKey} de producción?`
        );

        if (!confirmar) return;

        try {
            const db = getDatabase(app);

            await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`), {
                taller: false,
            });

            alert("OT quitada de producción");
            setOtSeleccionada(null);
        } catch (error) {
            console.error("Error al quitar de taller:", error);
            alert("No se pudo quitar la OT de producción");
        }
    };
    return (

        <div style={{ padding: 20 }}>
            {/* =========================
        CUERPO PRINCIPAL / AGREGAR OT
       ========================= */}
            <h2>Gestión de Producción</h2>

            {!otSeleccionada && (
                <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <input
                            type="number"
                            placeholder="Número de OT"
                            value={numeroOT}
                            onChange={(e) => setNumeroOT(e.target.value)}
                            style={{
                                width: 180,
                                padding: 8,
                                border: "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        />

                        <button onClick={agregarOT} disabled={cargando}>
                            {cargando ? "Buscando..." : "Agregar OT"}
                        </button>
                    </div>

                    {/* =========================
            TABLA DE OTS AGREGADAS
           ========================= */}
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
                                    <th style={thStyle}>Factura</th>
                                    <th style={thStyle}>Cliente</th>
                                    <th style={thStyle}>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {ordenesAgregadas.length === 0 ? (
                                    <tr>
                                        <td style={tdStyle} colSpan={4}>
                                            No hay OTs agregadas
                                        </td>
                                    </tr>
                                ) : (
                                    ordenesAgregadas.map((ot) => (
                                        <tr key={ot.firebaseKey}>
                                            <td style={tdStyle}>{ot.otLabel || ot.firebaseKey}</td>

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

            {/* =========================
        DETALLE DE LA OT SELECCIONADA
       ========================= */}
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
                    <button
                        onClick={cerrarOT}
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

                    <h1 style={{ textAlign: "center", marginBottom: 20 }}>
                        {otSeleccionada.otLabel || otSeleccionada.firebaseKey}
                    </h1>

                    <div style={{ marginBottom: 10 }}>
                        <b>Factura:</b>{" "}
                        {otSeleccionada.factura === null || otSeleccionada.factura === undefined
                            ? "--"
                            : otSeleccionada.factura}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Compañero:</b>{" "}
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
                        <b>Teléfono:</b> {otSeleccionada.clienteSnapshot?.telefono || "--"}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Envío:</b> {otSeleccionada.envio ? "Sí" : "No"}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <b>Progreso:</b> Aquí luego pondremos la barra
                    </div>

                    {/* =========================
            PARTIDAS DE LA OT
           ========================= */}
                    <div style={{ marginTop: 25 }}>
                        <h3>Partidas</h3>

                        <div
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={thStyle}>Partida</th>
                                        <th style={thStyle}>Tipo</th>
                                        <th style={thStyle}>Estado</th>
                                        <th style={thStyle}>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {trabajosArray.length === 0 ? (
                                        <tr>
                                            <td style={tdStyle} colSpan={4}>
                                                No hay partidas
                                            </td>
                                        </tr>
                                    ) : (
                                        trabajosArray.map((trabajo, index) => (
                                            <tr key={trabajo.partida || index}>
                                                <td style={tdStyle}>
                                                    {trabajo.partida || `Partida ${index + 1}`}
                                                </td>

                                                <td style={tdStyle}>{trabajo.tipo || "--"}</td>

                                                <td style={tdStyle}>
                                                    {trabajo.estadoProduccion || "en_fila"}
                                                </td>

                                                <td style={tdStyle}>
                                                    <button onClick={() => seleccionarPartida(trabajo)}>
                                                        Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* =========================
            DETALLE DE LA PARTIDA SELECCIONADA
           ========================= */}
                    {partidaSeleccionada && (
                        <div
                            style={{
                                marginTop: 25,
                                border: "1px solid #999",
                                borderRadius: 10,
                                padding: 20,
                                background: "#fafafa",
                                position: "relative",
                            }}
                        >
                            <button
                                onClick={cerrarPartida}
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

                            <h3 style={{ marginBottom: 20 }}>
                                {partidaSeleccionada.partida || "Partida seleccionada"}
                            </h3>

                            <div style={{ marginBottom: 15 }}>
                                <b>Descripción:</b>
                                <div
                                    style={{
                                        marginTop: 8,
                                        padding: 10,
                                        border: "1px solid #ddd",
                                        borderRadius: 8,
                                        background: "#fff",
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    {partidaSeleccionada.descripcion || "--"}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr",
                                    gap: 12,
                                    marginBottom: 15,
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Trabajador:
                                    </label>

                                    <select
                                        value={trabajador}
                                        onChange={(e) => setTrabajador(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: 8,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    >
                                        <option value="">Selecciona un operador</option>

                                        {operadores.map((op) => (
                                            <option key={op.id} value={op.nombre || ""}>
                                                {op.nombre || "Sin nombre"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Inicio:
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: 8,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Fin:
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => setFechaFin(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: 8,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "bold",
                                        marginBottom: 6,
                                    }}
                                >
                                    Estado:
                                </label>

                                <select
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    style={{
                                        width: "100%",
                                        maxWidth: 260,
                                        padding: 8,
                                        border: "1px solid #ccc",
                                        borderRadius: 6,
                                    }}
                                >
                                    <option value="en_fila">En fila</option>
                                    <option value="en_proceso">En proceso</option>
                                    <option value="inspeccion">Inspección</option>
                                    <option value="contactado">Contactado</option>
                                    <option value="terminada">Terminada</option>
                                    <option value="lista_entrega">Lista para entrega</option>
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    onClick={() => {
                                        alert("Aquí luego conectamos el PDF de la partida");
                                    }}
                                >
                                    Crear PDF
                                </button>

                                <button onClick={guardarPartida}>
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}
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

export default GestionProduccion;
