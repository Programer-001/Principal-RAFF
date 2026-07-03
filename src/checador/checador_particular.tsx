// src/Checador/checador_particular.tsx

import React, { useEffect, useState } from "react";
import { get, push, ref, update } from "firebase/database";
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

// Ubicación de RAFF
const LAT_RAFF = 20.68065;
const LNG_RAFF = -103.36982;
// Distancia máxima permitida para checar
const RADIO_PERMITIDO_METROS = 80;

function distanciaMetros(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
) {
    const R = 6371000;
    const rad = Math.PI / 180;

    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) *
            Math.cos(lat2 * rad) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ChecadorParticular: React.FC = () => {
    const [empleado, setEmpleado] = useState<EmpleadoRH | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const cargarEmpleado = async () => {
            try {
                // AJUSTA ESTO A COMO GUARDAS TU SESIÓN
                const usuarioSesion =
                    localStorage.getItem("username") ||
                    localStorage.getItem("usuario") ||
                    "";

                if (!usuarioSesion) {
                    alert("No se encontró sesión activa");
                    setCargando(false);
                    return;
                }

                const empleadosRef = ref(db, "RH/Empleados");
                const snapshot = await get(empleadosRef);

                if (!snapshot.exists()) {
                    setCargando(false);
                    return;
                }

                const data = snapshot.val();

                const lista: EmpleadoRH[] = Object.entries(data).map(
                    ([id, value]: any) => ({
                        id,
                        ...value,
                    })
                );

                const encontrado = lista.find(
                    (emp) =>
                        emp.activo &&
                        (emp.username === usuarioSesion ||
                            emp.id === usuarioSesion)
                );

                if (!encontrado) {
                    alert("Empleado no encontrado o inactivo");
                    setCargando(false);
                    return;
                }

                setEmpleado(encontrado);
            } catch (error) {
                console.log(error);
                alert("Error cargando empleado");
            } finally {
                setCargando(false);
            }
        };

        cargarEmpleado();
    }, []);

    const guardarChecada = async () => {
        if (!empleado) return;

        const fecha = fechaHoy();
        const hora = horaActual();
        const empleadoId = empleado.id;

        const refBase = ref(
            db,
            `asistencia/registros/${fecha}/${empleadoId}`
        );

        const eventoRef = push(
            ref(db, `asistencia/registros/${fecha}/${empleadoId}/eventos`)
        );

        const snapshot = await get(refBase);
        const actual = snapshot.val() || {};
        const timestamp = Date.now();

        await update(eventoRef, {
            empleadoId,
            nombre: empleado.nombre || "",
            username: empleado.username || "",
            area: empleado.area || "",
            puesto: empleado.puesto || "",
            fecha,
            hora,
            origen: "celular",
            timestamp,
        });

        await update(refBase, {
            empleadoId,
            nombre: empleado.nombre || actual.nombre || "",
            username: empleado.username || actual.username || "",
            area: empleado.area || actual.area || "",
            puesto: empleado.puesto || actual.puesto || "",

            entrada: actual.entrada || actual.primeraEntrada || hora,
            primeraEntrada: actual.primeraEntrada || actual.entrada || hora,

            ultimaChecada: hora,

            totalChecadas: (actual.totalChecadas || 0) + 1,
            actualizado: timestamp,
        });
    };

    const registrarChecada = async () => {
        if (!empleado) {
            alert("No hay empleado cargado");
            return;
        }

        setGuardando(true);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;

                    const distancia = distanciaMetros(
                        lat,
                        lng,
                        LAT_RAFF,
                        LNG_RAFF
                    );

                    if (distancia > RADIO_PERMITIDO_METROS) {
                        alert("No estás en la ubicación permitida para checar");
                        setGuardando(false);
                        return;
                    }

                    await guardarChecada();

                    alert("Checada registrada correctamente");
                } catch (error) {
                    console.log(error);
                    alert("Error registrando checada");
                } finally {
                    setGuardando(false);
                }
            },
            (error) => {
                console.log(error);
                alert("Debes permitir la ubicación para registrar checada");
                setGuardando(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    if (cargando) {
        return (
            <div className="bono-page">
                <h2>Checador</h2>
                <p>Cargando empleado...</p>
            </div>
        );
    }

    return (
        <div className="bono-page">
            <h2>Checador</h2>

            <section className="bono-card">
                {empleado ? (
                    <>
                        <p>
                            <strong>Empleado:</strong>{" "}
                            {empleado.nombre || empleado.username}
                        </p>

                        <p>
                            <strong>Área:</strong> {empleado.area || "N/A"}
                        </p>

                        <button
                            type="button"
                            className="btn-pdf"
                            onClick={registrarChecada}
                            disabled={guardando}
                        >
                            {guardando
                                ? "Registrando..."
                                : "Registrar checada"}
                        </button>
                    </>
                ) : (
                    <p>No se encontró empleado activo.</p>
                )}
            </section>
        </div>
    );
};

export default ChecadorParticular;