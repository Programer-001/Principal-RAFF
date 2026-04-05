import React, { useState } from "react";
import { loginConUsername } from "./Login";

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            await loginConUsername(username, password);

            // Firebase actualizará automáticamente el estado en App.tsx
        } catch (err: any) {
            console.error(err);

            if (err.message === "Usuario no encontrado") {
                setError("Usuario no encontrado");
            } else if (err.message === "Usuario inactivo") {
                setError("Usuario inactivo");
            } else if (
                err.code === "auth/wrong-password" ||
                err.code === "auth/invalid-credential"
            ) {
                setError("Contraseña incorrecta");
            } else if (err.code === "auth/too-many-requests") {
                setError("Demasiados intentos. Intenta más tarde");
            } else {
                setError("Error al iniciar sesión");
            }
        }

        setLoading(false);
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: "#f0f2f5",
            }}
        >
            <form
                onSubmit={handleLogin}
                style={{
                    background: "#fff",
                    padding: 30,
                    borderRadius: 10,
                    width: 320,
                    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                <h2 style={{ textAlign: "center", marginBottom: 10 }}>
                    Iniciar sesión
                </h2>

                <input
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                    }}
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                    }}
                />

                {error && <div style={{ color: "red", fontSize: 14 }}>{error}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: 10,
                        borderRadius: 6,
                        border: "none",
                        background: "#007bff",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "bold",
                    }}
                >
                    {loading ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </div>
    );
};

export default Login;