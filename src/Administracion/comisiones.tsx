//src/Administracion/comisiones.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { formatearMoneda, procesarInputMoneda } from "../funciones/formato_moneda";
import "../css/comisiones.css";

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
/* Aquí puedes ajustar los tipos y descripciones según lo que manejen en tu sistema, 
en firebase el tipo: tubular, banda, cartuchoB, cartuchoA, resorte, termopar, etc. */
const TIPOS_DISPONIBLES = [
    { value: "tubular", label: "Tubular" },
    { value: "banda", label: "Banda" },
    { value: "CartuchoB", label: "Cartucho baja concentración" },
    { value: "CartuchoA", label: "Cartucho alta concentración" },
    { value: "resorte", label: "Resorte" },
    { value: "termopar", label: "Termopar" },
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
        setTiposSeleccionados(TIPOS_DISPONIBLES.map((t) => normalizarTexto(t.value)));
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
        <div className="comisiones-page">
            <h1 className="comisiones-title">Comisiones</h1>

            <div className="comisiones-filtros-container">
                {/* TIPOS */}
                <div className="comisiones-card">
                    <div className="comisiones-card-header">
                        <h3 className="comisiones-card-title">Tipos</h3>
                        <div className="comisiones-inline-buttons">
                            <button className="comisiones-btn-secundario" onClick={seleccionarTodosTipos}>
                                Todos
                            </button>
                            <button className="comisiones-btn-secundario" onClick={limpiarTipos}>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="comisiones-check-grid">
                        {TIPOS_DISPONIBLES.map((tipo) => {
                            const valueNormalizado = normalizarTexto(tipo.value);

                            return (
                                <label key={tipo.value} className="comisiones-check-item">
                                    <input
                                        type="checkbox"
                                        checked={tiposSeleccionados.includes(valueNormalizado)}
                                        onChange={() => toggleTipo(valueNormalizado)}
                                    />
                                    <span>{tipo.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* TRABAJADORES */}
                <div className="comisiones-card">
                    <div className="comisiones-card-header">
                        <h3 className="comisiones-card-title">Trabajadores activos</h3>
                        <div className="comisiones-inline-buttons">
                            <button className="comisiones-btn-secundario" onClick={seleccionarTodosTrabajadores}>
                                Todos
                            </button>
                            <button className="comisiones-btn-secundario" onClick={limpiarTrabajadores}>
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="comisiones-check-grid">
                        {trabajadoresActivos.length === 0 ? (
                            <div>No hay trabajadores activos.</div>
                        ) : (
                            trabajadoresActivos.map((trabajador) => {
                                const username = String(trabajador.username || "").trim();
                                const nombre = String(trabajador.nombre || "").trim();

                                return (
                                    <label key={trabajador.id || username} className="comisiones-check-item">
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
                <div className="comisiones-card">
                    <h3 className="comisiones-card-title">Rango de fechas</h3>

                    <div className="comisiones-fecha-grid">
                        <div className="comisiones-field">
                            <label className="comisiones-label">Fecha inicio</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="comisiones-input"
                            />
                        </div>

                        <div className="comisiones-field">
                            <label className="comisiones-label">Fecha fin</label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className="comisiones-input"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="comisiones-card">
                <div className="comisiones-resumen-superior">
                    <div><strong>Partidas:</strong> {filasFiltradas.length}</div>
                    <div><strong>Cantidad total:</strong> {totalCantidad}</div>
                    <div><strong>Total:</strong> {dinero(totalGeneral)}</div>
                </div>

                <div className="comisiones-table-wrap">
                    <table className="comisiones-table">
                        <thead>
                            <tr>
                                <th>OT</th>
                                <th>Descripcion</th>
                                <th>Operador</th>
                                <th>Tipo</th>
                                <th>Cantidad</th>
                                <th>Subtotal</th>
                                <th>Fecha fin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filasFiltradas.length === 0 ? (
                                <tr>
                                    <td className="td-center" colSpan={7}>
                                        No hay partidas en ese rango.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {filasFiltradas.map((fila) => (
                                        <tr key={fila.partidaKey}>
                                            <td>{fila.partidaKey}</td>
                                            <td>{fila.descripcion || "--"}</td>
                                            <td>{fila.operador || "--"}</td>
                                            <td>{fila.tipo || "--"}</td>
                                            <td className="td-number">{fila.cantidad}</td>
                                            <td className="td-number">{dinero(fila.total)}</td>
                                            <td>{fila.fechaFin || "--"}</td>
                                        </tr>
                                    ))}

                                    <tr className="comisiones-total-row">
                                        <td colSpan={4}><strong>Totales</strong></td>
                                        <td className="td-number"><strong>{totalCantidad}</strong></td>
                                        <td className="td-number"><strong>{dinero(totalGeneral)}</strong></td>
                                        <td><strong>{filasFiltradas.length} partidas</strong></td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RESUMEN POR TRABAJADOR */}
            <div className="comisiones-card">
                <h3 className="comisiones-card-title">Resumen por trabajador</h3>

                <div className="comisiones-table-wrap">
                    <table className="comisiones-table comisiones-resumen-table">
                        <thead>
                            <tr>
                                <th>Trabajador</th>
                                <th>Cantidad</th>
                                <th>Partidas</th>
                                <th>Total trabajado</th>
                                <th>Comisión 0.2%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resumenPorTrabajador.length === 0 ? (
                                <tr>
                                    <td className="td-center" colSpan={5}>
                                        No hay resumen para mostrar.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {resumenPorTrabajador.map((item) => (
                                        <tr key={item.operador}>
                                            <td>{item.operador}</td>
                                            <td className="td-number">{item.cantidad}</td>
                                            <td className="td-number">{item.partidas}</td>
                                            <td className="td-number">{dinero(item.total)}</td>
                                            <td className="td-number">{dinero(item.comision)}</td>
                                        </tr>
                                    ))}

                                    <tr className="comisiones-total-row">
                                        <td><strong>Total general</strong></td>
                                        <td className="td-number">
                                            <strong>{resumenPorTrabajador.reduce((acc, x) => acc + x.cantidad, 0)}</strong>
                                        </td>
                                        <td className="td-number">
                                            <strong>{resumenPorTrabajador.reduce((acc, x) => acc + x.partidas, 0)}</strong>
                                        </td>
                                        <td className="td-number">
                                            <strong>{dinero(resumenPorTrabajador.reduce((acc, x) => acc + x.total, 0))}</strong>
                                        </td>
                                        <td className="td-number">
                                            <strong>{dinero(resumenPorTrabajador.reduce((acc, x) => acc + x.comision, 0))}</strong>
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



export default Comisiones;