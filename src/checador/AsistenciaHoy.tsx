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
        </div>
    );
};

export default AsistenciaHoy;