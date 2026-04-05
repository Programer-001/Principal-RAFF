import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp();

export const crearUsuarioEmpleado = onCall(
    {
        region: "us-central1",
    },
    async (request) => {
        const data = request.data;

        const email = String(data?.email || "").trim();
        const password = String(data?.password || "").trim();
        const nombre = String(data?.nombre || "").trim();

        if (!email) {
            throw new HttpsError("invalid-argument", "El correo es obligatorio");
        }

        if (!password) {
            throw new HttpsError("invalid-argument", "La contraseña es obligatoria");
        }

        if (password.length < 6) {
            throw new HttpsError(
                "invalid-argument",
                "La contraseña debe tener al menos 6 caracteres"
            );
        }

        try {
            const userRecord = await getAuth().createUser({
                email,
                password,
                displayName: nombre || undefined,
            });

            return {
                ok: true,
                uid: userRecord.uid,
                email: userRecord.email,
            };
        } catch (error: any) {
            console.error("Error creando usuario en Auth:", error);

            if (error?.code === "auth/email-already-exists") {
                throw new HttpsError(
                    "already-exists",
                    "Ese correo ya existe en Authentication"
                );
            }

            if (error?.code === "auth/invalid-email") {
                throw new HttpsError("invalid-argument", "Correo inválido");
            }

            throw new HttpsError(
                "internal",
                error?.message || "No se pudo crear el usuario"
            );
        }
    }
);

export const eliminarUsuarioEmpleado = onCall(
    { region: "us-central1" },
    async (request) => {
        const uid = request.data?.uid;

        if (!uid) {
            throw new HttpsError("invalid-argument", "UID requerido");
        }

        try {
            await getAuth().deleteUser(uid);

            return { ok: true };
        } catch (error: any) {
            console.error("Error eliminando usuario:", error);
            throw new HttpsError("internal", "No se pudo eliminar el usuario");
        }
    }
);