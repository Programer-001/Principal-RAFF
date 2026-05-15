import { useEffect, useMemo, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase/config";
import { ItemCotizado } from "../cotizador";
import { formatearMoneda } from "../funciones/formato_moneda";

interface Props {
  data?: ItemCotizado;
  onGuardar: (item: ItemCotizado) => void;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ServicioFirebase {
  id: string;
  tipo: string;
  precio: number;
  grupo: "reparacion" | "mantenimiento";
}

//const MANTENIMIENTO = ["SACAR HUMEDAD", "PINTAR", "CARDEAR"];

const MantenimientoReparacion = ({ data, onGuardar, setDirty }: Props) => {
  const [servicios, setServicios] = useState<ServicioFirebase[]>([]);
  const [seleccionados, setSeleccionados] = useState<Record<string, boolean>>({});
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [notas, setNotas] = useState("");

useEffect(() => {
  const cargarServicios = async () => {
    const snap = await get(ref(db, "cotizador/servicios"));

    if (!snap.exists()) return;

    const data = snap.val();

    const lista = Object.keys(data).flatMap<ServicioFirebase>((id) => {
      const tipo = String(data[id].Tipo || "");
      const precio = Number(data[id].Precio || 0);

      // 🔹 MANTENIMIENTO
      if (tipo === "SACAR HUMEDAD, PINTAR Y CARDEAR") {
        return [
          {
            id: `${id}_sacar_humedad`,
            tipo: "SACAR HUMEDAD",
            precio,
            grupo: "mantenimiento",
          },
          {
            id: `${id}_pintar`,
            tipo: "PINTAR",
            precio,
            grupo: "mantenimiento",
          },
          {
            id: `${id}_cardear`,
            tipo: "CARDEAR",
            precio,
            grupo: "mantenimiento",
          },
        ];
      }

      // 🔹 REPARACIÓN
      return [
        {
          id,
          tipo,
          precio,
          grupo: "reparacion",
        },
      ];
    });

    setServicios(lista);
  };

  cargarServicios();
}, []);

  useEffect(() => {
    if (!data) return;

    setSeleccionados(data.datos?.seleccionados || {});
    setCantidades(data.datos?.cantidades || {});
    setNotas(data.datos?.notas || "");
  }, [data]);

  const serviciosReparacion = servicios.filter(
    (s) => s.grupo === "reparacion"
  );

  const serviciosMantenimiento = servicios.filter(
    (s) => s.grupo === "mantenimiento"
  );

  const total = useMemo(() => {
    return servicios.reduce((acc, servicio) => {
      if (!seleccionados[servicio.id]) return acc;

      const cantidad = Number(cantidades[servicio.id] || 0);
      return acc + cantidad * servicio.precio;
    }, 0);
  }, [servicios, seleccionados, cantidades]);

const descripcion = useMemo(() => {
  const reparacion = serviciosReparacion.filter(
    (s) => seleccionados[s.id]
  );

  const mantenimiento = serviciosMantenimiento.filter(
    (s) => seleccionados[s.id]
  );

  const bloques: string[] = [];

  // 🔹 REPARACIÓN
  if (reparacion.length > 0) {
    const textoReparacion = reparacion
      .map(
        (s) =>
          `${s.tipo} CANTIDAD ${cantidades[s.id] || 0}`
      )
      .join(" / ");

    bloques.push(`REPARACIÓN:\n${textoReparacion}`);
  }

  // 🔹 MANTENIMIENTO
  if (mantenimiento.length > 0) {
    const textoMantenimiento = mantenimiento
      .map(
        (s) =>
          `${s.tipo} CANTIDAD ${cantidades[s.id] || 0}`
      )
      .join(" / ");

    bloques.push(`MANTENIMIENTO:\n${textoMantenimiento}`);
  }

  // 🔹 NOTAS
  if (notas.trim()) {
    bloques.push(`NOTAS ADICIONALES:\n${notas.trim()}`);
  }

  return bloques.join("\n\n");
}, [
  serviciosReparacion,
  serviciosMantenimiento,
  seleccionados,
  cantidades,
  notas,
]);

  const toggleServicio = (servicio: ServicioFirebase) => {
    setSeleccionados((prev) => {
      const activo = !prev[servicio.id];

      if (activo) {
        setCantidades((cant) => ({
          ...cant,
          [servicio.id]: cant[servicio.id] || 1,
        }));
      } else {
        setCantidades((cant) => ({
          ...cant,
          [servicio.id]: 0,
        }));
      }

      return {
        ...prev,
        [servicio.id]: activo,
      };
    });

    setDirty(true);
  };

const renderServicio = (servicio: ServicioFirebase) => {
  const activo = !!seleccionados[servicio.id];
  const cantidad = Number(cantidades[servicio.id] || 0);
  const subtotal = activo ? cantidad * servicio.precio : 0;

return (
  <div
    key={servicio.id}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
      flexWrap: "wrap",
    }}
  >
    {/* CHECK */}
    <input
      type="checkbox"
      checked={activo}
      onChange={() => toggleServicio(servicio)}
    />

    {/* NOMBRE */}
    <label
      style={{
        minWidth: 250,
        fontWeight: "bold",
      }}
    >
      {servicio.tipo}
    </label>

    {/* CANTIDAD */}
    {activo && (
      <input
        type="number"
        min={1}
        value={cantidad === 0 ? "" : cantidad}
        placeholder="Cantidad"
        style={{ width: 100 }}
        onChange={(e) => {
          setCantidades((prev) => ({
            ...prev,
            [servicio.id]: Number(e.target.value),
          }));
          setDirty(true);
        }}
      />
    )}

    {/* TOTAL */}
    {activo && (
      <b style={{ minWidth: 100 }}>
        {formatearMoneda(subtotal)}
      </b>
    )}
  </div>
);
};
  const guardar = () => {
    const haySeleccionado = servicios.some((s) => seleccionados[s.id]);

    if (!haySeleccionado) {
      alert("Selecciona al menos un servicio.");
      return;
    }

    onGuardar({
      id: data?.id || Date.now().toString(),
      tipo: "mantenimiento_reparacion",
      descripcion,
      total: Number(total.toFixed(2)),
      datos: {
        servicios,
        seleccionados,
        cantidades,
        notas,
      },
    });

    setSeleccionados({});
    setCantidades({});
    setNotas("");
    setDirty(false);
  };

  return (
    <div className="form-container">
      <h1>Mantenimiento y reparación</h1>

      <h2>Reparación</h2>
      {serviciosReparacion.map(renderServicio)}

      <h2>Mantenimiento</h2>
      {serviciosMantenimiento.map(renderServicio)}

      <div className="form-row textarea-row">
        <label>Notas adicionales</label>
        <textarea
          value={notas}
          onChange={(e) => {
            setNotas(e.target.value);
            setDirty(true);
          }}
          placeholder="Ej. revisar terminales, limpiar base, etc."
        />
      </div>

      <div className="form-row textarea-row full-width descripcion-row">
        <div className="descripcion-box">
          <label className="descripcion-title">Descripción</label>
          <p className="descripcion-texto">{descripcion}</p>
        </div>
      </div>

      <h2>Subtotal: {formatearMoneda(total)}</h2>

      <button className="btn btn-blue" onClick={guardar}>
        {data ? "ACTUALIZAR" : "AGREGAR"}
      </button>
    </div>
  );
};

export default MantenimientoReparacion;