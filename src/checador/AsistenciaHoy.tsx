// src/checador/AsistenciaHoy.tsx

import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase/config";
import { calcularEstadoDia } from "./calcularAsistencia";
import "../css/asistencia.css";
type RegistroAsistencia = {
    empleadoId: string;
    nombre?: string;
    area?: string;
    entrada?: string;
    ultimaChecada?: string;
    totalChecadas?: number;
    estado?: string;
    checadas?: any[];
};

type EmpleadoRH = {
    id: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
};

type PermisoEmpleado = {
    id: string;
    empleadoId?: string;
    empleado?: string;
    tipo?: string;
    formaPago?: string;
    inicio: string;
    fin: string;
};

function obtenerFechaHoy() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

const AsistenciaHoy: React.FC = () => {
    const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
    const [cargando, setCargando] = useState(true);
    const [empleadosActivos, setEmpleadosActivos] = useState<EmpleadoRH[]>([]);
    const [permisos, setPermisos] = useState<PermisoEmpleado[]>([]);
    //Checa asistencias
    useEffect(() => {
        const fechaHoy = obtenerFechaHoy();

        const registrosRef = ref(db, `asistencia/registros/${fechaHoy}`);

        const unsubscribe = onValue(registrosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setRegistros([]);
                setCargando(false);
                return;
            }

            const data = snapshot.val();

            const lista: RegistroAsistencia[] = Object.entries(data).map(
                ([empleadoId, value]: any) => ({
                    empleadoId,
                    ...value,
                })
            );

            setRegistros(lista);
            setCargando(false);
        });

        return () => unsubscribe();
    }, []);
    //Recorre a los empleados activos
    useEffect(() => {
        const empleadosRef = ref(db, "RH/Empleados");

        const unsubscribe = onValue(empleadosRef, (snapshot) => {
            if (!snapshot.exists()) {
                setEmpleadosActivos([]);
                return;
            }

            const data = snapshot.val();

            const lista: EmpleadoRH[] = Object.entries(data)
                .map(([id, value]: any) => ({
                    id,
                    ...value,
                }))
                .filter((emp) => emp.activo === true);

            setEmpleadosActivos(lista);
        });

        return () => unsubscribe();
    }, []);
    //permisos de empleados
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

    const fechaHoy = obtenerFechaHoy();

    const obtenerPermisoEmpleado = (empleadoId: string) => {
        return permisos.find(
            (p) =>
                String(p.empleadoId) === String(empleadoId) &&
                fechaHoy >= p.inicio &&
                fechaHoy <= p.fin
        );
    };

    const empleadosConPermisoHoy = empleadosActivos.filter((emp) =>
        obtenerPermisoEmpleado(emp.id)
    );

    const idsConChecada = new Set(
        registros.map((r) => String(r.empleadoId))
    );

    const empleadosSinLlegar = empleadosActivos.filter((emp) => {
        const tieneChecada = idsConChecada.has(String(emp.id));
        const tienePermiso = !!obtenerPermisoEmpleado(emp.id);

        return !tieneChecada && !tienePermiso;
    });

    return (
        <div className="asistencia-page">
            <h2>Asistencia de Hoy</h2>

            {cargando ? (
                <p>Cargando asistencia...</p>
            ) : registros.length === 0 ? (
                <p>No hay checadas registradas hoy.</p>
            ) : (
                <div className="asistencia-table-wrap">
                    <table className="asistencia-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Área</th>
                                <th>Entrada</th>
                                <th>Última checada</th>
                                <th>Total checadas</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {registros.map((r) => (
                                <tr key={r.empleadoId}>
                                    <td>{r.nombre || r.empleadoId}</td>
                                    <td>{r.area || "-"}</td>
                                    <td>{r.entrada || "-"}</td>
                                    <td>{r.ultimaChecada || "-"}</td>
                                    <td>{r.totalChecadas ?? r.checadas?.length ?? 0}</td>
                                    <td>
                                        {calcularEstadoDia(
                                            r.entrada,
                                            r.totalChecadas ?? r.checadas?.length ?? 0
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Empleados con permiso */}
            <div className="asistencia-table-wrap">
                <h3>Permisos de hoy</h3>

                {empleadosConPermisoHoy.length === 0 ? (
                    <p>No hay permisos registrados hoy.</p>
                ) : (
                    <table className="asistencia-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Área</th>
                                <th>Puesto</th>
                                <th>Tipo</th>
                                <th>Forma de pago</th>
                            </tr>
                        </thead>

                        <tbody>
                            {empleadosConPermisoHoy.map((emp) => {
                                const permiso = obtenerPermisoEmpleado(emp.id);

                                return (
                                    <tr key={emp.id}>
                                        <td>{emp.nombre || emp.username || emp.id}</td>
                                        <td>{emp.area || "-"}</td>
                                        <td>{emp.puesto || "-"}</td>
                                        <td>{permiso?.tipo || "-"}</td>
                                        <td>{permiso?.formaPago || "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/*Los que no han llegado*/}
            <div className="asistencia-table-wrap">
                <h3>No han llegado</h3>

                {empleadosSinLlegar.length === 0 ? (
                    <p>Todos los empleados activos ya tienen checada.</p>
                ) : (
                    <table className="asistencia-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Área</th>
                                <th>Puesto</th>
                                <th>Estado</th>
                            </tr>
                        </thead>

                        <tbody>
                            {empleadosSinLlegar.map((emp) => (
                                <tr key={emp.id}>
                                    <td>{emp.nombre || emp.username || emp.id}</td>
                                    <td>{emp.area || "-"}</td>
                                    <td>{emp.puesto || "-"}</td>
                                    <td>Sin checada</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
        
    );
};

export default AsistenciaHoy;