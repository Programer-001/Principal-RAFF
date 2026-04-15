// src/comisiones_mostrador.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";

interface CorteCajaItem {
    id: string;
    fecha?: string; // "10/2/2026"
    cantidad?: number;
    estatus?: boolean;
    factura?: string;
    metodo?: string;
    comentarios?: string;
    transaccion?: number;
}

interface EmpleadoRH {
    id: string;
    activo?: boolean;
    area?: string;
    puesto?: string;
    salario?: number;
    username?: string;
    nombre?: string;
}

interface AjusteEmpleado {
    cancelada: boolean;
    diasLaborados: number; // base 5 días
    modificada: boolean;
}

const ComisionesMostrador: React.FC = () => {
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [porcentaje, setPorcentaje] = useState<number>(0.2); // 0.2%
    const [ventasRango, setVentasRango] = useState<CorteCajaItem[]>([]);
    const [empleados, setEmpleados] = useState<EmpleadoRH[]>([]);
    const [loadingVentas, setLoadingVentas] = useState(false);
    const [loadingEmpleados, setLoadingEmpleados] = useState(false);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [empleadoSeleccionado, setEmpleadoSeleccionado] =
        useState<EmpleadoRH | null>(null);

    const [ajustes, setAjustes] = useState<Record<string, AjusteEmpleado>>({});

    const [cancelarComisionTemp, setCancelarComisionTemp] = useState(false);
    const [diasLaboradosTemp, setDiasLaboradosTemp] = useState<number>(5);

    const [facturasExcluidas, setFacturasExcluidas] = useState<Record<string, boolean>>({});

    // =========================
    // HELPERS
    // =========================
    const formatearMoneda = (valor: number) =>
        new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            minimumFractionDigits: 2,
        }).format(valor || 0);

    const parseFechaCorteCaja = (fecha?: string): Date | null => {
        if (!fecha || typeof fecha !== "string") return null;

        // Esperado: d/m/yyyy o dd/mm/yyyy
        const partes = fecha.split("/");
        if (partes.length !== 3) return null;

        const dia = Number(partes[0]);
        const mes = Number(partes[1]);
        const anio = Number(partes[2]);

        if (!dia || !mes || !anio) return null;

        return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
    };

    const parseFechaInput = (fecha: string): Date | null => {
        if (!fecha) return null;
        // fecha tipo yyyy-mm-dd
        const [anio, mes, dia] = fecha.split("-").map(Number);
        if (!anio || !mes || !dia) return null;
        return new Date(anio, mes - 1, dia, 0, 0, 0, 0);
    };

    const estaDentroDeRango = (
        fechaItem: Date | null,
        inicio: Date | null,
        fin: Date | null
    ) => {
        if (!fechaItem || !inicio || !fin) return false;

        const item = new Date(
            fechaItem.getFullYear(),
            fechaItem.getMonth(),
            fechaItem.getDate()
        );
        const desde = new Date(
            inicio.getFullYear(),
            inicio.getMonth(),
            inicio.getDate()
        );
        const hasta = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());

        return item >= desde && item <= hasta;
    };

    // =========================
    // CARGAR EMPLEADOS MOSTRADOR
    // =========================
    const cargarEmpleados = async () => {
        try {
            setLoadingEmpleados(true);
            const snapshot = await get(ref(db, "RH/Empleados"));

            if (!snapshot.exists()) {
                setEmpleados([]);
                return;
            }

            const data = snapshot.val();

            const lista: EmpleadoRH[] = Object.keys(data).map((key) => ({
                id: data[key].id || key,
                activo: data[key].activo ?? false,
                area: data[key].area || "",
                puesto: data[key].puesto || "",
                salario: Number(data[key].salario || 0),
                username: data[key].username || "",
                nombre: data[key].nombre || "",
            }));

            const filtrados = lista.filter(
                (emp) =>
                    emp.activo === true &&
                    (emp.area || "").trim().toLowerCase() === "mostrador"
            );

            setEmpleados(filtrados);

            // inicializar ajustes si no existen
            setAjustes((prev) => {
                const nuevo = { ...prev };
                filtrados.forEach((emp) => {
                    if (!nuevo[emp.id]) {
                        nuevo[emp.id] = {
                            cancelada: false,
                            diasLaborados: 5,
                            modificada: false,
                        };
                    }
                });
                return nuevo;
            });
        } catch (error) {
            console.error("Error cargando empleados:", error);
            setEmpleados([]);
        } finally {
            setLoadingEmpleados(false);
        }
    };

    // =========================
    // CARGAR VENTAS EN RANGO
    // =========================
    const cargarVentas = async () => {
        if (!fechaInicio || !fechaFin) return;

        try {
            setLoadingVentas(true);

            const snapshot = await get(ref(db, "corte-caja"));

            if (!snapshot.exists()) {
                setVentasRango([]);
                return;
            }

            const data = snapshot.val();
            const lista: CorteCajaItem[] = [];

            Object.entries(data).forEach(([fechaKey, dia]: any) => {
                Object.entries(dia).forEach(([pagoKey, p]: any) => {
                    lista.push({
                        id: p.id || pagoKey,
                        fecha: p.fecha || "",
                        cantidad: Number(p.cantidad || 0),
                        estatus: p.estatus ?? false,
                        factura: p.factura || "",
                        metodo: p.metodo || "",
                        comentarios: p.comentarios || "",
                        transaccion: p.transaccion || 0,
                    });
                });
            });

            const desdeTimestamp = new Date(fechaInicio).getTime();
            const hastaTimestamp =
                new Date(fechaFin).getTime() + 24 * 60 * 60 * 1000 - 1;

            const filtradas = lista.filter((p) => {
                if (!p.estatus) return false;
                if (!p.factura) return false;
                if (!p.fecha) return false;

                const [dia, mes, anio] = p.fecha.split("/").map(Number);
                const fechaPago = new Date(anio, mes - 1, dia).getTime();

                return fechaPago >= desdeTimestamp && fechaPago <= hastaTimestamp;
            });

            filtradas.sort((a, b) => {
                const fechaA = parseFechaCorteCaja(a.fecha)?.getTime() || 0;
                const fechaB = parseFechaCorteCaja(b.fecha)?.getTime() || 0;

                // 1) por fecha
                if (fechaA !== fechaB) return fechaA - fechaB;

                // 2) por transacción
                const transA = Number(a.transaccion || 0);
                const transB = Number(b.transaccion || 0);

                if (transA !== transB) return transA - transB;

                // 3) respaldo
                return Number(a.factura || 0) - Number(b.factura || 0);
            });

            setVentasRango(filtradas);
            setFacturasExcluidas({});
        } catch (error) {
            console.error("Error cargando ventas:", error);
            setVentasRango([]);
        } finally {
            setLoadingVentas(false);
        }
    };
    useEffect(() => {
        cargarEmpleados();
    }, []);

    // =========================
    // TOTALES GENERALES
    // =========================
    const totalConIva = useMemo(() => {
        return ventasRango.reduce((acc, item) => {
            if (facturasExcluidas[item.id]) return acc; // 🔴 NO SUMA
            return acc + Number(item.cantidad || 0);
        }, 0);
    }, [ventasRango, facturasExcluidas]);

    const subtotalSinIva = useMemo(() => {
        return totalConIva / 1.16;
    }, [totalConIva]);

    const comisionBaseGeneral = useMemo(() => {
        // porcentaje capturado como 0.2 = 0.2%
        return subtotalSinIva * (Number(porcentaje || 0) / 100);
    }, [subtotalSinIva, porcentaje]);

    // =========================
    // CÁLCULO POR EMPLEADO
    // =========================
    const obtenerSalarioSemanal = (salarioMensual: number) => {
        return Number(salarioMensual || 0) / 4;
    };

    const obtenerComisionEmpleado = (empleadoId: string) => {
        const ajuste = ajustes[empleadoId];

        if (!ajuste) return comisionBaseGeneral;
        if (ajuste.cancelada) return 0;

        if (ajuste.modificada) {
            return (comisionBaseGeneral / 5) * Number(ajuste.diasLaborados || 0);
        }

        return comisionBaseGeneral;
    };

    const totalNominaComisiones = useMemo(() => {
        return empleados.reduce((acc, emp) => {
            const salarioSemanal = obtenerSalarioSemanal(Number(emp.salario || 0));
            const comision = obtenerComisionEmpleado(emp.id);
            return acc + salarioSemanal + comision;
        }, 0);
    }, [empleados, ajustes, comisionBaseGeneral]);

    // =========================
    // MODAL
    // =========================
    const abrirModal = (empleado: EmpleadoRH) => {
        const ajuste = ajustes[empleado.id] || {
            cancelada: false,
            diasLaborados: 5,
            modificada: false,
        };

        setEmpleadoSeleccionado(empleado);
        setCancelarComisionTemp(ajuste.cancelada);
        setDiasLaboradosTemp(ajuste.diasLaborados || 5);
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setEmpleadoSeleccionado(null);
        setCancelarComisionTemp(false);
        setDiasLaboradosTemp(5);
    };

    const aplicarAjuste = () => {
        if (!empleadoSeleccionado) return;

        setAjustes((prev) => ({
            ...prev,
            [empleadoSeleccionado.id]: {
                cancelada: cancelarComisionTemp,
                diasLaborados: Number(diasLaboradosTemp || 0),
                modificada: !cancelarComisionTemp && Number(diasLaboradosTemp) !== 5,
            },
        }));

        cerrarModal();
    };
    useEffect(() => {
        setFacturasExcluidas({});
    }, [fechaInicio, fechaFin]);
    // =========================
    // RESET
    // =========================
    const resetearRango = () => {
        setFechaInicio("");
        setFechaFin("");
        setVentasRango([]);
        setFacturasExcluidas({});
    };
    return (
        <div className="form-container">
            <h2>Comisiones Mostrador</h2>

            {/* FILTROS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                    alignItems: "end",
                }}
            >
                <div>
                    <label><strong>Fecha inicio</strong></label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <label><strong>Fecha fin</strong></label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        style={{ width: "100%" }}
                    />
                </div>

                <div>
                    <label><strong>Porcentaje de comision</strong></label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="number"
                            step="0.01"
                            value={porcentaje}
                            onChange={(e) => setPorcentaje(Number(e.target.value))}
                            style={{ width: "100%" }}
                        />
                        <p style={{ margin: 0 }}>%</p>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={cargarVentas} className="btn btn-blue">
                        Consultar
                    </button>

                    <button onClick={resetearRango} className="btn btn-red">
                        Limpiar
                    </button>
                </div>
            </div>

            {/* RESUMEN */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                }}
            >
                <div className="card-resumen" style={cardStyle}>
                    <strong>Total con IVA</strong>
                    <p style={valorStyle}>{formatearMoneda(totalConIva)}</p>
                </div>

                <div className="card-resumen" style={cardStyle}>
                    <strong>Subtotal sin IVA</strong>
                    <p style={valorStyle}>{formatearMoneda(subtotalSinIva)}</p>
                </div>

                <div className="card-resumen" style={cardStyle}>
                    <strong>Comision base</strong>
                    <p style={valorStyle}>{formatearMoneda(comisionBaseGeneral)}</p>
                </div>

                <div className="card-resumen" style={cardStyle}>
                    <strong>Total semanal + comisiones</strong>
                    <p style={valorStyle}>{formatearMoneda(totalNominaComisiones)}</p>
                </div>
            </div>

            {/* TABLA DE FACTURAS */}
            <h3>Facturas dentro del rango</h3>

            <div className="table-scroll">
                <table className="caja-table">
                    <thead>
                        <tr>
                            <th>Transaccion</th>
                            <th>Fecha</th>
                            <th>Factura</th>
                            <th>Método</th>
                            <th>Cantidad</th>
                            <th>Incluir</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loadingVentas ? (
                            <tr>
                                <td colSpan={6}>Cargando ventas...</td>
                            </tr>
                        ) : ventasRango.length === 0 ? (
                            <tr>
                                <td colSpan={6}>No hay facturas en el rango seleccionado.</td>
                            </tr>
                        ) : (
                            ventasRango.map((item) => (
                                <tr
                                    key={item.id}
                                    style={{
                                        opacity: facturasExcluidas[item.id] ? 0.5 : 1,
                                    }}
                                >
                                    <td>{item.transaccion}</td>
                                    <td>{item.fecha || "-"}</td>
                                    <td>{item.factura || "-"}</td>
                                    <td>{item.metodo || "-"}</td>
                                    <td>{formatearMoneda(Number(item.cantidad || 0))}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={!facturasExcluidas[item.id]}
                                            onChange={(e) => {
                                                setFacturasExcluidas((prev) => ({
                                                    ...prev,
                                                    [item.id]: !e.target.checked,
                                                }));
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* TABLA DE EMPLEADOS */}
            <h3>Trabajadores de Mostrador</h3>
            <div style={{ overflowX: "auto" }}>
                <table className="caja-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Salario semanal</th>
                            <th>Comision</th>
                            <th>Total</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingEmpleados ? (
                            <tr>
                                <td colSpan={6}>Cargando empleados...</td>
                            </tr>
                        ) : empleados.length === 0 ? (
                            <tr>
                                <td colSpan={6}>No hay empleados activos en Mostrador.</td>
                            </tr>
                        ) : (
                            empleados.map((emp) => {
                                const salarioSemanal = obtenerSalarioSemanal(
                                    Number(emp.salario || 0)
                                );
                                const comision = obtenerComisionEmpleado(emp.id);
                                const total = salarioSemanal + comision;
                                const ajuste = ajustes[emp.id];

                                return (
                                    <tr key={emp.id}>
                                        <td>{emp.id}</td>
                                        <td>{emp.username || "-"}</td>
                                        <td>{formatearMoneda(salarioSemanal)}</td>
                                        <td>
                                            {formatearMoneda(comision)}
                                            {ajuste?.cancelada && (
                                                <p style={{ margin: 0, fontSize: "12px", color: "red" }}>
                                                    Cancelada
                                                </p>
                                            )}
                                            {!ajuste?.cancelada && ajuste?.modificada && (
                                                <p style={{ margin: 0, fontSize: "12px", color: "#555" }}>
                                                    {ajuste.diasLaborados} día(s) laborado(s)
                                                </p>
                                            )}
                                        </td>
                                        <td>{formatearMoneda(total)}</td>
                                        <td>
                                            <button onClick={() => abrirModal(emp)}>
                                                Modificar comision
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {modalAbierto && empleadoSeleccionado && (
                <div style={overlayStyle}>
                    <div style={modalStyle}>
                        <h3 style={{ marginTop: 0 }}>
                            Ajustar comisión: {empleadoSeleccionado.username}
                        </h3>

                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input
                                    type="checkbox"
                                    checked={cancelarComisionTemp}
                                    onChange={(e) => setCancelarComisionTemp(e.target.checked)}
                                />
                                Cancelar comisión
                            </label>
                        </div>

                        <div style={{ marginBottom: "14px" }}>
                            <label><strong>Días laborados</strong></label>
                            <input
                                type="number"
                                min={0}
                                max={5}
                                value={diasLaboradosTemp}
                                onChange={(e) => setDiasLaboradosTemp(Number(e.target.value))}
                                disabled={cancelarComisionTemp}
                                style={{ width: "100%", marginTop: 6 }}
                            />
                            <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#666" }}>
                                La comisión se divide entre 5 y se multiplica por los días laborados.
                            </p>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                justifyContent: "flex-end",
                            }}
                        >
                            <button onClick={cerrarModal}>Cerrar</button>
                            <button onClick={aplicarAjuste}>Aplicar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComisionesMostrador;

// =========================
// ESTILOS RÁPIDOS
// =========================
const cardStyle: React.CSSProperties = {
    border: "1px solid #dcdcdc",
    borderRadius: 8,
    padding: 14,
    background: "#fff",
};

const valorStyle: React.CSSProperties = {
    margin: "8px 0 0 0",
    fontSize: "1.2rem",
    fontWeight: 700,
};

const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
};

const modalStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};