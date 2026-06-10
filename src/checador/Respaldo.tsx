// src/checador/Respaldo.tsx
//Aqui se guardan las asistencias de la base de datos del checador

import React, { useEffect, useMemo, useState } from "react";
import initSqlJs from "sql.js";
import { ref, onValue, update } from "firebase/database";
import { db } from "../firebase/config";
import { formatearFechaMX} from "../funciones/formato_fechas";
//import "../css/asistencia.css";
import "../css/respaldo.css";

type EmpleadoRH = {
  id: string;
  nombre?: string;
  username?: string;
  area?: string;
  puesto?: string;
  activo?: boolean;
};

type EventoPreview = {
  empleadoId: string;
  nombre: string;
  fecha: string;
  hora: string;
  timestamp: number;
};

type RegistroPreview = {
  empleadoId: string;
  nombre: string;
  area?: string;
  puesto?: string;
  fecha: string;
  entrada: string;
  primeraEntrada: string;
  ultimaChecada: string;
  totalChecadas: number;
  eventos: EventoPreview[];
};

const Respaldo: React.FC = () => {
const [empleados, setEmpleados] = useState<EmpleadoRH[]>([]);
const [registros, setRegistros] = useState<RegistroPreview[]>([]);
const [fechaDesde, setFechaDesde] = useState("");
const [fechaHasta, setFechaHasta] = useState("");
const [busquedaEmpleado, setBusquedaEmpleado] = useState("");
const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
const [archivoNombre, setArchivoNombre] = useState("");
const [procesando, setProcesando] = useState(false);
const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const empleadosRef = ref(db, "RH/Empleados");

    const unsub = onValue(empleadosRef, (snapshot) => {
      if (!snapshot.exists()) {
        setEmpleados([]);
        return;
      }

      const data = snapshot.val();

      const lista: EmpleadoRH[] = Object.entries(data).map(
        ([id, value]: any) => ({
          id,
          ...value,
        })
      );

      setEmpleados(lista);
    });

    return () => unsub();
  }, []);

  const empleadosMap = useMemo(() => {
    const map = new Map<string, EmpleadoRH>();

    empleados.forEach((emp) => {
      map.set(String(emp.id), emp);
    });

    return map;
  }, [empleados]);

  const leerRespaldo = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setProcesando(true);
      setArchivoNombre(file.name);

      const buffer = await file.arrayBuffer();

      const SQL = await initSqlJs({
        locateFile: () => "/sql-wasm.wasm",
      });

      const database = new SQL.Database(new Uint8Array(buffer));

        const query = `
        SELECT 
            p.employee_id,
            p.punch_time,
            e.emp_pin,
            e.emp_firstname,
            e.emp_lastname
        FROM att_punches p
        LEFT JOIN hr_employee e ON e.id = p.employee_id
        WHERE p.punch_time IS NOT NULL
        ORDER BY e.emp_pin, p.punch_time
        `;

      const resultado = database.exec(query);

      if (!resultado.length) {
        alert("No se encontraron checadas en el respaldo.");
        setRegistros([]);
        return;
      }

      const columnas = resultado[0].columns;
      const valores = resultado[0].values;

      const eventos: EventoPreview[] = valores.map((fila: any[]) => {
        const row: any = {};

        columnas.forEach((col, index) => {
          row[col] = fila[index];
        });

        const empleadoId = String(row.emp_pin || row.employee_id);
        const punchTime = String(row.punch_time);

        const [fecha, hora] = punchTime.split(" ");


        const nombreRespaldo = `${row.emp_firstname || ""} ${
          row.emp_lastname || ""
        }`.trim();

        return {
          empleadoId,
            nombre: nombreRespaldo || empleadoId,
          fecha,
          hora,
          timestamp: new Date(`${fecha}T${hora}`).getTime(),
        };
      });

      const agrupados = new Map<string, EventoPreview[]>();

      eventos.forEach((ev) => {
        const key = `${ev.fecha}_${ev.empleadoId}`;

        if (!agrupados.has(key)) {
          agrupados.set(key, []);
        }

        agrupados.get(key)!.push(ev);
      });

      const listaRegistros: RegistroPreview[] = Array.from(
        agrupados.entries()
      ).map(([_, eventosDia]) => {
        const ordenados = eventosDia.sort(
          (a, b) => a.timestamp - b.timestamp
        );

        const primero = ordenados[0];
        const ultimo = ordenados[ordenados.length - 1];

        const emp = empleadosMap.get(String(primero.empleadoId));

        return {
          empleadoId: primero.empleadoId,
            nombre: primero.nombre || primero.empleadoId,
          area: emp?.area || "",
          puesto: emp?.puesto || "",
          fecha: primero.fecha,
          entrada: primero.hora,
          primeraEntrada: primero.hora,
          ultimaChecada: ultimo.hora,
          totalChecadas: ordenados.length,
          eventos: ordenados,
        };
      });
        setBusquedaEmpleado("");
        setEmpleadosSeleccionados([]);
      setRegistros(listaRegistros);
    } catch (error: any) {
        console.error(error);

        alert(
            `Error leyendo respaldo:\n${error?.message || "Error desconocido"}`
        );
        } finally {
      setProcesando(false);
      e.target.value = "";
    }
  };

