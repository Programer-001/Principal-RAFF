import React, { useState } from "react";
import { loginConUsername } from "./Login";
import { useNavigate } from "react-router-dom";
import { ReactComponent as LogoBlanco } from "../Imagenes/svg/logo_blanco.svg";
import "../css/svg.css";

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            await loginConUsername(username, password);
            navigate("/home", { replace: true });
        } catch (err: any) {
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                height: "100vh",
                background: "#eef1f5",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    display: "flex",
                    width: "900px",
                    maxWidth: "100%",
                    minHeight: "500px",
                    background: "#ffffff",
                    borderRadius: "18px",
                    overflow: "hidden",
                    boxShadow: "0 12px 35px rgba(0,0,0,0.15)",
                }}
            >
                {/* IZQUIERDA */}
                <div
                    style={{
                        flex: 1,
                        background: "#ffffff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "40px 32px",
                        boxSizing: "border-box",
                    }}
                >
                    <form
                        onSubmit={handleLogin}
                        style={{
                            width: "100%",
                            maxWidth: "320px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                        }}
                    >
                        <div style={{ textAlign: "center", marginBottom: "10px" }}>

                            <h1
                                style={{
                                    margin: 0,
                                    fontSize: "34px",
                                    fontWeight: 700,
                                    color: "#111",
                                }}
                            >
                                Bienvenido
                            </h1>
                        </div>

                        <input
                            type="text"
                            placeholder="Usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d9d9d9",
                                outline: "none",
                                fontSize: "14px",
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                        />

                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                padding: "12px 14px",
                                borderRadius: "8px",
                                border: "1px solid #d9d9d9",
                                outline: "none",
                                fontSize: "14px",
                                width: "100%",
                                boxSizing: "border-box",
                            }}
                        />

                        {error && (
                            <div
                                style={{
                                    color: "#d62828",
                                    fontSize: "14px",
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: "6px",
                                padding: "12px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#000000",
                                color: "#ffffff",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontWeight: "bold",
                                fontSize: "15px",
                                width: "100%",
                                opacity: loading ? 0.7 : 1,
                            }}
                        >
                            {loading ? "Entrando..." : "Iniciar sesión"}
                        </button>
                    </form>
                </div>

                {/* DERECHA */}
                <div
                    style={{
                        flex: 1,
                        background: "#000000",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "30px",
                    }}
                >
                    <LogoBlanco
                        className="logo"
                        style={{
                            width: "500px",
                            maxWidth: "80%",
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Login;