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
import {
  obtenerSiguienteCotizacion,
  obtenerSiguienteEnvio,
} from "./firebase/consecutivos";
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
    "tubular" | "banda" | "CartuchoB" | "CartuchoA" | "Resorte"
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
  const navigate = useNavigate();
  const location = useLocation();
  const DRAFT_KEY = "cotizador_historial";
  // 🔹 Buscar clientes
  const buscarClientes = async () => {
    const db = getDatabase(app);
    const snapshot = await get(ref(db, "Clientes"));

    if (!snapshot.exists()) return;

    const data = snapshot.val();

    const lista: Cliente[] = Object.keys(data).map((id) => ({
      id,
      nombre: data[id].nombre || "",
      razonSocial: data[id].razonSocial || "",
      rfc: data[id].rfc || "",
      telefono: data[id].telefono || "",

      // 🔥 DIRECCIÓN (LO QUE TE FALTABA)
      direccion: data[id].direccion || "",
      numeroExterior: data[id].numeroExterior || "",
      numeroInterior: data[id].numeroInterior || "",
      colonia: data[id].colonia || "",
      municipio: data[id].municipio || "",
      estado: data[id].estado || "",
      cp: data[id].cp || "",

      credito: data[id].credito || {
        activo: false,
        dias: 0,
        limite: 0,
      },

      descuento: data[id].descuentoDefault ?? 0,

      busqueda:
        data[id].busqueda ||
        `${data[id].nombre || ""} ${data[id].razonSocial || ""}`.toUpperCase(),
    }));

    // 🔍 FILTRO POR TEXTO
    const texto = buscar.toLowerCase();

    const filtrados = lista.filter((c: any) =>
      c.busqueda?.toLowerCase().includes(texto)
    );

    setClientes(filtrados);
  };

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
    nuevo: "tubular" | "banda" | "CartuchoB" | "CartuchoA" | "Resorte"
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

      const trabajosObj = cotizaciones.reduce((acc, item, index) => {
        const numeroPartida = index + 1;
        const partidaLabel = `${claveOt}.${numeroPartida}`; // visible
        const partidaKey = `${claveOt}_${numeroPartida}`; // clave firebase

        acc[partidaKey] = {
          partida: partidaLabel,
          tipo: item.tipo,
          descripcion: item.descripcion,
          total: item.total,
          datos: item.datos,
        };

        return acc;
      }, {} as Record<string, any>);

      const ordenTrabajo = {
        ot: nuevoOt,
        otLabel: `OT-${nuevoOt}`,
        factura: factura || null,
        fecha: fecha,
        clienteId: cliente?.id || null,
        clienteSnapshot: cliente || { nombre: "PUBLICO GENERAL" },
        credito: cliente?.credito?.activo || false,

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
      };

      await set(ref(db, `ordenes_trabajo/${claveOt}`), ordenTrabajo);

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
            <input
              type="number"
              min={0}
              value={factura === "" ? "" : factura}
              onChange={(e) => setFactura(Number(e.target.value))}
              className="input-factura"
            />
          </div>
        </div>

        {/* BUSCADOR */}
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Buscar cliente"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={buscarClientes}>Buscar</button>

          {!cliente && (
            <button
              onClick={() =>
                setCliente({
                  id: "TEMP",
                  nombre: "PUBLICO GENERAL",
                  descuento: 0,
                  credito: {
                    activo: false,
                    dias: 0,
                    limite: 0,
                  },
                })
              }
            >
              Cliente temporal
            </button>
          )}
        </div>

        {/* RESULTADOS */}
        {clientes.length > 0 && !cliente && (
          <table>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre || c.razonSocial || "SIN NOMBRE"}</td>
                  <td>
                    <button
                      onClick={() => {
                        setCliente(c);
                        setClientes([]);
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
                  <div>
                    <b>Calle:</b> {cliente.direccion || "--"}
                  </div>

                  <div>
                    <b>Número:</b>{" "}
                    {(cliente.numeroExterior || "") +
                      (cliente.numeroInterior
                        ? ` Int ${cliente.numeroInterior}`
                        : "") || "--"}
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
                </div>
              </div>
            )}

            {/* DIRECCIÓN SI TIENE ENVÍO (placeholder) */}
            {/* luego aquí puedes mostrar dirección */}
          </div>
        )}

        {/* MENU */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => cambiarCotizador("tubular")}>Tubular</button>
          <button onClick={() => cambiarCotizador("banda")}>Banda</button>
          <button onClick={() => cambiarCotizador("CartuchoB")}>
            Cartucho Baja
          </button>
          <button onClick={() => cambiarCotizador("CartuchoA")}>
            Cartucho Alta
          </button>
          <button onClick={() => cambiarCotizador("Resorte")}>Resorte</button>
        </div>

        {/* AREA */}
        {cotizadorActivo === "tubular" && (
          <Tubular
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
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
          />
        )}

        {cotizadorActivo === "CartuchoA" && (
          <CartuchoAlta
            data={itemEditando || undefined}
            onGuardar={guardarCotizacion}
            setDirty={setFormDirty}
          />
        )}

        {cotizadorActivo === "Resorte" && (
          <Resorte
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
            <div>${c.total.toFixed(2)}</div>

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
          <b>Subtotal:</b> ${totalGeneral.toFixed(2)}
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
          <b>Total con IVA (16%):</b> ${totalConIva.toFixed(2)}
        </div>
        <br />
        {/* FINALIZAR */}
        {cotizaciones.length > 0 && (
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
