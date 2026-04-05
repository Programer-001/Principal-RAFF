import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";

interface PerfilEmpleado {
    nombre?: string;
    puesto?: string;
    area?: string;
    email?: string;
    username?: string;
    uid?: string;
}

const Perfil: React.FC = () => {
    const [perfil, setPerfil] = useState<PerfilEmpleado | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user?.uid) return;

            const snapshot = await get(ref(db, "RH/Empleados"));

            if (!snapshot.exists()) return;

            const data = snapshot.val();

            for (const key in data) {
                const emp = data[key];
                if (emp.uid === user.uid) {
                    setPerfil(emp);
                    break;
                }
            }
        });

        return () => unsub();
    }, []);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 40,
            }}
        >
            <div
                style={{
                    display: "flex",
                    width: 600,
                    minHeight: 220,
                    border: "1px solid #ccc",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    background: "#fff",
                }}
            >
                {/* 🔹 LADO IZQUIERDO - LOGO */}
                <div
                    style={{
                        width: "40%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "#f5f5f5",
                    }}
                >
                    <img
                        src="/svg/logo_negro.svg"
                        alt="Logo"
                        style={{
                            width: "70%",
                            objectFit: "contain",
                        }}
                    />
                </div>

                {/* 🔹 LADO DERECHO - INFO */}
                <div
                    style={{
                        width: "60%",
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 8,
                    }}
                >
                    <div><b>Nombre Completo:</b> {perfil?.nombre || "-"}</div>
                    <div><b>Puesto:</b> {perfil?.puesto || "-"}</div>
                    <div><b>Área:</b> {perfil?.area || "-"}</div>
                    <div><b>Correo:</b> {perfil?.email || "-"}</div>
                    <div><b>Username:</b> {perfil?.username || "-"}</div>
                </div>
            </div>
        </div>
    );
};

export default Perfil;