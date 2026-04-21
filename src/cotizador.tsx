// src/cotizador.tsx
import React, { useState, useEffect } from "react";
//firebase
import { getDatabase, ref, get, set } from "firebase/database";
import { app, auth, db } from "./firebase/config";
// 🔹 Componentes
import { useLocation, useNavigate } from "react-router-dom";
import Tubular from "./cotizadores/Tubular";
import Banda from "./cotizadores/Banda";
import CartuchoBaja from "./cotizadores/cartuchobaja";
import CartuchoAlta from "./cotizadores/cartuchoalta";
import Resorte from "./cotizadores/Resorte";
import Termopar from "./cotizadores/termopares";
import Cuarzo from "./cotizadores/cuarzo";
import { formatearMoneda } from "./funciones/formato_moneda";
import {obtenerSiguienteCotizacion,obtenerSiguienteEnvio} from "./firebase/consecutivos";

// 🔹 Tipos
interface Cliente {
  id?: string;
  nombre?: string;
  razonSocial?: string;
  rfc?: string;
  direccion?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  empresa?: string;
  giro?: string;
  regimenFiscal?: string;
  notas?: string;
  descuentoDefault?: number;
  descuento?: number;
  busqueda?: string;

  credito?: {
    activo: boolean;
    limite?: number;
    dias?: number;
  };
}

export interface ItemCotizado {
  id: string;
  tipo: string;
  descripcion: string;
  total: number;
  datos: any;
  partida?: string;
}

interface AsesorSnapshot {
    id?: string;
    uid?: string;
    nombre?: string;
    username?: string;
    area?: string;
    puesto?: string;
}

