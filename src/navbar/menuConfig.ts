export type MenuItem = {
    key: string;
    label: string;
    children?: MenuItem[];
};

type MenuPorRol = {
    area: string;
    puesto: string;
    items: MenuItem[];
};

const MENU_BASE: Record<string, MenuItem> = {
    home: { key: "home", label: "Inicio" },
    cotizador: { key: "cotizador", label: "Cotizador" },
    consultaot: { key: "consultaot", label: "Consulta OT" },
    clientes: { key: "clientes", label: "Clientes" },
    envios: { key: "envios", label: "Envíos" },
    compras: { key: "compras", label: "Orden de compras" },
    productos: { key: "productos", label: "Productos" },
    rh: {
        key: "rh",
        label: "Recursos Humanos",
        children: [
            { key: "empleados", label: "Empleados" },
            { key: "permisos", label: "Permisos" },
        ],
    },
    facturacion: {
        key: "facturacion",
        label: "Sistema de caja",
        children: [
            { key: "caja", label: "Caja" },
            { key: "mostrarcaja", label: "Consulta de factura" },
            { key: "cajacorteporfecha", label: "Registrar factura" },
            { key: "cortedia", label: "Corte del día" },
            { key: "gastos", label: "Gastos" },
            { key: "consultagastos", label: "Consulta de gastos" },
            { key: "modificarpago", label: "Modificar pago" },
            { key: "modificarcaja", label: "Editar factura del día" },
            { key: "contardinero", label: "Contador de dinero" },
        ],
    },

    produccion: {
        key: "produccion",
        label: "Produccion", 
        children: [
            { key: "gestionproduccion", label: "Operacion" },
            { key: "invalmacen", label: "Almacen" },
        ],
    },

    contabilidad: {
        key: "contabilidad",
        label: "Contabilidad",
        children: [
            { key: "lefor", label: "Etiquetas para LEFOR" },
        ],
    },

    administracion: {
        key: "administracion",
        label: "Administracion",
        children: [
            { key: "comisiones", label: "Comisiones Produccion" },
            { key: "comisionesmostrador", label: "Comisiones mostrador" },
        ],
    },
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
            MENU_BASE.facturacion,
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
            MENU_BASE.rh,
            MENU_BASE.facturacion,
            MENU_BASE.contabilidad,
            MENU_BASE.produccion,
            MENU_BASE.administracion,

        ],
    },
    
    {
        area: "Administración",
        puesto: "Gerente Administrativo",
        items: [
            MENU_BASE.consultaot,
            MENU_BASE.clientes,
            MENU_BASE.compras,
            MENU_BASE.productos,
            MENU_BASE.rh,
            MENU_BASE.facturacion,
            MENU_BASE.administracion,
        ],
    },
    {
        area: "Almacen",
        puesto: "Almacenista",
        items: [
            MENU_BASE.produccion,

        ],
    },

    {
        area: "RH",
        puesto: "Auxiliar",
        items: [MENU_BASE.rh],
    },
];

const MENU_DEFAULT: MenuItem[] = [MENU_BASE.home];

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