const cancelar = () => {
  setRegistros([]);
  setArchivoNombre("");
  setFechaDesde("");
  setFechaHasta("");
  setBusquedaEmpleado("");
  setEmpleadosSeleccionados([]);
};

const sobrescribirFirebase = async () => {
  if (registrosFinales.length === 0) {
    alert("No hay registros para guardar.");
    return;
  }

  const confirmar = confirm(
    "Esto sobrescribirá únicamente las checadas del rango de fechas y empleados seleccionados. ¿Continuar?"
  );

  if (!confirmar) return;

  try {
    setGuardando(true);

    const updates: Record<string, any> = {};
    const ahora = Date.now();

    registrosFinales.forEach((r) => {
      const basePath = `asistencia/registros/${r.fecha}/${r.empleadoId}`;
      const empFirebase = empleadosMap.get(String(r.empleadoId));

      updates[`${basePath}/empleadoId`] = r.empleadoId;
      updates[`${basePath}/nombre`] =
        empFirebase?.nombre || empFirebase?.username || r.nombre;
      updates[`${basePath}/username`] = empFirebase?.username || "";
      updates[`${basePath}/area`] = empFirebase?.area || "";
      updates[`${basePath}/puesto`] = empFirebase?.puesto || "";
      updates[`${basePath}/entrada`] = r.entrada;
      updates[`${basePath}/primeraEntrada`] = r.primeraEntrada;
      updates[`${basePath}/ultimaChecada`] = r.ultimaChecada;
      updates[`${basePath}/totalChecadas`] = r.totalChecadas;
      updates[`${basePath}/actualizado`] = ahora;
      updates[`${basePath}/origen`] = "respaldo_checador";

      r.eventos.forEach((ev, index) => {
        updates[`${basePath}/eventos/respaldo_${index + 1}`] = {
          empleadoId: ev.empleadoId,
          nombre: empFirebase?.nombre || empFirebase?.username || r.nombre,
          username: empFirebase?.username || "",
          area: empFirebase?.area || "",
          puesto: empFirebase?.puesto || "",
          fecha: ev.fecha,
          hora: ev.hora,
          origen: "respaldo_checador",
          timestamp: ev.timestamp,
        };
      });
    });

    await update(ref(db), updates);

    alert("Respaldo importado correctamente.");
  } catch (error: any) {
    console.error(error);

    alert(
      `Error guardando respaldo:\n${error?.message || error}`
    );
  } finally {
    setGuardando(false);
  }
};


    const registrosFiltrados = registros.filter((r) => {
    if (fechaDesde && r.fecha < fechaDesde) return false;
    if (fechaHasta && r.fecha > fechaHasta) return false;
    return true;
    });


    const empleadosDelRespaldo = Array.from(
  new Map(
    registros.map((r) => [
      r.empleadoId,
      {
        id: r.empleadoId,
        nombre: r.nombre,
        area: r.area || "Sin área",
      },
    ])
  ).values()
);

