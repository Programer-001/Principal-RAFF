// src/datos/Armado_Resistencia.ts

export interface MaterialItem {
    nombre: string;
    cantidad: number;
}

const BASE_5_16: MaterialItem[] = [
    { nombre: "AISLADOR #17", cantidad: 2 },
    { nombre: "TORNILLO 3/16", cantidad: 2 },
    { nombre: "VARILLA 3MM", cantidad: 2 },
    { nombre: "TUERCA HEXAGONAL 3/16", cantidad: 4 },
    { nombre: "CAPUCHON 3/8", cantidad: 2 },
];

const BASE_7_16: MaterialItem[] = [
    { nombre: "AISLADOR #17", cantidad: 2 },
    { nombre: "VARILLA DE ACERO INOX", cantidad: 2 },
    { nombre: "BIRLO DE TECHO 3/16", cantidad: 2 },
    { nombre: "TUERCA HEXAGONAL 3/16", cantidad: 4 },
    { nombre: "CAPUCHON 1/2", cantidad: 2 },
];

const TORNILLOS_VALIDOS_5_16: MaterialItem[] = [
    { nombre: "TORNILLO DE ACERO INOXIDABLE 1/2", cantidad: 2 },
    { nombre: "TORNILLO DE ACERO INOXIDABLE 3/4", cantidad: 2 },
    { nombre: "TORNILLO DE ACERO INOXIDABLE 5/8", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 1/2", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 5/8", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 3/4", cantidad: 2 },
];

const TORNILLOS_VALIDOS_7_16: MaterialItem[] = [
    { nombre: "TORNILLO DE ACERO INOXIDABLE 1/2", cantidad: 2 },
    { nombre: "TORNILLO DE ACERO INOXIDABLE 3/4", cantidad: 2 },
    { nombre: "TORNILLO DE ACERO INOXIDABLE 5/8", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 1/2", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 5/8", cantidad: 2 },
    { nombre: "TORNILLO DE FIERRO 3/4", cantidad: 2 },
];

function normalizarTexto(texto: string): string {
    return (texto || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function detectarCantidadResistencias(descripcion: string): number {
    const texto = normalizarTexto(descripcion);

    const match = texto.match(/^(\d+)\s+RESISTENCIA(?:S)?\b/);
    if (match) {
        return Number(match[1]);
    }

    return 1;
}

export function detectarFamiliaTubular(
    descripcion: string
): "5/16" | "7/16" | null {
    const texto = normalizarTexto(descripcion);

    if (texto.includes("5/16")) return "5/16";
    if (texto.includes("7/16")) return "7/16";

    return null;
}

export function detectarTornillo(descripcion: string): MaterialItem | null {
    const texto = normalizarTexto(descripcion);

    const catalogo = [
        "TORNILLO DE ACERO INOXIDABLE 1/2",
        "TORNILLO DE ACERO INOXIDABLE 3/4",
        "TORNILLO DE ACERO INOXIDABLE 5/8",
        "TORNILLO DE FIERRO 1/2",
        "TORNILLO DE FIERRO 5/8",
        "TORNILLO DE FIERRO 3/4",
    ];

    for (const nombre of catalogo) {
        if (texto.includes(nombre)) {
            return { nombre, cantidad: 2 };
        }
    }

    // compatibilidad con descripciones como:
    // "TORNILLO: ACERO INOX 5/8 CON ARGON"
    if (texto.includes("TORNILLO: ACERO INOX 1/2")) {
        return { nombre: "TORNILLO DE ACERO INOXIDABLE 1/2", cantidad: 2 };
    }
    if (texto.includes("TORNILLO: ACERO INOX 3/4")) {
        return { nombre: "TORNILLO DE ACERO INOXIDABLE 3/4", cantidad: 2 };
    }
    if (texto.includes("TORNILLO: ACERO INOX 5/8")) {
        return { nombre: "TORNILLO DE ACERO INOXIDABLE 5/8", cantidad: 2 };
    }
    if (texto.includes("TORNILLO: FIERRO 1/2")) {
        return { nombre: "TORNILLO DE FIERRO 1/2", cantidad: 2 };
    }
    if (texto.includes("TORNILLO: FIERRO 5/8")) {
        return { nombre: "TORNILLO DE FIERRO 5/8", cantidad: 2 };
    }
    if (texto.includes("TORNILLO: FIERRO 3/4")) {
        return { nombre: "TORNILLO DE FIERRO 3/4", cantidad: 2 };
    }

    return null;
}

function multiplicarMateriales(
    materiales: MaterialItem[],
    multiplicador: number
): MaterialItem[] {
    return materiales.map((item) => ({
        ...item,
        cantidad: item.cantidad * multiplicador,
    }));
}

function unirMateriales(materiales: MaterialItem[]): MaterialItem[] {
    const acumulado: Record<string, number> = {};

    for (const item of materiales) {
        acumulado[item.nombre] = (acumulado[item.nombre] || 0) + item.cantidad;
    }

    return Object.entries(acumulado).map(([nombre, cantidad]) => ({
        nombre,
        cantidad,
    }));
}

export function calcularMaterialesTubular(descripcion: string): {
    familia: "5/16" | "7/16" | null;
    cantidadResistencias: number;
    materiales: MaterialItem[];
} {
    const cantidadResistencias = detectarCantidadResistencias(descripcion);
    const familia = detectarFamiliaTubular(descripcion);

    if (!familia) {
        return {
            familia: null,
            cantidadResistencias,
            materiales: [],
        };
    }

    const base = familia === "5/16" ? BASE_5_16 : BASE_7_16;
    const tornillo = detectarTornillo(descripcion);

    const materialesBase = multiplicarMateriales(base, cantidadResistencias);
    const materialesExtra = tornillo
        ? multiplicarMateriales([tornillo], cantidadResistencias)
        : [];

    const materiales = unirMateriales([...materialesBase, ...materialesExtra]);

    return {
        familia,
        cantidadResistencias,
        materiales,
    };
}