// src/Envios.tsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  getDatabase,
  ref,
  get,
  runTransaction,
  set,
  remove,
  onValue,
  query,
  equalTo,
  orderByChild,
  push,
} from "firebase/database";
import { app } from "../firebase/config";
import { generarPDFEnvio } from "../plantillas/plantillaEnvio";
//import { generarPDFEnvioMitad, EnvioData } from "./plantillaEnvio";

interface Cliente {
  id?: string;
  nombre?: string;
  razonSocial?: string;
  rfc?: string;
  telefono?: string;
  direccion?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  cp?: string;
  [key: string]: any;
}

interface Envio {
    folio: string;
    fecha: string;
    clienteId?: string | null;
    clienteNombre: string;
    telefono?: string;
    empresa?: string;
    direccion: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
    cp?: string;
    paqueteria?: string;
    guia?: string;
    notas?: string;
    productos?: any[];
    enviado?: boolean;
    otKey?: string;
    otLabel?: string;

    convenio?: boolean;
    convenioTexto?: string;
    atencionRecibe?: string;
    tipoEntrega?: string;
    formaPagoEnvio?: string;
}

interface Producto {    
  descripcion: string;
  cantidad: number;
  unidad: string;
}
// 🔹 NORMALIZAR TEXTO
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const Envios: React.FC = () => {
  const db = getDatabase(app);

  const [buscar, setBuscar] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [ultimosEnvios, setUltimosEnvios] = useState<Envio[]>([]);
  const [envioSeleccionado, setEnvioSeleccionado] = useState<Envio | null>(
    null
  );

  const [notas, setNotas] = useState("");
  const [paqueteria, setPaqueteria] = useState("");
  const [guia, setGuia] = useState("");
    const [enviado, setEnviado] = useState(false);

    const [convenio, setConvenio] = useState(false);
    const [convenioTexto, setConvenioTexto] = useState("");
    const [atencionRecibe, setAtencionRecibe] = useState("");
    const [tipoEntrega, setTipoEntrega] = useState("");
    const [formaPagoEnvio, setFormaPagoEnvio] = useState("");

  const toggleEnviado = () => {
    setEnviado((prev) => !prev);
  };
  const [productos, setProductos] = useState<Producto[]>([
    {
      descripcion: "Envío de mercancía RESISTENCIAS",
      cantidad: 1,
      unidad: "Paquete",
    },
  ]);
  const location = useLocation();
  const [otKey, setOtKey] = useState("");
  const [otLabel, setOtLabel] = useState("");
  const [envioFolioReservado, setEnvioFolioReservado] = useState("");
  const enviadoRef = useRef<HTMLInputElement | null>(null);
  // 🔄 RESET FORMULARIO
  const resetFormulario = () => {
    setCliente(null);
    setClientes([]);
    setBuscar("");
    setNotas("");
    setPaqueteria("");
    setGuia("");
    setEnvioSeleccionado(null);
    setProductos([{ descripcion: "", cantidad: 1, unidad: "Paquete" }]);
    setEnviado(false);
    setOtKey("");
    setOtLabel("");
      setEnvioFolioReservado("");
      setConvenio(false);
      setConvenioTexto("");
      setAtencionRecibe("");
      setTipoEntrega("");
      setFormaPagoEnvio("");
  };

  // 🔎 BUSCAR CLIENTES
  const buscarClientes = async () => {
    const snap = await get(ref(db, "Clientes"));
    const data = snap.val() || {};
    const lista = Object.keys(data).map((id) => ({ id, ...data[id] }));
    const textoBusqueda = buscar.toLowerCase();
    const resultados = lista.filter((c: any) => {
      const nombre = (c.nombre || "").toLowerCase();
      const razon = (c.razonSocial || "").toLowerCase();
      const rfc = (c.rfc || "").toLowerCase();
      return (
        nombre.includes(textoBusqueda) ||
        razon.includes(textoBusqueda) ||
        rfc.includes(textoBusqueda)
      );
    });
    setClientes(resultados);
  };

  // 🔄 Cargar últimos envíos
  useEffect(() => {
    const enviosRef = ref(db, "Envios");

    const unsubscribe = onValue(enviosRef, (snapshot) => {
      const data = snapshot.val() || {};

      const lista = Object.keys(data).map((key) => ({
        folio: key,
        ...data[key],
      })) as Envio[];

      const ordenados = lista
        .sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        )
        .slice(0, 10);

      setUltimosEnvios(ordenados);
    });

    return () => unsubscribe();
  }, [db]);

    useEffect(() => {
        if (envioSeleccionado) {
            setEnviado(envioSeleccionado.enviado || false);
            setConvenio(envioSeleccionado.convenio || false);
            setConvenioTexto(envioSeleccionado.convenioTexto || "");
            setAtencionRecibe(envioSeleccionado.atencionRecibe || "");
            setTipoEntrega(envioSeleccionado.tipoEntrega || "");
            setFormaPagoEnvio(envioSeleccionado.formaPagoEnvio || "");
            setProductos(
                envioSeleccionado.productos || [
                    { descripcion: "", cantidad: 1, unidad: "Paquete" },
                ]
            );
        }
    }, [envioSeleccionado]);

  // 📦 GUARDAR O ACTUALIZAR ENVÍO
  const guardarEnvio = async () => {
    if (!cliente) {
      alert("Debes seleccionar o llenar un cliente temporal");
      return;
    }

    try {
      const enviadoActual = enviadoRef.current?.checked ?? enviado;
      console.log("ENVIADO ACTUAL AL GUARDAR:", enviadoActual);

      let folio = envioSeleccionado?.folio || envioFolioReservado;

      // Generar folio si es nuevo y no viene reservado
      if (!folio) {
        const contadorRef = ref(db, "Contadores/envios");
        const result = await runTransaction(
          contadorRef,
          (current) => (current || 0) + 1
        );
        const numeroEnvio = result.snapshot.val();
        folio = `ENV-${String(numeroEnvio).padStart(5, "0")}`;
      }

      const fechaMexico = envioSeleccionado?.fecha || new Date().toISOString();
      const clienteId = cliente.id;

      const envio: Envio = {
        ...envioSeleccionado,
        folio,
        clienteId: cliente.id ?? null,
        otKey: otKey || "",
        otLabel: otLabel || "",
        clienteNombre: cliente.nombre || cliente.razonSocial || "",
        empresa: cliente.razonSocial || "",
        telefono: cliente.telefono || "",
        direccion: `${cliente.direccion || ""} ${cliente.numeroExterior || ""}`,
        colonia: cliente.colonia || "",
        ciudad: cliente.municipio || "",
        estado: cliente.estado || "",
        cp: cliente.cp || "",
        paqueteria,
        guia,
        notas,
        fecha: fechaMexico,
        enviado: enviadoActual,
          productos: productos,
          convenio,
          convenioTexto: convenio ? convenioTexto : "",
          atencionRecibe,
          tipoEntrega,
          formaPagoEnvio,
      };

      // Guardar envío
      await set(ref(db, `Envios/${folio}`), envio);

      // Actualizar OT ligada
      if (otKey) {
        const otSnap = await get(ref(db, `ordenes_trabajo/${otKey}`));

        if (otSnap.exists()) {
          const otActual = otSnap.val();

          console.log("ACTUALIZANDO OT CON envioEnviado =", enviadoActual);

          await set(ref(db, `ordenes_trabajo/${otKey}`), {
            ...otActual,
            envioGenerado: true,
            envioEnviado: enviadoActual,
            envioFolio: folio,
          });
        }
      }

      alert(
        envioSeleccionado
          ? `Envío actualizado correctamente\nFolio: ${folio}`
          : `Envío guardado correctamente\nFolio: ${folio}`
      );

      resetFormulario();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el envío");
    }
  };

  // BOTON PDF
    const handleGenerarPDF = () => {
        if (!envioSeleccionado) {
            alert("Selecciona un envío primero");
            return;
        }

        generarPDFEnvio({
            folio: envioSeleccionado.folio,
            destinoNombre: envioSeleccionado.clienteNombre,
            destinoCalle: envioSeleccionado.direccion,
            destinoNumero: "",
            destinoInterior: cliente?.numeroInterior || "",
            destinoColonia: envioSeleccionado.colonia || "",
            destinoCP: envioSeleccionado.cp || "",
            destinoMunicipio: envioSeleccionado.ciudad || "",
            destinoEstado: envioSeleccionado.estado || "",
            destinoTelefono: envioSeleccionado.telefono || "",
            paqueteria: envioSeleccionado.paqueteria || "",
            guiapaqueteria: envioSeleccionado.guia || "",
            convenio: envioSeleccionado.convenio || false,
            convenioTexto: envioSeleccionado.convenioTexto || "",
            atencionRecibe: envioSeleccionado.atencionRecibe || "",
            tipoEntrega: envioSeleccionado.tipoEntrega || "",
            formaPagoEnvio: envioSeleccionado.formaPagoEnvio || "",
            notaspaquete: envioSeleccionado.notas || "",
            productos: envioSeleccionado.productos || [],
        });
    };
  // ❌ BORRAR ENVÍO
  const borrarEnvio = async () => {
    if (!envioSeleccionado) return;
    const confirmar = window.confirm(
      `¿Seguro que deseas borrar el envío ${envioSeleccionado.folio}?`
    );
    if (!confirmar) return;

    try {
      await remove(ref(db, `Envios/${envioSeleccionado.folio}`));
      if ((envioSeleccionado as any).otKey) {
        const otKeyRelacionado = (envioSeleccionado as any).otKey;

        const otSnap = await get(
          ref(db, `ordenes_trabajo/${otKeyRelacionado}`)
        );

        if (otSnap.exists()) {
          const otActual = otSnap.val();

          await set(ref(db, `ordenes_trabajo/${otKeyRelacionado}`), {
            ...otActual,
            envioGenerado: false,
            envioEnviado: false,
            // OJO: conservamos envioFolio
          });
        }
      }
      alert("Envío borrado correctamente");
      resetFormulario();
    } catch (error) {
      console.error(error);
      alert("Error al borrar el envío");
    }
  };

  // 🗺 Dirección completa en google maps
  const direccionCompleta = cliente
    ? `${cliente.direccion || ""} ${cliente.numeroExterior || ""}, ${
        cliente.colonia || ""
      }, ${cliente.municipio || ""}, ${cliente.estado || ""}, ${
        cliente.cp || ""
      }`
    : "";

  const enviosPendientes = ultimosEnvios.filter((e) => !e.enviado).slice(0, 5);

  const enviosRealizados = ultimosEnvios.filter((e) => e.enviado).slice(0, 5);

  // FUNCIONES DE PRODUCTOS
  const agregarProducto = () =>
    setProductos([
      ...productos,
      { descripcion: "", cantidad: 1, unidad: "Paquete" },
    ]);
  const actualizarProducto = (index: number, campo: string, valor: any) => {
    const nuevos = [...productos];
    (nuevos[index] as any)[campo] = valor;
    setProductos(nuevos);
  };
  const eliminarProducto = (index: number) => {
    const nuevos = [...productos];
    nuevos.splice(index, 1);
    setProductos(nuevos);
  };

  //Guardar clientes
  const guardarCliente = async () => {
    if (!cliente?.nombre && !cliente?.razonSocial) {
      alert("Debes escribir un nombre o razón social");
      return;
    }

    try {
      const nombreBuscar = normalizar(
        cliente.nombre || cliente.razonSocial || ""
      );

      const clientesRef = ref(db, "Clientes");
      const snapshot = await get(clientesRef);

      let clienteExistenteId = null;

      if (snapshot.exists()) {
        const clientes = snapshot.val();

        for (const id in clientes) {
          const c = clientes[id];
          const nombreBD = normalizar(c.nombre || c.razonSocial || "");

          if (nombreBD === nombreBuscar) {
            clienteExistenteId = id;
            break;
          }
        }
      }

      // 🔴 Si ya existe
      if (clienteExistenteId) {
        const confirmar = window.confirm(
          "Ya existe un cliente con este nombre. ¿Deseas sobrescribirlo?"
        );

        if (!confirmar) return;

        await set(ref(db, `Clientes/${clienteExistenteId}`), {
          ...cliente,
        });

        setCliente({
          ...cliente,
          id: clienteExistenteId,
        });

        alert("Cliente actualizado correctamente");
        return;
      }

      // 🟢 Si no existe
      const nuevoClienteRef = await push(clientesRef, {
        ...cliente,
      });

      setCliente({
        ...cliente,
        id: nuevoClienteRef.key ?? undefined,
      });
      alert("Cliente guardado correctamente");
    } catch (error) {
      console.error(error);
      alert("Error al guardar cliente");
    }
  };

  //----------------------------Obtener envios de consulta OT--------------->>
  useEffect(() => {
    const state = location.state as any;

    if (!state?.desdeOT) return;

    const clienteOT = state.cliente;

    if (clienteOT) {
      setCliente({
        id: state.clienteId || "TEMP",
        nombre: clienteOT.nombre || "",
        razonSocial: clienteOT.razonSocial || "",
        telefono: clienteOT.telefono || "",
        direccion: clienteOT.direccion || "",
        numeroExterior: clienteOT.numeroExterior || "",
        numeroInterior: clienteOT.numeroInterior || "",
        colonia: clienteOT.colonia || "",
        municipio: clienteOT.municipio || "",
        estado: clienteOT.estado || "",
        cp: clienteOT.cp || "",
      });
    }

    setOtKey(state.otKey || "");
    setOtLabel(state.otLabel || "");
    setEnvioFolioReservado(state.envioFolio || "");
  }, [location.state]);
  //-----------------------------HTML--------------------------------------->>

  return (
    <div style={{ display: "flex", gap: 30, padding: 20 }}>
      {/* LADO IZQUIERDO: FORMULARIO */}
      <div style={{ flex: 3 }}>
        <h2>Etiqueta de Envío</h2>
        {/* NUMERO DE FOLIO */}
        <div style={{ marginBottom: 10 }}>
          {envioSeleccionado ? (
            <span>
              <b>Folio consultado:</b> {envioSeleccionado.folio}
            </span>
          ) : envioFolioReservado ? (
            <span>
              <b>Folio reservado:</b> {envioFolioReservado}
            </span>
          ) : (
            <span>
              <b>Nuevo folio:</b> ENV-
              {String(ultimosEnvios.length + 1).padStart(5, "0")}
            </span>
          )}
        </div>

        <div className="search-bar">
          <input
            placeholder="Buscar cliente (nombre, razón social o RFC)"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="search-input"
          />
          <button onClick={buscarClientes} className="btn btn-blue">
            Buscar
          </button>
          {!cliente && (
            <button
              className="btn btn-blue"
              onClick={() =>
                setCliente({
                  nombre: "",
                  razonSocial: "",
                  direccion: "",
                  numeroExterior: "",
                  numeroInterior: "",
                  colonia: "",
                  municipio: "",
                  estado: "",
                  cp: "",
                  telefono: "",
                })
              }
            >
              Cliente temporal
            </button>
          )}
        </div>

        {clientes.length > 0 && !cliente && (
          <table className="caja-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Razón Social</th>
                <th>RFC</th>
                <th>Seleccionar</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.razonSocial}</td>
                  <td>{c.rfc}</td>
                  <td>
                    <button
                      className="btn btn-blue"
                      onClick={() => {
                        setCliente(c);
                        setClientes([]);
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

        {cliente && (
          <>
            {/* CHECKBOX ENVIADO */}
            <div className="form-container">
              {/* CHECKBOX ENVIADO */}
              <div className="form-row checkbox-row">
                <label>Envío realizado</label>
                <input
                  ref={enviadoRef}
                  type="checkbox"
                  checked={enviado}
                  onChange={(e) => setEnviado(e.target.checked)}
                />
              </div>
              {/* FIN CHECKBOX ENVIADO */}

              <h3>Destino</h3>

              <div className="form-row">
                <label>Empresa:</label>
                <input
                  value={cliente.razonSocial || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, razonSocial: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Nombre:</label>
                <input
                  value={cliente.nombre || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, nombre: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Dirección:</label>
                <div className="direccion-row">
                  <input
                    className="direccion-input"
                    value={cliente.direccion || ""}
                    onChange={(e) =>
                      setCliente({ ...cliente, direccion: e.target.value })
                    }
                  />
                  <input
                    className="direccion-numero"
                    value={cliente.numeroExterior || ""}
                    placeholder="No. Ext"
                    onChange={(e) =>
                      setCliente({ ...cliente, numeroExterior: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Colonia:</label>
                <input
                  value={cliente.colonia || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, colonia: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Ciudad:</label>
                <input
                  value={cliente.municipio || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, municipio: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Estado:</label>
                <input
                  value={cliente.estado || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, estado: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>CP:</label>
                <input
                  value={cliente.cp || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, cp: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Teléfono:</label>
                <input
                  value={cliente.telefono || ""}
                  onChange={(e) =>
                    setCliente({ ...cliente, telefono: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>SAT:</label>
                <p className="descripcion-texto">32121600</p>
              </div>
                          <div className="form-row">
                              <label>Quien recibe (At´n):</label>
                              <input
                                  value={atencionRecibe}
                                  onChange={(e) => setAtencionRecibe(e.target.value)}
                                  placeholder="Nombre de quien recibe"
                              />
                          </div>
              <div className="form-row">
                <label>Paquetería:</label>
                <select
                  value={paqueteria}
                  onChange={(e) => setPaqueteria(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  <option>PMM</option>
                  <option>DHL</option>
                  <option>Estafeta</option>
                  <option>FedEx</option>
                  <option>Castores</option>
                  <option>Paquete Express</option>
                  <option>Servicio Express</option>
                  <option>Flecha Amarilla</option>
                  <option>Kora Express</option>
                  <option>Altos Pack</option>
                  <option>Fletes Oriente</option>
                </select>
              </div>

              <div className="form-row">
                <label>Número de Guía:</label>
                <input
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                  placeholder="Número de guía"
                />
                          </div>
                          <div className="form-row">
                              <label>Tipo de entrega:</label>
                              <select
                                  value={tipoEntrega}
                                  onChange={(e) => setTipoEntrega(e.target.value)}
                              >
                                  <option value="">Seleccionar</option>
                                  <option value="Domicilio">Entrega a domicilio</option>
                                  <option value="Ocurre">Ocurre (recoger en sucursal)</option>
                              </select>
                          </div>
                          <div className="form-row">
                              <label>Forma de envío:</label>
                              <select
                                  value={formaPagoEnvio}
                                  onChange={(e) => setFormaPagoEnvio(e.target.value)}
                              >
                                  <option value="">Seleccionar</option>
                                  <option value="Prepagado">Prepagado</option>
                                  <option value="Por cobrar">Por cobrar</option>
                              </select>
                          </div>
                          <div className="form-row checkbox-row">
                              <label>Convenio:</label>
                              <input
                                  type="checkbox"
                                  checked={convenio}
                                  onChange={(e) => {
                                      setConvenio(e.target.checked);
                                      if (!e.target.checked) {
                                          setConvenioTexto("");
                                      }
                                  }}
                              />
                          </div>

                          {convenio && (
                              <div className="form-row">
                                  <label>Número de convenio:</label>
                                  <input
                                      value={convenioTexto}
                                      onChange={(e) => setConvenioTexto(e.target.value)}
                                      placeholder="Escribe el convenio"
                                  />
                              </div>
                          )}
              <div className="form-row textarea-row">
                <label>Notas:</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={4}
                />
              </div>

              {/* PRODUCTOS */}
              <h3 style={{ marginTop: 20 }}>Productos</h3>
              <table className="caja-table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          value={p.descripcion}
                          onChange={(e) =>
                            actualizarProducto(
                              index,
                              "descripcion",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={p.cantidad}
                          onChange={(e) =>
                            actualizarProducto(
                              index,
                              "cantidad",
                              Number(e.target.value)
                            )
                          }
                          style={{ width: 60 }}
                        />
                      </td>
                      <td>
                        <input
                          value={p.unidad}
                          onChange={(e) =>
                            actualizarProducto(index, "unidad", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="btn btn-red"
                          onClick={() => eliminarProducto(index)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="btn btn-blue"
                onClick={agregarProducto}
                style={{ marginTop: 10 }}
              >
                Agregar producto
              </button>
            </div>
            {/* FIN DIV TABLA */}

                      {/* BOTONES */}
                      <div className="btn-container">
              <button onClick={guardarEnvio} className="btn btn-green">
                {envioSeleccionado
                  ? "Actualizar envío"
                  : "Guardar y generar etiqueta"}
              </button>
              <button
                className="btn btn-yellow"
                onClick={handleGenerarPDF}
              >
                Generar PDF
              </button>
              <button onClick={guardarCliente} className="btn btn-blue">
                Guardar cliente
              </button>
              {envioSeleccionado && (
                <button
                  className="btn btn-red"
                  onClick={borrarEnvio}
                >
                  Borrar envío
                </button>
              )}
              <button
                className="btn btn-purple"
                onClick={resetFormulario}
              >
                Cancelar
              </button>
            </div>

            {/* MAPA */}
            {direccionCompleta && (
              <div style={{ marginTop: 30 }}>
                              <h3>Ubicación del destino</h3>
                              <div style={{ display: "flex", justifyContent: "center" }}>
                <iframe
                  title="mapa-envio"
                  width="70%"
                  height="300"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    direccionCompleta
                  )}&output=embed`}
                                  />
                              </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* LADO DERECHO: ÚLTIMOS ENVÍOS */}
      {/* LADO DERECHO */}
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid #ccc",
          paddingLeft: 20,
          minWidth: 220,
        }}
      >
        {/* PENDIENTES */}
        <h3>Pendientes</h3>
        {enviosPendientes.map((e, index) => (
          <div
            key={e.folio}
            onClick={() => {
              setCliente({
                id: e.clienteId || "",
                nombre: e.clienteNombre,
                razonSocial: e.empresa,
                direccion: e.direccion,
                numeroExterior: "",
                numeroInterior: "",
                colonia: e.colonia,
                municipio: e.ciudad,
                estado: e.estado,
                cp: e.cp,
                telefono: e.telefono || "",
              });

                setPaqueteria(e.paqueteria || "");
                setGuia(e.guia || "");
                setNotas(e.notas || "");
                setEnviado(e.enviado || false);
                setTipoEntrega(e.tipoEntrega || "");
                setFormaPagoEnvio(e.formaPagoEnvio || "");
                setEnvioSeleccionado(e);
            }}
            style={{
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
              background: index === 0 ? "#fff3b0" : "#ffd6d6",
            }}
          >
            <strong>{e.folio}</strong>
            <br />
            <small>
              {new Date(e.fecha).toLocaleString("es-MX", {
                timeZone: "America/Mexico_City",
              })}
            </small>
          </div>
        ))}

        {/* ENVIADOS */}
        <h3 style={{ marginTop: 20 }}>Enviados</h3>
        {enviosRealizados.map((e) => (
          <div
            key={e.folio}
            onClick={() => {
              setCliente({
                id: e.clienteId || "",
                nombre: e.clienteNombre,
                razonSocial: e.empresa,
                direccion: e.direccion,
                numeroExterior: "",
                numeroInterior: "",
                colonia: e.colonia,
                municipio: e.ciudad,
                estado: e.estado,
                cp: e.cp,
                telefono: e.telefono || "",
              });

                setPaqueteria(e.paqueteria || "");
                setGuia(e.guia || "");
                setNotas(e.notas || "");
                setEnviado(e.enviado || false);
                setTipoEntrega(e.tipoEntrega || "");
                setFormaPagoEnvio(e.formaPagoEnvio || "");
                setEnvioSeleccionado(e);
            }}
            style={{
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              cursor: "pointer",
              background: "#c8f7c5",
            }}
          >
            <strong>{e.folio}</strong>
            <br />
            <small>
              {new Date(e.fecha).toLocaleString("es-MX", {
                timeZone: "America/Mexico_City",
              })}
            </small>
          </div>
        ))}
      </div>
      {/* FIN LADO DERECHO: ÚLTIMOS ENVÍOS */}
    </div>
  );
};

export default Envios;
