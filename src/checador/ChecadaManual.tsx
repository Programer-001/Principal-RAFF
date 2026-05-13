import React, { useEffect, useState } from "react";
import { onValue, push, ref, update } from "firebase/database";
import { db } from "../firebase/config";

type EmpleadoRH = {
    id: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
};

function fechaHoy() {
    const hoy = new Date();

    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
}

function horaActual() {
    const ahora = new Date();

    const hh = String(ahora.getHours()).padStart(2, "0");
    const mm = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");

    return `${hh}:${mm}:${ss}`;
}

const ChecadaManual: React.FC = () => {
    const [empleados, setEmpleados] = useState<EmpleadoRH[]>([]);

    const [empleadoId, setEmpleadoId] = useState("");
    const [fecha, setFecha] = useState(fechaHoy());
    const [hora, setHora] = useState(horaActual());

    const [guardando, setGuardando] = useState(false);

    // ===============================
    // EMPLEADOS
    // ===============================
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
                .filter((emp) => emp.activo);

            setEmpleados(lista);
        });

        return () => unsubscribe();
    }, []);

    // ===============================
    // GUARDAR CHECADA
    // ===============================
const guardarChecada = async () => {
    try {
        if (!empleadoId) {
            alert("Selecciona un empleado");
            return;
        }

        if (!fecha || !hora) {
            alert("Completa fecha y hora");
            return;
        }

        setGuardando(true);

        const empleado = empleados.find(
            (e) => String(e.id) === String(empleadoId)
        );

        if (!empleado) {
            alert("Empleado no encontrado");
            return;
        }

        const refBase = ref(
            db,
            `asistencia/registros/${fecha}/${empleadoId}`
        );

        const eventoRef = push(
            ref(db, `asistencia/registros/${fecha}/${empleadoId}/eventos`)
        );

        // Leer resumen actual antes de actualizar
        const snapshot = await new Promise<any>((resolve) => {
            onValue(refBase, resolve, { onlyOnce: true });
        });

        const actual = snapshot.val() || {};
        const timestamp = Date.now();

        // Guardar evento manual
        await update(eventoRef, {
            empleadoId,
            nombre: empleado.nombre || "",
            username: empleado.username || "",
            area: empleado.area || "",
            puesto: empleado.puesto || "",
            fecha,
            hora,
            origen: "manual",
            timestamp,
        });

        // Actualizar resumen del día
        await update(refBase, {
            empleadoId,
            nombre: empleado.nombre || actual.nombre || "",
            username: empleado.username || actual.username || "",
            area: empleado.area || actual.area || "",
            puesto: empleado.puesto || actual.puesto || "",

            // Si no existe entrada, esta hora será la entrada.
            // Si ya existe, se conserva.
            entrada: actual.entrada || actual.primeraEntrada || hora,
            primeraEntrada: actual.primeraEntrada || actual.entrada || hora,

            // Esta siempre se actualiza
            ultimaChecada: hora,

            totalChecadas: (actual.totalChecadas || 0) + 1,
            actualizado: timestamp,
        });

        alert("Checada agregada");

        setHora(horaActual());
    } catch (error) {
        console.log(error);
        alert("Error guardando checada");
    } finally {
        setGuardando(false);
    }
};

    return (
        <div className="bono-page">
            <h2>Checada Manual</h2>

            <section className="bono-card">
                <div className="filtros-grid">
                    <label>
                        Empleado

                        <select
                            value={empleadoId}
                            onChange={(e) =>
                                setEmpleadoId(e.target.value)
                            }
                        >
                            <option value="">
                                Seleccionar...
                            </option>

                            {empleados.map((emp) => (
                                <option
                                    key={emp.id}
                                    value={emp.id}
                                >
                                    {emp.nombre ||
                                        emp.username ||
                                        emp.id}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Fecha

                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) =>
                                setFecha(e.target.value)
                            }
                        />
                    </label>

                    <label>
                        Hora

                        <input
                            type="time"
                            step="1"
                            value={hora}
                            onChange={(e) =>
                                setHora(e.target.value)
                            }
                        />
                    </label>
                </div>

                <button
                    type="button"
                    className="btn-pdf"
                    onClick={guardarChecada}
                    disabled={guardando}
                >
                    {guardando
                        ? "Guardando..."
                        : "Agregar checada"}
                </button>
            </section>
        </div>
    );
};

export default ChecadaManual;