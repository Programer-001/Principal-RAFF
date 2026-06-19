// src/cotizadores/ProductosExtras.tsx
import React from "react";
import { formatearMoneda } from "../funciones/formato_moneda";

export type ProductoExtra = {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
};

type Props = {
  activo: boolean;
  setActivo: (value: boolean) => void;
  productosExtras: ProductoExtra[];
  setProductosExtras: React.Dispatch<React.SetStateAction<ProductoExtra[]>>;
};

const ProductosExtras = ({
  activo,
  setActivo,
  productosExtras,
  setProductosExtras,
}: Props) => {
  const agregarExtra = () => {
    setProductosExtras((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        descripcion: "",
        cantidad: 1,
        precio: 0,
      },
    ]);
  };

  const actualizarExtra = (
    id: string,
    campo: keyof ProductoExtra,
    valor: string | number
  ) => {
    setProductosExtras((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const eliminarExtra = (id: string) => {
    setProductosExtras((prev) => prev.filter((item) => item.id !== id));
  };

  const totalProductosExtras = productosExtras.reduce(
    (acc, item) => acc + (item.cantidad || 0) * (item.precio || 0),
    0
  );

  return (
    <>
      <div className="form-row checkbox-row">
        <label>Productos Extras:</label>
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => {
            const value = e.target.checked;
            setActivo(value);

            if (value && productosExtras.length === 0) {
              agregarExtra();
            }

            if (!value) {
              setProductosExtras([]);
            }
          }}
        />
      </div>

      {activo && (
        <div className="productos-extras-box">
          {productosExtras.map((item) => {
            const subtotal = (item.cantidad || 0) * (item.precio || 0);

            return (
              <div key={item.id} className="producto-extra-item">
                <div className="producto-extra-row">
                  <input
                    type="text"
                    placeholder="Descripción"
                    value={item.descripcion}
                    onChange={(e) =>
                      actualizarExtra(item.id, "descripcion", e.target.value)
                    }
                  />

                  <input
                    type="number"
                    min={0}
                    placeholder="Cantidad"
                    value={item.cantidad === 0 ? "" : item.cantidad}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) =>
                      actualizarExtra(
                        item.id,
                        "cantidad",
                        Math.max(0, Number(e.target.value))
                      )
                    }
                  />

                  <input
                    type="number"
                    min={0}
                    placeholder="Precio"
                    value={item.precio === 0 ? "" : item.precio}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) =>
                      actualizarExtra(
                        item.id,
                        "precio",
                        Math.max(0, Number(e.target.value))
                      )
                    }
                  />

                  <button
                    type="button"
                    className="btn btn-red"
                    onClick={() => eliminarExtra(item.id)}
                  >
                    X
                  </button>
                </div>

                <p className="subtotal-extra">
                  <strong>{formatearMoneda(subtotal)}</strong>
                </p>
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-blue"
            onClick={agregarExtra}
          >
            + Agregar producto extra
          </button>

          <h3>Total extras: {formatearMoneda(totalProductosExtras)}</h3>
        </div>
      )}
    </>
  );
};

export default ProductosExtras;