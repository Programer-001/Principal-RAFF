import React, { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../firebase/config";
import {
    calcularEstadoEntrada,
    calcularEstadoDia,
    calcularResumenSemanal,
    EstadoAsistencia,
    PermisoAsistencia,
} from "./calcularAsistencia";
import "../css/reporteBonoPuntualidad.css";

type EmpleadoRH = {
    id: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
};
type PermisoEmpleado = PermisoAsistencia & {
    id: string;
    empleadoId?: string;
    empleado?: string;
    tipo?: string;
    formaPago?: string;
    inicio: string;
    fin: string;
    horaPermiso?: string;
};

type RegistroDia = {
    empleadoId: string;
    nombre?: string;
    area?: string;
    entrada?: string;
    ultimaChecada?: string;
    totalChecadas?: number;
    checadas?: any[];
};

type DiaReporte = {
    fecha: string;
    diaTexto: string;
    fechaTexto: string;
};

const COLORES_ASISTENCIA: Record<string, string> = {
    puntual: "#16a34a",
    puntual_sin_bono: "#77dd77",
    retardo_leve: "#facc15",
    retardo_moderado: "#ff3816",
    retardo_grave: "#ff0000",
    falta: "#ea0000",
    permiso: "#3b82f6",
};

const LABEL_ESTADO: Record<string, string> = {
    puntual: "Puntual",
    puntual_sin_bono: "Sin bono",
    retardo_leve: "Retardo leve",
    retardo_moderado: "Retardo moderado",
    retardo_grave: "Retardo grave",
    falta: "Falta",
    permiso: "Permiso",
};

function fechaInputHoy() {
    const hoy = new Date();

    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}
function sumarDias(fecha: string, dias: number) {
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

function obtenerDiasRango(inicio: string, fin: string): DiaReporte[] {
    if (!inicio || !fin) return [];

    const dias: DiaReporte[] = [];
    let actual = inicio;

    while (actual <= fin) {
        const d = new Date(`${actual}T00:00:00`);
        const diaSemana = d.getDay();

        // solo lunes a viernes
        if (diaSemana >= 1 && diaSemana <= 5) {
            dias.push({
                fecha: actual,
                diaTexto: d.toLocaleDateString("es-MX", {
                    weekday: "long",
                }),
                fechaTexto: d.toLocaleDateString("es-MX", {
                    day: "2-digit",
                    month: "2-digit",
                }),
            });
        }

        actual = sumarDias(actual, 1);
    }

    return dias;
}

function formatoHora(hora?: string) {
    if (!hora) return "-";

    const [hh, mm] = hora.split(":").map(Number);

    const fecha = new Date();
    fecha.setHours(hh, mm, 0, 0);

    return fecha.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

function obtenerSalida(registro?: RegistroDia) {
    if (!registro) return "";

    if (registro.ultimaChecada && registro.ultimaChecada !== registro.entrada) {
        return registro.ultimaChecada;
    }

    return "";
}

const ReporteBonoPuntualidad: React.FC = () => {
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");

    const [modo, setModo] = useState<"todos" | "uno" | "personalizado">("todos");
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");
    const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);

    const [empleados, setEmpleados] = useState<EmpleadoRH[]>([]);
    const [permisos, setPermisos] = useState<PermisoEmpleado[]>([]);
    const [registrosPorFecha, setRegistrosPorFecha] = useState<
        Record<string, Record<string, RegistroDia>>
    >({});

    const diasRango = useMemo(
        () => obtenerDiasRango(fechaInicio, fechaFin),
        [fechaInicio, fechaFin]
    );

    useEffect(() => {
        const empleadosRef = ref(db, "RH/Empleados");

        const unsubscribe = onValue(empleadosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setEmpleados([]);
                return;
            }

            const data = snapshot.val();

            const lista: EmpleadoRH[] = Object.entries(data)
                .map(([id, value]: any) => ({
                    id,
                    ...value,
                }))
                .filter((emp) => emp.activo === true);

            setEmpleados(lista);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const permisosRef = ref(db, "RH/permisos_empleados");

        const unsubscribe = onValue(permisosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setPermisos([]);
                return;
            }

            const data = snapshot.val();

            const lista: PermisoEmpleado[] = Object.entries(data).map(
                ([id, value]: any) => ({
                    id,
                    ...value,
                })
            );

            setPermisos(lista);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!fechaInicio || !fechaFin) return;

        const registrosRef = ref(db, "asistencia/registros");

        const unsubscribe = onValue(registrosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setRegistrosPorFecha({});
                return;
            }

            const data = snapshot.val();

            const filtrado: Record<string, Record<string, RegistroDia>> = {};

            Object.entries(data).forEach(([fecha, value]: any) => {
                if (fecha >= fechaInicio && fecha <= fechaFin) {
                    filtrado[fecha] = value;
                }
            });

            setRegistrosPorFecha(filtrado);
        });

        return () => unsubscribe();
    }, [fechaInicio, fechaFin]);

    const obtenerPermisoEmpleado = (fecha: string, empleadoId: string) => {
        return permisos.find(
            (p) =>
                String(p.empleadoId) === String(empleadoId) &&
                fecha >= p.inicio &&
                fecha <= p.fin
        );
    };
    const empleadosVisibles = useMemo(() => {
        if (modo === "todos") return empleados;

        if (modo === "uno") {
            return empleados.filter((e) => e.id === empleadoSeleccionado);
        }

        return empleados.filter((e) => empleadosSeleccionados.includes(e.id));
    }, [modo, empleados, empleadoSeleccionado, empleadosSeleccionados]);

    const obtenerRegistro = (fecha: string, empleadoId: string) => {
        return registrosPorFecha[fecha]?.[empleadoId];
    };

    const obtenerEstado = (
        fecha: string,
        empleadoId: string,
        registro?: RegistroDia
    ): EstadoAsistencia => {

        const permiso = obtenerPermisoEmpleado(
            fecha,
            empleadoId
        );

        // Permiso sin checada
        if (!registro?.entrada && permiso) {
            return "permiso";
        }

        // Sin checada
        if (!registro?.entrada) {
            return "falta";
        }

        // Entrada tarde autorizada
        if (permiso?.tipo === "entrada_tarde") {
            return "puntual_sin_bono";
        }

        // Estado normal
        return calcularEstadoEntrada(
            registro.entrada
        );
    };

    const toggleEmpleado = (id: string) => {
        setEmpleadosSeleccionados((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id]
        );
    };

    const filtrosListos =
        fechaInicio &&
        fechaFin &&
        (
            modo === "todos" ||
            (modo === "uno" && empleadoSeleccionado) ||
            (modo === "personalizado" && empleadosSeleccionados.length > 0)
        );


    return (
        <div className="bono-page">
            <h2>Reporte de Bono de Puntualidad</h2>

            <section className="bono-card filtros-card">
                <div>
                    <h3>1. Filtros</h3>

                    <div className="filtros-grid">
                        <label>
                            Inicio
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </label>

                        <label>
                            Fin
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </label>
                    </div>
                </div>

                <div>
                    <h3>Seleccionar empleados</h3>

                    <label className="radio-line">
                        <input
                            type="radio"
                            checked={modo === "todos"}
                            onChange={() => setModo("todos")}
                        />
                        Todos
                    </label>

                    <label className="radio-line">
                        <input
                            type="radio"
                            checked={modo === "uno"}
                            onChange={() => setModo("uno")}
                        />
                        Un trabajador
                    </label>

                    {modo === "uno" && (
                        <select
                            value={empleadoSeleccionado}
                            onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
                        >
                            <option value="">Seleccionar...</option>
                            {empleados.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.nombre || emp.username || emp.id}
                                </option>
                            ))}
                        </select>
                    )}

                    <label className="radio-line">
                        <input
                            type="radio"
                            checked={modo === "personalizado"}
                            onChange={() => setModo("personalizado")}
                        />
                        Personalizada
                    </label>

                    {modo === "personalizado" && (
                        <div className="checks-empleados">
                            {empleados.map((emp) => (
                                <label key={emp.id}>
                                    <input
                                        type="checkbox"
                                        checked={empleadosSeleccionados.includes(emp.id)}
                                        onChange={() => toggleEmpleado(emp.id)}
                                    />
                                    {emp.nombre || emp.username || emp.id}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="reglas-box">
                    <h3>Reglas de colores</h3>
                    <p><span style={{ background: "#16a34a" }} /> Hasta 09:30:59 = Bono</p>
                    <p><span style={{ background: "#77dd77" }} /> 09:31:00 - 09:35:59 = Sin bono</p>
                    <p><span style={{ background: "#facc15" }} /> 09:36:00 - 09:45:59 = Leve</p>
                    <p><span style={{ background: "#ff3816" }} /> 09:46:00 - 10:00:59 = Moderado</p>
                    <p><span style={{ background: "#ff0000" }} /> 10:01:00 en adelante = Grave</p>
                    <p><span style={{ background: "#ea0000" }} /> Sin checada = Falta</p>
                    <p><span style={{ background: "#3b82f6" }} /> Permiso / Vacaciones</p>
                </div>
            </section>
            {filtrosListos && (
                <>
            {/*Seccion 2 y 3*/ }
            <section className="bono-layout">
                <div className="bono-card">
                    <h3>2. Vista calendario semanal</h3>

                    {empleadosVisibles.map((emp) => {
                        const estadosSemana = diasRango.map((dia) =>
                            obtenerEstado(
                                dia.fecha,
                                emp.id,
                                obtenerRegistro(dia.fecha, emp.id)
                            )
                        );

                        const resumen = calcularResumenSemanal(estadosSemana);

                        return (
                            <div key={emp.id} className="empleado-calendario">
                                <div className="empleado-header">
                                    <strong>{emp.nombre || emp.username || emp.id}</strong>
                                    <span>
                                        Bono:{" "}
                                        <b className={resumen.pierdeBono ? "bono-no" : "bono-si"}>
                                            {resumen.bonoPuntualidad === 100 ? "$100" : "$0"}
                                        </b>
                                    </span>
                                </div>

                                <div className="dias-grid">
                                    {diasRango.map((dia) => {
                                        const registro = obtenerRegistro(dia.fecha, emp.id);
                                        const estado = obtenerEstado(
                                            dia.fecha,
                                            emp.id,
                                            obtenerRegistro(dia.fecha, emp.id)
                                        );
                                        const permiso = obtenerPermisoEmpleado(
                                            dia.fecha,
                                            emp.id
                                        );
                                        const salida = obtenerSalida(registro);

                                        return (
                                            <div key={dia.fecha} className="dia-card">
                                                <div className="dia-title">
                                                    <strong>{dia.diaTexto}</strong>
                                                    <span>{dia.fechaTexto}</span>
                                                </div>

                                                <div
                                                    className="hora-entrada"
                                                    style={{
                                                        background: COLORES_ASISTENCIA[estado],
                                                    }}
                                                >
                                                <strong>
                                                    {estado === "permiso"
                                                        ? permiso?.horaPermiso || "Permiso"
                                                        : formatoHora(registro?.entrada)}
                                                </strong>
                                                    <small>{LABEL_ESTADO[estado]}</small>
                                                </div>

                                                <div className="hora-salida">
                                                    {salida ? formatoHora(salida) : "Sin salida"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bono-card tabla-card">
                    <h3>3. Tabla detallada</h3>

                    <div className="tabla-scroll">
                        <table className="bono-table">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    {diasRango.map((dia) => (
                                        <th key={dia.fecha}>
                                            {dia.diaTexto.slice(0, 3)} {dia.fechaTexto}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {empleadosVisibles.map((emp) => (
                                    <tr key={emp.id}>
                                        <td>{emp.nombre || emp.username || emp.id}</td>

                                            {diasRango.map((dia) => {
                                                const registro = obtenerRegistro(
                                                    dia.fecha,
                                                    emp.id
                                                );

                                                const estado = obtenerEstado(
                                                    dia.fecha,
                                                    emp.id,
                                                    registro
                                                );

                                                const permiso = obtenerPermisoEmpleado(
                                                    dia.fecha,
                                                    emp.id
                                                );

                                                const salida = obtenerSalida(registro);

                                                return (
                                                <td key={dia.fecha}>
                                                    <div
                                                        className="celda-estado"
                                                        style={{
                                                            background: COLORES_ASISTENCIA[estado],
                                                        }}
                                                    >
                                                        <strong>
                                                            {estado === "permiso"
                                                                ? permiso?.horaPermiso || "Permiso"
                                                                : formatoHora(registro?.entrada)}
                                                        </strong>
                                                        <small>{LABEL_ESTADO[estado]}</small>
                                                    </div>

                                                    <div className="celda-salida">
                                                        {salida ? formatoHora(salida) : "-"}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            {/*Seccion 4*/ }
            <section className="bono-card acciones-card">
                <h3>4. Acciones</h3>

                <button
                    type="button"
                    className="btn-pdf"
                    onClick={() => alert("PDF pendiente")}
                >
                    Generar PDF
                </button>
                    </section>
                </>
            )}
        </div>
    );
};

export default ReporteBonoPuntualidad;