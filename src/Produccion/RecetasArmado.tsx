// src/Produccion/RecetasArmado.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, push, ref, remove, set } from "firebase/database";
import { db } from "../firebase/config";
import "../css/RecetasArmado.css";

type MaterialInventario = {
  id: string;
  descripcion: string;
  cantidad: number;
  activo: boolean;
};

type OpcionCotizador = { id: string; tipo: string; };

type MaterialReceta = {
  materialId: string;
  cantidad: number;
};

// catalogoId es la clave ESTABLE de la opción elegida en el cotizador.
// materialId es el producto físico del inventario y puede reasignarse al editar.
type MaterialVariable = MaterialReceta & {
  catalogoId: string;
};

type Receta = {
  id: string;
  nombre: string;
  habilitado: boolean;
  materiales: MaterialReceta[];
  materialesVariables: MaterialVariable[];
};

const RUTA_RECETAS = "produccion/recetas_armado";
const RUTA_INVENTARIO = "produccion/almacen_inventario";
const RUTA_TORNILLOS = "cotizador/tornillo";

function comoLista(valor: unknown): any[] {
  if (Array.isArray(valor)) return valor;
  if (valor && typeof valor === "object") return Object.values(valor);
  return [];
}

const RecetasArmado: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [inventario, setInventario] = useState<MaterialInventario[]>([]);
  const [opcionesCotizador, setOpcionesCotizador] = useState<OpcionCotizador[]>([]);
  const [errorCotizador, setErrorCotizador] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [nombre, setNombre] = useState("");
  const [habilitado, setHabilitado] = useState(true);
  const [materiales, setMateriales] = useState<MaterialReceta[]>([]);
  const [materialesVariables, setMaterialesVariables] = useState<MaterialVariable[]>([]);
  const [busquedaRecetas, setBusquedaRecetas] = useState("");
  const [busquedaMaterial, setBusquedaMaterial] = useState("");
  const [materialElegido, setMaterialElegido] = useState("");
  const [cantidadNueva, setCantidadNueva] = useState("1");
  const [variableElegida, setVariableElegida] = useState("");
  const [cantidadVariable, setCantidadVariable] = useState("2");
  const [claveVariable, setClaveVariable] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    setError("");
    try {
      const [snapRecetas, snapInventario] = await Promise.all([
        get(ref(db, RUTA_RECETAS)),
        get(ref(db, RUTA_INVENTARIO)),
      ]);
      // La lectura del catálogo es independiente: un problema de permisos no bloquea las recetas.
      try {
        const snapTornillos = await get(ref(db, RUTA_TORNILLOS));
        const datosTornillos = (snapTornillos.val() || {}) as Record<string, any>;
        const opciones = Object.entries(datosTornillos)
          .filter(([, dato]) => dato && typeof dato === "object" && !Array.isArray(dato))
          .map(([clave, dato]) => ({
            id: clave,
            tipo: String(dato.Tipo ?? dato.tipo ?? ""),
          }))
          .filter((opcion) => opcion.id && opcion.tipo)
          .sort((a, b) => a.tipo.localeCompare(b.tipo, "es"));
        setOpcionesCotizador(opciones);
        setErrorCotizador(opciones.length ? "" : "No se encontraron opciones en cotizador/tornillo. Verifica que cada opción tenga el campo Tipo.");
      } catch (e) {
        console.error("Error consultando catálogo de tornillos:", e);
        setOpcionesCotizador([]);
        setErrorCotizador("No se pudo leer cotizador/tornillo. Verifica la ruta y los permisos de Firebase.");
      }
      const datosRecetas = (snapRecetas.val() || {}) as Record<string, any>;
      setRecetas(Object.entries(datosRecetas).map(([id, dato]) => ({
        id,
        nombre: String(dato?.nombre || ""),
        habilitado: dato?.habilitado !== false,
        materiales: comoLista(dato?.materiales)
          .filter((m) => m && m.materialId)
          .map((m) => ({ materialId: String(m.materialId), cantidad: Number(m.cantidad) })),
        materialesVariables: comoLista(dato?.materialesVariables)
          .filter((m) => m && m.materialId)
          .map((m) => ({
            materialId: String(m.materialId),
            catalogoId: String(m.catalogoId || ""),
            cantidad: Number(m.cantidad),
          })),
      })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));

      const datosInventario = (snapInventario.val() || {}) as Record<string, any>;
      setInventario(Object.entries(datosInventario).map(([id, dato]) => ({
        id,
        descripcion: String(dato?.descripcion || "Sin descripción"),
        cantidad: Number(dato?.cantidad || 0),
        activo: dato?.activo !== false && dato?.activo !== 0 && dato?.activo !== "false",
      })).sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es")));
    } catch (e) {
      console.error("Error cargando recetas e inventario:", e);
      setError("No se pudieron cargar las recetas o el inventario. Revisa la conexión y los permisos de Firebase.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { void cargarDatos(); }, []);

  const porId = useMemo(() => new Map(inventario.map((m) => [m.id, m])), [inventario]);
  const opcionPorId = useMemo(() => new Map(opcionesCotizador.map((o) => [o.id, o])), [opcionesCotizador]);
  const recetasFiltradas = recetas.filter((r) =>
    r.nombre.toLocaleLowerCase("es").includes(busquedaRecetas.trim().toLocaleLowerCase("es"))
  );
  const opcionesMaterial = inventario.filter((m) =>
    m.activo && !materiales.some((item) => item.materialId === m.id) &&
    `${m.id} ${m.descripcion}`.toLocaleLowerCase("es").includes(busquedaMaterial.trim().toLocaleLowerCase("es"))
  );
  const opcionesVariable = inventario.filter((m) =>
    m.activo && !materialesVariables.some((item) => item.materialId === m.id)
  );

  const llenarFormulario = (receta: Receta) => {
    setNombre(receta.nombre);
    setHabilitado(receta.habilitado);
    setMateriales(receta.materiales.map((m) => ({ ...m })));
    setMaterialesVariables(receta.materialesVariables.map((m) => ({ ...m })));
    setMaterialElegido("");
    setBusquedaMaterial("");
    setCantidadNueva("1");
    setVariableElegida("");
    setCantidadVariable("2");
    setClaveVariable("");
  };

  const seleccionar = (receta: Receta) => {
    setSeleccionadaId(receta.id);
    setNueva(false);
    setEditando(false);
    llenarFormulario(receta);
  };

  const crearNueva = () => {
    setSeleccionadaId(null);
    setNueva(true);
    setEditando(true);
    setNombre("");
    setHabilitado(true);
    setMateriales([]);
    setMaterialesVariables([]);
    setMaterialElegido("");
    setBusquedaMaterial("");
    setCantidadNueva("1");
    setVariableElegida("");
    setCantidadVariable("2");
    setClaveVariable("");
  };

  const cancelar = () => {
    if (nueva) {
      setNueva(false);
      setEditando(false);
      setSeleccionadaId(null);
      return;
    }
    const original = recetas.find((r) => r.id === seleccionadaId);
    if (original) llenarFormulario(original);
    setEditando(false);
  };

  const agregarMaterial = () => {
    const cantidad = Number(cantidadNueva);
    if (!materialElegido || !porId.get(materialElegido)?.activo) return alert("Selecciona un material activo del inventario.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) return alert("La cantidad debe ser mayor que cero.");
    if (materiales.some((m) => m.materialId === materialElegido)) return alert("Este material ya está agregado como fijo.");
    setMateriales((prev) => [...prev, { materialId: materialElegido, cantidad }]);
    setMaterialElegido("");
    setCantidadNueva("1");
    setBusquedaMaterial("");
  };

  const agregarVariable = () => {
    const cantidad = Number(cantidadVariable);
    const catalogoId = claveVariable.trim();
    if (!variableElegida || !porId.get(variableElegida)?.activo) return alert("Selecciona un material activo del inventario.");
    if (!catalogoId || !opcionPorId.has(catalogoId)) return alert("Selecciona una opción válida del cotizador.");
    if (!Number.isFinite(cantidad) || cantidad <= 0) return alert("La cantidad debe ser mayor que cero.");
    if (materialesVariables.some((m) => m.catalogoId === catalogoId)) return alert("Ese ID de opción ya está registrado en esta receta.");
    if (materialesVariables.some((m) => m.materialId === variableElegida)) return alert("Ese producto ya está registrado como variable.");
    setMaterialesVariables((prev) => [...prev, { materialId: variableElegida, catalogoId, cantidad }]);
    setVariableElegida("");
    setClaveVariable("");
    setCantidadVariable("2");
  };

  const guardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return alert("Escribe el nombre de la receta.");
    if (materiales.length === 0) return alert("Agrega al menos un material fijo.");
    const todos = [...materiales, ...materialesVariables];
    if (todos.some((m) => !m.materialId || !Number.isFinite(m.cantidad) || m.cantidad <= 0)) {
      return alert("Revisa las cantidades: todas deben ser mayores que cero.");
    }
    if (new Set(materiales.map((m) => m.materialId)).size !== materiales.length) return alert("Hay materiales fijos duplicados.");
    if (new Set(materialesVariables.map((m) => m.catalogoId.trim())).size !== materialesVariables.length ||
        materialesVariables.some((m) => !m.catalogoId.trim())) return alert("Cada material variable necesita un ID de opción único.");
    if (new Set(materialesVariables.map((m) => m.materialId)).size !== materialesVariables.length) return alert("Hay productos variables duplicados.");
    if (materialesVariables.some((m) => !opcionPorId.has(m.catalogoId))) return alert("Hay opciones del cotizador que no se encuentran en el catálogo. Revisa la relación antes de guardar.");
    if (todos.some((m) => !porId.has(m.materialId))) return alert("Hay materiales que ya no existen en inventario. Corrige la receta.");
    const datos = {
      nombre: nombreLimpio,
      habilitado,
      materiales: materiales.map((m) => ({ ...m })),
      materialesVariables: materialesVariables.map((m) => ({
        materialId: m.materialId,
        catalogoId: m.catalogoId.trim(),
        cantidad: m.cantidad,
      })),
    };
    setGuardando(true);
    try {
      let id = seleccionadaId;
      if (nueva) {
        const nuevaRef = push(ref(db, RUTA_RECETAS));
        if (!nuevaRef.key) throw new Error("Firebase no generó una clave.");
        id = nuevaRef.key;
        await set(nuevaRef, datos);
      } else {
        if (!id) return;
        // set sustituye la receta completa, evitando que queden opciones eliminadas en RTDB.
        await set(ref(db, `${RUTA_RECETAS}/${id}`), datos);
      }
      setRecetas((prev) => [
        ...prev.filter((r) => r.id !== id),
        { id: id!, ...datos },
      ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setSeleccionadaId(id);
      setNueva(false);
      setEditando(false);
    } catch (e) {
      console.error("Error guardando receta:", e);
      alert("No se pudo guardar la receta en Firebase.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!seleccionadaId || !window.confirm(`¿Eliminar la receta "${nombre}"? Esta acción no modifica el inventario.`)) return;
    setGuardando(true);
    try {
      await remove(ref(db, `${RUTA_RECETAS}/${seleccionadaId}`));
      setRecetas((prev) => prev.filter((r) => r.id !== seleccionadaId));
      setSeleccionadaId(null);
      setEditando(false);
      setNueva(false);
    } catch (e) {
      console.error("Error eliminando receta:", e);
      alert("No se pudo eliminar la receta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="recetas-armado">
      <aside className="recetas-sidebar">
        <h2>RECETAS DE ARMADO</h2>
        <input aria-label="Buscar receta" placeholder="Buscar receta..." value={busquedaRecetas}
          onChange={(e) => setBusquedaRecetas(e.target.value)} />
        {cargando && <p>Cargando...</p>}
        {error && <p className="recetas-error">{error}</p>}
        {!cargando && recetasFiltradas.map((receta) => (
          <button key={receta.id} type="button"
            className={`recetas-item ${seleccionadaId === receta.id ? "seleccionada" : ""}`}
            onClick={() => seleccionar(receta)}>
            <span>{receta.nombre}</span>
            {!receta.habilitado && <small>Deshabilitada</small>}
          </button>
        ))}
        <button type="button" className="recetas-agregar" onClick={crearNueva} disabled={cargando || guardando}>
          + NUEVA RECETA
        </button>
      </aside>

      <section className="recetas-contenido">
        <h2>{nueva ? "NUEVA RECETA" : "INFORMACIÓN DE LA RECETA"}</h2>
        {!seleccionadaId && !nueva ? <p>Selecciona una receta o crea una nueva.</p> : (
          <>
            <div className="recetas-campo">
              <label htmlFor="receta-nombre">Nombre de la receta</label>
              {editando ? <input id="receta-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. RESISTENCIA TUBULAR 5/16" /> : <strong>{nombre}</strong>}
            </div>
            <div className="recetas-campo recetas-check">
              <label htmlFor="receta-habilitada">Habilitada</label>
              {editando ? <input id="receta-habilitada" type="checkbox" checked={habilitado}
                onChange={(e) => setHabilitado(e.target.checked)} /> : <strong>{habilitado ? "Sí" : "No"}</strong>}
            </div>

            <h3>1. MATERIALES FIJOS — para fabricar 1 resistencia</h3>
            <div className="recetas-tabla-scroll">
              <table className="recetas-tabla">
                <thead><tr><th>ID</th><th>Material</th><th>Cantidad por resistencia</th>{editando && <th>Acción</th>}</tr></thead>
                <tbody>
                  {materiales.length === 0 && <tr><td colSpan={editando ? 4 : 3}>Sin materiales fijos.</td></tr>}
                  {materiales.map((material) => {
                    const producto = porId.get(material.materialId);
                    return <tr key={material.materialId}>
                      <td>{material.materialId}</td>
                      <td>{producto?.descripcion || "Material no encontrado en inventario"}
                        {producto && !producto.activo && <small className="recetas-inactivo"> (Inactivo)</small>}</td>
                      <td>{editando ? <input aria-label={`Cantidad de ${producto?.descripcion || material.materialId}`}
                        type="number" min="0.000001" step="any" value={material.cantidad}
                        onChange={(e) => setMateriales((prev) => prev.map((m) =>
                          m.materialId === material.materialId ? { ...m, cantidad: Number(e.target.value) } : m))} />
                        : material.cantidad}</td>
                      {editando && <td><button type="button" className="recetas-quitar"
                        onClick={() => setMateriales((prev) => prev.filter((m) => m.materialId !== material.materialId))}>Quitar</button></td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {editando && <div className="recetas-nuevo-material">
              <h3>Agregar material fijo del inventario</h3>
              <input placeholder="Buscar por nombre o ID (AL0035)..." value={busquedaMaterial}
                onChange={(e) => { setBusquedaMaterial(e.target.value); setMaterialElegido(""); }} />
              <div className="recetas-agregar-fila">
                <select aria-label="Material fijo del inventario" value={materialElegido}
                  onChange={(e) => setMaterialElegido(e.target.value)}>
                  <option value="">Selecciona un material...</option>
                  {opcionesMaterial.map((m) => <option key={m.id} value={m.id}>
                    {m.id} — {m.descripcion} (Existencia: {m.cantidad})
                  </option>)}
                </select>
                <input aria-label="Cantidad del nuevo material fijo" type="number" min="0.000001" step="any"
                  value={cantidadNueva} onChange={(e) => setCantidadNueva(e.target.value)} />
                <button type="button" onClick={agregarMaterial}>+ AGREGAR FIJO</button>
              </div>
            </div>}

            <h3>2. MATERIALES VARIABLES</h3>
            <p className="recetas-nota">Son alternativas registradas: la receta no utiliza todas a la vez. Su selección se conectará con Producción posteriormente.</p>
            <div className="recetas-tabla-scroll">
              <table className="recetas-tabla">
                <thead><tr><th>ID inventario</th><th>Material</th><th>ID opción del cotizador</th><th>Cantidad por resistencia</th>{editando && <th>Acción</th>}</tr></thead>
                <tbody>
                  {materialesVariables.length === 0 && <tr><td colSpan={editando ? 5 : 4}>Sin materiales variables.</td></tr>}
                  {materialesVariables.map((material, indice) => {
                    const producto = porId.get(material.materialId);
                    return <tr key={`${material.catalogoId}-${indice}`}>
                      <td>{editando ? <select aria-label={`Producto inventario de opción ${material.catalogoId}`}
                        value={material.materialId}
                        onChange={(e) => setMaterialesVariables((prev) => prev.map((m, i) => i === indice ? { ...m, materialId: e.target.value } : m))}>
                        {!producto && <option value={material.materialId}>{material.materialId} (no encontrado)</option>}
                        {inventario.filter((m) => m.activo || m.id === material.materialId).map((m) =>
                          <option key={m.id} value={m.id}>{m.id} — {m.descripcion}</option>)}
                      </select> : material.materialId}</td>
                      <td>{producto?.descripcion || "Material no encontrado en inventario"}
                        {producto && !producto.activo && <small className="recetas-inactivo"> (Inactivo)</small>}</td>
                      <td>{editando ? <select aria-label={`Opción del cotizador ${indice + 1}`} value={material.catalogoId}
                        onChange={(e) => setMaterialesVariables((prev) => prev.map((m, i) => i === indice ? { ...m, catalogoId: e.target.value } : m))}>
                          <option value="">Selecciona una opción...</option>
                          {material.catalogoId && !opcionPorId.has(material.catalogoId) && <option value={material.catalogoId}>ID anterior: {material.catalogoId} (no encontrado)</option>}
                          {opcionesCotizador.map((o) => <option key={o.id} value={o.id}>{o.tipo}</option>)}
                        </select> : `${opcionPorId.get(material.catalogoId)?.tipo || "Opción no encontrada"} (${material.catalogoId || "Sin vincular"})`}</td>
                      <td>{editando ? <input aria-label={`Cantidad variable ${indice + 1}`} type="number" min="0.000001" step="any"
                        value={material.cantidad} onChange={(e) => setMaterialesVariables((prev) => prev.map((m, i) =>
                          i === indice ? { ...m, cantidad: Number(e.target.value) } : m))} /> : material.cantidad}</td>
                      {editando && <td><button type="button" className="recetas-quitar"
                        onClick={() => setMaterialesVariables((prev) => prev.filter((_, i) => i !== indice))}>Quitar</button></td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            {editando && <div className="recetas-nuevo-material">
              <h3>Agregar material variable</h3>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 110px", gap: 10, alignItems: "end" }}>
                <label style={{ minWidth: 0 }}>
                  Material del inventario
                  <select aria-label="Material variable del inventario" value={variableElegida}
                    onChange={(e) => setVariableElegida(e.target.value)} style={{ width: "100%" }}>
                    <option value="">Selecciona un material...</option>
                    {opcionesVariable.map((m) => <option key={m.id} value={m.id}>
                      {m.id} — {m.descripcion} (Existencia: {m.cantidad})
                    </option>)}
                  </select>
                </label>
                <label style={{ minWidth: 0 }}>
                  Opción del cotizador
                  <select aria-label="Opción del cotizador" value={claveVariable}
                    onChange={(e) => setClaveVariable(e.target.value)} style={{ width: "100%" }}>
                    <option value="">Selecciona una opción...</option>
                    {opcionesCotizador.map((o) => <option key={o.id} value={o.id}>
                      {o.tipo} — ID: {o.id}
                    </option>)}
                  </select>
                </label>
                <label style={{ minWidth: 0 }}>
                  Cantidad
                  <input aria-label="Cantidad del nuevo material variable" type="number" min="0.000001" step="any"
                    value={cantidadVariable} onChange={(e) => setCantidadVariable(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box" }} />
                </label>
              </div>
              {errorCotizador && <p className="recetas-error">{errorCotizador}</p>}
              <button type="button" onClick={agregarVariable} style={{ marginTop: 10 }}>
                + AGREGAR VARIABLE
              </button>
            </div>}
            <div className="recetas-acciones">
              {editando ? <>
                <button type="button" className="recetas-guardar" onClick={guardar} disabled={guardando}>
                  {guardando ? "GUARDANDO..." : nueva ? "CREAR RECETA" : "GUARDAR CAMBIOS"}
                </button>
                <button type="button" onClick={cancelar} disabled={guardando}>CANCELAR</button>
                {!nueva && <button type="button" className="recetas-eliminar" onClick={eliminar} disabled={guardando}>ELIMINAR RECETA</button>}
              </> : <button type="button" onClick={() => setEditando(true)}>EDITAR RECETA</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default RecetasArmado;
