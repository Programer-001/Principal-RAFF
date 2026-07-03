//src/funciones/formato_fechas.tsx
//Aquí pondremos funciones para formatear fechas, obtener la fecha local, etc.

// Devuelve la fecha actual en formato "YYYY-MM-DD"
export const obtenerFechaLocal = () => {
    const fecha = new Date();

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// Convierte una fecha ISO "YYYY-MM-DD" a formato "DD/MM/YYYY"
export const formatearFechaMX = (fechaISO: string) => {
    if (!fechaISO) return "-";

    const [year, month, day] = fechaISO.split("-");

    return `${day}/${month}/${year}`;
};

// Convierte un objeto Date a formato "YYYY-MM-DD"
export const fechaLocalDesdeDate = (fecha: Date) => {
    const year = fecha.getFullYear();

    const month = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};
// Convierte una fecha ISO "YYYY-MM-DD" a formato "DDMMYYYY" para Firebase
export const formatearFechaFirebase = (fechaISO: string) => {
    const [year, month, day] = fechaISO.split("-");
    return `${day}${month}${year}`;
};

// Convierte cualquier fecha a formato MX legible
export const formatearFechaHora = (fecha: any) => {
    if (!fecha) return "";

    try {
        const fechaObj = new Date(fecha);

        if (isNaN(fechaObj.getTime())) {
            return String(fecha);
        }

        return fechaObj.toLocaleString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return String(fecha);
    }
};