import { onCall, HttpsError,onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
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
            throw new HttpsError("invalid-argument", "La contrase�a es obligatoria");
        }

        if (password.length < 6) {
            throw new HttpsError(
                "invalid-argument",
                "La contrase�a debe tener al menos 6 caracteres"
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
                throw new HttpsError("invalid-argument", "Correo inv�lido");
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
// =====================================================
// CONSULTAR ESTADO DE PEDIDO - PÁGINA WEB RAFF
// =====================================================

export const consultarEstadoPedido = onRequest(
    {
        region: "us-central1",
        cors: false,
        invoker: "public",
        maxInstances: 5,
        timeoutSeconds: 10,
    },
    async (request, response) => {
        response.set("Cache-Control", "no-store");

        if (request.method !== "GET") {
            response.status(405).json({
                mensaje: "Método no permitido",
            });
            return;
        }

        const numero = String(request.query.ot ?? "").trim();

        if (!/^[0-9]{1,10}$/.test(numero) || !/[1-9]/.test(numero)) {
            response.status(400).json({
                mensaje: "Número de orden inválido",
            });
            return;
        }

        const numeroLimpio = numero.replace(/^0+/, "");
        const idOrden = `ot${numeroLimpio.padStart(5, "0")}`;

        try {
            const referencia = getDatabase().ref(
                `ordenes_trabajo/${idOrden}/estadoGeneral`
            );

            const snapshot = await referencia.get();

            if (!snapshot.exists()) {
                response.status(404).json({
                    mensaje: "Orden no disponible para consulta",
                });
                return;
            }

            const estadoGeneral = String(snapshot.val() ?? "");

            const mensajes: Record<string, string> = {
                cotizacion: "Tu pedido aún no ha ingresado a producción",
                pendiente_taller: "En fila",
                fabricacion: "En fabricación",
                completada: "Lista para entrega",
            };

            const mensaje = mensajes[estadoGeneral];

            if (!mensaje) {
                response.status(404).json({
                    mensaje: "Estado no disponible para consulta",
                });
                return;
            }

            response.status(200).json({
                estado: mensaje,
            });
        } catch (error) {
            console.error("Error al consultar estado de pedido:", error);

            response.status(500).json({
                mensaje: "No fue posible consultar el pedido",
            });
        }
    }
);