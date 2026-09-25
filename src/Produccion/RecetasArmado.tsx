// src/Produccion/RecetasArmado.tsx
import React, { useEffect, useMemo, useState } from "react";
import { get, onValue, push, ref, remove, set } from "firebase/database";
import { db } from "../firebase/config";
import "../css/RecetasArmado.css";

type MaterialInventario = {
  id: string;
  descripcion: string;
  cantidad: number;
  activo: boolean;
};

type OpcionCotizador = { id: string; tipo: string; };
type DiametroReceta = { id: string; tipo: string; };

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
  tipo: string;
  habilitado: boolean;
  materiales: MaterialReceta[];
  materialesVariables: MaterialVariable[];
  diametros: DiametroReceta[];
};

// El valor debe coincidir con el campo tipo de cada trabajo en Producción.
const TIPOS_RECETA = [
  { value: "tubular", label: "Tubular" },
  { value: "banda", label: "Banda" },
  { value: "CartuchoA", label: "Cartucho Alta" },
  { value: "CartuchoB", label: "Cartucho Baja" },
  { value: "cuarzo", label: "Cuarzo" },
  { value: "mantenimiento_reparacion", label: "Mantenimiento / Reparación" },
  { value: "personalizado", label: "Personalizado" },
] as const;

const RUTA_RECETAS = "produccion/recetas_armado";
const RUTA_INVENTARIO = "produccion/almacen_inventario";
const RUTA_TORNILLOS = "cotizador/tornillo";
const RUTA_DIAMETROS = "cotizador/Diametro_del_tubo";

function comoLista(valor: unknown): any[] {
  if (Array.isArray(valor)) return valor;
  if (valor && typeof valor === "object") return Object.values(valor);
  return [];
}

