// src/navbar/PermisosMenu.tsx

import React, { useEffect, useMemo, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "../firebase/config";
import { CATALOGO_MENU } from "./menuConfig";
import "../css/menu-personalizado.css";

/* =========================================================
   TIPOS
========================================================= */

type Empleado = {
    id: string | number;
    firebaseKey?: string;

    nombre?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;

    menuConfig?: MenuConfig;
};

type PaginaMenu = {
    key: string;
    label: string;
};

type MenuPagina = {
    id: string;
    tipo: "pagina";
    key: string;
};

type MenuSubmenu = {
    id: string;
    tipo: "submenu";
    label: string;
    children: string[];
};

type MenuPersonalizadoItem =
    | MenuPagina
    | MenuSubmenu;

type MenuConfig = {
    tipo: "plantilla" | "personalizado";
    plantilla?: string;
    items?: MenuPersonalizadoItem[];
};

type PlantillaMenu = {
    id: string;
    area: string;
    puesto: string;
    items: MenuPersonalizadoItem[];
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

const convertirAArray = <T,>(valor: any): T[] => {
    if (!valor) {
        return [];
    }

    if (Array.isArray(valor)) {
        return valor.filter(Boolean) as T[];
    }

    if (typeof valor === "object") {
        return Object.keys(valor)
            .sort((a, b) => {
                const numeroA = Number(a);
                const numeroB = Number(b);

                if (
                    !Number.isNaN(numeroA) &&
                    !Number.isNaN(numeroB)
                ) {
                    return numeroA - numeroB;
                }

                return a.localeCompare(b);
            })
            .map((key) => valor[key])
            .filter(Boolean) as T[];
    }

    return [];
};

const normalizarItems = (
    valor: any
): MenuPersonalizadoItem[] => {
    const lista = convertirAArray<any>(valor);

    return lista
        .map(
            (
                item
            ): MenuPersonalizadoItem | null => {
                if (!item) {
                    return null;
                }

                if (item.tipo === "pagina") {
                    return {
                        id: String(
                            item.id || item.key
                        ),
                        tipo: "pagina",
                        key: String(
                            item.key || ""
                        ),
                    };
                }

                if (item.tipo === "submenu") {
                    return {
                        id: String(
                            item.id || ""
                        ),
                        tipo: "submenu",
                        label: String(
                            item.label ||
                                item.id ||
                                "Submenú"
                        ),
                        children:
                            convertirAArray<string>(
                                item.children
                            ),
                    };
                }

                return null;
            }
        )
        .filter(
            (
                item
            ): item is MenuPersonalizadoItem =>
                item !== null
        );
};

const normalizarTexto = (
    texto?: string
): string => {
    return (texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const crearIdPlantilla = (
    area: string,
    puesto: string
) => {
    const preparar = (texto: string) =>
        normalizarTexto(texto)
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");

    return `${preparar(area)}_${preparar(
        puesto
    )}`;
};

const copiarItems = (
    items: MenuPersonalizadoItem[]
): MenuPersonalizadoItem[] => {
    return items.map((item) => {
        if (item.tipo === "submenu") {
            return {
                ...item,
                children: [...item.children],
            };
        }

        return {
            ...item,
        };
    });
};

/* =========================================================
   COMPONENTE
========================================================= */

const PermisosMenu: React.FC = () => {
    /* =====================================================
       EMPLEADOS
    ===================================================== */

    const [empleados, setEmpleados] =
        useState<Empleado[]>([]);

    const [empleadoId, setEmpleadoId] =
        useState("");

    /* =====================================================
       PLANTILLAS
    ===================================================== */

    const [plantillas, setPlantillas] =
        useState<PlantillaMenu[]>([]);

    const [plantilla, setPlantilla] =
        useState("");

    /* =====================================================
       MENÚ DEL TRABAJADOR
    ===================================================== */

    const [tipoMenu, setTipoMenu] =
        useState<
            "plantilla" | "personalizado"
        >("plantilla");

    const [items, setItems] =
        useState<MenuPersonalizadoItem[]>([]);

    const [nuevoSubmenu, setNuevoSubmenu] =
        useState("");

    const [guardando, setGuardando] =
        useState(false);

    /* =====================================================
       DRAG & DROP PERSONALIZADO
    ===================================================== */

    const [dragIndex, setDragIndex] =
        useState<number | null>(null);

    /* =====================================================
       MODAL ADMINISTRAR PLANTILLAS
    ===================================================== */

    const [
        modalPlantillasAbierto,
        setModalPlantillasAbierto,
    ] = useState(false);

    const [
        plantillaEditandoId,
        setPlantillaEditandoId,
    ] = useState("");

    const [
        areaPlantillaEditando,
        setAreaPlantillaEditando,
    ] = useState("");

    const [
        puestoPlantillaEditando,
        setPuestoPlantillaEditando,
    ] = useState("");

    const [
        itemsPlantillaEditando,
        setItemsPlantillaEditando,
    ] = useState<MenuPersonalizadoItem[]>(
        []
    );

    const [
        creandoPlantilla,
        setCreandoPlantilla,
    ] = useState(false);

    const [
        guardandoPlantilla,
        setGuardandoPlantilla,
    ] = useState(false);

    const [
        nuevoSubmenuPlantilla,
        setNuevoSubmenuPlantilla,
    ] = useState("");

    /* =====================================================
       CATÁLOGO DE TODAS LAS PÁGINAS
    ===================================================== */

    const paginasDisponibles: PaginaMenu[] =
        useMemo(() => {
            const mapa =
                new Map<string, PaginaMenu>();

            Object.values(
                CATALOGO_MENU
            ).forEach((menu) => {
                if (
                    !menu.children ||
                    menu.children.length === 0
                ) {
                    mapa.set(menu.key, {
                        key: menu.key,
                        label: menu.label,
                    });
                }

                menu.children?.forEach(
                    (child) => {
                        mapa.set(child.key, {
                            key: child.key,
                            label: child.label,
                        });
                    }
                );
            });

            return Array.from(
                mapa.values()
            ).sort((a, b) =>
                a.label.localeCompare(b.label)
            );
        }, []);

    /* =====================================================
       OBTENER LABEL
    ===================================================== */

    const obtenerLabel = (
        key: string
    ) => {
        const pagina =
            paginasDisponibles.find(
                (p) => p.key === key
            );

        return pagina?.label || key;
    };

    /* =====================================================
       CARGAR PLANTILLAS DE FIREBASE
    ===================================================== */

    useEffect(() => {
        const plantillasRef = ref(
            db,
            "Plantillas_Menu"
        );

        return onValue(
            plantillasRef,
            (snapshot) => {
                const data = snapshot.val();

                if (!data) {
                    setPlantillas([]);
                    return;
                }

                const lista: PlantillaMenu[] =
                    Object.entries(data).map(
                        ([id, value]) => {
                            const datos =
                                value as any;

                            return {
                                id,
                                area:
                                    datos.area || "",
                                puesto:
                                    datos.puesto || "",
                                items:
                                    normalizarItems(
                                        datos.items
                                    ),
                            };
                        }
                    );

                lista.sort((a, b) => {
                    const area =
                        a.area.localeCompare(
                            b.area
                        );

                    if (area !== 0) {
                        return area;
                    }

                    return a.puesto.localeCompare(
                        b.puesto
                    );
                });

                setPlantillas(lista);
            }
        );
    }, []);

    /* =====================================================
       CARGAR EMPLEADOS
    ===================================================== */

    useEffect(() => {
        const empleadosRef = ref(
            db,
            "RH/Empleados"
        );

        return onValue(
            empleadosRef,
            (snapshot) => {
                const data = snapshot.val();

                if (!data) {
                    setEmpleados([]);
                    return;
                }

                const lista: Empleado[] =
                    Object.entries(data).map(
                        ([
                            firebaseKey,
                            value,
                        ]) => {
                            const empleado =
                                value as Empleado;

                            return {
                                ...empleado,
                                firebaseKey,

                                id:
                                    empleado.id ??
                                    firebaseKey,
                            };
                        }
                    );

                lista.sort((a, b) =>
                    (
                        a.nombre || ""
                    ).localeCompare(
                        b.nombre || ""
                    )
                );

                setEmpleados(lista);
            }
        );
    }, []);

    /* =====================================================
       BUSCAR PLANTILLA POR ÁREA + PUESTO
    ===================================================== */

    const buscarPlantillaPorEmpleado = (
        empleado: Empleado
    ) => {
        const areaEmpleado =
            normalizarTexto(
                empleado.area
            );

        const puestoEmpleado =
            normalizarTexto(
                empleado.puesto
            );

        return plantillas.find(
            (p) =>
                normalizarTexto(p.area) ===
                    areaEmpleado &&
                normalizarTexto(
                    p.puesto
                ) === puestoEmpleado
        );
    };

    /* =====================================================
       CUANDO CAMBIA TRABAJADOR
    ===================================================== */

    useEffect(() => {
        if (!empleadoId) {
            setPlantilla("");
            setItems([]);
            return;
        }

        const empleado =
            empleados.find(
                (e) =>
                    String(e.id) ===
                    empleadoId
            );

        if (!empleado) {
            return;
        }

        const config =
            empleado.menuConfig;

        if (config) {
            setTipoMenu(
                config.tipo ||
                    "plantilla"
            );

            if (
                config.tipo ===
                "personalizado"
            ) {
                setPlantilla("");

                setItems(
                    normalizarItems(
                        config.items
                    )
                );

                return;
            }

            setPlantilla(
                config.plantilla || ""
            );

            setItems([]);

            return;
        }

        /*
         * Si nunca se le ha asignado menuConfig,
         * buscamos automáticamente por área/puesto.
         */

        setTipoMenu("plantilla");
        setItems([]);

        const encontrada =
            buscarPlantillaPorEmpleado(
                empleado
            );

        if (encontrada) {
            setPlantilla(
                encontrada.id
            );
        } else {
            setPlantilla("");
        }
    }, [
        empleadoId,
        empleados,
        plantillas,
    ]);

    /* =====================================================
       PLANTILLA SELECCIONADA
    ===================================================== */

    const plantillaSeleccionada =
        useMemo(() => {
            return plantillas.find(
                (p) =>
                    p.id === plantilla
            );
        }, [
            plantillas,
            plantilla,
        ]);

    /* =====================================================
       VISTA PREVIA
    ===================================================== */

    const itemsVistaPrevia =
        useMemo(() => {
            if (
                tipoMenu ===
                "plantilla"
            ) {
                return (
                    plantillaSeleccionada?.items ||
                    []
                );
            }

            return items;
        }, [
            tipoMenu,
            plantillaSeleccionada,
            items,
        ]);

    /* =====================================================
       MENÚ PERSONALIZADO
    ===================================================== */

    const agregarPagina = (
        pagina: PaginaMenu
    ) => {
        const yaExiste =
            items.some((item) => {
                if (
                    item.tipo === "pagina"
                ) {
                    return (
                        item.key ===
                        pagina.key
                    );
                }

                return item.children.includes(
                    pagina.key
                );
            });

        if (yaExiste) {
            alert(
                "Esta página ya está agregada al menú."
            );
            return;
        }

        setItems((actual) => [
            ...actual,
            {
                id: `${pagina.key}_${Date.now()}`,
                tipo: "pagina",
                key: pagina.key,
            },
        ]);
    };

    const crearSubmenu = () => {
        const nombre =
            nuevoSubmenu.trim();

        if (!nombre) {
            alert(
                "Escribe el nombre del submenú."
            );
            return;
        }

        setItems((actual) => [
            ...actual,
            {
                id: `submenu_${Date.now()}`,
                tipo: "submenu",
                label: nombre,
                children: [],
            },
        ]);

        setNuevoSubmenu("");
    };

    const agregarPaginaASubmenu = (
        submenuId: string,
        paginaKey: string
    ) => {
        const yaUsada =
            items.some((item) => {
                if (
                    item.tipo === "pagina"
                ) {
                    return (
                        item.key ===
                        paginaKey
                    );
                }

                return item.children.includes(
                    paginaKey
                );
            });

        if (yaUsada) {
            alert(
                "Esta página ya está siendo utilizada."
            );
            return;
        }

        setItems((actual) =>
            actual.map((item) => {
                if (
                    item.tipo ===
                        "submenu" &&
                    item.id === submenuId
                ) {
                    return {
                        ...item,
                        children: [
                            ...item.children,
                            paginaKey,
                        ],
                    };
                }

                return item;
            })
        );
    };

    const quitarPaginaSubmenu = (
        submenuId: string,
        paginaKey: string
    ) => {
        setItems((actual) =>
            actual.map((item) => {
                if (
                    item.tipo ===
                        "submenu" &&
                    item.id === submenuId
                ) {
                    return {
                        ...item,

                        children:
                            item.children.filter(
                                (key) =>
                                    key !==
                                    paginaKey
                            ),
                    };
                }

                return item;
            })
        );
    };

    const eliminarItem = (
        id: string
    ) => {
        setItems((actual) =>
            actual.filter(
                (item) =>
                    item.id !== id
            )
        );
    };

    /* =====================================================
       MOVER PERSONALIZADO
    ===================================================== */

    const moverIzquierda = (
        index: number
    ) => {
        if (index <= 0) {
            return;
        }

        setItems((actual) => {
            const copia = [
                ...actual,
            ];

            [
                copia[index - 1],
                copia[index],
            ] = [
                copia[index],
                copia[index - 1],
            ];

            return copia;
        });
    };

    const moverDerecha = (
        index: number
    ) => {
        if (
            index >=
            items.length - 1
        ) {
            return;
        }

        setItems((actual) => {
            const copia = [
                ...actual,
            ];

            [
                copia[index],
                copia[index + 1],
            ] = [
                copia[index + 1],
                copia[index],
            ];

            return copia;
        });
    };

    /* =====================================================
       DRAG & DROP PERSONALIZADO
    ===================================================== */

    const handleDragStart = (
        index: number
    ) => {
        if (
            tipoMenu !==
            "personalizado"
        ) {
            return;
        }

        setDragIndex(index);
    };

    const handleDragOver = (
        e: React.DragEvent<HTMLDivElement>
    ) => {
        e.preventDefault();
    };

    const handleDrop = (
        dropIndex: number
    ) => {
        if (
            tipoMenu !==
            "personalizado"
        ) {
            return;
        }

        if (
            dragIndex === null
        ) {
            return;
        }

        if (
            dragIndex ===
            dropIndex
        ) {
            setDragIndex(null);
            return;
        }

        setItems((actual) => {
            const copia = [
                ...actual,
            ];

            const [movido] =
                copia.splice(
                    dragIndex,
                    1
                );

            copia.splice(
                dropIndex,
                0,
                movido
            );

            return copia;
        });

        setDragIndex(null);
    };

    /* =====================================================
       GUARDAR MENÚ DEL TRABAJADOR
    ===================================================== */

    const guardar = async () => {
        if (!empleadoId) {
            alert(
                "Selecciona un trabajador."
            );
            return;
        }

        const empleado =
            empleados.find(
                (e) =>
                    String(e.id) ===
                    empleadoId
            );

        if (!empleado) {
            alert(
                "No se encontró el trabajador."
            );
            return;
        }

        if (
            tipoMenu ===
                "plantilla" &&
            !plantilla
        ) {
            alert(
                "Selecciona una plantilla."
            );
            return;
        }

        if (
            tipoMenu ===
                "personalizado" &&
            items.length === 0
        ) {
            alert(
                "Agrega al menos una opción al menú personalizado."
            );
            return;
        }

        setGuardando(true);

        try {
            const config: MenuConfig =
                tipoMenu ===
                "plantilla"
                    ? {
                          tipo: "plantilla",
                          plantilla,
                      }
                    : {
                          tipo: "personalizado",
                          items,
                      };

            const firebaseKey =
                empleado.firebaseKey ||
                String(
                    empleado.id
                );

            await update(
                ref(
                    db,
                    `RH/Empleados/${firebaseKey}`
                ),
                {
                    menuConfig: config,
                }
            );

            alert(
                "Menú guardado correctamente."
            );
        } catch (error) {
            console.error(
                "ERROR GUARDANDO MENÚ:",
                error
            );

            alert(
                "No se pudo guardar el menú."
            );
        } finally {
            setGuardando(false);
        }
    };

    /* =========================================================
       ADMINISTRAR PLANTILLAS
    ========================================================= */

    const abrirAdministradorPlantillas =
        () => {
            setModalPlantillasAbierto(
                true
            );

            /*
             * Si actualmente hay una plantilla seleccionada,
             * abrimos esa automáticamente.
             */

            if (
                plantillaSeleccionada
            ) {
                seleccionarPlantillaParaEditar(
                    plantillaSeleccionada
                );
                return;
            }

            if (
                plantillas.length > 0
            ) {
                seleccionarPlantillaParaEditar(
                    plantillas[0]
                );
            }
        };

    const seleccionarPlantillaParaEditar =
        (
            plantillaEditar: PlantillaMenu
        ) => {
            setCreandoPlantilla(false);

            setPlantillaEditandoId(
                plantillaEditar.id
            );

            setAreaPlantillaEditando(
                plantillaEditar.area
            );

            setPuestoPlantillaEditando(
                plantillaEditar.puesto
            );

            setItemsPlantillaEditando(
                copiarItems(
                    plantillaEditar.items
                )
            );

            setNuevoSubmenuPlantilla(
                ""
            );
        };

    const nuevaPlantilla = () => {
        setCreandoPlantilla(true);

        setPlantillaEditandoId(
            ""
        );

        setAreaPlantillaEditando(
            ""
        );

        setPuestoPlantillaEditando(
            ""
        );

        setItemsPlantillaEditando(
            []
        );

        setNuevoSubmenuPlantilla(
            ""
        );
    };

    const cancelarAdministradorPlantillas =
        () => {
            setModalPlantillasAbierto(
                false
            );

            setCreandoPlantilla(
                false
            );

            setPlantillaEditandoId(
                ""
            );

            setAreaPlantillaEditando(
                ""
            );

            setPuestoPlantillaEditando(
                ""
            );

            setItemsPlantillaEditando(
                []
            );

            setNuevoSubmenuPlantilla(
                ""
            );
        };

    /* =====================================================
       SABER SI UNA PÁGINA YA ESTÁ EN LA PLANTILLA
    ===================================================== */

    const paginaUsadaEnPlantilla = (
        paginaKey: string
    ) => {
        return itemsPlantillaEditando.some(
            (item) => {
                if (
                    item.tipo === "pagina"
                ) {
                    return (
                        item.key ===
                        paginaKey
                    );
                }

                return item.children.includes(
                    paginaKey
                );
            }
        );
    };

    /* =====================================================
       AGREGAR PÁGINA DIRECTA A PLANTILLA
    ===================================================== */

    const agregarPaginaPlantilla = (
        pagina: PaginaMenu
    ) => {
        if (
            paginaUsadaEnPlantilla(
                pagina.key
            )
        ) {
            alert(
                "Esta página ya está utilizada en la plantilla."
            );
            return;
        }

        setItemsPlantillaEditando(
            (actual) => [
                ...actual,
                {
                    id: pagina.key,
                    tipo: "pagina",
                    key: pagina.key,
                },
            ]
        );
    };

    /* =====================================================
       ELIMINAR ITEM DE PLANTILLA
    ===================================================== */

    const eliminarItemPlantilla = (
        id: string
    ) => {
        setItemsPlantillaEditando(
            (actual) =>
                actual.filter(
                    (item) =>
                        item.id !== id
                )
        );
    };

    /* =====================================================
       CREAR SUBMENÚ EN PLANTILLA
    ===================================================== */

    const crearSubmenuPlantilla =
        () => {
            const nombre =
                nuevoSubmenuPlantilla.trim();

            if (!nombre) {
                alert(
                    "Escribe el nombre del submenú."
                );
                return;
            }

            setItemsPlantillaEditando(
                (actual) => [
                    ...actual,
                    {
                        id: `submenu_${Date.now()}`,
                        tipo: "submenu",
                        label: nombre,
                        children: [],
                    },
                ]
            );

            setNuevoSubmenuPlantilla(
                ""
            );
        };

    /* =====================================================
       AGREGAR PÁGINA A SUBMENÚ DE PLANTILLA
    ===================================================== */

    const agregarPaginaSubmenuPlantilla =
        (
            submenuId: string,
            paginaKey: string
        ) => {
            if (
                paginaUsadaEnPlantilla(
                    paginaKey
                )
            ) {
                alert(
                    "Esta página ya está utilizada en la plantilla."
                );
                return;
            }

            setItemsPlantillaEditando(
                (actual) =>
                    actual.map(
                        (item) => {
                            if (
                                item.tipo ===
                                    "submenu" &&
                                item.id ===
                                    submenuId
                            ) {
                                return {
                                    ...item,

                                    children: [
                                        ...item.children,
                                        paginaKey,
                                    ],
                                };
                            }

                            return item;
                        }
                    )
            );
        };

    /* =====================================================
       QUITAR PÁGINA DE SUBMENÚ DE PLANTILLA
    ===================================================== */

    const quitarPaginaSubmenuPlantilla =
        (
            submenuId: string,
            paginaKey: string
        ) => {
            setItemsPlantillaEditando(
                (actual) =>
                    actual.map(
                        (item) => {
                            if (
                                item.tipo ===
                                    "submenu" &&
                                item.id ===
                                    submenuId
                            ) {
                                return {
                                    ...item,

                                    children:
                                        item.children.filter(
                                            (
                                                key
                                            ) =>
                                                key !==
                                                paginaKey
                                        ),
                                };
                            }

                            return item;
                        }
                    )
            );
        };

    /* =====================================================
       MOVER ITEMS DE PLANTILLA
    ===================================================== */

    const moverPlantillaIzquierda =
        (index: number) => {
            if (index <= 0) {
                return;
            }

            setItemsPlantillaEditando(
                (actual) => {
                    const copia = [
                        ...actual,
                    ];

                    [
                        copia[index - 1],
                        copia[index],
                    ] = [
                        copia[index],
                        copia[index - 1],
                    ];

                    return copia;
                }
            );
        };

    const moverPlantillaDerecha =
        (index: number) => {
            if (
                index >=
                itemsPlantillaEditando.length -
                    1
            ) {
                return;
            }

            setItemsPlantillaEditando(
                (actual) => {
                    const copia = [
                        ...actual,
                    ];

                    [
                        copia[index],
                        copia[index + 1],
                    ] = [
                        copia[index + 1],
                        copia[index],
                    ];

                    return copia;
                }
            );
        };

    /* =====================================================
       GUARDAR PLANTILLA EN FIREBASE
    ===================================================== */

    const guardarPlantillaFirebase =
        async () => {
            const area =
                areaPlantillaEditando.trim();

            const puesto =
                puestoPlantillaEditando.trim();

            if (!area) {
                alert(
                    "Escribe el área de la plantilla."
                );
                return;
            }

            if (!puesto) {
                alert(
                    "Escribe el puesto de la plantilla."
                );
                return;
            }

            if (
                itemsPlantillaEditando.length ===
                0
            ) {
                alert(
                    "Agrega al menos una opción a la plantilla."
                );
                return;
            }

            /*
             * No permitimos submenús vacíos.
             */
            const submenuVacio =
                itemsPlantillaEditando.find(
                    (item): item is MenuSubmenu =>
                        item.tipo === "submenu" &&
                        item.children.length === 0
                );

            if (submenuVacio) {
                alert(
                    `El submenú "${submenuVacio.label}" está vacío. Agrega una opción o elimínalo.`
                );
                return;
            }

            try {
                let id =
                    plantillaEditandoId;

                if (
                    creandoPlantilla
                ) {
                    id =
                        crearIdPlantilla(
                            area,
                            puesto
                        );

                    /*
                     * Evita crear otra con el mismo ID.
                     */
                    const yaExiste =
                        plantillas.some(
                            (p) =>
                                p.id === id
                        );

                    if (yaExiste) {
                        alert(
                            "Ya existe una plantilla con esa área y puesto."
                        );

                        setGuardandoPlantilla(
                            false
                        );

                        return;
                    }
                }

                await update(
                    ref(
                        db,
                        `Plantillas_Menu/${id}`
                    ),
                    {
                        area,
                        puesto,

                        items:
                            itemsPlantillaEditando,
                    }
                );

                /*
                 * Si estamos creando,
                 * seleccionamos automáticamente
                 * la nueva plantilla.
                 */
                if (
                    creandoPlantilla
                ) {
                    setPlantilla(id);
                }

                setPlantillaEditandoId(
                    id
                );

                setCreandoPlantilla(
                    false
                );

                alert(
                    "Plantilla guardada correctamente."
                );

                /*
                 * Cerramos modal después de guardar.
                 */
                setModalPlantillasAbierto(
                    false
                );
            } catch (error) {
                console.error(
                    "ERROR GUARDANDO PLANTILLA:",
                    error
                );

                alert(
                    "No se pudo guardar la plantilla."
                );
            } finally {
                setGuardandoPlantilla(
                    false
                );
            }
        };

    /* =====================================================
       EMPLEADO SELECCIONADO
    ===================================================== */

    const empleadoSeleccionado =
        empleados.find(
            (e) =>
                String(e.id) ===
                empleadoId
        );

    /* =========================================================
       JSX
    ========================================================= */

    return (
        <div className="permisos-menu-page">
            <h2>
                Configuración de menús
            </h2>

            {/* =================================================
                TRABAJADOR
            ================================================== */}

            <div className="permisos-menu-card">
                <label>
                    <strong>
                        Trabajador
                    </strong>
                </label>

                <select
                    value={
                        empleadoId
                    }
                    onChange={(e) =>
                        setEmpleadoId(
                            e.target.value
                        )
                    }
                >
                    <option value="">
                        Selecciona un trabajador
                    </option>

                    {empleados.map(
                        (empleado) => (
                            <option
                                key={String(
                                    empleado.id
                                )}
                                value={String(
                                    empleado.id
                                )}
                            >
                                {empleado.nombre ||
                                    empleado.id}
                            </option>
                        )
                    )}
                </select>

                {empleadoSeleccionado && (
                    <div className="datos-empleado-menu">
                        <span>
                            <strong>
                                Área:
                            </strong>{" "}
                            {empleadoSeleccionado.area ||
                                "-"}
                        </span>

                        <span>
                            <strong>
                                Puesto:
                            </strong>{" "}
                            {empleadoSeleccionado.puesto ||
                                "-"}
                        </span>
                    </div>
                )}
            </div>

            {empleadoId && (
                <>
                    {/* =========================================
                        TIPO DE MENÚ
                    ========================================== */}

                    <div className="permisos-menu-card">
                        <h3>
                            Tipo de menú
                        </h3>

                        <label>
                            <input
                                type="radio"
                                checked={
                                    tipoMenu ===
                                    "plantilla"
                                }
                                onChange={() =>
                                    setTipoMenu(
                                        "plantilla"
                                    )
                                }
                            />

                            Usar plantilla
                        </label>

                        <label>
                            <input
                                type="radio"
                                checked={
                                    tipoMenu ===
                                    "personalizado"
                                }
                                onChange={() =>
                                    setTipoMenu(
                                        "personalizado"
                                    )
                                }
                            />

                            Menú personalizado
                        </label>

                        {/* =====================================
                            PLANTILLA
                        ====================================== */}

                        {tipoMenu ===
                            "plantilla" && (
                            <div
                                style={{
                                    marginTop:
                                        "15px",
                                }}
                            >
                                <div>
                                    <label>
                                        <strong>
                                            Plantilla
                                        </strong>
                                    </label>

                                    <select
                                        value={
                                            plantilla
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setPlantilla(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Selecciona
                                            una
                                            plantilla
                                        </option>

                                        {plantillas.map(
                                            (
                                                p
                                            ) => (
                                                <option
                                                    key={
                                                        p.id
                                                    }
                                                    value={
                                                        p.id
                                                    }
                                                >
                                                    {
                                                        p.area
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        p.puesto
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* BOTÓN NUEVO */}

                                <button
                                    type="button"
                                    onClick={
                                        abrirAdministradorPlantillas
                                    }
                                    style={{
                                        marginTop:
                                            "10px",
                                    }}
                                >
                                    Administrar
                                    plantillas
                                </button>

                                {plantillaSeleccionada && (
                                    <div
                                        style={{
                                            marginTop:
                                                "12px",
                                        }}
                                    >
                                        <div>
                                            <strong>
                                                Área
                                                de la
                                                plantilla:
                                            </strong>{" "}
                                            {
                                                plantillaSeleccionada.area
                                            }
                                        </div>

                                        <div>
                                            <strong>
                                                Puesto:
                                            </strong>{" "}
                                            {
                                                plantillaSeleccionada.puesto
                                            }
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* =========================================
                        PERSONALIZADO
                    ========================================== */}

                    {tipoMenu ===
                        "personalizado" && (
                        <div className="constructor-menu">
                            <div className="permisos-menu-card">
                                <h3>
                                    Páginas
                                    disponibles
                                </h3>

                                <div className="lista-paginas">
                                    {paginasDisponibles.map(
                                        (
                                            pagina
                                        ) => (
                                            <div
                                                key={
                                                    pagina.key
                                                }
                                                className="pagina-disponible"
                                            >
                                                <span>
                                                    {
                                                        pagina.label
                                                    }
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        agregarPagina(
                                                            pagina
                                                        )
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="permisos-menu-card">
                                <h3>
                                    Crear
                                    submenú
                                </h3>

                                <div className="crear-submenu">
                                    <input
                                        type="text"
                                        placeholder="Ej. Primerizo"
                                        value={
                                            nuevoSubmenu
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setNuevoSubmenu(
                                                e
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            crearSubmenu
                                        }
                                    >
                                        + Crear
                                    </button>
                                </div>
                            </div>

                            {items
                                .filter(
                                    (
                                        item
                                    ): item is MenuSubmenu =>
                                        item.tipo ===
                                        "submenu"
                                )
                                .map(
                                    (
                                        submenu
                                    ) => (
                                        <div
                                            key={
                                                submenu.id
                                            }
                                            className="permisos-menu-card"
                                        >
                                            <h3>
                                                {
                                                    submenu.label
                                                }
                                            </h3>

                                            <div className="submenu-paginas">
                                                {submenu.children.map(
                                                    (
                                                        paginaKey
                                                    ) => (
                                                        <div
                                                            key={
                                                                paginaKey
                                                            }
                                                        >
                                                            <span>
                                                                {obtenerLabel(
                                                                    paginaKey
                                                                )}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    quitarPaginaSubmenu(
                                                                        submenu.id,
                                                                        paginaKey
                                                                    )
                                                                }
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <select
                                                value=""
                                                onChange={(
                                                    e
                                                ) => {
                                                    if (
                                                        e
                                                            .target
                                                            .value
                                                    ) {
                                                        agregarPaginaASubmenu(
                                                            submenu.id,
                                                            e
                                                                .target
                                                                .value
                                                        );
                                                    }
                                                }}
                                            >
                                                <option value="">
                                                    Agregar
                                                    página...
                                                </option>

                                                {paginasDisponibles.map(
                                                    (
                                                        pagina
                                                    ) => (
                                                        <option
                                                            key={
                                                                pagina.key
                                                            }
                                                            value={
                                                                pagina.key
                                                            }
                                                        >
                                                            {
                                                                pagina.label
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </div>
                                    )
                                )}
                        </div>
                    )}

                    {/* =========================================
                        VISTA PREVIA
                    ========================================== */}

                    <div className="permisos-menu-card">
                        <h3>
                            Vista previa
                        </h3>

                        {tipoMenu ===
                        "personalizado" ? (
                            <p>
                                Arrastra los
                                elementos para
                                cambiar el orden.
                            </p>
                        ) : (
                            <p>
                                Vista de la
                                plantilla que
                                utilizará este
                                trabajador.
                            </p>
                        )}

                        <div className="menu-preview">
                            {itemsVistaPrevia.map(
                                (
                                    item,
                                    index
                                ) => (
                                    <div
                                        key={`${item.id}_${index}`}
                                        className="menu-preview-item"
                                        draggable={
                                            tipoMenu ===
                                            "personalizado"
                                        }
                                        onDragStart={() =>
                                            handleDragStart(
                                                index
                                            )
                                        }
                                        onDragOver={
                                            handleDragOver
                                        }
                                        onDrop={() =>
                                            handleDrop(
                                                index
                                            )
                                        }
                                    >
                                        {item.tipo ===
                                        "pagina" ? (
                                            <span>
                                                {obtenerLabel(
                                                    item.key
                                                )}
                                            </span>
                                        ) : (
                                            <div>
                                                <span>
                                                    {
                                                        item.label
                                                    }{" "}
                                                    ▼
                                                </span>

                                                <div className="submenu-preview">
                                                    {item.children.map(
                                                        (
                                                            paginaKey
                                                        ) => (
                                                            <div
                                                                key={
                                                                    paginaKey
                                                                }
                                                            >
                                                                {obtenerLabel(
                                                                    paginaKey
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {tipoMenu ===
                                            "personalizado" && (
                                            <div className="acciones-preview">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        index ===
                                                        0
                                                    }
                                                    onClick={() =>
                                                        moverIzquierda(
                                                            index
                                                        )
                                                    }
                                                >
                                                    ←
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        index ===
                                                        items.length -
                                                            1
                                                    }
                                                    onClick={() =>
                                                        moverDerecha(
                                                            index
                                                        )
                                                    }
                                                >
                                                    →
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        eliminarItem(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {itemsVistaPrevia.length ===
                                0 && (
                                <div className="menu-vacio">
                                    No hay
                                    elementos en
                                    el menú.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* =========================================
                        GUARDAR TRABAJADOR
                    ========================================== */}

                    <div className="acciones-guardar-menu">
                        <button
                            type="button"
                            onClick={
                                guardar
                            }
                            disabled={
                                guardando
                            }
                        >
                            {guardando
                                ? "Guardando..."
                                : "Guardar menú"}
                        </button>
                    </div>
                </>
            )}

            {/* =================================================
                MODAL ADMINISTRAR PLANTILLAS
            ================================================== */}

            {modalPlantillasAbierto && (
                <div className="modal-plantillas-fondo">
                    <div className="modal-plantillas">
                        {/* HEADER */}

                        <div className="modal-plantillas-header">
                            <h2>
                                Administrar
                                plantillas
                            </h2>

                            <button
                                type="button"
                                onClick={
                                    cancelarAdministradorPlantillas
                                }
                            >
                                ✕
                            </button>
                        </div>

                        {/* CONTENIDO */}

                        <div className="modal-plantillas-contenido">
                            {/* ===============================
                                IZQUIERDA
                            ================================ */}

                            <div className="lista-plantillas-admin">
                                <h3>
                                    Plantillas
                                </h3>

                                {plantillas.map(
                                    (p) => (
                                        <button
                                            type="button"
                                            key={
                                                p.id
                                            }
                                            className={
                                                plantillaEditandoId ===
                                                p.id
                                                    ? "plantilla-admin activa"
                                                    : "plantilla-admin"
                                            }
                                            onClick={() =>
                                                seleccionarPlantillaParaEditar(
                                                    p
                                                )
                                            }
                                        >
                                            <strong>
                                                {
                                                    p.area
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    p.puesto
                                                }
                                            </span>
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    className="btn-nueva-plantilla"
                                    onClick={
                                        nuevaPlantilla
                                    }
                                >
                                    + Agregar
                                    perfil
                                </button>
                            </div>

                            {/* ===============================
                                DERECHA
                            ================================ */}

                            <div className="editor-plantilla-admin">
                                {!plantillaEditandoId &&
                                !creandoPlantilla ? (
                                    <div>
                                        Selecciona
                                        una
                                        plantilla.
                                    </div>
                                ) : (
                                    <>
                                        <h3>
                                            {creandoPlantilla
                                                ? "Nueva plantilla"
                                                : "Editar plantilla"}
                                        </h3>

                                        {/* AREA */}

                                        <div className="campo-plantilla">
                                            <label>
                                                Área
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    areaPlantillaEditando
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setAreaPlantillaEditando(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Ej. Cochera"
                                            />
                                        </div>

                                        {/* PUESTO */}

                                        <div className="campo-plantilla">
                                            <label>
                                                Puesto
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    puestoPlantillaEditando
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setPuestoPlantillaEditando(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Ej. Encargado"
                                            />
                                        </div>

                                        <hr />

                                        {/* =========================
                                            MENÚ ACTUAL
                                        ========================== */}

                                        <h3>
                                            Menú
                                            de la
                                            plantilla
                                        </h3>

                                        <div className="menu-preview">
                                            {itemsPlantillaEditando.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <div
                                                        key={`${item.id}_${index}`}
                                                        className="menu-preview-item"
                                                    >
                                                        {item.tipo ===
                                                        "pagina" ? (
                                                            <span>
                                                                {obtenerLabel(
                                                                    item.key
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <strong>
                                                                    {
                                                                        item.label
                                                                    }{" "}
                                                                    ▼
                                                                </strong>

                                                                <div className="submenu-preview">
                                                                    {item.children.map(
                                                                        (
                                                                            paginaKey
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    paginaKey
                                                                                }
                                                                            >
                                                                                {obtenerLabel(
                                                                                    paginaKey
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="acciones-preview">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    index ===
                                                                    0
                                                                }
                                                                onClick={() =>
                                                                    moverPlantillaIzquierda(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                ←
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    index ===
                                                                    itemsPlantillaEditando.length -
                                                                        1
                                                                }
                                                                onClick={() =>
                                                                    moverPlantillaDerecha(
                                                                        index
                                                                    )
                                                                }
                                                            >
                                                                →
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    eliminarItemPlantilla(
                                                                        item.id
                                                                    )
                                                                }
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            )}

                                            {itemsPlantillaEditando.length ===
                                                0 && (
                                                <div className="menu-vacio">
                                                    No
                                                    hay
                                                    opciones.
                                                </div>
                                            )}
                                        </div>

                                        {/* =========================
                                            PÁGINAS DISPONIBLES
                                        ========================== */}

                                        <h3
                                            style={{
                                                marginTop:
                                                    "25px",
                                            }}
                                        >
                                            Agregar
                                            opción
                                        </h3>

                                        <div className="opciones-plantilla-admin">
                                            {paginasDisponibles.map(
                                                (
                                                    pagina
                                                ) => {
                                                    const usada =
                                                        paginaUsadaEnPlantilla(
                                                            pagina.key
                                                        );

                                                    return (
                                                        <button
                                                            key={
                                                                pagina.key
                                                            }
                                                            type="button"
                                                            disabled={
                                                                usada
                                                            }
                                                            onClick={() =>
                                                                agregarPaginaPlantilla(
                                                                    pagina
                                                                )
                                                            }
                                                            className="opcion-agregar-plantilla"
                                                        >
                                                            {usada
                                                                ? "✓ "
                                                                : "+ "}

                                                            {
                                                                pagina.label
                                                            }
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        {/* =========================
                                            CREAR SUBMENÚ
                                        ========================== */}

                                        <h3
                                            style={{
                                                marginTop:
                                                    "25px",
                                            }}
                                        >
                                            Crear
                                            submenú
                                        </h3>

                                        <div className="crear-submenu">
                                            <input
                                                type="text"
                                                placeholder="Ej. Primerizo"
                                                value={
                                                    nuevoSubmenuPlantilla
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setNuevoSubmenuPlantilla(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={
                                                    crearSubmenuPlantilla
                                                }
                                            >
                                                +
                                                Crear
                                            </button>
                                        </div>

                                        {/* =========================
                                            CONFIGURAR SUBMENÚS
                                        ========================== */}

                                        {itemsPlantillaEditando
                                            .filter(
                                                (
                                                    item
                                                ): item is MenuSubmenu =>
                                                    item.tipo ===
                                                    "submenu"
                                            )
                                            .map(
                                                (
                                                    submenu
                                                ) => (
                                                    <div
                                                        key={
                                                            submenu.id
                                                        }
                                                        className="submenu-editor-plantilla"
                                                    >
                                                        <h4>
                                                            {
                                                                submenu.label
                                                            }
                                                        </h4>

                                                        {submenu.children.map(
                                                            (
                                                                paginaKey
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        paginaKey
                                                                    }
                                                                    className="submenu-editor-item"
                                                                >
                                                                    <span>
                                                                        {obtenerLabel(
                                                                            paginaKey
                                                                        )}
                                                                    </span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            quitarPaginaSubmenuPlantilla(
                                                                                submenu.id,
                                                                                paginaKey
                                                                            )
                                                                        }
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            )
                                                        )}

                                                        <select
                                                            value=""
                                                            onChange={(
                                                                e
                                                            ) => {
                                                                if (
                                                                    e
                                                                        .target
                                                                        .value
                                                                ) {
                                                                    agregarPaginaSubmenuPlantilla(
                                                                        submenu.id,
                                                                        e
                                                                            .target
                                                                            .value
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <option value="">
                                                                Agregar
                                                                página
                                                                al
                                                                submenú...
                                                            </option>

                                                            {paginasDisponibles.map(
                                                                (
                                                                    pagina
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            pagina.key
                                                                        }
                                                                        value={
                                                                            pagina.key
                                                                        }
                                                                        disabled={paginaUsadaEnPlantilla(
                                                                            pagina.key
                                                                        )}
                                                                    >
                                                                        {
                                                                            pagina.label
                                                                        }
                                                                    </option>
                                                                )
                                                            )}
                                                        </select>
                                                    </div>
                                                )
                                            )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* FOOTER */}

                        <div className="modal-plantillas-footer">
                            <button
                                type="button"
                                onClick={
                                    cancelarAdministradorPlantillas
                                }
                            >
                                Cancelar
                            </button>

                            {(plantillaEditandoId ||
                                creandoPlantilla) && (
                                <button
                                    type="button"
                                    onClick={
                                        guardarPlantillaFirebase
                                    }
                                    disabled={
                                        guardandoPlantilla
                                    }
                                >
                                    {guardandoPlantilla
                                        ? "Guardando..."
                                        : creandoPlantilla
                                          ? "Guardar nueva plantilla"
                                          : "Guardar cambios"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermisosMenu;