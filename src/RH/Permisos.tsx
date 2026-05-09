import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, onValue, set, remove, update } from "firebase/database";
import { generarFormatoPermiso } from "../plantillas/plantillaPermiso";

interface Permiso {
    id: string;
    empleadoId?: string;
    empleado: string;
    tipo: string;
    inicio: string;
    fin: string;
    formaPago: string;
    horaPermiso?: string;
}

const permisoVacio: Permiso = {
    id: "",
    empleado: "",
    tipo: "",
    inicio: "",
    fin: "",
    formaPago: "",
    horaPermiso: "",
};

const Permisos: React.FC = () => {
    const [empleados, setEmpleados] = useState<any[]>([]);
    const [permisos, setPermisos] = useState<Permiso[]>([]);
    const [editando, setEditando] = useState<Permiso>(permisoVacio);

    const [diasDisponibles, setDiasDisponibles] = useState(0);
    const [diasSolicitados, setDiasSolicitados] = useState(0);
    const [diasRestantes, setDiasRestantes] = useState(0);
    const [descuentoSalario, setDescuentoSalario] = useState(0);
    const [salarioDiario, setSalarioDiario] = useState(0);

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

// 🔄 Recalcular días / descuentos
useEffect(() => {
    if (editando.inicio && editando.fin) {
        const dias = calcularDiasHabiles(editando.inicio, editando.fin);

        setDiasSolicitados(dias);

        const empleado = empleados.find(
            (emp) => emp.nombre === editando.empleado
        );

        const salarioMensual = Number(empleado?.salario || 0);

        // 🔥 salario por día
        const descuentoPorDia = salarioMensual / 28;

        // 🔥 salario por hora
        const descuentoPorHora = descuentoPorDia / 8;

        let totalDescuento = 0;

        setSalarioDiario(descuentoPorDia);

        // 🔥 ENTRADA TARDE / SALIDA TEMPRANO
        if (
            (editando.tipo === "entrada_tarde" ||
                editando.tipo === "salida_temprano") &&
            editando.horaPermiso
        ) {
            const [h, m] = editando.horaPermiso
                .split(":")
                .map(Number);

            const minutosSeleccionados = h * 60 + m;

            const horaEntrada = 9 * 60 + 30; // 9:30 AM
            const horaSalida = 18 * 60; // 6:00 PM

            let horasDescuento = 0;

            if (editando.tipo === "entrada_tarde") {
                horasDescuento = Math.ceil(
                    Math.max(0, minutosSeleccionados - horaEntrada) / 60
                );
            }

            if (editando.tipo === "salida_temprano") {
                horasDescuento = Math.ceil(
                    Math.max(0, horaSalida - minutosSeleccionados) / 60
                );
            }

            horasDescuento = Math.min(horasDescuento, 8);

            totalDescuento = descuentoPorHora * horasDescuento;

            // Estos permisos no descuentan vacaciones
            setDiasRestantes(diasDisponibles);
        }

        // 🔥 SUELDO COMPLETO POR DÍA
        else if (editando.formaPago === "Sueldo") {
            totalDescuento = descuentoPorDia * dias;
        }

        // 🔥 INCAPACIDAD 60%
        else if (editando.formaPago === "salario_60_receta") {
            totalDescuento = descuentoPorDia * 0.4 * dias;
        }

        setDescuentoSalario(totalDescuento);

        // 🔥 VACACIONES / PERSONAL CON DÍA DE VACACIONES
        if (
            (
                editando.tipo === "vacaciones" ||
                editando.tipo === "Personal"
            ) &&
            editando.formaPago === "vacaciones"
        ) {
            setDiasRestantes(diasDisponibles - dias);
        } else {
            setDiasRestantes(diasDisponibles);
        }
    }
}, [
    editando.inicio,
    editando.fin,
    editando.tipo,
    editando.formaPago,
    editando.empleado,
    editando.horaPermiso,
    diasDisponibles,
    empleados
]);

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
       if (
    (
        editando.tipo === "vacaciones" ||
        editando.tipo === "Personal"
    ) &&
    editando.formaPago === "vacaciones"
) {
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

    const obtenerTextoTipo = (tipo: string) => {
    switch (tipo) {
        case "vacaciones":
            return "Vacaciones";

        case "Enfermedad":
            return "Enfermedad";

        case "Personal":
            return "Día personal";

        case "entrada_tarde":
            return "Entrada tarde";

        case "salida_temprano":
            return "Salida temprano";

        default:
            return tipo;
    }
};

const obtenerTextoFormaPago = (formaPago: string) => {
    switch (formaPago) {
        case "vacaciones":
            return "Día de vacaciones";

        case "Tiempo":
            return "Tiempo acumulado";

        case "Sueldo":
            return "Descuento salarial";

        case "salario_60_receta":
            return "Salario 60% (receta médica)";

        default:
            return formaPago;
    }
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
                                empleadoId: emp?.id || "",
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
                        onChange={(e) => {
                            const tipo = e.target.value;

                            setEditando({
                                ...editando,
                                tipo,
                                formaPago:
                                    tipo === "entrada_tarde" || tipo === "salida_temprano"
                                        ? "Sueldo"
                                        : "",
                                inicio: "",
                                fin: "",
                            });
                        }}
                    >
                        <option value="">Seleccione</option>
                        <option value="vacaciones">Vacaciones</option>
                        <option value="Enfermedad">Enfermedad</option>
                        <option value="Personal">Día Personal</option>
                        <option value="entrada_tarde">Entrada tarde</option>
                        <option value="salida_temprano">Salida temprano</option>
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

                       { editando.tipo === "entrada_tarde" ||
                        editando.tipo === "salida_temprano" ? (
                            <option value="Sueldo">Descuento salarial</option>
                            ) : 
                            editando.tipo === "Enfermedad" ? (
                            <>
                                <option value="salario_60_receta">
                                    Salario 60% (receta médica)
                                </option>
                                <option value="Sueldo">
                                    Descuento salarial
                                </option>
                            </>
                        ) : (
                            <>
                                <option value="vacaciones">
                                    Día de vacaciones
                                </option>
                                <option value="Tiempo">
                                    Tiempo acumulado
                                </option>
                                <option value="Sueldo">
                                    Descuento en salario
                                </option>
                            </>
                        )}
                    </select>
                </div>
                {/*calendarios*/}
                {editando.tipo === "entrada_tarde" || editando.tipo === "salida_temprano" ? (
                    <>
                        <div className="form-row">
                            <label>Fecha:</label>
                            <input
                                type="date"
                                value={editando.inicio}
                                onChange={(e) =>
                                    setEditando({
                                        ...editando,
                                        inicio: e.target.value,
                                        fin: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="form-row">
                            <label>
                                {editando.tipo === "entrada_tarde"
                                    ? "Hora de entrada:"
                                    : "Hora de salida:"}
                            </label>

                            <input
                                type="time"
                                value={editando.horaPermiso || ""}
                                onChange={(e) =>
                                setEditando({
                                    ...editando,
                                    horaPermiso: e.target.value,
                                })
                                }
                            />
                        </div>
                    </>
                ) : (
                    <>
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
                    </>
                )}

                {/* 🔥 BOTÓN ABAJO */}
                <div className="form-row full-width" style={{ justifyContent: "center" }}>
                    <button className="btn btn-blue" type="submit" disabled={diasRestantes < 0}>
                        Agregar Permiso
                    </button>
                </div>

            </form>
            {/* 🔥 informacion */}

            <div className="info-permiso">
                {editando.tipo === "entrada_tarde" ||
                editando.tipo === "salida_temprano" ? (
                    <>
                        <p>
                            Salario por hora:{" "}
                            <strong>
                                ${(salarioDiario / 8).toFixed(2)}
                            </strong>
                        </p>

                        <p>
                            Hora registrada:{" "}
                            <strong>{editando.horaPermiso || "--:--"}</strong>
                        </p>

                        <p>
                            Tipo:{" "}
                            <strong>
                                {editando.tipo === "entrada_tarde"
                                    ? "Entrada tarde"
                                    : "Salida temprano"}
                            </strong>
                        </p>

                        <p>
                            Descuento salarial total:{" "}
                            <strong className="negativo">
                                ${descuentoSalario.toFixed(2)}
                            </strong>
                        </p>
                    </>
                ) : editando.formaPago === "Sueldo" ||
                  editando.formaPago === "salario_60_receta" ? (
                    <>
                        <p>
                            Salario diario:{" "}
                            <strong>${salarioDiario.toFixed(2)}</strong>
                        </p>

                        <p>Días tomados: {diasSolicitados}</p>

                        <p>
                            Tipo de pago:{" "}
                            <strong>
                                {editando.formaPago === "salario_60_receta"
                                    ? "Salario al 60%"
                                    : "Descuento completo"}
                            </strong>
                        </p>

                        <p>
                            Descuento salarial total:{" "}
                            <strong className="negativo">
                                ${descuentoSalario.toFixed(2)}
                            </strong>
                        </p>
                    </>
                ) : (
                    <>
                        <p>Días disponibles: {diasDisponibles}</p>
                        <p>Días solicitados: {diasSolicitados}</p>
                        <p>
                            Días restantes:{" "}
                            <strong className={diasRestantes < 0 ? "negativo" : "positivo"}>
                                {diasRestantes}
                            </strong>
                        </p>
                    </>
                )}
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
                            <td>{obtenerTextoTipo(permiso.tipo)}</td>
                            <td>{obtenerTextoFormaPago(permiso.formaPago)}</td>
                            <td>{permiso.inicio}</td>
                            <td>{permiso.fin}</td>

                            <td>
                                <button className="btn btn-green"onClick={() => setEditando(permiso)}>✏ Editar</button>

                                <button className="btn btn-red"  onClick={() => eliminarPermiso(permiso.id)}>❌</button>
                                <button type="button"
                                onClick={() => generarFormatoPermiso(permiso)}>
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
