import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase/config";

interface Empleado {
    username: string;
    email: string;
    activo: boolean;
}

export const loginConUsername = async (username: string, password: string) => {
    const snapshot = await get(ref(db, "RH/Empleados"));

    if (!snapshot.exists()) {
        throw new Error("No hay empleados");
    }

    const empleados = snapshot.val();
    let empleadoEncontrado: Empleado | undefined;

    for (const key in empleados) {
        const emp = empleados[key] as Empleado;
        if (emp.username === username) {
            empleadoEncontrado = emp;
            break;
        }
    }

    if (!empleadoEncontrado) {
        throw new Error("Usuario no encontrado");
    }

    if (!empleadoEncontrado.activo) {
        throw new Error("Usuario inactivo");
    }

    return await signInWithEmailAndPassword(
        auth,
        empleadoEncontrado.email,
        password
    );
};