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
// REPARACIÓN Tornillo
  const [opcionesTornillo, setOpcionesTornillo] = useState<ServicioFirebase[]>([]);
  const [soldarTornillo, setSoldarTornillo] = useState(false);
  const [tornilloSeleccionado, setTornilloSeleccionado] = useState<ServicioFirebase | null>(null);
  const [cantidadTornillo, setCantidadTornillo] = useState(0);

useEffect(() => {
  const cargarServicios = async () => {
    const [snapServicios, snapTornillo] = await Promise.all([
      get(ref(db, "cotizador/servicios")),
      get(ref(db, "cotizador/tornillo")),
    ]);

    // =========================
    // SERVICIOS
    // =========================
    if (snapServicios.exists()) {
      const data = snapServicios.val();

      const lista = Object.keys(data).flatMap<ServicioFirebase>((id) => {
        const tipo = String(data[id].Tipo || "");
        const precio = Number(data[id].Precio || 0);

        // 🔹 MANTENIMIENTO
        // Un solo registro en Firebase se divide en 3 checkbox
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

        // 🔹 TODO LO DEMÁS ES REPARACIÓN
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
    } else {
      setServicios([]);
    }

    // =========================
    // TORNILLO PARA SELECT
    // =========================
    if (snapTornillo.exists()) {
      const dataTornillo = snapTornillo.val();

      const listaTornillo = Object.keys(dataTornillo)
        .map<ServicioFirebase>((id) => ({
          id: `tornillo_${id}`,
          tipo: String(dataTornillo[id].Tipo || ""),
          precio: Number(dataTornillo[id].Precio || 0),
          grupo: "reparacion",
        }))
        .filter((t) => t.tipo && t.tipo !== "NO");

      setOpcionesTornillo(listaTornillo);
    } else {
      setOpcionesTornillo([]);
    }
  };

  cargarServicios();
}, []);
// CARGAR DATOS EXISTENTES SI VIENEN EN PROPS
  useEffect(() => {
    if (!data) return;

    setSeleccionados(data.datos?.seleccionados || {});
    setCantidades(data.datos?.cantidades || {});
    setNotas(data.datos?.notas || "");

    setSoldarTornillo(data.datos?.soldarTornillo || false);
    setTornilloSeleccionado(data.datos?.tornilloSeleccionado || null);
    setCantidadTornillo(data.datos?.cantidadTornillo || 0);
  }, [data]);

  const serviciosReparacion = servicios.filter(
    (s) => s.grupo === "reparacion"
  );

  const serviciosMantenimiento = servicios.filter(
    (s) => s.grupo === "mantenimiento"
  );


// CÁLCULO DE TOTALES
  const total = useMemo(() => {
    return servicios.reduce((acc, servicio) => {
      if (!seleccionados[servicio.id]) return acc;

      const cantidad = Number(cantidades[servicio.id] || 0);
      return acc + cantidad * servicio.precio;
    }, 0);
  }, [servicios, seleccionados, cantidades]);
// CÁLCULO TOTAL TORNILLO
  const totalTornillo =
  soldarTornillo && tornilloSeleccionado
    ? (Number(cantidadTornillo) || 0) * tornilloSeleccionado.precio
    : 0;

const totalGeneral = total + totalTornillo;



const descripcion = useMemo(() => {
  const reparacion = serviciosReparacion.filter(
    (s) => seleccionados[s.id]
  );

  const mantenimiento = serviciosMantenimiento.filter(
    (s) => seleccionados[s.id]
  );

  const bloques: string[] = [];

  // =========================
  // REPARACIÓN
  // =========================
  if (reparacion.length > 0) {
    const textoReparacion = reparacion
      .map(
        (s) =>
          `${s.tipo} CANTIDAD ${cantidades[s.id] || 0}`
      )
      .join(" / ");

    bloques.push(`REPARACIÓN:\n${textoReparacion}`);
  }

  // =========================
  // SOLDAR TORNILLO
  // =========================
  if (soldarTornillo && tornilloSeleccionado) {
    bloques.push(
      `SOLDAR TORNILLO:\n${tornilloSeleccionado.tipo} CANTIDAD ${cantidadTornillo || 0}`
    );
  }

  // =========================
  // MANTENIMIENTO
  // =========================
  if (mantenimiento.length > 0) {
    const textoMantenimiento = mantenimiento
      .map(
        (s) =>
          `${s.tipo} CANTIDAD ${cantidades[s.id] || 0}`
      )
      .join(" / ");

    bloques.push(`MANTENIMIENTO:\n${textoMantenimiento}`);
  }

  // =========================
  // NOTAS
  // =========================
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

  soldarTornillo,
  tornilloSeleccionado,
  cantidadTornillo,
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

  if (!haySeleccionado && !soldarTornillo) {
    alert("Selecciona al menos un servicio.");
    return;
  }

  // 🔹 VALIDAR TORNILLO
  if (soldarTornillo && !tornilloSeleccionado) {
    alert("Selecciona el tipo de tornillo.");
    return;
  }

  onGuardar({
    id: data?.id || Date.now().toString(),
    tipo: "mantenimiento_reparacion",
    descripcion,
    total: Number(totalGeneral.toFixed(2)),
    datos: {
      servicios,
      seleccionados,
      cantidades,
      soldarTornillo,
      tornilloSeleccionado,
      cantidadTornillo,
      totalTornillo,
      notas,
    },
  });

  setSeleccionados({});
  setCantidades({});
  setSoldarTornillo(false);
  setTornilloSeleccionado(null);
  setCantidadTornillo(0);
  setNotas("");
  setDirty(false);
};
  return (
    <div className="form-container">
      <h1>Mantenimiento y reparación</h1>

      <h2>Reparación</h2>
      {/* 🔹 SOLDAR TORNILLO */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 15,
            flexWrap: "wrap",
          }}
        >
          {/* CHECK */}
          <input
            type="checkbox"
            checked={soldarTornillo}
            onChange={(e) => {
              const activo = e.target.checked;

              setSoldarTornillo(activo);

              if (!activo) {
                setTornilloSeleccionado(null);
                setCantidadTornillo(0);
              } else {
                setCantidadTornillo(1);
              }

              setDirty(true);
            }}
          />

          {/* TEXTO */}
          <label
            style={{
              minWidth: 220,
              fontWeight: "bold",
            }}
          >
            SOLDAR TORNILLO
          </label>

          {/* SELECT */}
          {soldarTornillo && (
            <>
              <select
                value={tornilloSeleccionado?.id || ""}
                onChange={(e) => {
                  const seleccionado = opcionesTornillo.find(
                    (t) => t.id === e.target.value
                  );

                  setTornilloSeleccionado(seleccionado || null);
                  setDirty(true);
                }}
              >
                <option value="">Seleccione...</option>

                {opcionesTornillo.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tipo}
                  </option>
                ))}
              </select>

              {/* CANTIDAD */}
              <input
                type="number"
                min={1}
                value={cantidadTornillo === 0 ? "" : cantidadTornillo}
                placeholder="Cantidad"
                style={{ width: 90 }}
                onChange={(e) => {
                  setCantidadTornillo(Number(e.target.value));
                  setDirty(true);
                }}
              />

              {/* TOTAL */}
              <b style={{ minWidth: 100 }}>
                {formatearMoneda(totalTornillo)}
              </b>
            </>
          )}
        </div>
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

      <h2>Subtotal: {formatearMoneda(totalGeneral)}</h2>

      <button className="btn btn-blue" onClick={guardar}>
        {data ? "ACTUALIZAR" : "AGREGAR"}
      </button>
    </div>
  );
};

export default MantenimientoReparacion;