import React, { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";

type Empleado = {
    id?: string;
    username?: string;
    nombre?: string;
    activo?: boolean;
    area?: string;
    puesto?: string;
    [key: string]: any;
};

type Trabajo = {
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number | string;
    estadoProduccion?: string;
    fechaInicio?: string;
    fechaFin?: string;
    trabajador?: string;
    datos?: Record<string, any>;
    [key: string]: any;
};

type OrdenTrabajo = {
    ot?: string;
    otLabel?: string;
    trabajos?: Record<string, Trabajo>;
    [key: string]: any;
};

type FilaComision = {
    firebaseKey: string; // ot00040
    partidaKey: string; // ot00040_1
    partidaNumero: number;
    otNumero: number;
    otLabel: string;
    tipo: string;
    descripcion: string;
    operador: string;
    cantidad: number;
    total: number;
    fechaFin: string;
};

const COMISION_PORCENTAJE = 0.002; // 0.2%

const TIPOS_DISPONIBLES = [
    "tubular",
    "banda",
    "cartucho baja concentración",
    "cartucho alta concentración",
    "resorte",
    "termopar",
    "ceramica",
    "infrarrojo",
];

const Comisiones = () => {
    const [ordenes, setOrdenes] = useState<Record<string, OrdenTrabajo>>({});
    const [trabajadores, setTrabajadores] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);

    const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
    const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<string[]>([]);
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    const normalizarTexto = (valor: any) =>
        String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    const numeroSeguro = (valor: any) => {
        const n = Number(valor);
        return Number.isFinite(n) ? n : 0;
    };

    const obtenerCantidad = (trabajo: Trabajo) => {
        const datos = trabajo?.datos || {};

        return (
            numeroSeguro(datos.cantidadResistencias) ||
            numeroSeguro(datos.cantidad) ||
            numeroSeguro(trabajo?.cantidad) ||
            1
        );
    };

    const obtenerOperador = (trabajo: Trabajo) => {
        return String(trabajo?.trabajador || "").trim();
    };

    const obtenerTipo = (trabajo: Trabajo) => {
        return normalizarTexto(trabajo?.tipo);
    };

    const toggleTipo = (tipo: string) => {
        setTiposSeleccionados((prev) =>
            prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
        );
    };

    const toggleTrabajador = (username: string) => {
        setTrabajadoresSeleccionados((prev) =>
            prev.includes(username)
                ? prev.filter((u) => u !== username)
                : [...prev, username]
        );
    };

    const seleccionarTodosTipos = () => {
        setTiposSeleccionados([...TIPOS_DISPONIBLES]);
    };

    const limpiarTipos = () => {
        setTiposSeleccionados([]);
    };

    const seleccionarTodosTrabajadores = () => {
        setTrabajadoresSeleccionados(trabajadoresActivos.map((t) => t.username || "").filter(Boolean));
    };

    const limpiarTrabajadores = () => {
        setTrabajadoresSeleccionados([]);
    };

    useEffect(() => {
        const cargar = async () => {
            try {
                setLoading(true);

                const [snapOrdenes, snapEmpleados] = await Promise.all([
                    get(ref(db, "ordenes_trabajo")),
                    get(ref(db, "RH/Empleados")),
                ]);

                const ordenesData = snapOrdenes.exists() ? snapOrdenes.val() : {};
                const empleadosData = snapEmpleados.exists() ? snapEmpleados.val() : {};

                setOrdenes(ordenesData);

                const listaEmpleados: Empleado[] = Object.entries(empleadosData || {}).map(
                    ([id, emp]: [string, any]) => ({
                        id,
                        ...emp,
                    })
                );

                // Aquí tomé trabajadores activos de producción / operadores
                const activosProduccion = listaEmpleados.filter((emp) => {
                    const activo = emp.activo === true;
                    const area = normalizarTexto(emp.area);
                    const puesto = normalizarTexto(emp.puesto);

                    return activo && (area === "produccion" || puesto === "operador");
                });

                activosProduccion.sort((a, b) =>
                    String(a.username || a.nombre || "").localeCompare(
                        String(b.username || b.nombre || ""),
                        "es-MX",
                        { sensitivity: "base" }
                    )
                );

                setTrabajadores(activosProduccion);
            } catch (error) {
                console.error("Error cargando comisiones:", error);
            } finally {
                setLoading(false);
            }
        };

        cargar();
    }, []);

    const trabajadoresActivos = useMemo(() => trabajadores, [trabajadores]);

    const filasFiltradas = useMemo(() => {
        const resultado: FilaComision[] = [];

        Object.entries(ordenes || {}).forEach(([firebaseKey, orden]) => {
            const trabajos = orden?.trabajos || {};

            Object.entries(trabajos).forEach(([partidaKey, trabajo]) => {
                const t = trabajo as Trabajo;

                const fechaFinTrabajo = String(t?.fechaFin || "").trim();
                if (!fechaFinTrabajo) return;

                const tipoNormalizado = obtenerTipo(t);
                const operador = obtenerOperador(t);
                const operadorNormalizado = operador.trim().toLowerCase();

                if (fechaInicio && fechaFinTrabajo < fechaInicio) return;
                if (fechaFin && fechaFinTrabajo > fechaFin) return;

                if (tiposSeleccionados.length > 0 && !tiposSeleccionados.includes(tipoNormalizado)) {
                    return;
                }

                if (
                    trabajadoresSeleccionados.length > 0 &&
                    !trabajadoresSeleccionados.map((x) => x.toLowerCase()).includes(operadorNormalizado)
                ) {
                    return;
                }

                const total = numeroSeguro(t?.total);
                const cantidad = obtenerCantidad(t);

                const matchOt = String(firebaseKey).match(/\d+/);
                const otNumero = matchOt ? Number(matchOt[0]) : 0;

                const matchPartida = String(partidaKey).match(/_(\d+)$/);
                const partidaNumero = matchPartida ? Number(matchPartida[1]) : 0;

                resultado.push({
                    firebaseKey,
                    partidaKey,
                    partidaNumero,
                    otNumero,
                    otLabel: String(orden?.otLabel || orden?.ot || firebaseKey),
                    tipo: tipoNormalizado,
                    descripcion: String(t?.descripcion || ""),
                    operador: operador || "--",
                    cantidad,
                    total,
                    fechaFin: fechaFinTrabajo,
                });
            });
        });

        resultado.sort((a, b) => {
            if (a.otNumero !== b.otNumero) return a.otNumero - b.otNumero;
            return a.partidaNumero - b.partidaNumero;
        });

        return resultado;
    }, [
        ordenes,
        fechaInicio,
        fechaFin,
        tiposSeleccionados,
        trabajadoresSeleccionados,
        trabajadores,
    ]);

    const totalGeneral = useMemo(() => {
        return filasFiltradas.reduce((acc, item) => acc + item.total, 0);
    }, [filasFiltradas]);

    const totalCantidad = useMemo(() => {
        return filasFiltradas.reduce((acc, item) => acc + item.cantidad, 0);
    }, [filasFiltradas]);

    const resumenPorTrabajador = useMemo(() => {
        const mapa = new Map<
            string,
            {
                operador: string;
                cantidad: number;
                total: number;
                partidas: number;
                comision: number;
            }
        >();

        filasFiltradas.forEach((fila) => {
            const key = fila.operador || "--";

            if (!mapa.has(key)) {
                mapa.set(key, {
                    operador: key,
                    cantidad: 0,
                    total: 0,
                    partidas: 0,
                    comision: 0,
                });
            }

            const actual = mapa.get(key)!;
            actual.cantidad += fila.cantidad;
            actual.total += fila.total;
            actual.partidas += 1;
            actual.comision = actual.total * COMISION_PORCENTAJE;
        });

        return Array.from(mapa.values()).sort((a, b) =>
            a.operador.localeCompare(b.operador, "es-MX", { sensitivity: "base" })
        );
    }, [filasFiltradas]);

    const dinero = (valor: number) =>
        valor.toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
        });

    if (loading) {
        return <div style={{ padding: 20 }}>Cargando comisiones...</div>;
    }

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>Comisiones</h1>

            <div style={styles.filtrosContainer}>
                {/* TIPOS */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Tipos</h3>
                        <div style={styles.inlineButtons}>
                            <button style={styles.btnSecundario} onClick={seleccionarTodosTipos}>
                                Todos
                            </button>
                            <button style={styles.btnSecundario} onClick={limpiarTipos}>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div style={styles.checkGrid}>
                        {TIPOS_DISPONIBLES.map((tipo) => (
                            <label key={tipo} style={styles.checkItem}>
                                <input
                                    type="checkbox"
                                    checked={tiposSeleccionados.includes(tipo)}
                                    onChange={() => toggleTipo(tipo)}
                                />
                                <span style={{ textTransform: "capitalize" }}>{tipo}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* TRABAJADORES */}
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3 style={styles.cardTitle}>Trabajadores activos</h3>
                        <div style={styles.inlineButtons}>
                            <button style={styles.btnSecundario} onClick={seleccionarTodosTrabajadores}>
                                Todos
                            </button>
                            <button style={styles.btnSecundario} onClick={limpiarTrabajadores}>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div style={styles.checkGrid}>
                        {trabajadoresActivos.length === 0 ? (
                            <div>No hay trabajadores activos.</div>
                        ) : (
                            trabajadoresActivos.map((trabajador) => {
                                const username = String(trabajador.username || "").trim();
                                const nombre = String(trabajador.nombre || "").trim();

                                return (
                                    <label key={trabajador.id || username} style={styles.checkItem}>
                                        <input
                                            type="checkbox"
                                            checked={trabajadoresSeleccionados.includes(username)}
                                            onChange={() => toggleTrabajador(username)}
                                        />
                                        <span>{username || nombre || "Sin username"}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* FECHAS */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Rango de fechas</h3>

                    <div style={styles.fechaGrid}>
                        <div style={styles.field}>
                            <label style={styles.label}>Fecha inicio</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Fecha fin</label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div style={styles.card}>
                <div style={styles.resumenSuperior}>
                    <div><strong>Partidas:</strong> {filasFiltradas.length}</div>
                    <div><strong>Cantidad total:</strong> {totalCantidad}</div>
                    <div><strong>Total:</strong> {dinero(totalGeneral)}</div>
                </div>

                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>OT</th>
                                <th style={styles.th}>Descripción</th>
                                <th style={styles.th}>Operador</th>
                                <th style={styles.th}>Tipo</th>
                                <th style={styles.th}>Cantidad</th>
                                <th style={styles.th}>Subtotal</th>
                                <th style={styles.th}>Fecha fin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filasFiltradas.length === 0 ? (
                                <tr>
                                    <td style={styles.tdCenter} colSpan={7}>
                                        No hay partidas en ese rango.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {filasFiltradas.map((fila) => (
                                        <tr key={fila.partidaKey}>
                                            <td style={styles.td}>{fila.partidaKey}</td>
                                            <td style={styles.td}>{fila.descripcion || "--"}</td>
                                            <td style={styles.td}>{fila.operador || "--"}</td>
                                            <td style={styles.td}>{fila.tipo || "--"}</td>
                                            <td style={styles.tdNumber}>{fila.cantidad}</td>
                                            <td style={styles.tdNumber}>{dinero(fila.total)}</td>
                                            <td style={styles.td}>{fila.fechaFin || "--"}</td>
                                        </tr>
                                    ))}

                                    <tr style={styles.totalRow}>
                                        <td style={styles.td} colSpan={4}>
                                            <strong>Totales</strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>{totalCantidad}</strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>{dinero(totalGeneral)}</strong>
                                        </td>
                                        <td style={styles.td}>
                                            <strong>{filasFiltradas.length} partidas</strong>
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RESUMEN POR TRABAJADOR */}
            <div style={styles.card}>
                <h3 style={styles.cardTitle}>Resumen por trabajador</h3>

                <div style={styles.tableWrap}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Trabajador</th>
                                <th style={styles.th}>Cantidad</th>
                                <th style={styles.th}>Partidas</th>
                                <th style={styles.th}>Total trabajado</th>
                                <th style={styles.th}>Comisión 0.2%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumenPorTrabajador.length === 0 ? (
                                <tr>
                                    <td style={styles.tdCenter} colSpan={5}>
                                        No hay resumen para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {resumenPorTrabajador.map((item) => (
                                        <tr key={item.operador}>
                                            <td style={styles.td}>{item.operador}</td>
                                            <td style={styles.tdNumber}>{item.cantidad}</td>
                                            <td style={styles.tdNumber}>{item.partidas}</td>
                                            <td style={styles.tdNumber}>{dinero(item.total)}</td>
                                            <td style={styles.tdNumber}>{dinero(item.comision)}</td>
                                        </tr>
                                    ))}

                                    <tr style={styles.totalRow}>
                                        <td style={styles.td}>
                                            <strong>Total general</strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>
                                                {resumenPorTrabajador.reduce((acc, x) => acc + x.cantidad, 0)}
                                            </strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>
                                                {resumenPorTrabajador.reduce((acc, x) => acc + x.partidas, 0)}
                                            </strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>
                                                {dinero(resumenPorTrabajador.reduce((acc, x) => acc + x.total, 0))}
                                            </strong>
                                        </td>
                                        <td style={styles.tdNumber}>
                                            <strong>
                                                {dinero(resumenPorTrabajador.reduce((acc, x) => acc + x.comision, 0))}
                                            </strong>
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        padding: 20,
        width: "100%",
        boxSizing: "border-box",
    },
    title: {
        marginBottom: 20,
    },
    filtrosContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
        marginBottom: 20,
    },
    card: {
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        overflow: "hidden",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 12,
    },
    cardTitle: {
        margin: 0,
    },
    inlineButtons: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
    },
    btnSecundario: {
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #ccc",
        cursor: "pointer",
        background: "#f8f8f8",
    },
    checkGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 10,
    },
    checkItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
    },
    fechaGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
    },
    label: {
        fontWeight: 600,
    },
    input: {
        padding: 10,
        borderRadius: 8,
        border: "1px solid #ccc",
    },
    resumenSuperior: {
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 14,
    },
    tableWrap: {
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
    },
    th: {
        background: "#f3f4f6",
        padding: 10,
        textAlign: "left",
        borderBottom: "1px solid #ddd",
        whiteSpace: "nowrap",
    },
    td: {
        padding: 10,
        borderBottom: "1px solid #eee",
        verticalAlign: "top",
    },
    tdNumber: {
        padding: 10,
        borderBottom: "1px solid #eee",
        textAlign: "right",
        verticalAlign: "top",
        whiteSpace: "nowrap",
    },
    tdCenter: {
        padding: 16,
        textAlign: "center",
        borderBottom: "1px solid #eee",
    },
    totalRow: {
        background: "#fafafa",
    },
};

export default Comisiones;