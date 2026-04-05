import React, { useState, useEffect } from "react";
import { db, functions } from "../firebase/config";
import { ref, set, remove, update, get, onValue } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import "../css/empleados.css"
interface Empleado {
    id: string;
    nombre: string;
    celular: string;
    email: string;
    password?: string;
    username: string;
    activo: boolean;
    area: string;
    puesto: string;
    salario: number;
    diasdevacaciones: number;
    uid?: string;
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
};

const Empleados: React.FC = () => {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [nuevoEmpleado, setNuevoEmpleado] = useState(estadoInicial);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEditando, setIdEditando] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const empleadosRef = ref(db, "RH/Empleados");
        onValue(empleadosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const empleadosArray = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                setEmpleados(empleadosArray);
            } else {
                setEmpleados([]);
            }
        });
    }, []);

    const limpiarFormulario = () => {
        setNuevoEmpleado(estadoInicial);
        setModoEdicion(false);
        setIdEditando(null);
    };

    const editarDesdeTabla = (empleado: Empleado) => {
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
        });

        setModoEdicion(true);
        setIdEditando(empleado.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const crearLoginSiFalta = async () => {
        if (nuevoEmpleado.uid) {
            return nuevoEmpleado.uid;
        }

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
                email: nuevoEmpleado.email,
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

    const agregarEmpleado = async () => {
        if (
            !nuevoEmpleado.id ||
            !nuevoEmpleado.nombre ||
            !nuevoEmpleado.puesto ||
            !nuevoEmpleado.email ||
            !nuevoEmpleado.username
        ) {
            alert("Completa todos los campos obligatorios");
            return;
        }

        setLoading(true);

        try {
            const empleadoRef = ref(db, `RH/Empleados/${nuevoEmpleado.id}`);
            const snapshot = await get(empleadoRef);

            if (snapshot.exists()) {
                alert("❌ El ID ya está en uso.");
                setLoading(false);
                return;
            }

            const uid = await crearLoginSiFalta();

            const empleadoAGuardar = {
                id: nuevoEmpleado.id,
                nombre: nuevoEmpleado.nombre,
                celular: nuevoEmpleado.celular,
                email: nuevoEmpleado.email,
                username: nuevoEmpleado.username,
                activo: nuevoEmpleado.activo,
                area: nuevoEmpleado.area,
                puesto: nuevoEmpleado.puesto,
                salario: Number(nuevoEmpleado.salario || 0),
                diasdevacaciones: Number(nuevoEmpleado.diasdevacaciones || 0),
                uid,
            };

            await set(empleadoRef, empleadoAGuardar);

            alert("✅ Empleado creado correctamente");
            limpiarFormulario();
        } catch (error: any) {
            console.error("Error completo:", error);
            alert(
                error?.message ||
                error?.details ||
                error?.customData?.message ||
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

        if (
            !nuevoEmpleado.nombre ||
            !nuevoEmpleado.puesto ||
            !nuevoEmpleado.email ||
            !nuevoEmpleado.username
        ) {
            alert("Completa todos los campos obligatorios");
            return;
        }

        setLoading(true);

        try {
            let uidFinal = nuevoEmpleado.uid || "";

            if (!uidFinal) {
                uidFinal = await crearLoginSiFalta();
            }

            const datosActualizar = {
                nombre: nuevoEmpleado.nombre,
                celular: nuevoEmpleado.celular,
                email: nuevoEmpleado.email,
                username: nuevoEmpleado.username,
                activo: nuevoEmpleado.activo,
                area: nuevoEmpleado.area,
                puesto: nuevoEmpleado.puesto,
                salario: Number(nuevoEmpleado.salario || 0),
                diasdevacaciones: Number(nuevoEmpleado.diasdevacaciones || 0),
                uid: uidFinal,
            };

            await update(ref(db, `RH/Empleados/${idEditando}`), datosActualizar);

            alert("✅ Empleado actualizado correctamente");
            limpiarFormulario();
        } catch (error: any) {
            console.error("Error al editar empleado:", error);
            alert(error?.message || "Error al actualizar empleado");
        } finally {
            setLoading(false);
        }
    };

    const editarEmpleadoEnTabla = (id: string, campo: string, valor: any) => {
        setEmpleados((prev) =>
            prev.map((emp) => (emp.id === id ? { ...emp, [campo]: valor } : emp))
        );
    };

    const guardarCambiosRapidos = async (id: string) => {
        const empleado = empleados.find((emp) => emp.id === id);
        if (!empleado) return;

        try {
            const datosActualizar = {
                nombre: empleado.nombre,
                celular: empleado.celular,
                email: empleado.email,
                username: empleado.username,
                activo: empleado.activo,
                area: empleado.area,
                puesto: empleado.puesto,
                salario: Number(empleado.salario || 0),
                diasdevacaciones: Number(empleado.diasdevacaciones || 0),
            };

            await update(ref(db, `RH/Empleados/${id}`), datosActualizar);
        } catch (error) {
            console.error("Error guardando cambios rápidos:", error);
            alert("Error al guardar cambios");
        }
    };
    const eliminarUsuario = httpsCallable(functions, "eliminarUsuarioEmpleado");
    const eliminarEmpleado = async (id: string, uid?: string) => {
        try {
            // 🔥 primero borra en Auth
            if (uid) {
                await eliminarUsuario({ uid });
            }

            // 🔥 luego borra en DB
            await remove(ref(db, `RH/Empleados/${id}`));

        } catch (error) {
            console.error("Error eliminando:", error);
            alert("Error al eliminar empleado");
        }
    };

    return (
        <div className="hojaEmpleado">
            <h2>{modoEdicion ? "Editar Empleado" : "Gestión de Empleados"}</h2>

            {/* FORMULARIO */}
            <div className="formContainer">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        modoEdicion ? guardarEdicion() : agregarEmpleado();
                    }}
                    className="empleadoForm"
                >
                    <label>
                        ID:
                        <input
                            type="text"
                            className="inputEmpleado"
                            value={nuevoEmpleado.id}
                            disabled={modoEdicion}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, id: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Nombre:
                        <input
                            type="text"
                            className="inputEmpleado"
                            value={nuevoEmpleado.nombre}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, nombre: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Celular:
                        <input
                            type="number"
                            className="inputEmpleado"
                            value={nuevoEmpleado.celular}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, celular: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Correo:
                        <input
                            type="email"
                            className="inputEmpleado"
                            value={nuevoEmpleado.email}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, email: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Contraseña:
                        <input
                            type="password"
                            className="inputEmpleado"
                            value={nuevoEmpleado.password}
                            placeholder={
                                modoEdicion
                                    ? nuevoEmpleado.uid
                                        ? "Ya tiene login"
                                        : "Escribe contraseña para crear login"
                                    : "Mínimo 6 caracteres"
                            }
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, password: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Username:
                        <input
                            type="text"
                            className="inputEmpleado"
                            value={nuevoEmpleado.username}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, username: e.target.value })
                            }
                        />
                    </label>

                    <label>
                        Puesto (Rol):
                        <select
                            className="selectEmpleado"
                            value={nuevoEmpleado.puesto}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, puesto: e.target.value })
                            }
                        >
                            <option value="">Seleccione</option>
                            <option value="Gerente Administrativo">
                                Gerente Administrativo
                            </option>
                            <option value="Gerente Operativo">Gerente Operativo</option>
                            <option value="Cajera">Cajera</option>
                            <option value="Asesor de Ventas">Asesor de Ventas</option>
                            <option value="Auxiliar de Ventas">Auxiliar de Ventas</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Operador">Operador</option>
                            <option value="Almacenista">Almacenista</option>
                            <option value="Auxiliar de Almacén">Auxiliar de Almacén</option>
                        </select>
                    </label>

                    <label className="checkboxLabel">
                        Activo:
                        <input
                            type="checkbox"
                            checked={nuevoEmpleado.activo}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, activo: e.target.checked })
                            }
                        />
                    </label>

                    <label>
                        Área:
                        <select
                            className="selectEmpleado"
                            value={nuevoEmpleado.area}
                            onChange={(e) =>
                                setNuevoEmpleado({ ...nuevoEmpleado, area: e.target.value })
                            }
                        >
                            <option value="">Seleccione un área</option>
                            <option value="Mostrador">Mostrador</option>
                            <option value="Administración">Administración</option>
                            <option value="Almacén">Almacén</option>
                            <option value="Producción">Producción</option>
                        </select>
                    </label>

                    <label>
                        Salario:
                        <input
                            type="number"
                            className="inputEmpleado"
                            value={nuevoEmpleado.salario}
                            onChange={(e) =>
                                setNuevoEmpleado({
                                    ...nuevoEmpleado,
                                    salario: Number(e.target.value),
                                })
                            }
                        />
                    </label>

                    <label>
                        Vacaciones:
                        <input
                            type="number"
                            className="inputEmpleado"
                            value={nuevoEmpleado.diasdevacaciones}
                            onChange={(e) =>
                                setNuevoEmpleado({
                                    ...nuevoEmpleado,
                                    diasdevacaciones: Number(e.target.value),
                                })
                            }
                        />
                    </label>

                    <label>
                        UID:
                        <input
                            type="text"
                            className="inputEmpleado"
                            value={nuevoEmpleado.uid || ""}
                            disabled
                        />
                    </label>
                </form>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <button
                    className="botonEmpleado"
                    onClick={modoEdicion ? guardarEdicion : agregarEmpleado}
                    disabled={loading}
                >
                    {loading
                        ? "Guardando..."
                        : modoEdicion
                            ? "Guardar Cambios"
                            : "Agregar Empleado"}
                </button>

                {modoEdicion && (
                    <button className="botonEmpleado" onClick={limpiarFormulario}>
                        Cancelar Edición
                    </button>
                )}
            </div>

            {/* TABLA */}
            <div className="tablaScroll">
                <table className="tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Celular</th>
                            <th>Email</th>
                            <th>Username</th>
                            <th>Puesto</th>
                            <th>Activo</th>
                            <th>Área</th>
                            <th>Salario</th>
                            <th>Vacaciones</th>
                            <th>UID</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {empleados.map((empleado) => (
                            <tr key={empleado.id}>
                                <td>
                                    <input value={empleado.id} disabled />
                                </td>

                                <td>
                                    <input
                                        value={empleado.nombre}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "nombre",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        value={empleado.celular}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "celular",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        value={empleado.email}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "email",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        value={empleado.username}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "username",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <select
                                        value={empleado.puesto}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "puesto",
                                                e.target.value
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    >
                                        <option value="Gerente Administrativo">
                                            Gerente Administrativo
                                        </option>
                                        <option value="Gerente Operativo">Gerente Operativo</option>
                                        <option value="Cajera">Cajera</option>
                                        <option value="Asesor de Ventas">Asesor de Ventas</option>
                                        <option value="Auxiliar de Ventas">
                                            Auxiliar de Ventas
                                        </option>
                                        <option value="Supervisor">Supervisor</option>
                                        <option value="Operador">Operador</option>
                                        <option value="Almacenista">Almacenista</option>
                                        <option value="Auxiliar de Almacén">
                                            Auxiliar de Almacén
                                        </option>
                                    </select>
                                </td>

                                <td>
                                    <input
                                        type="checkbox"
                                        checked={empleado.activo}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "activo",
                                                e.target.checked
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        value={empleado.area}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(empleado.id, "area", e.target.value)
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={empleado.salario}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "salario",
                                                Number(e.target.value)
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={empleado.diasdevacaciones}
                                        onChange={(e) =>
                                            editarEmpleadoEnTabla(
                                                empleado.id,
                                                "diasdevacaciones",
                                                Number(e.target.value)
                                            )
                                        }
                                        onBlur={() => guardarCambiosRapidos(empleado.id)}
                                    />
                                </td>

                                <td>
                                    <input value={empleado.uid || ""} disabled />
                                </td>

                                <td style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => editarDesdeTabla(empleado)}>
                                        Editar
                                    </button>

                                    <button onClick={() => eliminarEmpleado(empleado.id, empleado.uid)}>
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Empleados;
