// src/Produccion/GestionProduccion.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, get, remove, update, onValue } from "firebase/database";
import { app, auth } from "../firebase/config";
import { generarPDFOTCliente } from "../plantillas/plantillaOTCliente";
import { generarPDFOTProduccion } from "../plantillas/plantillaOTProduccion";
import { calcularMaterialesTubular, MaterialItem } from "../datos/Armado_Resistencia";

interface ClienteSnapshot {
    nombre?: string;
    razonSocial?: string;
    telefono?: string;
}
interface AsesorSnapshot {
    id?: string;
    uid?: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
}
interface TrabajoItem {
    key?: string;
    partida?: string;
    tipo?: string;
    descripcion?: string;
    total?: number;
    datos?: any;
    estadoProduccion?: string;
    trabajador?: string;
    fechaInicio?: string;
    fechaFin?: string;
    materialSolicitado?: boolean;
    materialEntregado?: boolean;
    materialEntregaFecha?: string;
    inspeccion?: {
        aprobado?: boolean;
        usuario?: string;
        fecha?: string;
        observaciones?: string;
    };
    numerosSerie?: string[];
    seriesGeneradas?: boolean;
}

interface EmpleadoProduccion {
    id?: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
    activo?: boolean;
}

interface OrdenTrabajo {
    ot: string;
    otLabel?: string;
    factura?: number | null;
    fecha?: string;
    clienteId?: string | null;
    clienteSnapshot?: ClienteSnapshot;
    credito?: boolean;
    envio?: boolean;
    subtotal?: number;
    descuentoCliente?: number;
    totalConDescuento?: number;
    totalConIva?: number;
    trabajos?: Record<string, TrabajoItem>;
    envioFolio?: string;
    envioGenerado?: boolean;
    envioEnviado?: boolean;
    asesorId?: string | null;
    asesorSnapshot?: AsesorSnapshot | null;
    taller?: boolean;
    tipoDocumento?: string;
    Entrada_Almacen?: string;
}

type OrdenTrabajoConClave = OrdenTrabajo & {
    firebaseKey: string;
};

