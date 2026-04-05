export type MenuItem = {
    key: string;
    label: string;
};

type MenuPorRol = {
    area: string;
    puesto: string;
    items: MenuItem[];
};

const MENU_BASE: Record<string, MenuItem> = {
    cotizador: { key: "cotizador", label: "Cotizador" },
    consultaot: { key: "consultaot", label: "Consulta OT" },
    clientes: { key: "clientes", label: "Clientes" },
    envios: { key: "envios", label: "Envíos" },
    compras: { key: "compras", label: "Orden de compras" },
    productos: { key: "productos", label: "Productos" },
    empleados: { key: "empleados", label: "Empleados" },
};

const MENUS_POR_ROL: MenuPorRol[] = [
    {
        area: "Mostrador",
        puesto: "Asesor de ventas",
        items: [
            MENU_BASE.cotizador,
            MENU_BASE.consultaot,
            MENU_BASE.clientes,
            MENU_BASE.envios,
            MENU_BASE.productos,
            MENU_BASE.compras,
        ],
    },

    {
        area: "Mostrador",
        puesto: "Cajera",
        items: [
            MENU_BASE.cotizador,
            MENU_BASE.consultaot,
            MENU_BASE.clientes,
            MENU_BASE.productos,
        ],
    },
    {
        area: "Administración",
        puesto: "Gerente Operativo",
        items: [
            MENU_BASE.cotizador,
            MENU_BASE.consultaot,
            MENU_BASE.clientes,
            MENU_BASE.envios,
            MENU_BASE.compras,
            MENU_BASE.productos,
            MENU_BASE.empleados,
        ],
    },
    {
        area: "RH",
        puesto: "Auxiliar",
        items: [MENU_BASE.empleados],
    },
];

const MENU_DEFAULT: MenuItem[] = [MENU_BASE.cotizador];

function normalizarTexto(texto?: string): string {
    return (texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function obtenerMenuPorPerfil(
    area?: string,
    puesto?: string
): MenuItem[] {
    const areaNormalizada = normalizarTexto(area);
    const puestoNormalizado = normalizarTexto(puesto);

    console.log("AREA RECIBIDA:", area, "=>", areaNormalizada);
    console.log("PUESTO RECIBIDO:", puesto, "=>", puestoNormalizado);

    for (const rol of MENUS_POR_ROL) {
        const areaRol = normalizarTexto(rol.area);
        const puestoRol = normalizarTexto(rol.puesto);

        console.log("COMPARANDO CON:", {
            areaRol: rol.area,
            puestoRol: rol.puesto,
            areaRolNormalizada: areaRol,
            puestoRolNormalizada: puestoRol,
        });

        if (areaRol === areaNormalizada && puestoRol === puestoNormalizado) {
            console.log("MATCH EXACTO ✅", rol.items);
            return rol.items;
        }
    }

    console.log("SIN MATCH, REGRESANDO DEFAULT ⚠️");
    return MENU_DEFAULT;
}