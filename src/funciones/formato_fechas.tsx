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