const GestionProduccion: React.FC = () => {
    // =========================
    // ESTADOS
    // =========================
    const [numeroOT, setNumeroOT] = useState("");
    const [ordenesAgregadas, setOrdenesAgregadas] = useState<OrdenTrabajoConClave[]>([]);
    const [otSeleccionada, setOtSeleccionada] = useState<OrdenTrabajoConClave | null>(null);
    const [cargando, setCargando] = useState(false);
    const [partidaSeleccionada, setPartidaSeleccionada] = useState<TrabajoItem | null>(null);

    const [operadores, setOperadores] = useState<EmpleadoProduccion[]>([]);
    const [trabajador, setTrabajador] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [estado, setEstado] = useState("");
    const [mostrarMateriales, setMostrarMateriales] = useState(false);
    const [materialesCalculados, setMaterialesCalculados] = useState<MaterialItem[]>([]);
    const [filtrosEstado, setFiltrosEstado] = useState<string[]>([]);
    const [filtroTrabajador, setFiltroTrabajador] = useState("");

    const [checkRevision, setCheckRevision] = useState(false);
    const [observaciones, setObservaciones] = useState("");
    const [usuarioActual, setUsuarioActual] = useState("");

    const [mostrarSeries, setMostrarSeries] = useState(false);
    const [numerosSerie, setNumerosSerie] = useState<string[]>([]);
    // =========================
    // FORMATEAR NÚMERO OT
    // Ejemplo: 36 -> 00036
    // =========================
    const formatearNumeroOT = (valor: string) => {
        const soloNumeros = valor.replace(/\D/g, "");
        return soloNumeros.padStart(5, "0");    
    };
    // =========================
    // función para formatear la fecha
    // =========================
    const obtenerFechaEntradaAlmacen = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = String(hoy.getFullYear()).slice(-2);
        return `${dia}/${mes}/${anio}`;
    };
    // =========================
    // AUTENTICACION DE USUARIOS
    // =========================
    useEffect(() => {
        const obtenerUsuarioActual = async () => {
            const user = auth.currentUser;

            if (!user?.uid) return;

            try {
                const db = getDatabase(app);
                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) return;

                const data = snapshot.val();

                const empleado = Object.values(data).find(
                    (emp: any) => emp.uid === user.uid
                ) as any;

                if (empleado) {
                    setUsuarioActual(empleado.username || empleado.nombre || "Usuario");
                }
            } catch (error) {
                console.error("Error obteniendo usuario actual:", error);
            }
        };

        obtenerUsuarioActual();
    }, []);

    // =========================
    // AGREGAR OT
    // Busca la OT, evita duplicados y la manda a taller
    // =========================
    const agregarOT = async () => {
        const numeroLimpio = numeroOT.replace(/\D/g, "");
        const entradaAlmacen = obtenerFechaEntradaAlmacen();
        if (!numeroLimpio) {
            alert("Escribe un número de OT");
            return;
        }

        const numeroFormateado = formatearNumeroOT(numeroLimpio);
        const otLabelBuscada = `OT-${numeroFormateado}`;

        // Validar si ya fue agregada en la tabla local
        const yaExiste = ordenesAgregadas.some(
            (ot) =>
                ot.firebaseKey === `ot${numeroFormateado}` ||
                ot.ot === numeroFormateado ||
                ot.otLabel === otLabelBuscada
        );

        if (yaExiste) {
            alert(`La ${otLabelBuscada} ya está agregada en la tabla`);
            return;
        }

        try {
            setCargando(true);
            const db = getDatabase(app);
            const snapshot = await get(ref(db, "ordenes_trabajo"));

            if (!snapshot.exists()) {
                alert("No existe el nodo ordenes_trabajo");
                return;
            }

            const data = snapshot.val();

            const encontradaKey = Object.keys(data).find((key) => {
                const item = data[key];
                return (
                    key === `ot${numeroFormateado}` ||
                    item.ot === numeroFormateado ||
                    item.otLabel === otLabelBuscada
                );
            });

            if (!encontradaKey) {
                alert(`No se encontró la ${otLabelBuscada}`);
                return;
            }

            const otEncontrada = data[encontradaKey];

            // 🔴 VALIDAR QUE SOLO SEA ORDEN DE TRABAJO
            if (otEncontrada.tipoDocumento !== "orden_trabajo") {
                alert(
                    `${otLabelBuscada} no es una orden de trabajo.`
                );
                return;
            }

            // =========================
            // 🔥 NUEVO: ASEGURAR ESTADO EN PARTIDAS
            // =========================
            const trabajos = otEncontrada.trabajos || {};
            const updatesTrabajos: any = {};

            Object.keys(trabajos).forEach((key) => {
                const trabajo = trabajos[key];

                // Si NO tiene estado, lo inicializamos
                if (!trabajo.estadoProduccion) {
                    updatesTrabajos[`trabajos/${key}/estadoProduccion`] = "en_fila";
                }
            });

            // 👇 marcar la OT como enviada a taller + actualizar partidas
            await update(ref(db, `ordenes_trabajo/${encontradaKey}`), {
                taller: true,
                Entrada_Almacen: entradaAlmacen,
                ...updatesTrabajos, // 🔥 AQUÍ se agregan los estados automáticamente
            });

            alert(`${otLabelBuscada} agregada a producción`);
        } catch (error) {
            console.error("Error al buscar/agregar la OT:", error);
            alert("Ocurrió un error al agregar la OT");
        } finally {
            setCargando(false);
            setNumeroOT(""); // 🔥 SIEMPRE limpia el input pase lo que pase
        }
    };

    // =========================
    // SELECCIONAR OT
    // =========================
    const seleccionarOT = (ot: OrdenTrabajoConClave) => {
        setOtSeleccionada(ot);
    };

    // =========================
    // CERRAR OT
    // =========================
    const cerrarOT = () => {
        setOtSeleccionada(null);
        setPartidaSeleccionada(null);
    };

    // =========================
    // CONVERTIR TRABAJOS A ARRAY
    // =========================
    const trabajosArray = otSeleccionada?.trabajos
        ? Object.entries(otSeleccionada.trabajos).map(([key, value]) => ({
            key,
            ...value,
        }))
        : [];

    // =========================
    // SELECCIONAR PARTIDA
    // =========================
    const seleccionarPartida = (trabajo: TrabajoItem) => {
        setPartidaSeleccionada(trabajo);

        setTrabajador(trabajo.trabajador || "");
        setFechaInicio(trabajo.fechaInicio || "");
        setFechaFin(trabajo.fechaFin || "");
        setEstado(trabajo.estadoProduccion || "en_fila");
        setCheckRevision(!!trabajo.inspeccion?.aprobado);
        setObservaciones(trabajo.inspeccion?.observaciones || "");

        const descripcion = trabajo.descripcion || "";
        const resultado = calcularMaterialesTubular(descripcion);

        if ((trabajo.tipo || "").toLowerCase() === "tubular" && resultado.familia) {
            setMaterialesCalculados(resultado.materiales);
        } else {
            setMaterialesCalculados([]);
        }
        setMostrarSeries(!!trabajo.seriesGeneradas);
        setNumerosSerie(trabajo.numerosSerie || []);
    };
    // =========================
    // CERRAR PARTIDA
    // =========================
    const cerrarPartida = () => {
        setPartidaSeleccionada(null);
        setTrabajador("");
        setFechaInicio("");
        setFechaFin("");
        setEstado("en_fila");
        setCheckRevision(false);
        setObservaciones("");
        setMostrarSeries(false);
        setNumerosSerie([]);
    };
    // =========================
    // CARGAR OPERADORES DE PRODUCCIÓN
    // Solo activos, área Producción y puesto Operador
    // =========================
    const cargarOperadores = async () => {
        try {
            const db = getDatabase(app);
            const snapshot = await get(ref(db, "RH/Empleados"));

            if (!snapshot.exists()) {
                console.log("No existe RH/Empleados");
                setOperadores([]);
                return;
            }

            const data = snapshot.val();
            console.log("EMPLEADOS RAW:", data);

            const normalizarTexto = (valor: any) =>
                (valor || "")
                    .toString()
                    .trim()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");

            const lista: EmpleadoProduccion[] = Object.keys(data)
                .map((key) => ({
                    id: key,
                    ...data[key],
                }))
                .filter((emp: any) => {
                    const area = normalizarTexto(emp.area);
                    const puesto = normalizarTexto(emp.puesto);

                    const activo =
                        emp.activo === true ||
                        emp.activo === "true" ||
                        emp.activo === 1 ||
                        emp.activo === "1";

                    return (
                        activo &&
                        area === "produccion" &&
                        puesto === "operador"
                    );
                })
                .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));

            console.log("OPERADORES FILTRADOS:", lista);
            setOperadores(lista);
        } catch (error) {
            console.error("Error al cargar operadores:", error);
            alert("No se pudieron cargar los operadores");
        }
    };
    // =========================
    // FUNCION useEffect
    // =========================
    useEffect(() => {
        cargarOperadores();
    }, []);

    useEffect(() => {
        const unsubscribe = cargarOTsProduccion();

        return () => {
            unsubscribe();
        };
    }, []);
    // =========================
    // FUNCION GUARDAR
    // =========================

    const guardarPartida = async () => {
        if (!otSeleccionada || !partidaSeleccionada) return;

        if (!partidaSeleccionada.key) {
            alert("No se encontró la clave de la partida");
            return;
        }

        if (estado === "terminada" && !partidaSeleccionada.seriesGeneradas) {
            alert("Debes generar los números de serie antes de terminar");
            return;
        }

        try {
            const db = getDatabase(app);
            const ruta = `ordenes_trabajo/${otSeleccionada.firebaseKey}/trabajos/${partidaSeleccionada.key}`;

            if (estado === "inspeccion" && !checkRevision) {
                alert("Debes confirmar la revisión antes de guardar la inspección");
                return;
            }

            const datosActualizar: any = {
                trabajador: estado === "en_fila" ? "" : trabajador,
                fechaInicio: estado === "en_fila" ? "" : fechaInicio,
                fechaFin: estado === "en_fila" ? "" : fechaFin,
                estadoProduccion: estado,
            };

            if (estado === "inspeccion") {
                datosActualizar.inspeccion = {
                    aprobado: checkRevision,
                    usuario: usuarioActual,
                    fecha: new Date().toISOString(),
                    observaciones,
                };
            } else if (partidaSeleccionada.inspeccion) {
                datosActualizar.inspeccion = partidaSeleccionada.inspeccion;
            }

            await update(ref(db, ruta), datosActualizar);

            setOtSeleccionada((prev) => {
                if (!prev || !prev.trabajos) return prev;

                return {
                    ...prev,
                    trabajos: {
                        ...prev.trabajos,
                        [partidaSeleccionada.key!]: {
                            ...prev.trabajos[partidaSeleccionada.key!],
                            trabajador: estado === "en_fila" ? "" : trabajador,
                            fechaInicio: estado === "en_fila" ? "" : fechaInicio,
                            fechaFin: estado === "en_fila" ? "" : fechaFin,
                            estadoProduccion: estado,
                            inspeccion:
                                estado === "inspeccion"
                                    ? {
                                        aprobado: checkRevision,
                                        usuario: usuarioActual,
                                        fecha: new Date().toISOString(),
                                        observaciones,
                                    }
                                    : prev.trabajos[partidaSeleccionada.key!].inspeccion,
                        },
                    },
                };
            });

            alert("Partida guardada correctamente ✅");
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar la partida");
        }
    };

    // =========================
    // CARGAR OTS DE PRODUCCIÓN
    // Solo muestra OTs con taller = true
    // =========================
    const cargarOTsProduccion = () => {
        const db = getDatabase(app);
        const ordenesRef = ref(db, "ordenes_trabajo");

        return onValue(ordenesRef, (snapshot) => {
            if (!snapshot.exists()) {
                setOrdenesAgregadas([]);
                return;
            }

            const data = snapshot.val();

            const lista: OrdenTrabajoConClave[] = Object.keys(data)
                .map((key) => ({
                    firebaseKey: key,
                    ...data[key],
                }))
                .filter((ot: any) => ot.taller === true)
                .sort((a, b) => Number(b.ot || 0) - Number(a.ot || 0));

            setOrdenesAgregadas(lista);

            // si la OT seleccionada cambió en Firebase, se refresca
            setOtSeleccionada((prev) => {
                if (!prev) return prev;

                const actualizada = lista.find(
                    (ot) => ot.firebaseKey === prev.firebaseKey
                );

                return actualizada || prev;
            });
        });
    };


    // =========================
    // SACAR OT DE TALLER
    // =========================
    const quitarDeTaller = async () => {
        if (!otSeleccionada) return;

        const confirmar = window.confirm(
            `¿Deseas quitar la ${otSeleccionada.otLabel || otSeleccionada.firebaseKey} de producción?`
        );

        if (!confirmar) return;

        try {
            const db = getDatabase(app);

            await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}`), {
                taller: false,
            });

            alert("OT quitada de producción");
            setOtSeleccionada(null);
            setPartidaSeleccionada(null);
        } catch (error) {
            console.error("Error al quitar de taller:", error);
            alert("No se pudo quitar la OT de producción");
        }
    };

    // =========================
    // ABRIR SOLICITUD DE MATERIAL
    // =========================
    const abrirSolicitudMaterial = () => {
        if (!partidaSeleccionada) return;

        if (partidaSeleccionada.materialEntregado === true) {
            alert("Material entregado");
            return;
        }

        const descripcion = partidaSeleccionada.descripcion || "";
        const resultado = calcularMaterialesTubular(descripcion);

        if (!resultado.familia) {
            alert("No se pudo identificar si es tubular 5/16 o 7/16");
            return;
        }

        setMaterialesCalculados(resultado.materiales);
        setMostrarMateriales(true);
    };

    // =========================
    // CERRAR SOLICITUD DE MATERIAL
    // =========================
    const cerrarSolicitudMaterial = () => {
        setMostrarMateriales(false);
    };

    // =========================
    // ENTREGAR MATERIAL
    // =========================
    const entregarMaterial = async () => {
        if (!otSeleccionada || !partidaSeleccionada || !partidaSeleccionada.key) return;

        if (partidaSeleccionada.materialEntregado === true) {
            alert("Material entregado");
            setMostrarMateriales(false);
            return;
        }

        const confirmar = window.confirm(
            `¿Deseas entregar material para la partida ${partidaSeleccionada.partida || ""}?`
        );

        if (!confirmar) return;

        try {
            const db = getDatabase(app);
            const fechaEntrega = new Date().toISOString();

            // 1. Leer inventario
            const inventarioRef = ref(db, "produccion/almacen_inventario");
            const inventarioSnap = await get(inventarioRef);

            if (!inventarioSnap.exists()) {
                alert("No existe el inventario en produccion/almacen_inventario");
                return;
            }

            const inventarioData = inventarioSnap.val();

            // 2. Validar existencias antes de descontar
            const faltantes: string[] = [];
            const movimientosParaDescontar: Array<{
                key: string;
                nuevaCantidad: number;
                descripcion: string;
            }> = [];

            for (const material of materialesCalculados) {
                const nombreBuscado = normalizarNombreMaterial(material.nombre);

                const encontradaKey = Object.keys(inventarioData).find((key) => {
                    const item = inventarioData[key];
                    const descripcion = (item.descripcion || "")
                        .toUpperCase()
                        .trim()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");

                    return descripcion === nombreBuscado;
                });

                if (!encontradaKey) {
                    faltantes.push(`${material.nombre}: no existe en inventario`);
                    continue;
                }

                const itemInventario = inventarioData[encontradaKey];
                const cantidadActual = Number(itemInventario.cantidad || 0);
                const requerida = Number(material.cantidad || 0);

                if (cantidadActual < requerida) {
                    faltantes.push(
                        `${material.nombre}: faltan ${requerida - cantidadActual}`
                    );
                    continue;
                }

                movimientosParaDescontar.push({
                    key: encontradaKey,
                    nuevaCantidad: cantidadActual - requerida,
                    descripcion: itemInventario.descripcion || material.nombre,
                });
            }

            // 3. Si hay faltantes, no descontar nada
            if (faltantes.length > 0) {
                alert(
                    "No se puede entregar material.\n\n" +
                    faltantes.join("\n")
                );
                return;
            }

            // 4. Descontar inventario
            for (const mov of movimientosParaDescontar) {
                await update(
                    ref(db, `produccion/almacen_inventario/${mov.key}`),
                    {
                        cantidad: mov.nuevaCantidad,
                    }
                );
            }

            // 5. Marcar partida como entregada
            await update(
                ref(
                    db,
                    `ordenes_trabajo/${otSeleccionada.firebaseKey}/trabajos/${partidaSeleccionada.key}`
                ),
                {
                    materialSolicitado: true,
                    materialEntregado: true,
                    materialEntregaFecha: fechaEntrega,
                }
            );

            // 6. Refrescar estado local de partida seleccionada
            setPartidaSeleccionada((prev) => {
                if (!prev) return prev;

                return {
                    ...prev,
                    materialSolicitado: true,
                    materialEntregado: true,
                    materialEntregaFecha: fechaEntrega,
                };
            });

            // 7. Refrescar OT local
            setOtSeleccionada((prev) => {
                if (!prev || !prev.trabajos) return prev;

                return {
                    ...prev,
                    trabajos: {
                        ...prev.trabajos,
                        [partidaSeleccionada.key!]: {
                            ...prev.trabajos[partidaSeleccionada.key!],
                            materialSolicitado: true,
                            materialEntregado: true,
                            materialEntregaFecha: fechaEntrega,
                        },
                    },
                };
            });

            setMostrarMateriales(false);
            alert("Material entregado y descontado del inventario");
        } catch (error) {
            console.error("Error al entregar material:", error);
            alert("No se pudo registrar la entrega de material");
        }
    };
    // =========================
    // NORMALIZAR MATERIAL
    // =========================
    const normalizarNombreMaterial = (nombre: string) => {
        const texto = (nombre || "")
            .toUpperCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const equivalencias: Record<string, string> = {
            "AISLADOR #17": "AISLADOR #17",
            "CAPUCHON 3/8": "CAPUCHON 3/8",
            "CAPUCHON 1/2": "CAPUCHON 1/2",
            "TORNILLO 3/16": "TORNILLO 3/16",
            "VARILLA 3MM": "VARILLA 3MM X 10 CM",
            "VARILLA DE ACERO INOX": "VARILLA DE ACERO INOX",
            "BIRLO DE TECHO 3/16": "BIRLO DE TECHO 3/16",
            "TUERCA HEXAGONAL 3/16": "TUERCA HEXAGONAL 3/16",
            "TORNILLO DE ACERO INOXIDABLE 1/2": "TORNILLO DE ACERO INOXIDABLE 1/2",
            "TORNILLO DE ACERO INOXIDABLE 3/4": "TORNILLO DE ACERO INOXIDABLE 3/4",
            "TORNILLO DE ACERO INOXIDABLE 5/8": "TORNILLO DE ACERO INOXIDABLE 5/8",
            "TORNILLO DE FIERRO 1/2": "TORNILLO DE FIERRO 1/2",
            "TORNILLO DE FIERRO 5/8": "TORNILLO DE FIERRO 5/8",
            "TORNILLO DE FIERRO 3/4": "TORNILLO DE FIERRO 3/4",
        };

        return equivalencias[texto] || texto;
    };

    // =========================
    // FILTROS DE BUSQUEDA
    // =========================
    const hayFiltros = filtrosEstado.length > 0 || !!filtroTrabajador;
    const ESTADOS_PRODUCCION = [
        { value: "en_fila", label: "En fila" },
        { value: "en_proceso", label: "En proceso" },
        { value: "inspeccion", label: "Inspección" },
        { value: "contactado", label: "Contactado" },
        { value: "terminada", label: "Terminada" },
        { value: "lista_para_entrega", label: "Lista para entrega" },
    ];

    //Función para activar/desactivar checks
    const toggleEstado = (estado: string) => {
        setFiltrosEstado((prev) => {
            if (prev.includes(estado)) {
                return prev.filter((e) => e !== estado);
            } else {
                return [...prev, estado];
            }
        });
    };

    //Esto recorre todas las OTs y saca las partidas que coincidan
    const partidasFiltradasGlobales = ordenesAgregadas.flatMap((ot) => {
        const trabajos = Object.entries(ot.trabajos || {}).map(([key, trabajo]) => ({
            key,
            ...trabajo,
            otFirebaseKey: ot.firebaseKey,
            otLabel: ot.otLabel || ot.firebaseKey,
            factura: ot.factura,
            clienteNombre:
                ot.clienteSnapshot?.nombre ||
                ot.clienteSnapshot?.razonSocial ||
                "PUBLICO GENERAL",
            otCompleta: ot,
        }));

        return trabajos.filter((trabajo) => {
            const estado = trabajo.estadoProduccion || "en_fila";

            const cumpleEstado =
                filtrosEstado.length === 0 || filtrosEstado.includes(estado);

            const cumpleTrabajador =
                !filtroTrabajador || trabajo.trabajador === filtroTrabajador;

            return cumpleEstado && cumpleTrabajador;
        });
    });
    //Esta abre la OT general y además deja seleccionada la partida.
    const seleccionarDesdeFiltroGlobal = (trabajo: any) => {
        setOtSeleccionada(trabajo.otCompleta);
        seleccionarPartida(trabajo);
    };
    // =========================================
    // Limpiar trabajador cuando cambia a en_fila
    // =========================================
    useEffect(() => {
        if (estado === "en_fila") {
            setTrabajador("");
            setFechaInicio("");
            setFechaFin("");
        }
    }, [estado]);

    // =========================
    // NUMEROS DE SERIE GRABADO LASER
    // =========================
    //Función para formatear fecha de grabado
    const obtenerFechaGrabado = () => {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, "0");
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const anio = String(hoy.getFullYear()).slice(-2);
        return `${dia}${mes}${anio}`;
    };
    //Función para saber cuántas piezas tiene la partida*
    const obtenerCantidadParaGrabado = (trabajo: TrabajoItem) => {
        const cantidad = Number(trabajo.datos?.cantidad);

        if (!cantidad || cantidad <= 0) return 1;

        return cantidad;
    };

    //Función para generar series
    const generarNumerosSerie = async () => {
        if (!otSeleccionada || !partidaSeleccionada || !partidaSeleccionada.key) return;

        if (partidaSeleccionada.seriesGeneradas) {
            alert("Los números de serie ya fueron generados");
            return;
        }

        try {
            const db = getDatabase(app);
            const fechaGrabado = obtenerFechaGrabado();
            const cantidad = obtenerCantidadParaGrabado(partidaSeleccionada);

            const contadorRef = ref(db, `contadores/grabado/${fechaGrabado}`);
            const snapshot = await get(contadorRef);

            const ultimoConsecutivo = snapshot.exists() ? Number(snapshot.val() || 0) : 0;

            const nuevosNumeros: string[] = [];

            for (let i = 1; i <= cantidad; i++) {
                const consecutivo = String(ultimoConsecutivo + i).padStart(2, "0");
                nuevosNumeros.push(`${fechaGrabado}${consecutivo}`);
            }

            const nuevoUltimo = ultimoConsecutivo + cantidad;

            await update(ref(db, `ordenes_trabajo/${otSeleccionada.firebaseKey}/trabajos/${partidaSeleccionada.key}`), {
                numerosSerie: nuevosNumeros,
                seriesGeneradas: true,
            });

            await update(ref(db, "contadores/grabado"), {
                [fechaGrabado]: nuevoUltimo,
            });

            setNumerosSerie(nuevosNumeros);
            setMostrarSeries(true);

            setPartidaSeleccionada((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    numerosSerie: nuevosNumeros,
                    seriesGeneradas: true,
                };
            });

            setOtSeleccionada((prev) => {
                if (!prev || !prev.trabajos) return prev;

                return {
                    ...prev,
                    trabajos: {
                        ...prev.trabajos,
                        [partidaSeleccionada.key!]: {
                            ...prev.trabajos[partidaSeleccionada.key!],
                            numerosSerie: nuevosNumeros,
                            seriesGeneradas: true,
                        },
                    },
                };
            });
        } catch (error) {
            console.error("Error al generar números de serie:", error);
            alert("No se pudieron generar los números de serie");
        }
    };
    // =========================
    // HTML
    // =========================
    return (

        <div style={{ padding: 20 }}>
            {/* =========================
        CUERPO PRINCIPAL / AGREGAR OT
       ========================= */}
            <h2>Gestión de Producción</h2>

            {!otSeleccionada && (
                <>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                        <input
                            type="number"
                            placeholder="Número de OT"
                            value={numeroOT}
                            onChange={(e) => setNumeroOT(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !cargando) {
                                    agregarOT();
                                }
                            }}
                            style={{
                                width: 180,
                                padding: 8,
                                border: "1px solid #ccc",
                                borderRadius: 6,
                            }}
                        />

                        <button onClick={agregarOT} disabled={cargando}>
                            {cargando ? "Buscando..." : "Agregar OT"}
                        </button>
                    </div>
                    {/* =========================
            FILTROS  POR ESTADOS DE OTS 
           ========================= */}
                    <div style={{ marginBottom: 12 }}>
                        <b>Filtrar por estado:</b>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                            {ESTADOS_PRODUCCION.map((estado) => (
                                <label
                                    key={estado.value}
                                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={filtrosEstado.includes(estado.value)}
                                        onChange={() => toggleEstado(estado.value)}
                                    />
                                    {estado.label}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <b>Filtrar por trabajador:</b>

                        <select
                            value={filtroTrabajador}
                            onChange={(e) => setFiltroTrabajador(e.target.value)}
                            style={{
                                marginLeft: 10,
                                padding: 6,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                            }}
                        >
                            <option value="">Todos</option>

                            {operadores.map((op) => (
                                <option key={op.id} value={op.username || ""}>
                                    {op.username || "Sin username"}
                                </option>
                            ))}
                        </select>
                    </div>
                    {!hayFiltros ? (
                        <div
                            style={{
                                border: "1px solid #ccc",
                                borderRadius: 8,
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={thStyle}>OT</th>
                                        <th style={thStyle}>Factura</th>
                                        <th style={thStyle}>Cliente</th>
                                        <th style={thStyle}>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {ordenesAgregadas.length === 0 ? (
                                        <tr>
                                            <td style={tdStyle} colSpan={4}>
                                                No hay OTs agregadas
                                            </td>
                                        </tr>
                                    ) : (
                                        ordenesAgregadas.map((ot) => (
                                            <tr key={ot.firebaseKey}>
                                                <td style={tdStyle}>{ot.otLabel || ot.firebaseKey}</td>

                                                <td style={tdStyle}>
                                                    {ot.factura === null || ot.factura === undefined
                                                        ? "--"
                                                        : ot.factura}
                                                </td>

                                                <td style={tdStyle}>
                                                    {ot.clienteSnapshot?.nombre ||
                                                        ot.clienteSnapshot?.razonSocial ||
                                                        "PUBLICO GENERAL"}
                                                </td>

                                                <td style={tdStyle}>
                                                    <button onClick={() => seleccionarOT(ot)}>
                                                        Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                    ) : (
                          
                        <div
                            style={{
                                border: "1px solid #ccc",
                                borderRadius: 8,
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={thStyle}>OT</th>
                                        <th style={thStyle}>Partida</th>
                                        <th style={thStyle}>Tipo</th>
                                        <th style={thStyle}>Estado</th>
                                        <th style={thStyle}>Cliente</th>
                                        <th style={thStyle}>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {partidasFiltradasGlobales.length === 0 ? (
                                        <tr>
                                            <td style={tdStyle} colSpan={6}>
                                                No hay partidas con esos filtros
                                            </td>
                                        </tr>
                                    ) : (
                                        partidasFiltradasGlobales.map((trabajo, index) => (
                                            <tr key={`${trabajo.otFirebaseKey}-${trabajo.key}-${index}`}>
                                                <td style={tdStyle}>{trabajo.otLabel}</td>
                                                <td style={tdStyle}>{trabajo.partida || "--"}</td>
                                                <td style={tdStyle}>{trabajo.tipo || "--"}</td>
                                                <td style={tdStyle}>{trabajo.estadoProduccion || "en_fila"}</td>
                                                <td style={tdStyle}>{trabajo.clienteNombre}</td>
                                                <td style={tdStyle}>
                                                    <button onClick={() => seleccionarDesdeFiltroGlobal(trabajo)}>
                                                        Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                </>
            )}

            {/* =========================
        DETALLE DE LA OT SELECCIONADA
       ========================= */}
            {otSeleccionada && (
                <div
                    style={{
                        border: "1px solid #999",
                        borderRadius: 10,
                        padding: 20,
                        background: "#fff",
                        position: "relative",
                        marginTop: 10,
                    }}
                >
                    <button
                        onClick={cerrarOT}
                        style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            background: "#ff4d4f",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            cursor: "pointer",
                            fontWeight: "bold",
                        }}
                    >
                        ✕
                    </button>

                    <h1 style={{ textAlign: "center", marginBottom: 20 }}>
                        {otSeleccionada.otLabel || otSeleccionada.firebaseKey}
                    </h1>

                    <div style={{ marginBottom: 10 }}>
                        <b>Factura:</b>{" "}
                        {otSeleccionada.factura === null || otSeleccionada.factura === undefined
                            ? "--"
                            : otSeleccionada.factura}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Compañero:</b>{" "}
                        {otSeleccionada.asesorSnapshot?.username ||
                            otSeleccionada.asesorSnapshot?.nombre ||
                            "--"}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Cliente:</b>{" "}
                        {otSeleccionada.clienteSnapshot?.nombre ||
                            otSeleccionada.clienteSnapshot?.razonSocial ||
                            "PUBLICO GENERAL"}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Teléfono:</b> {otSeleccionada.clienteSnapshot?.telefono || "--"}
                    </div>

                    <div style={{ marginBottom: 10 }}>
                        <b>Envío:</b> {otSeleccionada.envio ? "Sí" : "No"}
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <b>Progreso:</b> Aquí luego pondremos la barra
                    </div>

                    {/* =========================
            PARTIDAS DE LA OT
           ========================= */}
                    <div style={{ marginTop: 25 }}>
                        <h3>Partidas</h3>

                        <div
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={thStyle}>Partida</th>
                                        <th style={thStyle}>Tipo</th>
                                        <th style={thStyle}>Estado</th>
                                        <th style={thStyle}>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {trabajosArray.length === 0 ? (
                                        <tr>
                                            <td style={tdStyle} colSpan={4}>
                                                No hay partidas
                                            </td>
                                        </tr>
                                    ) : (
                                            trabajosArray.map((trabajo, index) => (
                                            <tr key={trabajo.partida || index}>
                                                <td style={tdStyle}>
                                                    {trabajo.partida || `Partida ${index + 1}`}
                                                </td>

                                                <td style={tdStyle}>{trabajo.tipo || "--"}</td>

                                                <td style={tdStyle}>
                                                    {trabajo.estadoProduccion || "en_fila"}
                                                </td>

                                                <td style={tdStyle}>
                                                    <button onClick={() => seleccionarPartida(trabajo)}>
                                                        Seleccionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* =========================
            DETALLE DE LA PARTIDA SELECCIONADA
           ========================= */}
                    {partidaSeleccionada && (
                        <div
                            style={{
                                marginTop: 25,
                                border: "1px solid #999",
                                borderRadius: 10,
                                padding: 20,
                                background: "#fafafa",
                                position: "relative",
                            }}
                        >
                            <button
                                onClick={cerrarPartida}
                                style={{
                                    position: "absolute",
                                    top: 10,
                                    right: 10,
                                    background: "#ff4d4f",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 28,
                                    height: 28,
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                }}
                            >
                                ✕
                            </button>

                            <h3 style={{ marginBottom: 20 }}>
                                {partidaSeleccionada.partida || "Partida seleccionada"}
                            </h3>

                            <div style={{ marginBottom: 15 }}>
                                <b>Descripción:</b>
                                <div
                                    style={{
                                        marginTop: 8,
                                        padding: 10,
                                        border: "1px solid #ddd",
                                        borderRadius: 8,
                                        background: "#fff",
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    {partidaSeleccionada.descripcion || "--"}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "auto auto auto",
                                    gap: 10,
                                    justifyContent: "start", // 🔥 evita que se expandan
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Trabajador:
                                    </label>

                                    <select
                                        value={trabajador}
                                        onChange={(e) => setTrabajador(e.target.value)}
                                        disabled={
                                            estado === "en_fila" ||
                                            estado === "inspeccion" ||
                                            estado === "terminada" ||
                                            estado === "contactado" ||
                                            estado === "lista_para_entrega"
                                        }
                                        style={{
                                            width: "100%",
                                            padding: 8,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    >
                                        <option value="">Selecciona un operador</option>

                                        {operadores.map((op) => (
                                            <option key={op.id} value={op.username || ""}>
                                                {op.username || "Sin nombre"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Inicio:
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={(e) => setFechaInicio(e.target.value)}
                                        disabled={
                                            !trabajador ||
                                            estado === "inspeccion" ||
                                            estado === "contactado" ||
                                            estado === "terminada" ||
                                            estado === "lista_para_entrega"
                                        }
                                        style={{
                                            width: "100%",
                                            maxWidth: 180,
                                            padding: 6,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontWeight: "bold",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Fin:
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            setFechaFin(valor);

                                            if (valor) {
                                                setEstado("inspeccion");
                                            }
                                        }}
                                        disabled={
                                            !trabajador ||
                                            !fechaInicio ||
                                            estado === "inspeccion" ||
                                            estado === "contactado" ||
                                            estado === "terminada" ||
                                            estado === "lista_para_entrega"
                                        }
                                        style={{
                                            width: "100%",
                                            maxWidth: 180,
                                            padding: 6,
                                            border: "1px solid #ccc",
                                            borderRadius: 6,
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontWeight: "bold",
                                        marginBottom: 6,
                                    }}
                                >
                                    Estado:
                                </label>

                                <select
                                    value={estado}
                                    onChange={(e) => setEstado(e.target.value)}
                                    style={{
                                        width: "100%",
                                        maxWidth: 260,
                                        padding: 8,
                                        border: "1px solid #ccc",
                                        borderRadius: 6,
                                    }}
                                >
                                    <option
                                        value="en_fila"
                                        disabled={partidaSeleccionada.seriesGeneradas}
                                    >
                                        En fila
                                    </option>

                                    <option
                                        value="en_proceso"
                                        disabled={partidaSeleccionada.seriesGeneradas}
                                    >
                                        En proceso
                                    </option>

                                    <option
                                        value="inspeccion"
                                        disabled={partidaSeleccionada.seriesGeneradas}
                                    >
                                        Inspección
                                    </option>

                                    <option value="terminada">
                                        Terminada
                                    </option>

                                    <option value="contactado">
                                        Contactado
                                    </option>

                                    <option value="lista_para_entrega">
                                        Lista para entrega
                                    </option>
                                </select>
                            </div>
                            {/*DIV DE INSPECCION*/ }
                            {estado === "inspeccion" && (
                                <div
                                    style={{
                                        marginBottom: 20,
                                        padding: 14,
                                        border: "1px solid #d9d9d9",
                                        borderRadius: 8,
                                        background: "#fff",
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontWeight: "bold",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checkRevision}
                                            onChange={(e) => setCheckRevision(e.target.checked)}
                                        />
                                        {usuarioActual || "Usuario"} ha revisado que cumple
                                    </label>

                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontWeight: "bold",
                                                marginBottom: 6,
                                            }}
                                        >
                                            Observaciones:
                                        </label>

                                        <textarea
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            placeholder="Escribe observaciones de inspección..."
                                            style={{
                                                width: "100%",
                                                minHeight: 100,
                                                padding: 8,
                                                border: "1px solid #ccc",
                                                borderRadius: 6,
                                                resize: "vertical",
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/*SECCION DE BOTONES*/ }
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    onClick={() => {
                                        alert("Aquí luego conectamos el PDF de la partida");
                                    }}
                                >
                                    Crear PDF
                                </button>

                                <button onClick={guardarPartida}>
                                    Guardar
                                </button>
                                {estado === "contactado" && (
   
                                        <button
                                            onClick={() => {
                                                const telefono =
                                                    otSeleccionada?.clienteSnapshot?.telefono || "";

                                                if (!telefono) {
                                                    alert("El cliente no tiene teléfono");
                                                    return;
                                                }

                                                const numero = telefono.replace(/\D/g, ""); // limpiar

                                                const mensaje = `Nos comunicamos de RAFF para informarle que su ${otSeleccionada?.otLabel} ya esta lista`;

                                                const url = `https://wa.me/52${numero}?text=${encodeURIComponent(mensaje)}`;

                                                window.open(url, "_blank");
                                            }}
                                            style={{
                                                padding: "8px 14px",
                                                background: "#25D366",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            Enviar WhatsApp
                                        </button>
                                   
                                )}
                            </div>
                            {/*NUMERO DE SERIE LASER*/}
                            {estado === "terminada" && (
                                <div
                                    style={{
                                        marginBottom: 20,
                                        padding: 14,
                                        border: "1px solid #d9d9d9",
                                        borderRadius: 8,
                                        background: "#fff",
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontWeight: "bold",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={mostrarSeries}
                                            disabled={mostrarSeries}
                                            onChange={async (e) => {
                                                if (e.target.checked) {
                                                    await generarNumerosSerie();
                                                }
                                            }}
                                        />
                                        Mostrar números de serie
                                    </label>

                                    {numerosSerie.length > 0 && (
                                        <div
                                            style={{
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 8,
                                                background: "#f9fafb",
                                                padding: 12,
                                            }}
                                        >
                                            <b>Números de serie:</b>
                                            <div style={{ marginTop: 10 }}>
                                                {numerosSerie.map((serie, index) => (
                                                    <div key={`${serie}-${index}`} style={{ marginBottom: 4 }}>
                                                        {serie}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/*TABLA DE ENTREGA DE MATERIAL TUBULAR*/ }

                            {(partidaSeleccionada.tipo || "").toLowerCase() === "tubular" && (
                                <div
                                    style={{
                                        marginTop: 20,
                                        border: "1px solid #d1d5db",
                                        borderRadius: 10,
                                        padding: 16,
                                        background: "#ffffff",
                                    }}
                                >
                                    <h4 style={{ marginTop: 0, marginBottom: 12 }}>
                                        Material requerido
                                    </h4>

                                    <div
                                        style={{
                                            border: "1px solid #ddd",
                                            borderRadius: 8,
                                            overflow: "hidden",
                                            background: "#fff",
                                            marginBottom: 16,
                                        }}
                                    >
                                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr style={{ background: "#f5f5f5" }}>
                                                    <th style={thStyle}>Material</th>
                                                    <th style={thStyle}>Cantidad requerida</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materialesCalculados.length === 0 ? (
                                                    <tr>
                                                        <td style={tdStyle} colSpan={2}>
                                                            No se encontraron materiales para esta partida
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    materialesCalculados.map((item, index) => (
                                                        <tr key={`${item.nombre}-${index}`}>
                                                            <td style={tdStyle}>{item.nombre}</td>
                                                            <td style={tdStyle}>{item.cantidad}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                        <button
                                            onClick={entregarMaterial}
                                            disabled={partidaSeleccionada.materialEntregado === true}
                                        >
                                            {partidaSeleccionada.materialEntregado
                                                ? "Material entregado"
                                                : "Entregar material"}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/*fin1*/}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const thStyle: React.CSSProperties = {
    padding: 10,
    borderBottom: "1px solid #ddd",
    textAlign: "left",
};

const tdStyle: React.CSSProperties = {
    padding: 10,
    borderBottom: "1px solid #eee",
};

export default GestionProduccion;
