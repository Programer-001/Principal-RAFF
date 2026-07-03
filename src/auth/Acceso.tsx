import React, { useState } from "react";
import { loginConUsername } from "./Login";
import { useNavigate } from "react-router-dom";
import { ReactComponent as LogoBlanco } from "../Imagenes/svg/logo_blanco.svg";
import "../css/Acceso.css";
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
  <div className="acceso-page">
    <div className="acceso-card">

      <div className="acceso-left">
        <form onSubmit={handleLogin} className="acceso-form">

          <h1 className="acceso-title">Bienvenido</h1>

          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="acceso-input"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="acceso-input"
          />

          {error && <div className="acceso-error">{error}</div>}

          <button type="submit" disabled={loading} className="acceso-btn">
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>

    <div className="acceso-right">
   <LogoBlanco
    className="logo acceso-logo-pc"
    />
    </div>

    </div>
  </div>
);
};

export default Login;