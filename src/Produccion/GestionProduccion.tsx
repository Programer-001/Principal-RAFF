// src/GestionProduccion.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get, remove } from "firebase/database";
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
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number;
    datos?: any;
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
    // Busca la OT en Firebase y evita duplicados
    // =========================
    const agregarOT = async () => {
        const numeroLimpio = numeroOT.replace(/\D/g, "");

        if (!numeroLimpio) {
            alert("Escribe un número de OT");
            return;
        }

        const numeroFormateado = formatearNumeroOT(numeroLimpio);
        const otLabelBuscada = `OT-${numeroFormateado}`;

        // Validar si ya fue agregada
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

            const nuevaOT: OrdenTrabajoConClave = {
                firebaseKey: encontradaKey,
                ...data[encontradaKey],
            };

            setOrdenesAgregadas((prev) => [nuevaOT, ...prev]);
            setNumeroOT("");
        } catch (error) {
            console.error("Error al buscar la OT:", error);
            alert("Ocurrió un error al buscar la OT");
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
                                                <button onClick={() => seleccionarOT(ot)}>Seleccionar</button>
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

                    <div style={{ marginBottom: 10 }}>
                        <b>Progreso:</b> Aquí luego pondremos la barra
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

export default GestionProduccion;
