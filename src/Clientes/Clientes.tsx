//src/Cientes/Clientess.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, update, remove } from "firebase/database";
import { app } from "../firebase/config";
import "../css/formulario.css";

interface Cliente {
  id: string;
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

  credito?: {
    activo: boolean;
    limite?: number;
    dias?: number;
  };
}
interface Envio {
  id: string;
  folio?: string;
  fecha?: string;
  paqueteria?: string;
  guia?: string;
  estado?: string;
}

const ITEMS_PER_PAGE = 20;

const BuscarClientes: React.FC = () => {
  const db = getDatabase(app);
  //PARA EDICION DESDE COTIZADOR -> VARIABLES
  const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as any;
    const vieneDeCotizador = state?.modo === "editarDesdeCotizador";
    const clienteIdDesdeCotizador = state?.clienteId;
    const volverA = state?.volverA || "/cotizador";
    console.log("location.state en Clientes:", location.state);
    console.log("clienteIdDesdeCotizador:", clienteIdDesdeCotizador);
    // VARIABLES DEL CLIENTES
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [modoEditar, setModoEditar] = useState(false);
  const [enviosCliente, setEnviosCliente] = useState<Envio[]>([]);
  // 🔎 BUSCAR CLIENTES
  const buscarClientes = async (texto: string) => {
    const snap = await get(ref(db, "Clientes"));
    const data = snap.val() || {};

    const lista = Object.keys(data).map((id) => ({
      id,
      ...data[id],
    }));

    const textoBusqueda = texto.toLowerCase();

    return lista.filter((c: any) => {
      const nombre = (c.nombre || "").toLowerCase();
      const razon = (c.razonSocial || "").toLowerCase();
      const rfc = (c.rfc || "").toLowerCase();

      return (
        nombre.includes(textoBusqueda) ||
        razon.includes(textoBusqueda) ||
        rfc.includes(textoBusqueda)
      );
    });
  };

  // 🔎 BUSCAR AL ESCRIBIR
  useEffect(() => {
    if (search.trim() === "") {
      setClientes([]);
      setPage(1);
      return;
    }
    const timeout = setTimeout(async () => {
      const resultados = await buscarClientes(search.trim());
      setClientes(resultados);
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);
    //COTIZADOR->CLIENTE
    useEffect(() => {
        const abrirClienteDirecto = async () => {
            console.log("Entró a abrirClienteDirecto");
            console.log("clienteIdDesdeCotizador:", clienteIdDesdeCotizador);
            if (!clienteIdDesdeCotizador) return;

            const snap = await get(ref(db, `Clientes/${clienteIdDesdeCotizador}`));
            if (!snap.exists()) return;

            const data = snap.val();

            setSelectedCliente({
                id: clienteIdDesdeCotizador,
                ...data,
            });

            setModoEditar(true);
            cargarEnviosCliente(clienteIdDesdeCotizador);
        };

        abrirClienteDirecto();
    }, [clienteIdDesdeCotizador]);
    //----------------------------------------------------->>
  const datosPaginados = clientes.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // 💾 GUARDAR CLIENTE
    const guardarCliente = async () => {
        if (!selectedCliente) return;

        const { id, ...datos } = selectedCliente;

        if (!datos.credito?.activo) {
            delete datos.credito;
        }

        await update(ref(db, `Clientes/${id}`), datos);

        alert("Cliente actualizado");

        // 🔥 SI VIENE DEL COTIZADOR → REGRESAR
        if (vieneDeCotizador) {
            navigate(volverA, {
                state: {
                    modo: "regresoDesdeEditarCliente",
                    clienteActualizadoId: id,
                },
            });
            return;
        }

        setModoEditar(false);
    };

  // ❌ ELIMINAR CLIENTE
  const eliminarCliente = async (cliente: Cliente) => {
    if (!cliente.id) return;

    const confirmacion = window.confirm(
      `¿Eliminar al cliente ${cliente.nombre}?`
    );

    if (!confirmacion) return;

    await remove(ref(db, `Clientes/${cliente.id}`));

    setClientes(clientes.filter((c) => c.id !== cliente.id));

    if (selectedCliente?.id === cliente.id) {
      setSelectedCliente(null);
      setModoEditar(false);
    }

    alert("Cliente eliminado");
  };
  //Mostrar Envios
  const cargarEnviosCliente = async (clienteId: string) => {
    const snap = await get(ref(db, "Envios"));
    const data = snap.val() || {};

    const lista = Object.keys(data).map((id) => ({
      id,
      ...data[id],
    }));

    const filtrados = lista.filter((e: any) => e.clienteId === clienteId);

    setEnviosCliente(filtrados);
  };

  const direccionCompleta = selectedCliente
    ? `${selectedCliente.direccion || ""} ${
        selectedCliente.numeroExterior || ""
      }, ${selectedCliente.colonia || ""}, ${
        selectedCliente.municipio || ""
      }, ${selectedCliente.estado || ""}`
    : "";

  return (
    <div className="caja-container">
      <h2>Consulta de Clientes</h2>

      <input
        type="text"
        placeholder="Buscar nombre, razón social o RFC"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />

      {/* RESULTADOS */}

      {search.trim() !== "" &&
        datosPaginados.length > 0 &&
        !selectedCliente && (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Razón Social</th>
                  <th>RFC</th>
                  <th>Ficha</th>
                </tr>
              </thead>

              <tbody>
                {datosPaginados.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.razonSocial}</td>
                    <td>{c.rfc}</td>

                    <td>
                      <button
                        className="btn btn-blue"
                        onClick={() => {
                          setSelectedCliente(c);
                          setModoEditar(false);
                          cargarEnviosCliente(c.id);
                        }}
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* FICHA CLIENTE */}

      {selectedCliente && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            marginTop: 30,
          }}
        >
          {/* DATOS CLIENTE */}

          <div className="cliente-panel">
            {/* CLIENTE */}
            <h3 className="seccion">👤 CLIENTE</h3>

            <div className="grid-form">
              <Campo
                label="Nombre"
                value={selectedCliente.nombre}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, nombre: v })
                }
              />

              <Campo
                label="Razón Social"
                value={selectedCliente.razonSocial}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, razonSocial: v })
                }
              />

              <Campo
                label="RFC"
                value={selectedCliente.rfc}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, rfc: v })
                }
              />
              <CampoSelect
                label="Régimen Fiscal"
                value={selectedCliente.regimenFiscal ?? ""}
                editar={modoEditar}
                options={[
                  "601 - General de Ley Personas Morales",
                  "603 - Personas Morales con Fines no Lucrativos",
                  "605 - Sueldos y Salarios",
                  "606 - Arrendamiento",
                  "612 - Personas Físicas con Actividades Empresariales",
                  "621 - Incorporación Fiscal",
                  "626 - RESICO",
                ]}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, regimenFiscal: v })
                }
              />
            </div>

            {/* DIRECCIÓN */}
            <h3 className="seccion">📍 DIRECCIÓN</h3>

            <div className="grid-form">
              <Campo
                label="Calle"
                value={selectedCliente.direccion}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, direccion: v })
                }
              />

              <Campo
                label="Número"
                value={selectedCliente.numeroExterior}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, numeroExterior: v })
                }
              />

              <Campo
                label="Colonia"
                value={selectedCliente.colonia}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, colonia: v })
                }
              />
            </div>

            {/* CONTACTO */}
            <h3 className="seccion">📞 CONTACTO</h3>

            <div className="grid-form">
              <Campo
                label="Teléfono"
                value={selectedCliente.telefono}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, telefono: v })
                }
              />

              <Campo
                label="Email"
                value={selectedCliente.email}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, email: v })
                }
              />
            </div>

            <h3 className="seccion">🏢 EMPRESA</h3>

            <div className="grid-form">
              <Campo
                label="Nombre de Empresa"
                value={selectedCliente.empresa}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, empresa: v })
                }
              />

              <Campo
                label="Giro"
                value={selectedCliente.giro}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, giro: v })
                }
              />
            </div>

            <h3 className="seccion">💲 DESCUENTO</h3>

            <div className="grid-form">
              <Campo
                label="Descuento (%)"
                value={
                  selectedCliente?.descuentoDefault !== undefined
                    ? selectedCliente.descuentoDefault * 100
                    : ""
                }
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({
                    ...selectedCliente!,
                    descuentoDefault: Number(v) / 100, // 🔥 convierte a decimal
                  })
                }
              />
            </div>

            <h3 className="seccion">💳 CRÉDITO</h3>

            <div className="grid-form">
              {/* Checkbox */}
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedCliente?.credito?.activo || false}
                    disabled={!modoEditar}
                    onChange={(e) => {
                      if (!selectedCliente) return;

                      if (e.target.checked) {
                        setSelectedCliente({
                          ...selectedCliente,
                          credito: {
                            activo: true,
                            limite: 0,
                            dias: 0,
                          },
                        });
                      } else {
                        // 🔥 eliminar credito
                        const { credito, ...resto } = selectedCliente;
                        setSelectedCliente(resto);
                      }
                    }}
                  />
                  Cliente con crédito
                </label>
              </div>

              {/* Campos solo si tiene crédito */}
              {selectedCliente?.credito?.activo && (
                <>
                  <Campo
                    label="Límite de crédito"
                    value={selectedCliente.credito.limite}
                    editar={modoEditar}
                    onChange={(v: string) =>
                      setSelectedCliente({
                        ...selectedCliente,
                        credito: {
                          ...selectedCliente.credito!,
                          limite: Number(v),
                        },
                      })
                    }
                  />

                  <Campo
                    label="Días de crédito"
                    value={selectedCliente.credito.dias}
                    editar={modoEditar}
                    onChange={(v: string) =>
                      setSelectedCliente({
                        ...selectedCliente,
                        credito: {
                          ...selectedCliente.credito!,
                          dias: Number(v),
                        },
                      })
                    }
                  />
                </>
              )}
            </div>

            <h3 className="seccion">📦 ENVÍOS DEL CLIENTE</h3>

            {enviosCliente.length === 0 ? (
              <p>Este cliente no tiene envíos registrados.</p>
            ) : (
              <table className="caja-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Paquetería</th>
                    <th>Guía</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {enviosCliente.map((e) => (
                    <tr key={e.id}>
                      <td>{e.folio}</td>
                      <td>
                        {e.fecha
                          ? new Date(e.fecha).toLocaleDateString("es-MX")
                          : "-"}
                      </td>
                      <td>{e.paqueteria}</td>
                      <td>{e.guia}</td>
                      <td>{e.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* BOTONES */}

            <div className="botones">
              {!modoEditar && (
                <button
                  onClick={() => setModoEditar(true)}
                  className="btn btn-blue"
                >
                  Editar
                </button>
              )}

              {modoEditar && (
                <button onClick={guardarCliente} className="btn btn-green">
                  Guardar
                </button>
              )}

              <button
                className="btn btn-red"
                onClick={() => eliminarCliente(selectedCliente)}
              >
                Eliminar
              </button>

                          <button
                              className="btn btn-purple"
                              onClick={() => {
                                  if (vieneDeCotizador) {
                                      navigate(volverA, {
                                          state: {
                                              modo: "regresoDesdeEditarCliente",
                                              clienteActualizadoId: selectedCliente?.id || null,
                                          },
                                      });
                                      return;
                                  }

                                  setSelectedCliente(null);
                                  setModoEditar(false);
                              }}
                          >
                              Cerrar
                          </button>
            </div>
          </div>

          {/* MAPA */}

          <div>
            <h3>Ubicación</h3>

            {direccionCompleta && (
              <iframe
                title="mapa"
                width="100%"
                height="350"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  direccionCompleta
                )}&output=embed`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// COMPONENTE CAMPO REUTILIZABLE

const Campo = ({ label, value, editar, onChange }: any) => {
  return (
    <div style={{ marginBottom: 10 }}>
      <label className="campo-label">{label}</label>

      {editar ? (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p>{value}</p>
      )}
    </div>
  );
};

type CampoSelectProps = {
  label: string;
  value: string;
  editar: boolean;
  options: string[];
  onChange: (v: string) => void;
};

function CampoSelect({
  label,
  value,
  editar,
  options,
  onChange,
}: CampoSelectProps) {
  return (
    <div className="campo">
      <label className="campo-label">{label}</label>

      {editar ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccionar...</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div>{value}</div>
      )}
    </div>
  );
}
export default BuscarClientes;
