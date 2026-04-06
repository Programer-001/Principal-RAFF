import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { app, auth } from "../firebase/config";
import Notas from "./notas";

interface Empleado {
    id: string;
    nombre?: string;
    username?: string;
    uid?: string;
    activo?: boolean;
}

const Home: React.FC = () => {
    const db = getDatabase(app);

    const [loading, setLoading] = useState(true);
    const [empleado, setEmpleado] = useState<Empleado | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setEmpleado(null);
                setLoading(false);
                return;
            }

            try {
                const empleadosRef = ref(db, "RH/Empleados");
                const snap = await get(empleadosRef);

                if (!snap.exists()) {
                    setEmpleado(null);
                    setLoading(false);
                    return;
                }

                const data = snap.val() || {};

                const encontrado = Object.keys(data)
                    .map((key) => ({
                        id: key,
                        ...data[key],
                    }))
                    .find((emp: any) => emp.uid === user.uid);

                if (encontrado) {
                    setEmpleado({
                        id: String(encontrado.id),
                        nombre: encontrado.nombre || "",
                        username: encontrado.username || "",
                        uid: encontrado.uid || "",
                        activo: encontrado.activo ?? true,
                    });
                } else {
                    setEmpleado(null);
                }
            } catch (error) {
                console.error("Error cargando empleado:", error);
                setEmpleado(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [db]);

    if (loading) {
        return <div className="home-loading">Cargando...</div>;
    }

    if (!empleado) {
        return <div className="home-loading">No se encontró el empleado.</div>;
    }

    return (
        <div className="home-container">
            <div className="home-bienvenida">
                Bienvenido: <span>{empleado.username || "Compañero"}</span>
            </div>
            <Notas
                empleadoId={empleado.id}
                empleadoNombre={empleado.username || "Empleado"}
            />
        </div>
    );
};

export default Home;