import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useEffect, useState, useMemo } from "react";
import { ref, get } from "firebase/database";
import { obtenerMenuPorPerfil } from "./menuConfig";
import "../css/menu.css";

type Props = {
    vista: string;
    setVista: (v: string) => void;
};

type EmpleadoPerfil = {
    nombre?: string;
    username?: string;
    email?: string;
    uid?: string;
    area?: string;
    puesto?: string;
};

const Menu = ({ vista, setVista }: Props) => {
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<EmpleadoPerfil | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (usuario) => {
            setUser(usuario);

            if (!usuario?.uid) {
                setPerfil(null);
                return;
            }

            try {
                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) {
                    setPerfil(null);
                    return;
                }

                const empleados = snapshot.val();
                let encontrado: EmpleadoPerfil | null = null;

                for (const key in empleados) {
                    const emp = empleados[key];
                    if (emp?.uid === usuario.uid) {
                        encontrado = emp;
                        break;
                    }
                }

                setPerfil(encontrado);
            } catch (error) {
                console.error("Error cargando perfil:", error);
                setPerfil(null);
            }
        });

        return () => unsub();
    }, []);

    const cerrarSesion = async () => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            await signOut(auth);
            setVista("home");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };

    const textoUsuario =
        perfil?.username || perfil?.nombre || user?.email || "Sin sesión";

    const itemsMenu = obtenerMenuPorPerfil(perfil?.area, perfil?.puesto);

    console.log("itemsMenu final:", itemsMenu);

    console.log("perfil actual:", perfil);
    console.log("area actual:", perfil?.area);
    console.log("puesto actual:", perfil?.puesto);

    return (
        <header className="menu-header">
            <div
                className="menu-logo-area"
                onClick={() => setVista("home")}
                style={{ cursor: "pointer" }}
            >
                <img
                    src="/svg/logo_negro.svg"
                    alt="Logo empresa"
                    className="menu-logo"
                />
            </div>

            <nav className="menu-nav">
                {itemsMenu.map((item) =>
                    item.children && item.children.length > 0 ? (
                        <div key={item.key} className="menu-dropdown">
                            <button className="menu-link">
                                {item.label}
                            </button>

                            <div className="menu-dropdown-content">
                                {item.children.map((subitem) => (
                                    <button
                                        key={subitem.key}
                                        className={`menu-sublink ${vista === subitem.key ? "activo" : ""}`}
                                        onClick={() => setVista(subitem.key)}
                                    >
                                        {subitem.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            key={item.key}
                            className={`menu-link ${vista === item.key ? "activo" : ""}`}
                            onClick={() => setVista(item.key)}
                        >
                            {item.label}
                        </button>
                    )
                )}
            </nav>


            <div className="menu-user-area">
                <div className="menu-user-name">👤 {textoUsuario}</div>

                <button
                    className="menu-user-action"
                    onClick={() => setVista("perfil")}
                >
                    Perfil
                </button>

                <button
                    className="menu-user-action salir"
                    onClick={cerrarSesion}
                >
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
};

export default Menu;