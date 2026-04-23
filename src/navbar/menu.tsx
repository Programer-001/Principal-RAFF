import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { useEffect, useState, useMemo, useRef } from "react";
import { ref, get } from "firebase/database";
import { ReactComponent as Campana } from "../Notificaciones/svg/campana.svg";
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
    const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
    const notiRef = useRef<HTMLDivElement>(null);

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
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                notiRef.current &&
                !notiRef.current.contains(event.target as Node)
            ) {
                setNotificacionesAbiertas(false);
            }
        };

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
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
                <div className="menu-notificaciones-wrap" ref={notiRef}>
                    <button
                        className={`menu-campana-btn ${notificacionesAbiertas ? "activa" : ""}`}
                        onClick={() => setNotificacionesAbiertas((prev) => !prev)}
                    >
                        <Campana  className="menu-campana-icono" />
                        <span className="menu-campana-badge">3</span>
                    </button>

                    {notificacionesAbiertas && (
                        <div className="menu-notificaciones-panel">
                            <div className="menu-notificaciones-header">
                                Notificaciones
                            </div>

                            <div className="menu-notificaciones-lista">
                                <div className="menu-notificacion-item">
                                    Pedido listo
                                </div>
                                <div className="menu-notificacion-item">
                                    Material solicitado
                                </div>
                                <div className="menu-notificacion-item">
                                    OT terminada
                                </div>
                            </div>

                            <div className="menu-notificaciones-footer">
                                Ver todas
                            </div>
                        </div>
                    )}
                </div>
                <div className="menu-user-info">
                <div className="menu-user-name">


                    👤 {textoUsuario}</div>

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
            </div>
        </header>
    );
};

export default Menu;