const empleadosFiltrados = empleadosDelRespaldo.filter((emp) => {
  const texto = `${emp.id} ${emp.nombre}`.toLowerCase();
  return texto.includes(busquedaEmpleado.toLowerCase());
});

    const empleadosPorArea = empleadosFiltrados.reduce(
    (acc, emp) => {
        const area = emp.area || "Sin área";

        if (!acc[area]) acc[area] = [];

        acc[area].push(emp);

        return acc;
    },
    {} as Record<string, { id: string; nombre: string; area: string }[]>
    );

    const registrosFinales = registrosFiltrados.filter((r) => {
    if (empleadosSeleccionados.length === 0) return true;

    return empleadosSeleccionados.includes(r.empleadoId);
    });

return (
  <div className="asistencia-page">
    <h2>Subir respaldo del checador</h2>

    <div className="respaldo-card">
      <input
        type="file"
        accept=".db,.sqlite"
        onChange={leerRespaldo}
      />

      {archivoNombre && <p>Archivo: {archivoNombre}</p>}
      {procesando && <p>Procesando respaldo...</p>}

      {registros.length > 0 && (
        <>
          <p>
            Días/empleados encontrados: <b>{registrosFinales.length}</b>
            {" | "}
            Checadas:{" "}
            <b>
              {registrosFinales.reduce(
                (sum, r) => sum + r.totalChecadas,
                0
              )}
            </b>
          </p>

          <div className="respaldo-layout">
            <aside className="respaldo-sidebar">

            <input
                className="respaldo-buscador"
                type="text"
                placeholder="Buscar por ID o nombre"
                value={busquedaEmpleado}
                onChange={(e) =>
                setBusquedaEmpleado(e.target.value)
                }
            />

            <div className="respaldo-contenido">
                {Object.entries(empleadosPorArea).map(([area, lista]) => (
                <div key={area}>
                    <h4>{area}</h4>

                    {lista.map((emp) => (
                    <label
                        key={emp.id}
                        style={{
                        display: "block",
                        marginBottom: "8px",
                        cursor: "pointer",
                        }}
                    >
                        <input
                        type="checkbox"
                        checked={empleadosSeleccionados.includes(emp.id)}
                        onChange={() =>
                            setEmpleadosSeleccionados((prev) =>
                            prev.includes(emp.id)
                                ? prev.filter((id) => id !== emp.id)
                                : [...prev, emp.id]
                            )
                        }
                        />

                        {" "}
                        {emp.id} - {emp.nombre}
                    </label>
                    ))}
                </div>
                ))}
            </div>

            </aside>

            <section className="respaldo-main">
              <div className="respaldo-filtros">
                <label>
                  Desde
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </label>

                <label>
                  Hasta
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </label>
              </div>

              <div className="respaldo-tabla-wrap">
                <div className="respaldo-tabla-scroll">
                  <table className="respaldo-tabla">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Empleado</th>
                        <th>Área</th>
                        <th>Entrada</th>
                        <th>Última checada</th>
                        <th>Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...registrosFinales]
                        .sort((a, b) => {
                          if (a.fecha !== b.fecha) {
                            return a.fecha.localeCompare(b.fecha);
                          }

                          return Number(a.empleadoId) - Number(b.empleadoId);
                        })
                        .map((r) => (
                          <tr key={`${r.fecha}_${r.empleadoId}`}>
                            <td>{r.empleadoId}</td>
                            <td>{formatearFechaMX(r.fecha)}</td>
                            <td>{r.nombre}</td>
                            <td>{r.area || "-"}</td>
                            <td>{r.entrada}</td>
                            <td>{r.ultimaChecada}</td>
                            <td>{r.totalChecadas}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="respaldo-botones">
                <button
                  type="button"
                  className="btn-importar"
                  onClick={sobrescribirFirebase}
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Sobrescribir"}
                </button>

                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={cancelar}
                  disabled={guardando}
                >
                  Cancelar
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  </div>
);
};

export default Respaldo;