const RecetasArmado: React.FC = () => {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [inventario, setInventario] = useState<MaterialInventario[]>([]);
  const [opcionesCotizador, setOpcionesCotizador] = useState<OpcionCotizador[]>([]);
  const [catalogoDiametros, setCatalogoDiametros] = useState<DiametroReceta[]>([]);
  const [diametros, setDiametros] = useState<DiametroReceta[]>([]);
  const [diametroElegido, setDiametroElegido] = useState("");
  const [errorDiametros, setErrorDiametros] = useState("");
  const [errorCotizador, setErrorCotizador] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [nueva, setNueva] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("tubular");
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
  const [errorInventario, setErrorInventario] = useState("");

  const cargarDatos = async () => {
    setCargando(true);
    setError("");
    try {
      const [snapRecetas, snapInventario] = await Promise.all([
        get(ref(db, RUTA_RECETAS)),
        get(ref(db, RUTA_INVENTARIO)),
      ]);
      // El catálogo de diámetros se consulta independientemente para no bloquear recetas antiguas.
      try {
        const snapDiametros = await get(ref(db, RUTA_DIAMETROS));
        const datosDiametros = (snapDiametros.val() || {}) as Record<string, any>;
        const lista = Object.entries(datosDiametros)
          .filter(([, dato]) => dato && typeof dato === "object" && !Array.isArray(dato))
          .map(([id, dato]) => ({ id, tipo: String(dato.Tipo ?? dato.tipo ?? "").trim() }))
          .filter((item) => item.id && item.tipo)
          .sort((a, b) => a.tipo.localeCompare(b.tipo, "es"));
        setCatalogoDiametros(lista);
        setErrorDiametros(lista.length ? "" : "No se encontraron diámetros en cotizador/Diametro_del_tubo.");
      } catch (e) {
        console.error("Error consultando diámetros:", e);
        setCatalogoDiametros([]);
        setErrorDiametros("No se pudo leer el catálogo de diámetros. Revisa la ruta y los permisos de Firebase.");
      }
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
        // Recetas antiguas sin tipo: se consideran tubulares hasta que se editen.
        tipo: String(dato?.tipo || "tubular"),
        habilitado: dato?.habilitado !== false,
        diametros: comoLista(dato?.diametros)
          .filter((d) => d && d.id)
          .map((d) => ({ id: String(d.id), tipo: String(d.tipo ?? d.Tipo ?? "") })),
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

  // Mantener las existencias y las bajas de productos actualizadas mientras está abierto el módulo.
  useEffect(() => {
    const cancelarSuscripcion = onValue(
      ref(db, RUTA_INVENTARIO),
      (snapshot) => {
        const datos = (snapshot.val() || {}) as Record<string, any>;
        setInventario(Object.entries(datos).map(([id, dato]) => ({
          id,
          descripcion: String(dato?.descripcion || "Sin descripción"),
          cantidad: Number(dato?.cantidad || 0),
          activo: dato?.activo !== false && dato?.activo !== 0 && dato?.activo !== "false",
        })).sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es")));
        setErrorInventario("");
      },
      (e) => {
        console.error("Error actualizando inventario:", e);
        setErrorInventario("No se pudo actualizar el inventario. Verifica la conexión y vuelve a abrir el módulo.");
      }
    );
    return () => cancelarSuscripcion();
  }, []);

  const estadoMaterial = (producto?: MaterialInventario) => {
    if (!producto) return <strong style={{ color: "#b42318" }}>⚠️ Material no encontrado</strong>;
    if (!producto.activo) return <strong style={{ color: "#b54708" }}>⛔ Material inactivo</strong>;
    if (producto.cantidad <= 0) return <strong style={{ color: "#b54708" }}>🟠 Material agotado (Existencia: {producto.cantidad})</strong>;
    return <span style={{ color: "#16703c" }}>✅ Disponible (Existencia: {producto.cantidad})</span>;
  };

  const porId = useMemo(() => new Map(inventario.map((m) => [m.id, m])), [inventario]);
  const opcionPorId = useMemo(() => new Map(opcionesCotizador.map((o) => [o.id, o])), [opcionesCotizador]);
  const diametroPorId = useMemo(() => new Map(catalogoDiametros.map((d) => [d.id, d])), [catalogoDiametros]);
  const diametrosDisponibles = catalogoDiametros.filter((d) => !diametros.some((agregado) => agregado.id === d.id));
  const recetasFiltradas = recetas.filter((r) =>
    r.nombre.toLocaleLowerCase("es").includes(busquedaRecetas.trim().toLocaleLowerCase("es"))
  );
  const opcionesMaterial = inventario.filter((m) =>
    m.activo && !materiales.some((item) => item.materialId === m.id) &&
    `${m.id} ${m.descripcion}`.toLocaleLowerCase("es").includes(busquedaMaterial.trim().toLocaleLowerCase("es"))
  );
  // El mismo tornillo puede corresponder a argón y a plata: no ocultarlo al agregar otra opción.
  const opcionesVariable = inventario.filter((m) => m.activo);

  const llenarFormulario = (receta: Receta) => {
    setNombre(receta.nombre);
    setTipo(receta.tipo);
    setDiametros(receta.diametros.map((d) => ({ ...d })));
    setDiametroElegido("");
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
    setTipo("tubular");
    setDiametros([]);
    setDiametroElegido("");
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

  const agregarDiametro = () => {
    const opcion = diametroPorId.get(diametroElegido);
    if (!opcion) return alert("Selecciona un diámetro válido del catálogo.");
    if (diametros.some((d) => d.id === opcion.id)) return alert("Este diámetro ya está asociado a la receta.");
    setDiametros((prev) => [...prev, { id: opcion.id, tipo: opcion.tipo }]);
    setDiametroElegido("");
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
    setMaterialesVariables((prev) => [...prev, { materialId: variableElegida, catalogoId, cantidad }]);
    setVariableElegida("");
    setClaveVariable("");
    setCantidadVariable("2");
  };

  const guardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return alert("Escribe el nombre de la receta.");
    if (!TIPOS_RECETA.some((opcion) => opcion.value === tipo)) return alert("Selecciona a qué tipo de producto pertenece la receta.");
    if (materiales.length === 0) return alert("Agrega al menos un material fijo.");
    if (tipo === "tubular") {
      if (diametros.length === 0) return alert("Asocia al menos un diámetro a la receta tubular.");
      if (new Set(diametros.map((d) => d.id)).size !== diametros.length) return alert("Hay diámetros duplicados en esta receta.");
      if (diametros.some((d) => !diametroPorId.has(d.id))) return alert("Hay diámetros que ya no existen en el catálogo. Corrige la relación antes de guardar.");
    }
    const todos = [...materiales, ...materialesVariables];
    if (todos.some((m) => !m.materialId || !Number.isFinite(m.cantidad) || m.cantidad <= 0)) {
      return alert("Revisa las cantidades: todas deben ser mayores que cero.");
    }
    if (new Set(materiales.map((m) => m.materialId)).size !== materiales.length) return alert("Hay materiales fijos duplicados.");
    if (new Set(materialesVariables.map((m) => m.catalogoId.trim())).size !== materialesVariables.length ||
        materialesVariables.some((m) => !m.catalogoId.trim())) return alert("Cada material variable necesita un ID de opción único.");
    if (materialesVariables.some((m) => !opcionPorId.has(m.catalogoId))) return alert("Hay opciones del cotizador que no se encuentran en el catálogo. Revisa la relación antes de guardar.");
    if (todos.some((m) => !porId.has(m.materialId))) return alert("⚠️ Hay materiales que ya no existen en inventario. Selecciona su reemplazo antes de guardar.");
    const datos = {
      nombre: nombreLimpio,
      tipo,
      habilitado,
      diametros: diametros.map((d) => ({ id: d.id, tipo: diametroPorId.get(d.id)?.tipo ?? d.tipo })),
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
        {errorInventario && <p className="recetas-error">{errorInventario}</p>}
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
            <div className="recetas-campo">
              <label htmlFor="receta-tipo">Pertenece a</label>
              {editando ? (
                <select id="receta-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {!TIPOS_RECETA.some((opcion) => opcion.value === tipo) && (
                    <option value={tipo}>{tipo} (tipo anterior; selecciona uno válido)</option>
                  )}
                  {TIPOS_RECETA.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
                  ))}
                </select>
              ) : (
                <strong>{TIPOS_RECETA.find((opcion) => opcion.value === tipo)?.label || tipo}</strong>
              )}
            </div>
            {tipo === "tubular" && (
              <div className="recetas-nuevo-material">
                <h3>DIÁMETROS ASOCIADOS A ESTA RECETA</h3>
                <p className="recetas-nota">Puedes asociar varios diámetros a una misma receta. Cada diámetro agregado desaparece del selector de esta receta para evitar duplicados.</p>
                {diametros.length === 0 ? <p>Sin diámetros asociados.</p> : (
                  <div className="recetas-tabla-scroll">
                    <table className="recetas-tabla">
                      <thead><tr><th>Diámetro</th><th>Estado del catálogo</th>{editando && <th>Acción</th>}</tr></thead>
                      <tbody>{diametros.map((d) => {
                        const actual = diametroPorId.get(d.id);
                        return (
                          <tr key={d.id}>
                            <td>{actual?.tipo || d.tipo || d.id}</td>
                            <td>{actual ? "✅ Vinculado" : `⚠️ Diámetro no encontrado (ID anterior: ${d.id})`}</td>
                            {editando && <td><button type="button" className="recetas-quitar"
                              onClick={() => setDiametros((prev) => prev.filter((item) => item.id !== d.id))}>Quitar</button></td>}
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
                {editando && (
                  <div className="recetas-agregar-fila">
                    <select aria-label="Diámetro del tubo" value={diametroElegido}
                      onChange={(e) => setDiametroElegido(e.target.value)}>
                      <option value="">Selecciona un diámetro...</option>
                      {diametrosDisponibles.map((d) => <option key={d.id} value={d.id}>{d.tipo}</option>)}
                    </select>
                    <button type="button" onClick={agregarDiametro} disabled={!diametroElegido}>+ AGREGAR DIÁMETRO</button>
                  </div>
                )}
                {errorDiametros && <p className="recetas-error">{errorDiametros}</p>}
              </div>
            )}
            <div className="recetas-campo recetas-check">
              <label htmlFor="receta-habilitada">Habilitada</label>
              {editando ? <input id="receta-habilitada" type="checkbox" checked={habilitado}
                onChange={(e) => setHabilitado(e.target.checked)} /> : <strong>{habilitado ? "Sí" : "No"}</strong>}
            </div>

            <h3>1. MATERIALES FIJOS — para fabricar 1 resistencia</h3>
            <div className="recetas-tabla-scroll">
              <table className="recetas-tabla">
                <thead><tr><th>ID</th><th>Material</th><th>Estado de inventario</th><th>Cantidad por resistencia</th>{editando && <th>Acción</th>}</tr></thead>
                <tbody>
                  {materiales.length === 0 && <tr><td colSpan={editando ? 5 : 4}>Sin materiales fijos.</td></tr>}
                  {materiales.map((material, indice) => {
                    const producto = porId.get(material.materialId);
                    return <tr key={`${material.materialId}-${indice}`}>
                      <td>{editando ? <select aria-label={`Producto fijo ${material.materialId}`} value={material.materialId}
                        onChange={(e) => setMateriales((prev) => prev.map((m, i) =>
                          i === indice ? { ...m, materialId: e.target.value } : m))}>
                        {!producto && <option value={material.materialId}>ID anterior: {material.materialId} (no encontrado)</option>}
                        {inventario.filter((m) => m.activo || m.id === material.materialId).map((m) =>
                          <option key={m.id} value={m.id}>{m.id} — {m.descripcion}</option>)}
                      </select> : material.materialId}</td>
                      <td>{producto?.descripcion || `ID anterior: ${material.materialId}`}</td>
                      <td>{estadoMaterial(producto)}</td>
                      <td>{editando ? <input aria-label={`Cantidad de ${producto?.descripcion || material.materialId}`}
                        type="number" min="0.000001" step="any" value={material.cantidad}
                        onChange={(e) => setMateriales((prev) => prev.map((m, i) =>
                          i === indice ? { ...m, cantidad: Number(e.target.value) } : m))} />
                        : material.cantidad}</td>
                      {editando && <td><button type="button" className="recetas-quitar"
                        onClick={() => setMateriales((prev) => prev.filter((_, i) => i !== indice))}>Quitar</button></td>}
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
                <thead><tr><th>ID inventario</th><th>Material</th><th>Estado de inventario</th><th>Opción del cotizador</th><th>Cantidad por resistencia</th>{editando && <th>Acción</th>}</tr></thead>
                <tbody>
                  {materialesVariables.length === 0 && <tr><td colSpan={editando ? 6 : 5}>Sin materiales variables.</td></tr>}
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
                      <td>{producto?.descripcion || `ID anterior: ${material.materialId}`}</td>
                      <td>{estadoMaterial(producto)}</td>
                      <td>{editando ? <select aria-label={`Opción del cotizador ${indice + 1}`} value={material.catalogoId}
                        onChange={(e) => setMaterialesVariables((prev) => prev.map((m, i) => i === indice ? { ...m, catalogoId: e.target.value } : m))}>
                          <option value="">Selecciona una opción...</option>
                          {material.catalogoId && !opcionPorId.has(material.catalogoId) && <option value={material.catalogoId}>ID anterior: {material.catalogoId} (no encontrado)</option>}
                          {opcionesCotizador.map((o) => <option key={o.id} value={o.id}>{o.tipo}</option>)}
                        </select> : (opcionPorId.get(material.catalogoId)?.tipo || "⚠️ Opción del cotizador no encontrada")}</td>
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
                      {o.tipo}
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
