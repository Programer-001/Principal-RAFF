import React, { useMemo, useState } from "react";
import ProductosExtras, { ProductoExtra } from "./ProductosExtras";

type Servicio = {
  key: string;
  nombre: string;
  precio: number;
};

type PersonalizadoProps = {
  onGuardar?: (trabajo: any) => void;
  data?: any;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
};

const SERVICIOS: Servicio[] = [
  { key: "soldarTornillo", nombre: "SOLDAR TORNILLO", precio: 0 },
  { key: "soldaduraResistencia", nombre: "SOLDADURA EN RESISTENCIA", precio: 0 },
  { key: "soldarCables", nombre: "SOLDAR CABLES", precio: 0 },
  { key: "desoldar", nombre: "DESOLDAR", precio: 0 },
  { key: "sellosGarlock", nombre: "SELLOS DE GARLOCK", precio: 0 },
  { key: "termoposoBase", nombre: "TERMOPOZO EN BASE", precio: 0 },
  { key: "cambioTornilloCliente", nombre: "CAMBIO DE TORNILLO MISMO DEL CLIENTE", precio: 0 },
  { key: "puentes", nombre: "PUENTES", precio: 0 },
  { key: "soldarBorne", nombre: "SOLDAR BORNE", precio: 0 },
  { key: "sacarHumedad", nombre: "SACAR HUMEDAD", precio: 0 },
  { key: "pintar", nombre: "PINTAR", precio: 0 },
  { key: "cardear", nombre: "CARDEAR", precio: 0 },
];

const formatearMoneda = (valor: number) =>
  valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const Personalizado: React.FC<PersonalizadoProps> = ({ onGuardar, data,setDirty }) => {
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<
    Record<string, boolean>
  >(data?.datos?.serviciosSeleccionados || {});

  const [preciosServicios, setPreciosServicios] = useState<Record<string, number>>(
    data?.datos?.preciosServicios || {}
  );

  const [productosActivos, setProductosActivos] = useState<boolean>(
    data?.datos?.productosActivos || false
  );

  const [productosExtras, setProductosExtras] = useState<ProductoExtra[]>(
    data?.datos?.productosExtras || []
  );

  const [notas, setNotas] = useState(data?.datos?.notas || "");

  const cambiarServicio = (key: string) => {
    setServiciosSeleccionados((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const cambiarPrecioServicio = (key: string, valor: string) => {
    setPreciosServicios((prev) => ({
      ...prev,
      [key]: Math.max(0, Number(valor) || 0),
    }));
  };

  const serviciosActivos = useMemo(() => {
    return SERVICIOS.filter((servicio) => serviciosSeleccionados[servicio.key]);
  }, [serviciosSeleccionados]);

  const totalManoObra = useMemo(() => {
    return serviciosActivos.reduce((acc, servicio) => {
      return acc + (preciosServicios[servicio.key] || 0);
    }, 0);
  }, [serviciosActivos, preciosServicios]);

  const totalProductos = useMemo(() => {
    return productosExtras.reduce((acc, item) => {
      return acc + (Number(item.cantidad) || 0) * (Number(item.precio) || 0);
    }, 0);
  }, [productosExtras]);

  const total = totalManoObra + totalProductos;

  const descripcion = useMemo(() => {
    const manoObraTexto =
      serviciosActivos.length > 0
        ? serviciosActivos.map((s) => s.nombre).join(" / ")
        : "";

    const productosTexto =
      productosExtras.length > 0
        ? productosExtras
            .filter((p) => p.descripcion.trim() !== "")
            .map((p) => `PRODUCTO: ${p.descripcion} (${p.cantidad})`)
            .join(" / ")
        : "";

    const notasTexto = notas.trim() ? `NOTAS: ${notas.trim()}` : "";

    return [
      "SERVICIO PERSONALIZADO",
      manoObraTexto,
      productosTexto,
      notasTexto,
    ]
      .filter(Boolean)
      .join(" / ");
  }, [serviciosActivos, productosExtras, notas]);

  const guardar = () => {
    if (!onGuardar) return;

    onGuardar({
      id: Date.now().toString(),
      tipo: "personalizado",
      descripcion,
      total: Number(total.toFixed(2)),
      datos: {
        serviciosSeleccionados,
        preciosServicios,
        productosActivos,
        productosExtras,
        totalManoObra,
        totalProductos,
        notas,
      },
    });
  };

  return (
    <div className="form-container">
      <h1>Servicio Personalizado</h1>

      <h2>Productos</h2>

      <ProductosExtras
        activo={productosActivos}
        setActivo={setProductosActivos}
        productosExtras={productosExtras}
        setProductosExtras={setProductosExtras}
      />

      <div className="form-row">
        <label>Notas adicionales</label>
        <textarea
          value={notas}
          placeholder="Ej. revisar terminales, limpiar base, etc."
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

    <div className="descripcion-box">
        <strong>Descripción</strong>
        <p>{descripcion}</p>
    </div>

        {onGuardar && (
          <button className="btn btn-blue" onClick={guardar}>
            Agregar a OT
          </button>
        )}

        <h3>Total: {formatearMoneda(total)}</h3>

    </div>
  );
};

export default Personalizado;