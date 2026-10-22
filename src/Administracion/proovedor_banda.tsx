// src/cotizadores/proovedor_banda.tsx
// Cotizador independiente de Banda Proovedor.
// Lee la matriz de precios de Firebase y permite crear, editar y finalizar partidas.
import React, { useEffect, useMemo, useState } from "react";
import { get, push, ref, set } from "firebase/database";
import { db } from "../firebase/config";

type ProductoExtra = {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
};
type Partida = {
  id: string;
  tipo: "banda_proovedor";
  descripcion: string;
  total: number;
  datos: {
    diametro: number;
    ancho: number;
    cantidad: number;
    barreno: number;
    resaque: number;
    voltaje440: boolean;
    productosExtras: ProductoExtra[];
    notas: string;
    precioBase: number;
    subtotalExtras: number;
    incremento440: number;
    precioUnitario: number;
  };
};
type Props = {
  // Integración opcional con el cotizador principal: recibe la partida sin guardarla aquí.
  onGuardar?: (partida: Partida) => void;
  data?: Partida | null;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
};
type Tabla = Record<string, Record<string, number>>;
const RUTA_PRECIOS = "cotizador/Tabla_banda_proovedor";
// Ruta independiente para las cotizaciones finalizadas desde esta pantalla.
// No modifica ordenes_trabajo ni genera folios OT.
const RUTA_COTIZACIONES = "cotizaciones_banda_proovedor";
const MEDIDA_MIN = 1.5;
const MEDIDA_MAX = 15;
const PASO = 0.5;
const EXCEDENTE_POR_PASO = 5;
const moneda = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
const clave = (n: number) => String(n).replace(".", "_");
const nuevoId = () =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const numero = (n: unknown) => Number(n) || 0;

// Calcula el precio de la matriz. Fuera de 15, toma la última medida y suma $5
// por cada media pulgada adicional de diámetro y de ancho, independientemente.
// No extrapola medidas inferiores a 1.5 ni pasos diferentes a media pulgada.
function consultarPrecio(
  tabla: Tabla,
  diametro: number,
  ancho: number,
): number | null {
  if (
    ![diametro, ancho].every(
      (n) =>
        Number.isFinite(n) &&
        n >= MEDIDA_MIN &&
        Math.abs(n * 2 - Math.round(n * 2)) < 1e-8,
    )
  )
    return null;
  const d = Math.min(diametro, MEDIDA_MAX);
  const a = Math.min(ancho, MEDIDA_MAX);
  const base = tabla[clave(d)]?.[clave(a)];
  if (typeof base !== "number" || !Number.isFinite(base)) return null;
  const pasos =
    (Math.max(0, diametro - MEDIDA_MAX) + Math.max(0, ancho - MEDIDA_MAX)) /
    PASO;
  return base + pasos * EXCEDENTE_POR_PASO;
}

const estiloCampo: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  boxSizing: "border-box",
};
const estiloBoton: React.CSSProperties = {
  border: 0,
  borderRadius: 6,
  padding: "9px 14px",
  cursor: "pointer",
  background: "#2563eb",
  color: "white",
  fontWeight: 600,
};

