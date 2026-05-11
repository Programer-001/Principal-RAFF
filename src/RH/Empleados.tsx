import React, { useEffect, useMemo, useState } from "react";
import { db, functions } from "../firebase/config";
import { ref, set, remove, update, get, onValue } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { formatearFechaMX } from "../funciones/formato_fechas";
import "../css/empleados.css";

interface Empleado {
    id: string;
    nombre: string;
    celular: string;
    email?: string;
    password?: string;
    username?: string;
    activo: boolean;
    area: string;
    puesto: string;
    salario: number;
    diasdevacaciones: number;
    uid?: string;

    fechaIngreso?: string;
    fechaBaja?: string;
    fechaNacimiento?: string;

    direccion?: string;
    numeroExterior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
}

const estadoInicial = {
    id: "",
    nombre: "",
    celular: "",
    email: "",
    password: "",
    username: "",
    activo: true,
    area: "",
    puesto: "",
    salario: 0,
    diasdevacaciones: 0,
    uid: "",
    fechaIngreso: "",
    fechaBaja: "",
    fechaNacimiento: "",
    direccion: "",
    numeroExterior: "",
    colonia: "",
    municipio: "",
    estado: "",
    cp: "",
};

const puestos = [
    "Gerente Administrativo",
    "Gerente Operativo",
    "Cajera",
    "Asesor de Ventas",
    "Auxiliar de Ventas",
    "Supervisor",
    "Operador",
    "Almacenista",
    "Auxiliar de Almacén",
];

const areas = ["Mostrador", "Administración", "Almacén", "Producción"];

