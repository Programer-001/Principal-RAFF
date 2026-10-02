import React, { useEffect, useMemo, useState } from "react";

type ProductoPersonalizado = {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
};

type PersonalizadoProps = {
  onGuardar?: (trabajo: any) => void;
  data?: any;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
};

const formatearMoneda = (valor: number) =>
  valor.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const crearId = () => {
  return `${Date.now()}-${Math.random()}`;
};

const crearProductoVacio = (): ProductoPersonalizado => ({
  id: crearId(),
  descripcion: "",
  cantidad: 1,
  precio: 0,
});

const Personalizado: React.FC<PersonalizadoProps> = ({
  onGuardar,
  data,
  setDirty,
}) => {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [productos, setProductos] = useState<ProductoPersonalizado[]>([
    crearProductoVacio(),
  ]);

  const [notas, setNotas] = useState("");
  const [servicioExpress, setServicioExpress] = useState(false);

  // =====================================================
  // CARGAR DATOS AL EDITAR
  // =====================================================

  useEffect(() => {
    if (data) {
      const productosGuardados =
        data?.datos?.productos ||
        data?.datos?.productosExtras ||
        [];

      setProductos(
        productosGuardados.length > 0
          ? productosGuardados
          : [crearProductoVacio()]
      );

      setNotas(data?.datos?.notas || "");
      setServicioExpress(data?.servicioExpress || false);
    } else {
      setProductos([crearProductoVacio()]);
      setNotas("");
      setServicioExpress(false);
    }
  }, [data]);

  // =====================================================
  // AGREGAR PRODUCTO
  // =====================================================

  const agregarProducto = () => {
    setProductos((prev) => [
      ...prev,
      crearProductoVacio(),
    ]);

    //setDirty?.(true);
  };

  // =====================================================
  // ACTUALIZAR PRODUCTO
  // =====================================================

  const actualizarProducto = (
    id: string,
    campo: keyof ProductoPersonalizado,
    valor: string | number
  ) => {
    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id
          ? {
              ...producto,
              [campo]: valor,
            }
          : producto
      )
    );

    //setDirty?.(true);
  };

  // =====================================================
  // ELIMINAR PRODUCTO
  // =====================================================

  const eliminarProducto = (id: string) => {
    setProductos((prev) => {
      const nuevosProductos = prev.filter(
        (producto) => producto.id !== id
      );

      // Siempre dejar al menos una fila
      if (nuevosProductos.length === 0) {
        return [crearProductoVacio()];
      }

      return nuevosProductos;
    });

    //setDirty?.(true);
  };

  // =====================================================
  // TOTAL
  // =====================================================

  const subtotal  = useMemo(() => {
    return productos.reduce((acumulado, producto) => {
      const cantidad =
        Number(producto.cantidad) || 0;

      const precio =
        Number(producto.precio) || 0;

      return acumulado + cantidad * precio;
    }, 0);
  }, [productos]);
  // Servicio Express +30%
  const total = servicioExpress
  ? subtotal * 1.3
  : subtotal;

  // =====================================================
  // DESCRIPCIÓN
  // =====================================================

  const descripcion = useMemo(() => {
    const productosTexto = productos
      .filter(
        (producto) =>
          producto.descripcion.trim() !== ""
      )
      .map(
        (producto,index) =>
          `PRODUCTO ${index + 1}: ${producto.descripcion.trim()} (${producto.cantidad})`
      )
      .join(" / ");

    const notasTexto = notas.trim()
      ? `NOTAS: ${notas.trim()}`
      : "";

    return [
      "SERVICIO PERSONALIZADO",
      productosTexto,
      notasTexto,
      servicioExpress ? "SERVICIO EXPRESS" : "",
    ]
      .filter(Boolean)
      .join(" / ");
  }, [productos, notas,servicioExpress]);

  // =====================================================
  // GUARDAR
  // =====================================================

  const guardar = () => {
    if (!onGuardar) return;

    onGuardar({
      id: data?.id || Date.now().toString(),
      tipo: "personalizado",
      descripcion,
      total: Number(total.toFixed(2)),
      servicioExpress,

      datos: {
        productos,
        totalProductos: Number(total.toFixed(2)),
        notas,
        servicioExpress,
      },
    });

    // Si es una partida nueva, limpiar formulario
    if (!data) {
      setProductos([crearProductoVacio()]);
      setNotas("");
      setServicioExpress(false);
    }

    
  };

  // =====================================================
  // HTML
  // =====================================================

  return (
    <div className="form-container">
      <h1>Servicio Personalizado</h1>

      <h2>Productos</h2>

      {/* ================================================
          PRODUCTOS
      ================================================= */}

      <div
        style={{
          width: "100%",
          marginTop: "10px",
        }}
      >
        {productos.map((producto) => {
          const subtotal =
            (Number(producto.cantidad) || 0) *
            (Number(producto.precio) || 0);

          return (
            <div
              key={producto.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 2fr) minmax(90px, 0.7fr) minmax(120px, 1fr) 100px 40px",
                gap: "10px",
                alignItems: "center",
                width: "100%",
                marginBottom: "8px",
              }}
            >
              {/* DESCRIPCIÓN */}

              <input
                type="text"
                placeholder="Descripción"
                value={producto.descripcion}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onChange={(e) =>
                  actualizarProducto(
                    producto.id,
                    "descripcion",
                    e.target.value
                  )
                }
              />

              {/* CANTIDAD */}

              <input
                type="number"
                min={0}
                placeholder="Cantidad"
                value={
                  producto.cantidad === 0
                    ? ""
                    : producto.cantidad
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (
                    ["-", "+", "e", "E"].includes(
                      e.key
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const valor = e.target.value;

                  actualizarProducto(
                    producto.id,
                    "cantidad",
                    valor === ""
                      ? 0
                      : Math.max(
                          0,
                          Number(valor)
                        )
                  );
                }}
              />

              {/* PRECIO */}

              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Precio"
                value={
                  producto.precio === 0
                    ? ""
                    : producto.precio
                }
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => {
                  if (
                    ["-", "+", "e", "E"].includes(
                      e.key
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const valor = e.target.value;

                  actualizarProducto(
                    producto.id,
                    "precio",
                    valor === ""
                      ? 0
                      : Math.max(
                          0,
                          Number(valor)
                        )
                  );
                }}
              />

              {/* SUBTOTAL */}

              <strong
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  width: "100%",
                  whiteSpace: "nowrap",
                  fontSize: "16px",
                }}
              >
                {formatearMoneda(subtotal)}
              </strong>

              {/* ELIMINAR */}

              <button
                type="button"
                title="Eliminar producto"
                onClick={() =>
                  eliminarProducto(producto.id)
                }
                style={{
                  width: "34px",
                  height: "34px",
                  minWidth: "34px",
                  minHeight: "34px",
                  padding: 0,
                  margin: 0,
                  border: "none",
                  borderRadius: "5px",
                  background: "#e74c3c",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                X
              </button>
            </div>
          );
        })}

        {/* AGREGAR PRODUCTO */}

        <button
          type="button"
          className="btn btn-blue"
          onClick={agregarProducto}
          style={{
            marginTop: "5px",
            marginBottom: "20px",
          }}
        >
          + Agregar producto extra
        </button>
      </div>
      {/* ================================================
          SERVICIO EXPRESS
      ================================================= */}
      <div className="form-row checkbox-row">
        <label>Servicio Express (+30%):</label>
        <input
          type="checkbox"
          checked={servicioExpress}
          onChange={(e) => setServicioExpress(e.target.checked)}
        />
      </div>

      {/* ================================================
          NOTAS
      ================================================= */}

      <div
        className="form-row"
        style={{
          marginTop: "20px",
        }}
      >
        <label>Notas adicionales</label>

        <textarea
          value={notas}
          placeholder="Ej. revisar terminales, limpiar base, etc."
          onChange={(e) => {
            setNotas(e.target.value);
          
          }}
        />
      </div>

      {/* ================================================
          DESCRIPCIÓN
      ================================================= */}

      <div className="descripcion-box">
        <strong>Descripción</strong>

        <p>{descripcion}</p>
      </div>

      {/* ================================================
          TOTAL
      ================================================= */}

      <h2>Subtotal: {formatearMoneda(total)}</h2>
      <h1>Total: {formatearMoneda(total*1.16)}</h1>
      {/* ================================================
          AGREGAR / ACTUALIZAR
      ================================================= */}

      {onGuardar && (
        <button
          type="button"
          className="btn btn-blue"
          onClick={guardar}
        >
          {data ? "Actualizar" : "AGREGAR"}
        </button>
      )}

    </div>
  );
};

export default Personalizado;