const Cotizador = () => {
  // 🔹 Estado general
  const [ot, setOt] = useState("");

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [asesor, setAsesor] = useState<AsesorSnapshot | null>(null);
  const [buscar, setBuscar] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [envio, setEnvio] = useState<"si" | "no">("no");
  const [itemEditando, setItemEditando] = useState<ItemCotizado | null>(null); // para el ticket
  const [cotizadorActivo, setCotizadorActivo] = useState<
      "tubular" | "banda" | "CartuchoB" | "CartuchoA" | "Resorte" | "termopar" | "cuarzo"
  >("tubular");
  const [factura, setFactura] = useState<number | "">("");
  const [fecha, setFecha] = useState("");
  const [cotizaciones, setCotizaciones] = useState<ItemCotizado[]>([]);
  const [modoEdicionOT, setModoEdicionOT] = useState(false);
  const [firebaseKeyOT, setFirebaseKeyOT] = useState("");
  const [formDirty, setFormDirty] = useState(false);
  const [envioFolioOT, setEnvioFolioOT] = useState("");
  const [envioGeneradoOT, setEnvioGeneradoOT] = useState(false);
    const [envioEnviadoOT, setEnvioEnviadoOT] = useState(false);
    //estas dos variables son para controlar el cambio de GestionOT, en TipoDocumento y pago, para que al regresar al cotizador se mantenga el estado del cliente seleccionado y las cotizaciones agregadas, incluso si se editó el cliente en GestionOT, se actualice la información del cliente en el cotizador al regresar.
    const [tipoDocumento, setTipoDocumento] = useState<"cotizacion" | "orden_trabajo">("cotizacion");
    const [pagado, setPagado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const DRAFT_KEY = "cotizador_historial";
  // 🔹 Buscar clientes
    const buscarClientes = async (texto: string) => {
        const snapshot = await get(ref(db, "Clientes"));

        if (!snapshot.exists()) {
            setClientes([]);
            return;
        }

        const data = snapshot.val();

        const lista: Cliente[] = Object.keys(data).map((id) => ({
            id,
            nombre: data[id].nombre || "",
            razonSocial: data[id].razonSocial || "",
            rfc: data[id].rfc || "",
            telefono: data[id].telefono || "",
            email: data[id].email || "",

            direccion: data[id].direccion || "",
            numeroExterior: data[id].numeroExterior || "",
            numeroInterior: data[id].numeroInterior || "",
            colonia: data[id].colonia || "",
            municipio: data[id].municipio || "",
            estado: data[id].estado || "",
            cp: data[id].cp || "",

            empresa: data[id].empresa || "",
            giro: data[id].giro || "",
            regimenFiscal: data[id].regimenFiscal || "",
            notas: data[id].notas || "",

            credito: data[id].credito || {
                activo: false,
                dias: 0,
                limite: 0,
            },

            descuento: data[id].descuentoDefault ?? 0,

            busqueda:
                data[id].busqueda ||
                `${data[id].nombre || ""} ${data[id].razonSocial || ""} ${data[id].rfc || ""}`.toUpperCase(),
        }));

        const textoBusqueda = texto.toLowerCase().trim();

        const filtrados = lista.filter((c) => {
            const nombre = (c.nombre || "").toLowerCase();
            const razon = (c.razonSocial || "").toLowerCase();
            const rfc = (c.rfc || "").toLowerCase();
            const busqueda = (c.busqueda || "").toLowerCase();

            return (
                nombre.includes(textoBusqueda) ||
                razon.includes(textoBusqueda) ||
                rfc.includes(textoBusqueda) ||
                busqueda.includes(textoBusqueda)
            );
        });

        setClientes(filtrados);
    };
    useEffect(() => {
        if (cliente) return;

        if (buscar.trim() === "") {
            setClientes([]);
            return;
        }

        const timeout = setTimeout(() => {
            buscarClientes(buscar);
        }, 300);

        return () => clearTimeout(timeout);
    }, [buscar, cliente]);

  // 🔹 Guardar cotización
  const guardarCotizacion = (item: ItemCotizado) => {
    setCotizaciones((prev) => {
      const index = prev.findIndex((c) => c.id === item.id);

      // EDITAR
      if (index >= 0) {
        const copia = [...prev];
        copia[index] = {
          ...item,
          partida: prev[index].partida,
        };
        return copia;
      }

      // NUEVO
      const numeroPartida =
        prev.length > 0
          ? Math.max(
              ...prev.map((p) => Number(p.partida?.split(".")[1] || 0))
            ) + 1
          : 1;

      return [
        ...prev,
        {
          ...item,
          partida: `TEMP.${numeroPartida}`,
        },
      ];
    });

    setItemEditando(null);
    setFormDirty(false);
  };

  // 🔥 Cambio con confirmación
  const cambiarCotizador = (
      nuevo: "tubular" | "banda" | "CartuchoB" | "CartuchoA" | "Resorte" | "termopar" |"cuarzo"
  ) => {
    setItemEditando(null); // 🔥 clave

    if (formDirty) {
      const confirmar = window.confirm(
        "¿Deseas guardar la cotización actual antes de cambiar?"
      );

      if (confirmar) {
        alert("Da click en ACTUALIZAR antes de cambiar");
        return;
      }
    }

    setCotizadorActivo(nuevo);
  };
    //-----------------CARGAR EMPLEADO QUE HIZO OT------------------------------>>
    useEffect(() => {
        const cargarAsesorActual = async () => {
            try {
                const usuario = auth.currentUser;

                if (!usuario?.uid) {
                    setAsesor(null);
                    return;
                }

                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) {
                    setAsesor(null);
                    return;
                }

                const empleados = snapshot.val();
                let encontrado: AsesorSnapshot | null = null;

                for (const key in empleados) {
                    const emp = empleados[key];

                    if (emp?.uid === usuario.uid) {
                        encontrado = {
                            id: emp.id || key,
                            uid: emp.uid || usuario.uid,
                            nombre: emp.nombre || "",
                            username: emp.username || "",
                            area: emp.area || "",
                            puesto: emp.puesto || "",
                        };
                        break;
                    }
                }

                setAsesor(encontrado);
            } catch (error) {
                console.error("Error cargando asesor actual:", error);
                setAsesor(null);
            }
        };

        cargarAsesorActual();
    }, []);
  // 🔹 Subtotal
  const totalGeneral = cotizaciones.reduce((acc, c) => acc + c.total, 0);
  // 🔹 Descuento
  const descuentoCliente = cliente?.descuento ?? 0; // 0 = sin descuento
  const totalConDescuento = totalGeneral * (1 - descuentoCliente);

  // 🔹 IVA
  const iva = 0.16;
  const totalConIva = totalConDescuento * (1 + iva);

  // 🔥 FINALIZAR OT
    const finalizarOT = async () => {
        if (!cotizaciones.length) {
            alert("No hay cotizaciones");
            return;
        }

        if (!cliente) {
            alert("Debes seleccionar o Registrar un cliente antes de finalizar la OT");
            return;
        }

        try {
            const db = getDatabase(app);

            let nuevoOt = ot;
            let claveOt = firebaseKeyOT;
            let envioFolioReservado = "";

            // SI NO ESTÁS EDITANDO, CREA NUEVA OT
            if (!modoEdicionOT) {
                nuevoOt = await obtenerSiguienteCotizacion(); // ej. 00025
                claveOt = `ot${nuevoOt}`; // ej. ot00025

                if (envio === "si") {
                    envioFolioReservado = await obtenerSiguienteEnvio();
                }
            }

            if (modoEdicionOT && !envioFolioReservado) {
                envioFolioReservado = envioFolioOT || "";
            }

            // 🔥 Si estás editando, intenta conservar trabajos ya existentes
            const trabajosActuales =
                modoEdicionOT && (location.state as any)?.otData?.trabajos
                    ? (location.state as any).otData.trabajos
                    : {};

            const trabajosObj = cotizaciones.reduce((acc, item, index) => {
                const numeroPartida = index + 1;
                const partidaLabel = `${claveOt}.${numeroPartida}`; // visible
                const partidaKey = `${claveOt}_${numeroPartida}`; // clave firebase

                const trabajoPrevio = trabajosActuales?.[partidaKey] || {};

                acc[partidaKey] = {
                    ...trabajoPrevio,
                    partida: partidaLabel,
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    total: item.total,
                    datos: item.datos,
                    estadoProduccion:
                        trabajoPrevio.estadoProduccion ||
                        (tipoDocumento === "orden_trabajo" ? "en_fila" : ""),
                };

                return acc;
            }, {} as Record<string, any>);

            const ordenTrabajo = {
                ot: nuevoOt,
                otLabel: `OT-${nuevoOt}`,
                factura: factura || null,
                fecha: fecha,

                clienteId: cliente?.id && cliente.id !== "TEMP" ? cliente.id : null,
                clienteSnapshot: cliente || { nombre: "PUBLICO GENERAL" },
                credito:
                    cliente?.id !== "TEMP" ? cliente?.credito?.activo || false : false,

                asesorId: asesor?.id || null,
                asesorSnapshot: asesor
                    ? {
                        id: asesor.id || null,
                        uid: asesor.uid || null,
                        nombre: asesor.nombre || "",
                        username: asesor.username || "",
                        area: asesor.area || "",
                        puesto: asesor.puesto || "",
                    }
                    : null,

                envio: envio === "si",
                envioFolio: envio === "si" ? envioFolioReservado : "",
                envioGenerado: modoEdicionOT ? envioGeneradoOT : false,
                envioEnviado: modoEdicionOT ? envioEnviadoOT : false,

                subtotal: totalGeneral,
                descuentoCliente: descuentoCliente,
                totalConDescuento: totalConDescuento,
                totalConIva: totalConIva,
                trabajos: trabajosObj,
                tipoDocumento,
                pagado,

                estadoGeneral:
                    modoEdicionOT && (location.state as any)?.otData?.estadoGeneral
                        ? (location.state as any).otData.estadoGeneral
                        : "cotizacion",
            };

            const otRef = ref(db, `ordenes_trabajo/${claveOt}`);

            if (!modoEdicionOT) {
                await set(otRef, ordenTrabajo);
            } else {
                const snapshotActual = await get(otRef);
                const otActual = snapshotActual.exists() ? snapshotActual.val() : {};

                await set(otRef, {
                    ...otActual,
                    ...ordenTrabajo,

                    // 🔥 conservar campos de producción / flujo general
                    taller: otActual.taller ?? false,
                    Entrada_Almacen: otActual.Entrada_Almacen ?? "",
                    estadoGeneral:
                        otActual.estadoGeneral ?? ordenTrabajo.estadoGeneral ?? "cotizacion",
                    envioGenerado: otActual.envioGenerado ?? ordenTrabajo.envioGenerado ?? false,
                    envioEnviado: otActual.envioEnviado ?? ordenTrabajo.envioEnviado ?? false,
                    envioFolio: ordenTrabajo.envio
                        ? (otActual.envioFolio || ordenTrabajo.envioFolio || "")
                        : "",
                });
            }

            sessionStorage.removeItem(DRAFT_KEY);

            alert(
                modoEdicionOT
                    ? `OT actualizada: OT-${nuevoOt}`
                    : `OT guardada: OT-${nuevoOt}`
            );

            // limpiar
            setCotizaciones([]);
            setCliente(null);
            setBuscar("");
            setCotizadorActivo("tubular");
            setFormDirty(false);
            setItemEditando(null);
            setOt("");
            setFactura("");
            setEnvio("no");

            setModoEdicionOT(false);
            setFirebaseKeyOT("");

            setEnvioFolioOT("");
            setEnvioGeneradoOT(false);
            setEnvioEnviadoOT(false);

            navigate("/consultaot", {
                state: {
                    abrirOT: true,
                    firebaseKeyOT: claveOt,
                },
            });
        } catch (error) {
            console.error("Error al finalizar OT:", error);
            alert("Error al guardar la OT");
        }
    };

  //Eliminar Item de ticket
  const eliminarItem = (id: string) => {
    setCotizaciones((prev) => prev.filter((c) => c.id !== id));

    // 🔥 si estabas editando ese mismo, limpiar
    if (itemEditando?.id === id) {
      setItemEditando(null);
    }
  };

  const borrarOTActual = () => {
    const confirmar = window.confirm(
      "¿Seguro que deseas borrar toda la orden de trabajo actual?"
    );

      if (!confirmar) return;

    sessionStorage.removeItem(DRAFT_KEY);
    setCotizaciones([]);
    setCliente(null);
    setBuscar("");
    setEnvio("no");
    setItemEditando(null);
    setCotizadorActivo("tubular");
    setFormDirty(false);
    setOt("");
  };
  //------------------------------------------------------------------------------------------------------------>>
  useEffect(() => {
    const hoy = new Date();

    const dia = String(hoy.getDate()).padStart(2, "0");
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const año = hoy.getFullYear();

    setFecha(`${dia}/${mes}/${año}`);
  }, []);

  //---------------------------Recibir dadots de GestionOT------------------------------------------>>

  useEffect(() => {
    const state = location.state as any;

    if (!state?.modoEditarOT || !state?.otData) return;

    const otData = state.otData;

    setOt(otData.ot || "");
    setFactura(otData.factura ?? "");
    setFecha(otData.fecha || "");
    setEnvio(otData.envio ? "si" : "no");
    setEnvioFolioOT(otData.envioFolio || "");
    setEnvioGeneradoOT(otData.envioGenerado || false);
      setEnvioEnviadoOT(otData.envioEnviado || false);

    setTipoDocumento(otData.tipoDocumento === "orden_trabajo" ? "orden_trabajo" : "cotizacion");
    setPagado(!!otData.pagado);

    setModoEdicionOT(true);
    setFirebaseKeyOT(otData.firebaseKey || "");

    if (otData.clienteSnapshot) {
      setCliente({
        id: otData.clienteId || "TEMP",
        ...otData.clienteSnapshot,
        descuento: otData.descuentoCliente ?? 0,
        credito: {
          activo: otData.credito ?? false,
        },
      });
    }

    const trabajosArray = otData.trabajos ? Object.values(otData.trabajos) : [];

    const cotizacionesCargadas = trabajosArray.map((t: any, index: number) => ({
      id: `${otData.firebaseKey || otData.ot || "ot"}_${index + 1}`,
      tipo: t.tipo,
      descripcion: t.descripcion,
      total: t.total,
      datos: t.datos,
      partida: t.partida,
    }));

    setCotizaciones(cotizacionesCargadas);
    setItemEditando(null);
    setFormDirty(false);
    setCotizadorActivo("tubular");
  }, [location.state]);


    //---------------------------GUARDAR BORRADOR DE CLIENTE CUANDO USEMOS EL COTIZADOR------------------------------------------>>
    const guardarBorradorCotizador = () => {
        const draft = {
            clienteId: cliente?.id || null,
            clienteSnapshot: cliente || null,

            ot,
            factura,
            fecha,
            envio,
            cotizaciones,
            cotizadorActivo,
            itemEditando,
            modoEdicionOT,
            firebaseKeyOT,
            formDirty,
            envioFolioOT,
            envioGeneradoOT,
            envioEnviadoOT,
        };

        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    };

    // RESTAURAR SESION 
    const restaurarBorradorCotizador = async (clienteActualizadoId?: string) => {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;

        try {
            const draft = JSON.parse(raw);

            setOt(draft.ot || "");
            setFactura(draft.factura ?? "");
            setFecha(draft.fecha || "");
            setEnvio(draft.envio || "no");
            setCotizaciones(draft.cotizaciones || []);
            setCotizadorActivo(draft.cotizadorActivo || "tubular");
            setItemEditando(draft.itemEditando || null);
            setModoEdicionOT(draft.modoEdicionOT || false);
            setFirebaseKeyOT(draft.firebaseKeyOT || "");
            setFormDirty(draft.formDirty || false);
            setEnvioFolioOT(draft.envioFolioOT || "");
            setEnvioGeneradoOT(draft.envioGeneradoOT || false);
            setEnvioEnviadoOT(draft.envioEnviadoOT || false);

            const idFinal = clienteActualizadoId || draft.clienteId;

            if (idFinal && idFinal !== "TEMP") {
                const snapshot = await get(ref(db, `Clientes/${idFinal}`));

                if (snapshot.exists()) {
                    const data = snapshot.val();

                    setCliente({
                        id: idFinal,
                        nombre: data.nombre || "",
                        razonSocial: data.razonSocial || "",
                        rfc: data.rfc || "",
                        direccion: data.direccion || "",
                        numeroExterior: data.numeroExterior || "",
                        numeroInterior: data.numeroInterior || "",
                        colonia: data.colonia || "",
                        municipio: data.municipio || "",
                        estado: data.estado || "",
                        cp: data.cp || "",
                        telefono: data.telefono || "",
                        email: data.email || "",
                        empresa: data.empresa || "",
                        giro: data.giro || "",
                        regimenFiscal: data.regimenFiscal || "",
                        notas: data.notas || "",
                        descuento: data.descuentoDefault ?? 0,
                        credito: data.credito || {
                            activo: false,
                            limite: 0,
                            dias: 0,
                        },
                        busqueda:
                            data.busqueda ||
                            `${data.nombre || ""} ${data.razonSocial || ""}`.toUpperCase(),
                    });
                } else {
                    setCliente(null);
                }
            } else {
                if (draft.clienteSnapshot?.id === "TEMP") {
                    setCliente({
                        ...draft.clienteSnapshot,
                        descuento: 0,
                        credito: undefined,
                    });
                } else {
                    setCliente(draft.clienteSnapshot || null);
                }
            }
        } catch (error) {
            console.error("Error restaurando borrador:", error);
        }
    };

    useEffect(() => {
        const state = location.state as any;

        if (state?.modo === "regresoDesdeEditarCliente") {
            restaurarBorradorCotizador(state.clienteActualizadoId);
        }
    }, [location.state]);

    //CLIENTE TEMPORAL
    const esClienteTemporal = cliente?.id === "TEMP";
  //--------------------HTML-------------------------------------------------------------------------->>
    return (
        <div className="cotizador-layout">
      {/* IZQUIERDA */}
      <div style={{ flex: 3 }}>
        <h1>Ordenes de Trabajo</h1>

        <div className="encabezado-cotizador">
          {/* OT - izquierda */}
          <div className="encabezado-item">
            <b>OT: </b>
            <span>{ot || "SIN ASIGNAR"}</span>
          </div>

          {/* Fecha - centro */}
          <div className="encabezado-item encabezado-centro">
            <b>Fecha: </b>
            <span>{fecha}</span>
          </div>

                    {/* Factura - derecha */}
                    
                    <div className="encabezado-item encabezado-factura">
                        <b>Factura: </b>
                        <span className="input-factura">
                            {factura === "" ? "--" : factura}
                        </span>
                    </div>
        </div>
        <h2>Cliente</h2>
                {/* BUSCADOR */}
                {!cliente && (
                    <div className="search-bar">
                        <input
                            className="search-input"
                            placeholder="Buscar nombre, razón social o RFC"
                            value={buscar}
                            onChange={(e) => setBuscar(e.target.value)}
                            style={{ flex: 1 }}
                        />

                        <button
                            onClick={() =>
                                setCliente({
                                    id: "TEMP",
                                    nombre: "",
                                    razonSocial: "",
                                    rfc: "",
                                    telefono: "",
                                    email: "",
                                    direccion: "",
                                    numeroExterior: "",
                                    numeroInterior: "",
                                    colonia: "",
                                    municipio: "",
                                    estado: "",
                                    cp: "",
                                })
                            }
                        >
                            Cliente temporal
                        </button>
                    </div>
                )}

                {/* RESULTADOS */}
                {!cliente && buscar.trim() !== "" && clientes.length > 0 && (
                    <div className="clientes-resultados-scroll">
                        <table className="caja-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Razón Social</th>
                                    <th>RFC</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clientes.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.nombre || "--"}</td>
                                        <td>{c.razonSocial || "--"}</td>
                                        <td>{c.rfc || "--"}</td>
                                        <td>
                                            <button
                                                onClick={() => {
                                                    setCliente(c);
                                                    setClientes([]);
                                                    setBuscar("");
                                                    setEnvio("no");
                                                }}
                                            >
                                                Seleccionar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* SIN RESULTADOS */}
                {!cliente && buscar.trim() !== "" && clientes.length === 0 && (
                    <div style={{ marginTop: 10 }}>
                        No se encontraron clientes.
                    </div>
                )}

        {/* CLIENTE */}
        {cliente && (
          <div
            style={{
              marginBottom: 20,
              border: "1px solid #ccc",
              borderRadius: 8,
              padding: 15,
              position: "relative",
              background: "#f9f9f9",
            }}
          >
            {/* ❌ BOTÓN ARRIBA DERECHA */}
            <button
              onClick={() => {
                setCliente(null);
                setClientes([]);
                setBuscar("");
                setEnvio("no");
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "#ff4d4f",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 25,
                height: 25,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              ✕
            </button>

            {/* GRID DE CLIENTE */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {esClienteTemporal ? (
                    <>
                        <div style={{ minWidth: 220 }}>
                            <b>Nombre:</b>
                            <input
                                type="text"
                                value={cliente.nombre || ""}
                                onChange={(e) =>
                                    setCliente((prev) =>
                                        prev ? { ...prev, nombre: e.target.value } : prev
                                    )
                                }
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <b>Razón social:</b>
                            <input
                                type="text"
                                value={cliente.razonSocial || ""}
                                onChange={(e) =>
                                    setCliente((prev) =>
                                        prev ? { ...prev, razonSocial: e.target.value } : prev
                                    )
                                }
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <b>Teléfono:</b>
                            <input
                                type="text"
                                value={cliente.telefono || ""}
                                onChange={(e) =>
                                    setCliente((prev) =>
                                        prev ? { ...prev, telefono: e.target.value } : prev
                                    )
                                }
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <b>RFC:</b>
                            <input
                                type="text"
                                value={cliente.rfc || ""}
                                onChange={(e) =>
                                    setCliente((prev) =>
                                        prev ? { ...prev, rfc: e.target.value } : prev
                                    )
                                }
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div style={{ minWidth: 220 }}>
                            <b>Email:</b>
                            <input
                                type="text"
                                value={cliente.email || ""}
                                onChange={(e) =>
                                    setCliente((prev) =>
                                        prev ? { ...prev, email: e.target.value } : prev
                                    )
                                }
                                style={{ width: "100%" }}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <b>Nombre:</b>{" "}
                            {cliente.nombre || cliente.razonSocial || "SIN NOMBRE"}
                        </div>
                        <div>
                            <b>Teléfono:</b> {cliente.telefono || "--"}
                        </div>
                        <div>
                            <b>Descuento:</b>{" "}
                            {cliente.descuento
                                ? `${(cliente.descuento * 100).toFixed(0)}%`
                                : "0%"}
                        </div>
                        <div>
                            <b>Crédito:</b> {cliente.credito?.activo ? "ACTIVO" : "NO"}
                                        </div>

                                        <div style={{ marginTop: 10 }}>
                                            <button
                                                onClick={() => {
                                                    if (!cliente?.id || cliente.id === "TEMP") {
                                                        alert("Este cliente temporal no se puede editar.");
                                                        return;
                                                    }

                                                    guardarBorradorCotizador();

                                                    navigate("/clientes", {
                                                        state: {
                                                            modo: "editarDesdeCotizador",
                                                            clienteId: cliente.id,
                                                            volverA: "/cotizador",
                                                        },
                                                    });
                                                }}
                                            >
                                                Editar cliente
                                            </button>
                                        </div>
                    </>
                )}
            </div>

            {/* ENVÍO */}
            <div style={{ marginTop: 10 }}>
              <b>Envío:</b>{" "}
              <select
                value={envio}
                onChange={(e) => setEnvio(e.target.value as "si" | "no")}
              >
                <option value="no">No</option>
                <option value="si">Sí</option>
              </select>
            </div>
            {envio === "si" &&
              (!cliente.direccion || !cliente.colonia || !cliente.cp) && (
                <div style={{ color: "red", marginTop: 5 }}>
                  ⚠️ Dirección incompleta
                </div>
                )}
            {/* GRID DE ENVIOS */}
            {envio === "si" && (
                <div
                    style={{
                        marginTop: 10,
                        padding: 10,
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        background: "#fff",
                    }}
                >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {esClienteTemporal ? (
                            <>
                                <div style={{ minWidth: 220 }}>
                                    <b>Calle:</b>
                                    <input
                                        type="text"
                                        value={cliente.direccion || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, direccion: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 120 }}>
                                    <b>Número exterior:</b>
                                    <input
                                        type="text"
                                        value={cliente.numeroExterior || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, numeroExterior: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 120 }}>
                                    <b>Número interior:</b>
                                    <input
                                        type="text"
                                        value={cliente.numeroInterior || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, numeroInterior: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 180 }}>
                                    <b>Colonia:</b>
                                    <input
                                        type="text"
                                        value={cliente.colonia || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, colonia: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 120 }}>
                                    <b>CP:</b>
                                    <input
                                        type="text"
                                        value={cliente.cp || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, cp: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 180 }}>
                                    <b>Municipio:</b>
                                    <input
                                        type="text"
                                        value={cliente.municipio || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, municipio: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>

                                <div style={{ minWidth: 180 }}>
                                    <b>Estado:</b>
                                    <input
                                        type="text"
                                        value={cliente.estado || ""}
                                        onChange={(e) =>
                                            setCliente((prev) =>
                                                prev ? { ...prev, estado: e.target.value } : prev
                                            )
                                        }
                                        style={{ width: "100%" }}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <b>Calle:</b> {cliente.direccion || "--"}
                                </div>

                                <div>
                                    <b>Número:</b>{" "}
                                    {(cliente.numeroExterior || "") +
                                        (cliente.numeroInterior ? ` Int ${cliente.numeroInterior}` : "") ||
                                        "--"}
                                </div>

                                <div>
                                    <b>Colonia:</b> {cliente.colonia || "--"}
                                </div>

                                <div>
                                    <b>CP:</b> {cliente.cp || "--"}
                                </div>

                                <div>
                                    <b>Municipio:</b> {cliente.municipio || "--"}
                                </div>

                                <div>
                                    <b>Estado:</b> {cliente.estado || "--"}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* DIRECCIÓN SI TIENE ENVÍO (placeholder) */}
            {/* luego aquí puedes mostrar dirección */}
          </div>
        )}

        {/* MENU */}
        <div className="cotizador-tabs">
            <div
                className={`cotizador-tab ${cotizadorActivo === "tubular" ? "active" : ""}`}
                onClick={() => cambiarCotizador("tubular")}
            >
                Tubular
            </div>

            <div
                className={`cotizador-tab ${cotizadorActivo === "banda" ? "active" : ""}`}
                onClick={() => cambiarCotizador("banda")}
            >
                Banda
            </div>

            <div
                className={`cotizador-tab ${cotizadorActivo === "CartuchoB" ? "active" : ""}`}
                onClick={() => cambiarCotizador("CartuchoB")}
            >
                Cartucho Baja
            </div>

            <div
                className={`cotizador-tab ${cotizadorActivo === "CartuchoA" ? "active" : ""}`}
                onClick={() => cambiarCotizador("CartuchoA")}
            >
                Cartucho Alta
            </div>

            <div
                className={`cotizador-tab ${cotizadorActivo === "Resorte" ? "active" : ""}`}
                onClick={() => cambiarCotizador("Resorte")}
            >
                Resorte
            </div>

            <div
                className={`cotizador-tab ${cotizadorActivo === "termopar" ? "active" : ""}`}
                onClick={() => cambiarCotizador("termopar")}
            >
                Termopar
                    </div>
            <div
                className={`cotizador-tab ${cotizadorActivo === "cuarzo" ? "active" : ""}`}
                onClick={() => cambiarCotizador("cuarzo")}
            >
                Cuarzo
            </div>
        </div>

        {/* AREA */}
        {cotizadorActivo === "tubular" && (
          <Tubular
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
            perfil={asesor || undefined}
          />
        )}

        {cotizadorActivo === "banda" && (
          <Banda
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
          />
        )}
        {cotizadorActivo === "CartuchoB" && (
          <CartuchoBaja
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
            perfil={asesor || undefined}
          />
        )}

        {cotizadorActivo === "CartuchoA" && (
          <CartuchoAlta
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
            perfil={asesor || undefined}
          />
        )}

        {cotizadorActivo === "Resorte" && (
          <Resorte
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
            perfil={asesor || undefined}
          />
         )}
        {cotizadorActivo === "termopar" && (
            <Termopar
                data={itemEditando || undefined}
                onGuardar={guardarCotizacion}
                setDirty={setFormDirty}
                perfil={asesor || undefined}
            />
        )}
        {cotizadorActivo === "cuarzo" && (
            <Cuarzo
                data={itemEditando || undefined}
                onGuardar={guardarCotizacion}
                setDirty={setFormDirty}
            />
        )}
      </div>

      {/* RESUMEN */}
            <div
                className="resumen-cotizador"
      >
        <h2>Resumen</h2>
        <h3>Orden de Trabajo</h3>
        {cotizaciones.map((c, index) => (
          <div key={c.id} style={{ marginBottom: 8 }}>
            <div>
              <b>{ot ? `${ot}.${index + 1}` : `TEMP.${index + 1}`}</b>
            </div>
            <div>{c.descripcion}</div>
                <div>${formatearMoneda(c.total)}</div>

            <button
              onClick={() => {
                setCotizadorActivo(c.tipo as any);
                setItemEditando(c);
              }}
            >
              Editar
            </button>

            <button
              onClick={() => eliminarItem(c.id)}
              style={{
                background: "red",
                color: "white",
                border: "none",
                width: 20,
                height: 20,
                cursor: "pointer",
                fontSize: 10,
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <hr />
        <div>
                    <b>Subtotal:</b> ${formatearMoneda(totalGeneral)}
        </div>
        {cliente && descuentoCliente > 0 && (
          <div>
            <b>Descuento ({(descuentoCliente * 100).toFixed(0)}%):</b> -$
            {(totalGeneral * descuentoCliente).toFixed(2)}
          </div>
        )}

        {/* 🔥 CRÉDITO */}
        {cliente?.credito?.activo && (
          <div style={{ color: "blue" }}>
            <b>CRÉDITO</b>
          </div>
        )}
        <div>
                    <b>Total con IVA (16%):</b> ${formatearMoneda(totalConIva)}
        </div>
        <br />
        {/* FINALIZAR */}
                {cotizaciones.length > 0 && cliente &&(
          <div>
            <button onClick={finalizarOT}>
              {modoEdicionOT ? "ACTUALIZAR OT" : "FINALIZAR OT"}
            </button>
          </div>
        )}

        {cotizaciones.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <button onClick={borrarOTActual}>BORRAR OT</button>
          </div>
        )}
        {/* -------------------------------------------------------------FIN DERECHA */}
      </div>
    </div>
  );
};

export default Cotizador;