const Empleados: React.FC = () => {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [nuevoEmpleado, setNuevoEmpleado] = useState(estadoInicial);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [modoNuevo, setModoNuevo] = useState(false);
    const [idEditando, setIdEditando] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState("");

    useEffect(() => {
        const empleadosRef = ref(db, "RH/Empleados");

        const unsubscribe = onValue(empleadosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                const empleadosArray: Empleado[] = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));

                setEmpleados(empleadosArray);
            } else {
                setEmpleados([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const empleadosFiltrados = useMemo(() => {
        const texto = busqueda.toLowerCase().trim();

        return empleados
            .filter((emp) => {
                if (!texto) return true;

                return (
                    emp.nombre?.toLowerCase().includes(texto) ||
                    emp.username?.toLowerCase().includes(texto) ||
                    emp.area?.toLowerCase().includes(texto) ||
                    emp.puesto?.toLowerCase().includes(texto)
                );
            })
            .sort((a, b) => {
                if (a.activo !== b.activo) return a.activo ? -1 : 1;
                return (a.nombre || "").localeCompare(b.nombre || "");
            });
    }, [empleados, busqueda]);

    const limpiarFormulario = () => {
        setNuevoEmpleado(estadoInicial);
        setModoEdicion(false);
        setModoNuevo(false);
        setIdEditando(null);
    };

    const iniciarNuevoEmpleado = () => {
        setNuevoEmpleado(estadoInicial);
        setModoNuevo(true);
        setModoEdicion(false);
        setIdEditando(null);
    };

    const cargarEmpleadoEnFormulario = (empleado: Empleado) => {
        setNuevoEmpleado({
            id: empleado.id || "",
            nombre: empleado.nombre || "",
            celular: empleado.celular || "",
            email: empleado.email || "",
            password: "",
            username: empleado.username || "",
            activo: empleado.activo ?? true,
            area: empleado.area || "",
            puesto: empleado.puesto || "",
            salario: Number(empleado.salario || 0),
            diasdevacaciones: Number(empleado.diasdevacaciones || 0),
            uid: empleado.uid || "",
            fechaIngreso: empleado.fechaIngreso || "",
            fechaBaja: empleado.fechaBaja || "",
            direccion: empleado.direccion || "",
            numeroExterior: empleado.numeroExterior || "",
            colonia: empleado.colonia || "",
            municipio: empleado.municipio || "",
            estado: empleado.estado || "",
            cp: empleado.cp || "",
            fechaNacimiento: empleado.fechaNacimiento || "",
        });

        setModoEdicion(false);
        setModoNuevo(false);
        setIdEditando(empleado.id);
    };

    const seleccionarEmpleado = (empleado: Empleado) => {
        if (idEditando === empleado.id && !modoEdicion) {
            limpiarFormulario();
            return;
        }

        cargarEmpleadoEnFormulario(empleado);
    };

const crearLoginSiFalta = async () => {
    if (nuevoEmpleado.uid) return nuevoEmpleado.uid;

    if (!nuevoEmpleado.email) {
        throw new Error("El empleado no tiene correo");
    }

    if (!nuevoEmpleado.password || nuevoEmpleado.password.length < 6) {
        throw new Error(
            "Para crear login, escribe una contraseña de al menos 6 caracteres"
        );
    }

    const crearUsuarioEmpleado = httpsCallable(
        functions,
        "crearUsuarioEmpleadoV1"
    );

    try {
        const resultado: any = await crearUsuarioEmpleado({
            email: nuevoEmpleado.email.trim(),
            password: nuevoEmpleado.password,
            nombre: nuevoEmpleado.nombre,
        });

        console.log("resultado crearUsuarioEmpleado:", resultado);

        return resultado?.data?.uid || "";
    } catch (error: any) {
        console.error("ERROR CALLABLE COMPLETO:", error);
        console.error("error.code:", error?.code);
        console.error("error.message:", error?.message);
        console.error("error.details:", error?.details);

        throw error;
    }
};

    const construirEmpleadoParaGuardar = (uidFinal: string) => ({
        id: nuevoEmpleado.id,
        nombre: nuevoEmpleado.nombre,
        celular: nuevoEmpleado.celular || "",
        email: nuevoEmpleado.email || "",
        username: nuevoEmpleado.username || "",
        activo: nuevoEmpleado.activo,
        area: nuevoEmpleado.area,
        puesto: nuevoEmpleado.puesto,
        salario: Number(nuevoEmpleado.salario || 0),
        diasdevacaciones: Number(nuevoEmpleado.diasdevacaciones || 0),
        uid: uidFinal,

        fechaIngreso: nuevoEmpleado.fechaIngreso || "",
        fechaBaja: nuevoEmpleado.fechaBaja || "",
        fechaNacimiento: nuevoEmpleado.fechaNacimiento || "",

        direccion: nuevoEmpleado.direccion || "",
        numeroExterior: nuevoEmpleado.numeroExterior || "",
        colonia: nuevoEmpleado.colonia || "",
        municipio: nuevoEmpleado.municipio || "",
        estado: nuevoEmpleado.estado || "",
        cp: nuevoEmpleado.cp || "",
    });

    const agregarEmpleado = async () => {
        const requiereLogin =
            //nuevoEmpleado.email.trim() !== "" ||
            nuevoEmpleado.password.trim() !== "";

        if (
            !nuevoEmpleado.id ||
            !nuevoEmpleado.nombre ||
            !nuevoEmpleado.puesto ||
            !nuevoEmpleado.area
        ) {
            alert("Completa ID, nombre, área y puesto");
            return;
        }

        if (requiereLogin) {
            if (!nuevoEmpleado.email) {
                alert("Para crear login necesitas correo");
                return;
            }

            if (!nuevoEmpleado.password || nuevoEmpleado.password.length < 6) {
                alert("Para crear login necesitas contraseña de al menos 6 caracteres");
                return;
            }
        }

        setLoading(true);

        try {
            const empleadoRef = ref(db, `RH/Empleados/${nuevoEmpleado.id}`);
            const snapshot = await get(empleadoRef);

            if (snapshot.exists()) {
                alert("❌ El ID ya está en uso.");
                return;
            }

            const uid = requiereLogin ? await crearLoginSiFalta() : "";
            const empleadoAGuardar = construirEmpleadoParaGuardar(uid);

            await set(empleadoRef, empleadoAGuardar);

            alert("✅ Empleado creado correctamente");
            limpiarFormulario();
        } catch (error: any) {
            console.error("Error completo:", error);
            console.error("error.code:", error?.code);
            console.error("error.message:", error?.message);
            console.error("error.details:", error?.details);

            alert(
                error?.details ||
                error?.message ||
                error?.code ||
                "Error al crear empleado"
            );
        } finally {
            setLoading(false);
        }
    };

    const guardarEdicion = async () => {
        if (!idEditando) {
            alert("No hay empleado seleccionado para editar");
            return;
        }

        const requiereLogin =
            //nuevoEmpleado.email.trim() !== "" ||
            nuevoEmpleado.password.trim() !== "";

        if (!nuevoEmpleado.nombre || !nuevoEmpleado.puesto || !nuevoEmpleado.area) {
            alert("Completa nombre, área y puesto");
            return;
        }

        if (requiereLogin && !nuevoEmpleado.uid) {
            if (!nuevoEmpleado.email) {
                alert("Para crear login necesitas correo");
                return;
            }

            if (!nuevoEmpleado.password || nuevoEmpleado.password.length < 6) {
                alert("Para crear login necesitas contraseña de al menos 6 caracteres");
                return;
            }
        }

        setLoading(true);

        try {
            let uidFinal = nuevoEmpleado.uid || "";

            if (!uidFinal && requiereLogin) {
                uidFinal = await crearLoginSiFalta();
            }

            const datosActualizar = construirEmpleadoParaGuardar(uidFinal);
            const { id, ...datosSinId } = datosActualizar;

            await update(ref(db, `RH/Empleados/${idEditando}`), datosSinId);

            alert("✅ Empleado actualizado correctamente");
            limpiarFormulario();
        } catch (error: any) {
            console.error("Error al editar empleado:", error);
            alert(error?.message || "Error al actualizar empleado");
        } finally {
            setLoading(false);
        }
    };

    const eliminarUsuario = httpsCallable(functions, "eliminarUsuarioEmpleado");

    const eliminarEmpleado = async (id: string, uid?: string) => {
        const confirmar = window.confirm("¿Seguro que deseas eliminar este empleado?");

        if (!confirmar) return;

        try {
            if (uid) {
                await eliminarUsuario({ uid });
            }

            await remove(ref(db, `RH/Empleados/${id}`));

            if (idEditando === id) {
                limpiarFormulario();
            }

            alert("Empleado eliminado");
        } catch (error) {
            console.error("Error eliminando:", error);
            alert("Error al eliminar empleado");
        }
    };

    const guardar = () => {
        if (modoNuevo) {
            agregarEmpleado();
            return;
        }

        if (idEditando) {
            guardarEdicion();
            return;
        }

        agregarEmpleado();
    };

    const hayEmpleadoAbierto = modoNuevo || idEditando;

    return (
        <div className="empleados-page">
            <div className="empleados-header">
                <div>
                    <h2>Recursos Humanos</h2>
                    <p>Alta, consulta y edición de empleados</p>
                </div>

                <button className="btn btn-green" onClick={iniciarNuevoEmpleado}>
                    + Nuevo empleado
                </button>
            </div>

            <div className="empleados-layout">
                <section className="empleado-ficha">
                    {!hayEmpleadoAbierto ? (
                        <div className="empleado-empty">
                            <h3>Selecciona un empleado</h3>
                            <p>
                                Da click en la lista de la derecha para abrir su ficha.
                                Si das click otra vez, se cierra.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="empleado-ficha-header">
                                <div className="empleado-nombre-status">
                                    <span
                                        className={`empleado-status-dot ${
                                            nuevoEmpleado.activo ? "activo" : "inactivo"
                                        }`}
                                    />

                                    <div>
                                        <h3>
                                            {modoNuevo
                                                ? "Nuevo empleado"
                                                : nuevoEmpleado.nombre || "Empleado"}
                                        </h3>
                                        <p>
                                            {nuevoEmpleado.activo ? "Activo" : "Inactivo / Baja"}
                                        </p>
                                    </div>
                                </div>

                                {!modoNuevo && (
                                    <button
                                        className="btn btn-blue"
                                        onClick={() => setModoEdicion((prev) => !prev)}
                                    >
                                        {modoEdicion ? "Ver ficha" : "Editar"}
                                    </button>
                                )}
                            </div>

                            <div className="empleado-form-grid">
                                <Campo
                                    label="ID"
                                    value={nuevoEmpleado.id}
                                    editar={modoNuevo}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, id: v })
                                    }
                                />

                                <Campo
                                    label="Nombre"
                                    value={nuevoEmpleado.nombre}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, nombre: v })
                                    }
                                />

                                <Campo
                                    label="Username"
                                    value={nuevoEmpleado.username}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, username: v })
                                    }
                                />

                                <Campo
                                    label="Celular"
                                    value={nuevoEmpleado.celular}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, celular: v })
                                    }
                                />

                                <Campo
                                    label="Correo"
                                    type="email"
                                    value={nuevoEmpleado.email}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, email: v })
                                    }
                                />

                                <Campo
                                    label="Contraseña"
                                    type="password"
                                    value={nuevoEmpleado.password}
                                    editar={modoNuevo || modoEdicion}
                                    placeholder={
                                        nuevoEmpleado.uid
                                            ? "Ya tiene login"
                                            : "Mínimo 6 caracteres para crear login"
                                    }
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, password: v })
                                    }
                                />

                                <CampoSelect
                                    label="Área"
                                    value={nuevoEmpleado.area}
                                    editar={modoNuevo || modoEdicion}
                                    options={areas}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, area: v })
                                    }
                                />

                                <CampoSelect
                                    label="Puesto"
                                    value={nuevoEmpleado.puesto}
                                    editar={modoNuevo || modoEdicion}
                                    options={puestos}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, puesto: v })
                                    }
                                />

                                <Campo
                                    label="Salario"
                                    type="number"
                                    value={nuevoEmpleado.salario}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            salario: Number(v),
                                        })
                                    }
                                />

                                <Campo
                                    label="Días de vacaciones"
                                    type="number"
                                    value={nuevoEmpleado.diasdevacaciones}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            diasdevacaciones: Number(v),
                                        })
                                    }
                                />

                                <Campo
                                    label="Fecha ingreso"
                                    type="date"
                                    value={nuevoEmpleado.fechaIngreso}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            fechaIngreso: v,
                                        })
                                    }
                                />

                                <Campo
                                    label="Fecha baja"
                                    type="date"
                                    value={nuevoEmpleado.fechaBaja}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            fechaBaja: v,
                                            activo: v ? false : nuevoEmpleado.activo,
                                        })
                                    }
                                />
                                <Campo
                                    label="Fecha nacimiento"
                                    type="date"
                                    value={nuevoEmpleado.fechaNacimiento}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            fechaNacimiento: v,
                                        })
                                    }
                                />
                                <Campo
                                    label="Dirección"
                                    value={nuevoEmpleado.direccion}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, direccion: v })
                                    }
                                />

                                <Campo
                                    label="Número exterior"
                                    value={nuevoEmpleado.numeroExterior}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({
                                            ...nuevoEmpleado,
                                            numeroExterior: v,
                                        })
                                    }
                                />

                                <Campo
                                    label="Colonia"
                                    value={nuevoEmpleado.colonia}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, colonia: v })
                                    }
                                />

                                <Campo
                                    label="Municipio"
                                    value={nuevoEmpleado.municipio}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, municipio: v })
                                    }
                                />

                                <Campo
                                    label="Estado"
                                    value={nuevoEmpleado.estado}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, estado: v })
                                    }
                                />

                                <Campo
                                    label="CP"
                                    value={nuevoEmpleado.cp}
                                    editar={modoNuevo || modoEdicion}
                                    onChange={(v: string) =>
                                        setNuevoEmpleado({ ...nuevoEmpleado, cp: v })
                                    }
                                />

                                <div className="campo">
                                    <label className="campo-label">Activo</label>

                                    {modoNuevo || modoEdicion ? (
                                        <label className="empleado-check-activo">
                                            <input
                                                type="checkbox"
                                                checked={nuevoEmpleado.activo}
                                                onChange={(e) =>
                                                    setNuevoEmpleado({
                                                        ...nuevoEmpleado,
                                                        activo: e.target.checked,
                                                    })
                                                }
                                            />
                                            {nuevoEmpleado.activo ? "Activo" : "Inactivo"}
                                        </label>
                                    ) : (
                                        <p>{nuevoEmpleado.activo ? "Sí" : "No"}</p>
                                    )}
                                </div>

                                <Campo
                                    label="UID"
                                    value={nuevoEmpleado.uid}
                                    editar={false}
                                    onChange={() => {}}
                                />
                            </div>

                            <div className="empleado-actions">
                                {(modoNuevo || modoEdicion) && (
                                    <button
                                        className="btn btn-green"
                                        onClick={guardar}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Guardando..."
                                            : modoNuevo
                                                ? "Agregar empleado"
                                                : "Guardar cambios"}
                                    </button>
                                )}

                                {!modoNuevo && idEditando && (
                                    <button
                                        className="btn btn-red"
                                        onClick={() =>
                                            eliminarEmpleado(idEditando, nuevoEmpleado.uid)
                                        }
                                    >
                                        Eliminar
                                    </button>
                                )}

                                <button className="btn btn-purple" onClick={limpiarFormulario}>
                                    Cerrar
                                </button>
                            </div>
                        </>
                    )}
                </section>

                <aside className="empleados-sidebar">
                    <div className="empleados-sidebar-header">
                        <h3>Empleados</h3>
                        <span>{empleados.length}</span>
                    </div>

                    <input
                        className="empleados-search"
                        placeholder="Buscar empleado..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />

                    <div className="empleados-lista">
                        {empleadosFiltrados.map((empleado) => (
                            <button
                                key={empleado.id}
                                className={`empleado-list-item ${
                                    idEditando === empleado.id ? "seleccionado" : ""
                                }`}
                                onClick={() => seleccionarEmpleado(empleado)}
                            >
                                <span
                                    className={`empleado-status-dot ${
                                        empleado.activo ? "activo" : "inactivo"
                                    }`}
                                />

                                <div className="empleado-list-info">
                                    <strong>{empleado.nombre || "Sin nombre"}</strong>
                                    <small>@{empleado.username || empleado.id}</small>
                                    <span>
                                        {empleado.area || "Sin área"} /{" "}
                                        {empleado.puesto || "Sin puesto"}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

type CampoProps = {
    label: string;
    value: any;
    editar: boolean;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
};

const Campo = ({
    label,
    value,
    editar,
    onChange,
    type = "text",
    placeholder = "",
}: CampoProps) => {
    return (
        <div className="campo">
            <label className="campo-label">{label}</label>

            {editar ? (
                <input
                    type={type}
                    value={value ?? ""}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            ) : (
                <p>
                    {type === "date" && value
                        ? formatearFechaMX(value)
                        : value || "-"}
                </p>
            )}
        </div>
    );
};

type CampoSelectProps = {
    label: string;
    value: string;
    editar: boolean;
    options: string[];
    onChange: (value: string) => void;
};

const CampoSelect = ({
    label,
    value,
    editar,
    options,
    onChange,
}: CampoSelectProps) => {
    return (
        <div className="campo">
            <label className="campo-label">{label}</label>

            {editar ? (
                <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
                    <option value="">Seleccione</option>
                    {options.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            ) : (
                <p>{value || "-"}</p>
            )}
        </div>
    );
};

export default Empleados;