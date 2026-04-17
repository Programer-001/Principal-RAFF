import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebase/config";
import { ref, get, set, update } from "firebase/database";
import { obtenerPrecioBanda } from "../datos/Precio_Banda_interno";
import { formatearMoneda } from "../funciones/formato_moneda";
//import "../css/banda.css";

type TrabajoBanda = {
    trabajoKey: string;
    otKey: string;
    otLabel: string;
    fecha: string;
    cliente: string;
    partida: string;
    descripcion: string;
    datos: any;
    cantidad: number;
    precioBase: number;
    pagoBarrenos: number;
    pagoLaminas: number;
    pagoDobleces: number;
    pago440: number;
    pagoCeramica: number;
    precioUnitario: number;
    total: number;
    laminasCantidad: number;
    laminasPrecio: number;
    doblecesCantidad: number;
    doblecesPrecio: number;
    ceramicaPorcentaje: number;
    usarLaminas: boolean;
    usarDobleces: boolean;
    usarCeramica: boolean;
    tipoBanda: string;
};

type Empleado = {
    uid?: string;
    username?: string;
    nombre?: string;
};

const Pago_Banda: React.FC = () => {
    const [busquedaOT, setBusquedaOT] = useState("");
    const [trabajosEncontrados, setTrabajosEncontrados] = useState<TrabajoBanda[]>([]);
    const [ticketPago, setTicketPago] = useState<TrabajoBanda[]>([]);
    const [loading, setLoading] = useState(false);
    const [marcarComoPagado, setMarcarComoPagado] = useState(false);
    const [trabajoEditando, setTrabajoEditando] = useState<TrabajoBanda | null>(null);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        document.title = "Pago de Bandas";

        const guardados = localStorage.getItem("ticket_pago_bandas");
        if (guardados) {
            const lista = JSON.parse(guardados);

            const listaLimpia = Array.isArray(lista)
                ? lista.filter((item) => {
                    const keyTrabajo = String(item?.trabajoKey || "").trim();
                    return keyTrabajo && keyTrabajo !== "undefined" && keyTrabajo !== "null";
                })
                : [];

            setTicketPago(listaLimpia);
            localStorage.setItem("ticket_pago_bandas", JSON.stringify(listaLimpia));
        }
    }, []);
    const formatearFechaHoy = () => {
        const hoy = new Date();
        const dd = String(hoy.getDate()).padStart(2, "0");
        const mm = String(hoy.getMonth() + 1).padStart(2, "0");
        const yyyy = hoy.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };
    const obtenerNombreTipoBanda = (selector: number): string => {
        switch (selector) {
            case 1:
                return "Mica";
            case 2:
                return "Semicurva";
            case 3:
                return "Plana";
            case 4:
                return "Cerámica";
            case 5:
                return "Tira";
            default:
                return "No definido";
        }
    };
    const convertirDiametroSegunSelector = (
        diametroCm: number,
        selector: number
    ): number => {
        let diametroPulgadas = diametroCm / 2.54;

        if (selector === 2) {
            // SEMICURVA
            diametroPulgadas = (diametroPulgadas * 2) / Math.PI;
        }

        if (selector === 3) {
            // PLANA
            diametroPulgadas = diametroPulgadas / Math.PI;
        }

        return diametroPulgadas;
    };

    const normalizarMedidaBanda = (pulgadas: number): number => {
        const redondeado = Math.round(pulgadas * 2) / 2;
        return redondeado < 1.5 ? 1.5 : redondeado;
    };

    const construirTrabajoBanda = (
        otKey: string,
        otValue: any,
        trabajo: any
    ): TrabajoBanda => {
        const datos = trabajo.datos || {};
        
        const selector = Number(datos.selector) || 0;
        const cantidad = Number(datos.cantidad) || 1;

        const tipoBanda = obtenerNombreTipoBanda(selector);

        const anchoCm = Number(datos.ancho) || 0;
        const diametroCm = Number(datos.diametro) || 0;

        const anchoPulgadas = anchoCm / 2.54;
        const diametroPulgadas = convertirDiametroSegunSelector(diametroCm, selector);

        const anchoFinal = normalizarMedidaBanda(anchoPulgadas);
        const diametroFinal = normalizarMedidaBanda(diametroPulgadas);

        const precioBase = obtenerPrecioBanda(anchoFinal, diametroFinal) || 0;

        const numBarrenos = Number(datos.numBarrenos) || 0;
        const pagoBarrenos = numBarrenos * 10;

        const usarLaminas = Boolean(datos.usarLaminas);
        const laminasCantidad = Number(datos.laminasCantidad) || 0;
        const laminasPrecio = Number(datos.laminasPrecio) || 0;
        const pagoLaminas = usarLaminas ? laminasCantidad * laminasPrecio : 0;

        const usarDobleces = Boolean(datos.usarDobleces);
        const doblecesCantidad = Number(datos.doblecesCantidad) || 0;
        const doblecesPrecio = Number(datos.doblecesPrecio) || 0;
        const pagoDobleces = usarDobleces ? doblecesCantidad * doblecesPrecio : 0;

        const pago440 = datos.fabricar440 ? precioBase * 0.1 : 0;

        const usarCeramica = Boolean(datos.usarCeramica);
        const ceramicaPorcentaje = Number(datos.ceramicaPorcentaje) || 50;
        const pagoCeramica = usarCeramica
            ? precioBase * (ceramicaPorcentaje / 100)
            : 0;

        const precioUnitario =
            precioBase +
            pagoBarrenos +
            pagoLaminas +
            pagoDobleces +
            pago440 +
            pagoCeramica;

        const total = precioUnitario * cantidad;

        return {
            trabajoKey: trabajo.trabajoKey || "",
            otKey,
            otLabel: otValue.otLabel || otKey,
            fecha: otValue.fecha || "",
            cliente:
                otValue.clienteSnapshot?.nombre ||
                otValue.clienteSnapshot?.razonSocial ||
                "",
            partida: trabajo.partida || "",
            tipoBanda,
            descripcion: trabajo.descripcion || "",
            datos,
            cantidad,
            precioBase,
            pagoBarrenos,
            pagoLaminas,
            pagoDobleces,
            pago440,
            pagoCeramica,
            precioUnitario,
            total,
            laminasCantidad,
            laminasPrecio,
            doblecesCantidad,
            doblecesPrecio,
            ceramicaPorcentaje,
            usarLaminas,
            usarDobleces,
            usarCeramica,
        };
    };

    const recalcularTrabajo = (trabajo: TrabajoBanda): TrabajoBanda => {
        const pagoLaminas = trabajo.usarLaminas
            ? trabajo.laminasCantidad * trabajo.laminasPrecio
            : 0;

        const pagoDobleces = trabajo.usarDobleces
            ? trabajo.doblecesCantidad * trabajo.doblecesPrecio
            : 0;

        const pagoCeramica = trabajo.usarCeramica
            ? trabajo.precioBase * (trabajo.ceramicaPorcentaje / 100)
            : 0;

        const precioUnitario =
            trabajo.precioBase +
            trabajo.pagoBarrenos +
            pagoLaminas +
            pagoDobleces +
            trabajo.pago440 +
            pagoCeramica;

        const total = precioUnitario * trabajo.cantidad;

        return {
            ...trabajo,
            pagoLaminas,
            pagoDobleces,
            pagoCeramica,
            precioUnitario,
            total,
        };
    };

    const buscarOT = async () => {
        const otBuscada = busquedaOT.trim().toLowerCase();
        if (!otBuscada) return;

        try {
            setLoading(true);

            const snapshot = await get(ref(db, "ordenes_trabajo"));

            if (!snapshot.exists()) {
                setTrabajosEncontrados([]);
                alert("No hay órdenes de trabajo");
                return;
            }

            const data = snapshot.val();
            const resultados: TrabajoBanda[] = [];

            Object.entries(data).forEach(([otKey, otValue]: any) => {
                const coincideOT =
                    otKey.toLowerCase().includes(otBuscada) ||
                    String(otValue.otLabel || "").toLowerCase().includes(otBuscada) ||
                    String(otValue.ot || "").toLowerCase().includes(otBuscada);

                if (!coincideOT) return;

                const trabajos = Object.entries(otValue.trabajos || {});

                trabajos.forEach(([trabajoKey, trabajo]: any) => {
                    if (trabajo.tipo !== "banda") return;

                    resultados.push(
                        construirTrabajoBanda(otKey, otValue, {
                            ...trabajo,
                            trabajoKey,
                        })
                    );
                });
            });

            if (resultados.length === 0) {
                alert("No se encontraron partidas de banda para esa OT");
            }

            setTrabajosEncontrados(resultados);

            // 🔥 LIMPIAR INPUT SIEMPRE
            setBusquedaOT("");

        } catch (error) {
            console.error("Error al buscar OT:", error);
            alert("Ocurrió un error al buscar la OT");
        } finally {
            setLoading(false);
        }
    };

    const actualizarTrabajoEncontrado = (
        partida: string,
        campo: "laminasCantidad" | "laminasPrecio" | "doblecesCantidad" | "doblecesPrecio" | "ceramicaPorcentaje",
        valor: number
    ) => {
        setTrabajosEncontrados((prev) =>
            prev.map((trabajo) => {
                if (trabajo.partida !== partida) return trabajo;
                return recalcularTrabajo({
                    ...trabajo,
                    [campo]: valor,
                });
            })
        );
    };

    const toggleCeramica = (partida: string, activo: boolean) => {
        setTrabajosEncontrados((prev) =>
            prev.map((trabajo) => {
                if (trabajo.partida !== partida) return trabajo;
                return recalcularTrabajo({
                    ...trabajo,
                    usarCeramica: activo,
                    ceramicaPorcentaje: activo ? trabajo.ceramicaPorcentaje || 50 : 0,
                });
            })
        );
    };

    const agregarAlTicket = (trabajo: TrabajoBanda) => {
        const keyTrabajo = String(trabajo.trabajoKey || "").trim();

        if (!keyTrabajo || keyTrabajo === "undefined" || keyTrabajo === "null") {
            alert("Esta partida no tiene una clave válida de Firebase");
            console.warn("trabajo inválido:", trabajo);
            return;
        }

        const existe = ticketPago.find(
            (item) => item.otKey === trabajo.otKey && item.partida === trabajo.partida
        );

        if (existe) {
            alert("Esa partida ya está agregada al ticket");
            return;
        }

        const nuevoTicket = [...ticketPago, trabajo];
        setTicketPago(nuevoTicket);
        localStorage.setItem("ticket_pago_bandas", JSON.stringify(nuevoTicket));

        setTrabajosEncontrados((prev) =>
            prev.filter(
                (t) => !(t.otKey === trabajo.otKey && t.partida === trabajo.partida)
            )
        );
    };

    const quitarDelTicket = (otKey: string, partida: string) => {
        const nuevoTicket = ticketPago.filter(
            (item) => !(item.otKey === otKey && item.partida === partida)
        );

        setTicketPago(nuevoTicket);
        localStorage.setItem("ticket_pago_bandas", JSON.stringify(nuevoTicket));
    };

    const borrarTodo = () => {
        localStorage.removeItem("ticket_pago_bandas");
        setTicketPago([]);
    };

    const totalTicket = useMemo(() => {
        return ticketPago.reduce((acc, item) => acc + item.total, 0);
    }, [ticketPago]);
    //Guardar
    const guardarPago = async () => {
        if (ticketPago.length === 0) {
            alert("No hay trabajos en el ticket para guardar");
            return;
        }

        // 🔒 EVITAR DOBLE CLICK
        if (guardando) return;
        setGuardando(true);

        try {
            const snapshotPagos = await get(ref(db, "pagos_banda"));

            let siguienteNumero = 1;

            if (snapshotPagos.exists()) {
                const dataPagos = snapshotPagos.val();
                const claves = Object.keys(dataPagos);

                const numeros = claves
                    .map((key) => Number(String(key).replace("PB-", "")))
                    .filter((n) => !isNaN(n));

                if (numeros.length > 0) {
                    siguienteNumero = Math.max(...numeros) + 1;
                }
            }

            const pago = String(siguienteNumero).padStart(5, "0");
            const pagoLabel = `PB-${pago}`;
            const fecha = formatearFechaHoy();

            const usuarioActual = auth?.currentUser;

            let registradoPor = "Usuario sin nombre";
            let registradoPorUid = usuarioActual?.uid || "";

            if (usuarioActual?.uid) {
                const snapshotEmp = await get(ref(db, "RH/Empleados"));

                if (snapshotEmp.exists()) {
                    const empleados = snapshotEmp.val() as Record<string, Empleado>;

                    const encontrado = Object.values(empleados).find(
                        (emp) => emp.uid === usuarioActual.uid
                    );

                    if (encontrado) {
                        registradoPor = encontrado.username ?? encontrado.nombre ?? registradoPor;
                    }
                }
            }

            const pagadoBanda = marcarComoPagado;
            const fechaPagoBanda = marcarComoPagado ? fecha : "";

            const trabajos: Record<string, any> = {};

            ticketPago.forEach((trabajo, index) => {
                const trabajoKey = `${pagoLabel}_${index + 1}`;

                trabajos[trabajoKey] = {
                    otKey: trabajo.otKey || "",
                    otLabel: trabajo.otLabel || "",
                    partida: trabajo.partida || "",
                    tipo: "banda",
                    tipoBanda: trabajo.tipoBanda || "",
                    cliente: trabajo.cliente || "",
                    descripcion: trabajo.descripcion || "",
                    cantidad: trabajo.cantidad || 0,

                    precioBase: trabajo.precioBase || 0,
                    pagoBarrenos: trabajo.pagoBarrenos || 0,

                    usarLaminas: trabajo.usarLaminas || false,
                    laminasCantidad: trabajo.laminasCantidad || 0,
                    laminasPrecio: trabajo.laminasPrecio || 0,
                    pagoLaminas: trabajo.pagoLaminas || 0,

                    usarDobleces: trabajo.usarDobleces || false,
                    doblecesCantidad: trabajo.doblecesCantidad || 0,
                    doblecesPrecio: trabajo.doblecesPrecio || 0,
                    pagoDobleces: trabajo.pagoDobleces || 0,

                    fabricar440: trabajo.datos?.fabricar440 ?? false,
                    pago440: trabajo.pago440 || 0,

                    usarCeramica: trabajo.usarCeramica || false,
                    ceramicaPorcentaje: trabajo.ceramicaPorcentaje || 0,
                    pagoCeramica: trabajo.pagoCeramica || 0,

                    precioUnitario: trabajo.precioUnitario || 0,
                    total: trabajo.total || 0,

                    pagadoBanda,
                    fechaPagoBanda,

                    datosOriginales: trabajo.datos || {},
                };
            });

            const payload = {
                pago,
                pagoLabel,
                fecha,
                registradoPor,
                registradoPorUid,
                total: totalTicket,
                cantidadTrabajos: ticketPago.length,
                observaciones: "",
                pagadoBanda,
                fechaPagoBanda,
                trabajos,
            };

            // 🔥 GUARDAR EN pagos_banda
            await set(ref(db, `pagos_banda/${pagoLabel}`), payload);

            // 🔥 ACTUALIZAR ORDENES DE TRABAJO
            for (const trabajo of ticketPago) {
                const keyTrabajo = String(trabajo.trabajoKey || "").trim();

                if (!keyTrabajo || keyTrabajo === "undefined" || keyTrabajo === "null") {
                    console.warn("Trabajo sin trabajoKey válido, no se actualiza en OT:", trabajo);
                    continue;
                }

                // limpia basura vieja si existe
                await set(
                    ref(db, `ordenes_trabajo/${trabajo.otKey}/trabajos/undefined`),
                    null
                );

                await update(
                    ref(db, `ordenes_trabajo/${trabajo.otKey}/trabajos/${keyTrabajo}`),
                    {
                        pagadoBanda,
                        fechaPagoBanda,
                    }
                );
            }

            alert(`Pago guardado correctamente como ${pagoLabel}`);

            localStorage.removeItem("ticket_pago_bandas");
            setTicketPago([]);
            setMarcarComoPagado(false);
        } catch (error: any) {
            console.error("Error al guardar pago:", error);
            alert(`Ocurrió un error al guardar el pago: ${error?.message || error}`);
        } finally {
            setGuardando(false);
        }
    };
    //editar ticket
    const editarDelTicket = (trabajoEditar: TrabajoBanda) => {
        const existeArriba = trabajosEncontrados.find(
            (t) => t.otKey === trabajoEditar.otKey && t.partida === trabajoEditar.partida
        );

        if (!existeArriba) {
            setTrabajosEncontrados((prev) => [trabajoEditar, ...prev]);
        } else {
            setTrabajosEncontrados((prev) =>
                prev.map((t) =>
                    t.otKey === trabajoEditar.otKey && t.partida === trabajoEditar.partida
                        ? trabajoEditar
                        : t
                )
            );
        }

        // quitar del ticket para volverla a agregar ya editada
        const nuevoTicket = ticketPago.filter(
            (item) => !(item.otKey === trabajoEditar.otKey && item.partida === trabajoEditar.partida)
        );

        setTicketPago(nuevoTicket);
        localStorage.setItem("ticket_pago_bandas", JSON.stringify(nuevoTicket));

        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    //-------------------------------html--------------------------------------------->>
    return (
        <div className="cotizador-layout">
            {/* IZQUIERDA */}
            <div style={{ flex: 3 }}>
                <h1>Pago OT de banda</h1>

                <div className="busqueda_folio">
                    <input
                        type="text"
                        placeholder="Ingresa OT, por ejemplo: 57 u OT-00057"
                        value={busquedaOT}
                        onChange={(e) => setBusquedaOT(e.target.value)}
                    />

                    <button className="btn btn-blue" onClick={buscarOT}>
                        Buscar
                    </button>
                </div>

                {loading && <p>Cargando...</p>}

                {trabajosEncontrados.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        {trabajosEncontrados.map((trabajo, index) => (
                            <div
                                key={`${trabajo.otKey}-${trabajo.partida}-${index}`}
                                style={{
                                    border: "1px solid #ccc",
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 16,
                                    background: "#fff",
                                }}
                            >
                                <h2>{trabajo.otLabel}</h2>
                                <p><strong>Fecha:</strong> {trabajo.fecha}</p>
                                <p><strong>Cliente:</strong> {trabajo.cliente || "--"}</p>
                                <p><strong>OT - Partida:</strong> {trabajo.partida}</p>
                                <p><strong>Tipo de banda:</strong> {trabajo.tipoBanda}</p>
                                <p><strong>Descripción:</strong> {trabajo.descripcion || "--"}</p>

                                <hr />

                                <p><strong>Ancho:</strong> {trabajo.datos.ancho || 0} cm</p>
                                <p><strong>Diámetro:</strong> {trabajo.datos.diametro || 0} cm</p>
                                <p><strong>Cantidad:</strong> {trabajo.cantidad}</p>
                                <p><strong>Número de barrenos:</strong> {trabajo.datos.numBarrenos || 0}</p>
                                <p><strong>Fabricar a 440:</strong> {trabajo.datos.fabricar440 ? "Sí" : "No"}</p>

                                {/* LAMINAS */}
                                <div style={{ marginTop: 12 }}>
                                    <p><strong>Láminas:</strong> {trabajo.usarLaminas ? "Sí" : "No"}</p>

                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={trabajo.usarLaminas}
                                            onChange={(e) =>
                                                setTrabajosEncontrados((prev) =>
                                                    prev.map((t) =>
                                                        t.partida === trabajo.partida
                                                            ? recalcularTrabajo({
                                                                ...t,
                                                                usarLaminas: e.target.checked,
                                                                laminasCantidad: e.target.checked ? t.laminasCantidad : 0,
                                                                laminasPrecio: e.target.checked ? t.laminasPrecio : 0,
                                                            })
                                                            : t
                                                    )
                                                )
                                            }
                                        />
                                        Usar Láminas
                                    </label>

                                    {trabajo.usarLaminas && (
                                        <div className="producto_extra">
                                            <div>
                                                Cantidad
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={trabajo.laminasCantidad}
                                                    onChange={(e) =>
                                                        actualizarTrabajoEncontrado(
                                                            trabajo.partida,
                                                            "laminasCantidad",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                Precio
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={trabajo.laminasPrecio}
                                                    onChange={(e) =>
                                                        actualizarTrabajoEncontrado(
                                                            trabajo.partida,
                                                            "laminasPrecio",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* DOBLECES */}
                                <div style={{ marginTop: 12 }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={trabajo.usarDobleces}
                                            onChange={(e) =>
                                                setTrabajosEncontrados((prev) =>
                                                    prev.map((t) =>
                                                        t.partida === trabajo.partida
                                                            ? recalcularTrabajo({
                                                                ...t,
                                                                usarDobleces: e.target.checked,
                                                                doblecesCantidad: e.target.checked ? t.doblecesCantidad : 0,
                                                                doblecesPrecio: e.target.checked ? t.doblecesPrecio : 0,
                                                            })
                                                            : t
                                                    )
                                                )
                                            }
                                        />
                                        Usar Dobleces
                                    </label>

                                    {trabajo.usarDobleces && (
                                        <div className="producto_extra">
                                            <div>
                                                Cantidad
                                                <input
                                                    type="number"
                                                    value={trabajo.doblecesCantidad}
                                                    onChange={(e) =>
                                                        actualizarTrabajoEncontrado(
                                                            trabajo.partida,
                                                            "doblecesCantidad",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                Precio
                                                <input
                                                    type="number"
                                                    value={trabajo.doblecesPrecio}
                                                    onChange={(e) =>
                                                        actualizarTrabajoEncontrado(
                                                            trabajo.partida,
                                                            "doblecesPrecio",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* CERAMICA */}
                                <div style={{ marginTop: 12 }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={trabajo.usarCeramica}
                                            onChange={(e) =>
                                                setTrabajosEncontrados((prev) =>
                                                    prev.map((t) =>
                                                        t.partida === trabajo.partida
                                                            ? recalcularTrabajo({
                                                                ...t,
                                                                usarCeramica: e.target.checked,
                                                                ceramicaPorcentaje: e.target.checked
                                                                    ? (t.ceramicaPorcentaje || 50)
                                                                    : 0,
                                                            })
                                                            : t
                                                    )
                                                )
                                            }
                                        />
                                        Usar Cerámica
                                    </label>

                                    {trabajo.usarCeramica && (
                                        <div className="producto_extra">
                                            <div>
                                                Porcentaje
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={trabajo.ceramicaPorcentaje}
                                                    onChange={(e) =>
                                                        actualizarTrabajoEncontrado(
                                                            trabajo.partida,
                                                            "ceramicaPorcentaje",
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>%</div>
                                        </div>
                                    )}
                                </div>

                                <hr />

                                <p><strong>Precio base:</strong> {formatearMoneda(trabajo.precioBase)}</p>
                                <p><strong>Barrenos:</strong> {formatearMoneda(trabajo.pagoBarrenos)}</p>
                                <p><strong>Láminas:</strong> {trabajo.usarLaminas ? "Sí" : "No"} {formatearMoneda(trabajo.pagoLaminas)}</p>
                                <p><strong>Dobleces:</strong> {trabajo.usarDobleces ? "Sí" : "No"} {formatearMoneda(trabajo.pagoDobleces)}</p>
                                <p><strong>440V:</strong> {formatearMoneda(trabajo.pago440)}</p>
                                <p><strong>Cerámica:</strong> {trabajo.usarCeramica ? "Sí" : "No"} {formatearMoneda(trabajo.pagoCeramica)}</p>

                                <p>
                                    <strong>Fórmula:</strong>{" "}
                                    {trabajo.cantidad} * (
                                    {formatearMoneda(trabajo.precioBase)} +{" "}
                                    {formatearMoneda(trabajo.pagoBarrenos)} +{" "}
                                    {formatearMoneda(trabajo.pagoLaminas)} +{" "}
                                    {formatearMoneda(trabajo.pagoDobleces)} +{" "}
                                    {formatearMoneda(trabajo.pago440)} +{" "}
                                    {formatearMoneda(trabajo.pagoCeramica)}
                                    )
                                </p>

                                <p>
                                    <strong>Desarrollo:</strong>{" "}
                                    {trabajo.cantidad} * {formatearMoneda(trabajo.precioUnitario)}
                                </p>

                                <p>
                                    <strong>Total:</strong> {formatearMoneda(trabajo.total)}
                                </p>

                                <button
                                    className="btn btn-green"
                                    onClick={() => agregarAlTicket(trabajo)}
                                >
                                    Agregar Folio
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* DERECHA */}
            <div className="resumen-cotizador">
                <h2>🛒 Ticket de pago</h2>
                <h3>Bandas agregadas</h3>

                {ticketPago.length === 0 ? (
                    <p>No hay partidas agregadas.</p>
                ) : (
                    <>
                            {ticketPago.map((item, index) => (
                                <div
                                    key={`${item.otKey}-${item.partida}-${index}`}
                                    style={{ marginBottom: 12 }}
                                >
                                    <div>
                                        <b>{item.otLabel}</b> - {item.partida}
                                    </div>
                                    <div>{item.descripcion}</div>
                                    <div>{formatearMoneda(item.total)}</div>

                                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                        <button
                                            onClick={() => editarDelTicket(item)}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            className="btn btn-delete"
                                            onClick={() => quitarDelTicket(item.otKey, item.partida)}
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </div>
                            ))}

                        <hr />

                        <h3>Total: {formatearMoneda(totalTicket)}</h3>

                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginTop: 10,
                                marginBottom: 16,
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={marcarComoPagado}
                                onChange={(e) => setMarcarComoPagado(e.target.checked)}
                            />
                            Pagado
                        </label>
                    </>
                )}

                <div>
                    <button
                        className="btn btn-green"
                        onClick={guardarPago}
                        disabled={guardando}
                    >
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                </div>

                <div style={{ marginTop: 10 }}>
                    <button className="btn btn-red" onClick={borrarTodo}>
                        Borrar Todo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pago_Banda;