const ProovedorBanda: React.FC<Props> = ({ onGuardar, data, setDirty }) => {
  const [tabla, setTabla] = useState<Tabla>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [diametro, setDiametro] = useState("");
  const [ancho, setAncho] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [barreno, setBarreno] = useState(false);
  const [cantidadBarreno, setCantidadBarreno] = useState(1);
  const [resaque, setResaque] = useState(false);
  const [cantidadResaque, setCantidadResaque] = useState(1);
  const [voltaje440, setVoltaje440] = useState(false);
  const [usarProductos, setUsarProductos] = useState(false);
  const [productos, setProductos] = useState<ProductoExtra[]>([]);
  const [notas, setNotas] = useState("");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Descarga una sola vez la tabla del proveedor desde Firebase Realtime Database.
  useEffect(() => {
    let activo = true;
    get(ref(db, RUTA_PRECIOS))
      .then((snap) => {
        if (!activo) return;
        if (!snap.exists()) throw new Error(`No existe ${RUTA_PRECIOS}`);
        setTabla(snap.val() as Tabla);
      })
      .catch((e) => {
        if (activo)
          setError(
            e instanceof Error ? e.message : "No se pudo cargar la tabla",
          );
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  // Carga los datos guardados al editar una partida desde el cotizador principal.
  useEffect(() => {
    if (!data?.datos) return;
    const d = data.datos;
    setEditando(data.id);
    setDiametro(String(d.diametro));
    setAncho(String(d.ancho));
    setCantidad(d.cantidad || 1);
    setBarreno(d.barreno > 0);
    setCantidadBarreno(d.barreno || 1);
    setResaque(d.resaque > 0);
    setCantidadResaque(d.resaque || 1);
    setVoltaje440(!!d.voltaje440);
    setProductos(d.productosExtras || []);
    setUsarProductos((d.productosExtras || []).length > 0);
    setNotas(d.notas || "");
  }, [data]);

  const precioBase = useMemo(
    () => consultarPrecio(tabla, Number(diametro), Number(ancho)),
    [tabla, diametro, ancho],
  );
  const extrasFijos =
    (barreno ? cantidadBarreno * 10 : 0) + (resaque ? cantidadResaque * 10 : 0);
  const incremento440 =
    precioBase === null
      ? 0
      : (precioBase + extrasFijos) * (voltaje440 ? 0.1 : 0);
  const extrasProductos = usarProductos
    ? productos.reduce((s, p) => s + p.cantidad * p.precio, 0)
    : 0;
  const precioUnitario =
    (precioBase ?? 0) + extrasFijos + incremento440 + extrasProductos;
  const totalActual = precioUnitario * cantidad;
  const totalPartidas = partidas.reduce((s, p) => s + p.total, 0);

  // Reinicia todos los campos tras agregar o actualizar una partida.
  const limpiar = () => {
    setDiametro("");
    setAncho("");
    setCantidad(1);
    setBarreno(false);
    setCantidadBarreno(1);
    setResaque(false);
    setCantidadResaque(1);
    setVoltaje440(false);
    setUsarProductos(false);
    setProductos([]);
    setNotas("");
    setEditando(null);
    setDirty?.(false);
  };

  // Construye una partida compatible con el resumen del cotizador principal.
  const agregar = () => {
    if (cargando || error || precioBase === null) {
      alert(
        "Ingresa medidas válidas en incrementos de 0.5 y verifica la tabla de Firebase.",
      );
      return;
    }
    if (
      !Number.isInteger(cantidad) ||
      cantidad < 1 ||
      (barreno &&
        (!Number.isInteger(cantidadBarreno) || cantidadBarreno < 1)) ||
      (resaque && (!Number.isInteger(cantidadResaque) || cantidadResaque < 1))
    ) {
      alert("Las cantidades deben ser números enteros mayores que cero.");
      return;
    }
    if (
      usarProductos &&
      productos.some(
        (p) =>
          !p.descripcion.trim() ||
          !Number.isFinite(p.precio) ||
          p.precio < 0 ||
          !Number.isInteger(p.cantidad) ||
          p.cantidad < 1,
      )
    ) {
      alert(
        "Completa la descripción, cantidad y precio de todos los productos extras.",
      );
      return;
    }
    const descripcion = [
      `BANDA PROOVEDOR - Ø ${diametro}\" X ANCHO ${ancho}\" - ${cantidad} PZA(S)`,
      barreno ? `BARRENOS (${cantidadBarreno})` : "",
      resaque ? `RESAQUES (${cantidadResaque})` : "",
      voltaje440 ? "440V (+10%)" : "",
      ...(usarProductos
        ? productos.map(
            (p, i) => `PRODUCTO ${i + 1}: ${p.descripcion} (${p.cantidad})`,
          )
        : []),
      notas.trim() ? `NOTAS: ${notas.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" / ");
    const partida: Partida = {
      id: editando || nuevoId(),
      tipo: "banda_proovedor",
      descripcion,
      total: totalActual,
      datos: {
        diametro: Number(diametro),
        ancho: Number(ancho),
        cantidad,
        barreno: barreno ? cantidadBarreno : 0,
        resaque: resaque ? cantidadResaque : 0,
        voltaje440,
        productosExtras: usarProductos ? productos.map((p) => ({ ...p })) : [],
        notas,
        precioBase,
        subtotalExtras: extrasFijos + extrasProductos,
        incremento440,
        precioUnitario,
      },
    };
    if (onGuardar) onGuardar(partida);
    else
      setPartidas((prev) =>
        editando
          ? prev.map((p) => (p.id === editando ? partida : p))
          : [...prev, partida],
      );
    limpiar();
    setMensaje("");
  };

  // Permite recuperar cualquier partida del resumen para corregir sus datos.
  const editar = (p: Partida) => {
    setEditando(p.id);
    const d = p.datos;
    setDiametro(String(d.diametro));
    setAncho(String(d.ancho));
    setCantidad(d.cantidad);
    setBarreno(d.barreno > 0);
    setCantidadBarreno(d.barreno || 1);
    setResaque(d.resaque > 0);
    setCantidadResaque(d.resaque || 1);
    setVoltaje440(d.voltaje440);
    setProductos(d.productosExtras.map((x) => ({ ...x })));
    setUsarProductos(d.productosExtras.length > 0);
    setNotas(d.notas);
  };

  // Finaliza y guarda las partidas en una ruta independiente de Firebase.
  // Solo limpia el resumen cuando Firebase confirma que el guardado fue exitoso.
  const finalizar = async () => {
    if (!partidas.length || guardando) return;
    setGuardando(true);
    setMensaje("");
    try {
      const destino = push(ref(db, RUTA_COTIZACIONES));
      await set(destino, {
        fecha: new Date().toISOString(),
        estado: "finalizada",
        partidas,
        subtotal: totalPartidas,
        total: totalPartidas,
      });
      setPartidas([]);
      limpiar();
      setMensaje(
        `Guardado correctamente en ${RUTA_COTIZACIONES}/${destino.key}`,
      );
    } catch (e) {
      console.error("Error al guardar Banda Proovedor:", e);
      setMensaje(
        "No se pudo guardar en Firebase. Las partidas siguen disponibles.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const actualizarProducto = (id: string, cambio: Partial<ProductoExtra>) => {
    setProductos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...cambio } : p)),
    );
    setDirty?.(true);
  };
  const inputNumero = (
    valor: string,
    cambio: (n: number) => void,
    minimo = 1,
  ) => {
    const n = Number(valor);
    cambio(valor === "" ? 0 : Math.max(minimo, n));
    setDirty?.(true);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
        gap: "30px",
        width: "100%",
        maxWidth: "1200px",
        margin: "30px auto",
        padding: "0 20px",
        boxSizing: "border-box",
        alignItems: "start",
      }}
    >
      <section style={{ minWidth: 0 }}>
        <h2>Banda Proovedor</h2>
        {cargando && <p>Cargando tabla de precios...</p>}
        {error && <p style={{ color: "#b91c1c" }}>Error: {error}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 12,
          }}
        >
          <label>
            Diámetro (pulgadas)
            <input
              style={estiloCampo}
              type="number"
              min="1.5"
              step="0.5"
              value={diametro}
              onChange={(e) => {
                setDiametro(e.target.value);
                setDirty?.(true);
              }}
              placeholder="Ej. 10.5"
            />
          </label>
          <label>
            Ancho (pulgadas)
            <input
              style={estiloCampo}
              type="number"
              min="1.5"
              step="0.5"
              value={ancho}
              onChange={(e) => {
                setAncho(e.target.value);
                setDirty?.(true);
              }}
              placeholder="Ej. 5"
            />
          </label>
          <label>
            Cantidad de bandas
            <input
              style={estiloCampo}
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={(e) => inputNumero(e.target.value, setCantidad)}
            />
          </label>
        </div>
        <h3>Extras</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={barreno}
              onChange={(e) => {
                setBarreno(e.target.checked);
                setDirty?.(true);
              }}
            />{" "}
            Barreno ($10 c/u)
          </label>
          {barreno && (
            <label>
              Cantidad de barrenos{" "}
              <input
                type="number"
                min="1"
                step="1"
                value={cantidadBarreno}
                onChange={(e) =>
                  inputNumero(e.target.value, setCantidadBarreno)
                }
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={resaque}
              onChange={(e) => {
                setResaque(e.target.checked);
                setDirty?.(true);
              }}
            />{" "}
            Resaque ($10 c/u)
          </label>
          {resaque && (
            <label>
              Cantidad de resaques{" "}
              <input
                type="number"
                min="1"
                step="1"
                value={cantidadResaque}
                onChange={(e) =>
                  inputNumero(e.target.value, setCantidadResaque)
                }
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={voltaje440}
              onChange={(e) => {
                setVoltaje440(e.target.checked);
                setDirty?.(true);
              }}
            />{" "}
            440 V (+10% del precio base y extras fijos)
          </label>
        </div>
        <h3>Productos extras</h3>
        <label>
          <input
            type="checkbox"
            checked={usarProductos}
            onChange={(e) => {
              setUsarProductos(e.target.checked);
              setDirty?.(true);
            }}
          />{" "}
          Agregar productos extras
        </label>
        {usarProductos && (
          <div style={{ marginTop: 12 }}>
            {productos.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(100px,2fr) 75px 110px 70px 35px",
                  gap: 7,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <input
                  aria-label={`Descripción producto ${i + 1}`}
                  placeholder={`Producto ${i + 1} - Descripción`}
                  style={estiloCampo}
                  value={p.descripcion}
                  onChange={(e) =>
                    actualizarProducto(p.id, { descripcion: e.target.value })
                  }
                />
                <input
                  aria-label="Cantidad"
                  style={estiloCampo}
                  type="number"
                  min="1"
                  step="1"
                  value={p.cantidad}
                  onChange={(e) =>
                    actualizarProducto(p.id, {
                      cantidad: numero(e.target.value),
                    })
                  }
                />
                <input
                  aria-label="Precio"
                  style={estiloCampo}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  value={p.precio}
                  onChange={(e) =>
                    actualizarProducto(p.id, { precio: numero(e.target.value) })
                  }
                />
                <strong>{moneda(p.cantidad * p.precio)}</strong>
                <button
                  type="button"
                  aria-label="Eliminar producto"
                  onClick={() =>
                    setProductos((prev) => prev.filter((x) => x.id !== p.id))
                  }
                  style={{ ...estiloBoton, background: "#dc2626", padding: 8 }}
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              style={estiloBoton}
              onClick={() => {
                setProductos((prev) => [
                  ...prev,
                  { id: nuevoId(), descripcion: "", cantidad: 1, precio: 0 },
                ]);
                setDirty?.(true);
              }}
            >
              + Agregar producto extra
            </button>
          </div>
        )}
        <h3>Notas adicionales</h3>
        <textarea
          style={{ ...estiloCampo, minHeight: 90 }}
          placeholder="Observaciones, especificaciones, instrucciones..."
          value={notas}
          onChange={(e) => {
            setNotas(e.target.value);
            setDirty?.(true);
          }}
        />
        <div
          style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 15 }}
        >
          <p>
            Precio base:{" "}
            <strong>{precioBase === null ? "--" : moneda(precioBase)}</strong>
          </p>
          <p>
            Extras fijos: {moneda(extrasFijos)} · 440 V: {moneda(incremento440)}{" "}
            · Productos: {moneda(extrasProductos)}
          </p>
          <p>
            Precio unitario:{" "}
            <strong>
              {precioBase === null ? "--" : moneda(precioUnitario)}
            </strong>
          </p>
          <h3>Total: {precioBase === null ? "--" : moneda(totalActual)}</h3>
          <button
            type="button"
            style={estiloBoton}
            disabled={cargando || !!error || precioBase === null}
            onClick={agregar}
          >
            {editando ? "Actualizar" : "Agregar"}
          </button>
          {editando && (
            <button
              type="button"
              style={{ ...estiloBoton, background: "#64748b", marginLeft: 8 }}
              onClick={limpiar}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </section>
      {/* Si se usa dentro del cotizador principal, este ya tiene su propio resumen a la derecha. */}
      {!onGuardar && (
        <aside
          style={{
            border: "1px solid #ddd",
            borderRadius: 9,
            padding: 16,
            position: "sticky",
            top: 12,
          }}
        >
          <h2>Resumen</h2>
          <h3>Bandas agregadas</h3>
          {!partidas.length && <p>Aún no hay partidas agregadas.</p>}
          {partidas.map((p, i) => (
            <div
              key={p.id}
              style={{ borderBottom: "1px solid #ddd", padding: "12px 0" }}
            >
              <strong>Partida {i + 1}</strong>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {p.descripcion}
              </p>
              <strong>{moneda(p.total)}</strong>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  style={estiloBoton}
                  onClick={() => editar(p)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  style={{ ...estiloBoton, background: "#dc2626" }}
                  onClick={() => {
                    setPartidas((prev) => prev.filter((x) => x.id !== p.id));
                    if (editando === p.id) limpiar();
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          <h3>Total a pagar: {moneda(totalPartidas)}</h3>
          <p style={{ fontSize: 12, color: "#64748b" }}>
            Importes sin IVA. No se genera una OT desde esta pantalla.
          </p>
          <button
            type="button"
            style={{ ...estiloBoton, background: "#16a34a" }}
            disabled={!partidas.length || guardando}
            onClick={finalizar}
          >
            {guardando ? "Guardando..." : "Finalizar y guardar en Firebase"}
          </button>
          {mensaje && <p role="status">{mensaje}</p>}
        </aside>
      )}
    </div>
  );
};
export default ProovedorBanda;
