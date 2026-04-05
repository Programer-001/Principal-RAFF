import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, onValue, set, remove, update } from "firebase/database";
import { generarFormatoPermiso } from "../plantillas/plantillaPermiso";

interface Permiso {
    id: string;
    empleado: string;
    tipo: string;
    inicio: string;
    fin: string;
    formaPago: string;
}

const permisoVacio: Permiso = {
    id: "",
    empleado: "",
    tipo: "",
    inicio: "",
    fin: "",
    formaPago: "",
};

const Permisos: React.FC = () => {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [editando, setEditando] = useState<Permiso>(permisoVacio);

    const [diasDisponibles, setDiasDisponibles] = useState(0);
    const [diasSolicitados, setDiasSolicitados] = useState(0);
    const [diasRestantes, setDiasRestantes] = useState(0);

    // 🔄 Empleados activos
    useEffect(() => {
        const empleadosRef = ref(db, "RH/Empleados");

        return onValue(empleadosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                const lista = Object.values(data).filter((emp: any) => emp.activo);

                setEmpleados(lista);
            }
        });
    }, []);

    // 🔄 Permisos
    useEffect(() => {
        const permisosRef = ref(db, "RH/permisos_empleados");

        return onValue(permisosRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                const permisosArray = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));

                setPermisos(permisosArray);
            } else {
                setPermisos([]);
            }
        });
    }, []);

    // 📅 Calcular días hábiles
    const calcularDiasHabiles = (inicio: string, fin: string) => {
        const start = new Date(inicio);
        const end = new Date(fin);

        let dias = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dia = d.getDay();
            if (dia !== 0 && dia !== 6) dias++;
        }

        return dias;
    };

    // 🔄 Recalcular días
    useEffect(() => {
        if (editando.inicio && editando.fin) {
            const dias = calcularDiasHabiles(editando.inicio, editando.fin);

            setDiasSolicitados(dias);
            setDiasRestantes(diasDisponibles - dias);
        }
    }, [editando.inicio, editando.fin, diasDisponibles]);

    // 📌 ID
    const generarId = () => {
        const fecha = new Date();
        const dd = String(fecha.getDate()).padStart(2, "0");
        const MM = String(fecha.getMonth() + 1).padStart(2, "0");
        const yyyy = fecha.getFullYear();
        return `${dd}${MM}${yyyy}${permisos.length + 1}`;
    };

    // 💾 Guardar
    const guardarPermiso = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editando.empleado || !editando.inicio || !editando.fin) {
            alert("Todos los campos son obligatorios");
            return;
        }

        if (diasRestantes < 0) {
            alert("No tiene suficientes días de vacaciones");
            return;
        }

        const id = editando.id || generarId();
        const permisoRef = ref(db, `RH/permisos_empleados/${id}`);

        set(permisoRef, { ...editando, id });

        // 🔥 Descontar vacaciones
        if (editando.tipo === "vacaciones") {
            const empleado = empleados.find(
                (emp) => emp.nombre === editando.empleado
            );

            if (empleado) {
                const nuevosDias = (empleado.diasdevacaciones || 0) - diasSolicitados;

                update(ref(db, `RH/Empleados/${empleado.id}`), {
                    diasdevacaciones: nuevosDias,
                });
            }
        }

        setEditando(permisoVacio);
        setDiasDisponibles(0);
        setDiasSolicitados(0);
        setDiasRestantes(0);
    };

    // 🗑 Eliminar
    const eliminarPermiso = (id: string) => {
        remove(ref(db, `RH/permisos_empleados/${id}`));
    };

    return (
        <div className="form-container">
            <h1>Gestión de Permisos</h1>

            <form className="form-container" onSubmit={guardarPermiso}>

                <div className="form-row">
                    <label>Nombre del Empleado:</label>
                    <select
                        value={editando.empleado}
                        onChange={(e) => {
                            const emp = empleados.find((x) => x.nombre === e.target.value);

                            setEditando({
                                ...editando,
                                empleado: emp?.nombre || "",
                            });

                            setDiasDisponibles(emp?.diasdevacaciones || 0);
                        }}
                    >
                        <option value="">Seleccione un empleado</option>
                        {empleados.map((emp) => (
                            <option key={emp.id} value={emp.nombre}>
                                {emp.nombre}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <label>Tipo de Permiso:</label>
                    <select
                        value={editando.tipo}
                        onChange={(e) =>
                            setEditando({ ...editando, tipo: e.target.value })
                        }
                    >
                        <option value="">Seleccione</option>
                        <option value="vacaciones">Vacaciones</option>
                        <option value="Enfermedad">Enfermedad</option>
                        <option value="Personal">Día Personal</option>
                    </select>
                </div>

                <div className="form-row">
                    <label>Forma de Pago:</label>
                    <select
                        value={editando.formaPago}
                        onChange={(e) =>
                            setEditando({ ...editando, formaPago: e.target.value })
                        }
                    >
                        <option value="">Seleccione</option>
                        <option value="vacaciones">Día de vacaciones</option>
                        <option value="Tiempo">Tiempo acumulado</option>
                        <option value="Sueldo">Descuento en salario</option>
                    </select>
                </div>

                <div className="form-row">
                    <label>Fecha Inicio:</label>
                    <input
                        type="date"
                        value={editando.inicio}
                        onChange={(e) =>
                            setEditando({ ...editando, inicio: e.target.value })
                        }
                    />
                </div>

                <div className="form-row">
                    <label>Fecha Fin:</label>
                    <input
                        type="date"
                        value={editando.fin}
                        onChange={(e) =>
                            setEditando({ ...editando, fin: e.target.value })
                        }
                    />
                </div>

                {/* 🔥 BOTÓN ABAJO */}
                <div className="form-row full-width" style={{ justifyContent: "center" }}>
                    <button className="btn btn-blue" type="submit" disabled={diasRestantes < 0}>
                        Agregar Permiso
                    </button>
                </div>

            </form>
            {/* 🔥 informacion */}
            <div className="info-permiso">
                <p>Días disponibles: {diasDisponibles}</p>
                <p>Días solicitados: {diasSolicitados}</p>
                <p>
                    Días restantes:{" "}
                    <strong className={diasRestantes < 0 ? "negativo" : "positivo"}>
                        {diasRestantes}
                    </strong>
                </p>
            </div>

            

            {/* TABLA */}
            <div className="table-scroll">
            <table className="caja-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                        <th>Pago</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {permisos.map((permiso) => (
                        <tr key={permiso.id}>
                            <td>{permiso.id}</td>
                            <td>{permiso.empleado}</td>
                            <td>{permiso.tipo}</td>
                            <td>{permiso.formaPago}</td>
                            <td>{permiso.inicio}</td>
                            <td>{permiso.fin}</td>

                            <td>
                                <button className="btn btn-green"onClick={() => setEditando(permiso)}>✏ Editar</button>

                                <button className="btn btn-red"  onClick={() => eliminarPermiso(permiso.id)}>❌</button>
                                <button onClick={() => generarFormatoPermiso(permiso)}>
                                    🖨 Imprimir
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

export default Permisos;
