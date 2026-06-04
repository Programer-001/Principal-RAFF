// src/components/ModificarCaja.tsx
import React, { useState, useEffect } from "react";
import { getDatabase, ref, onValue, update, remove } from "firebase/database";
import { app } from "../firebase/config";

interface Pago {
  id: string;
  transaccion: number;
  cantidad: number;
  metodo: string;
  factura: string;
  fecha: string;
  estatus: boolean;
  comentarios: string;
  fechaKey?: string;
}

const ModificarCaja: React.FC = () => {
  const db = getDatabase(app);

  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosOriginales, setPagosOriginales] = useState<Pago[]>([]);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editandoPago, setEditandoPago] = useState<Pago | null>(null);

  const [comentarioCancelacion, setComentarioCancelacion] = useState("");
  const [mostrarCancelacion, setMostrarCancelacion] = useState(false);

  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const datosPaginados = pagos.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const totalPages = Math.ceil(pagos.length / itemsPerPage);

  useEffect(() => {
    const pagosRef = ref(db, "corte-caja");

    onValue(pagosRef, (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setPagosOriginales([]);
        setPagos([]);
        return;
      }

      const lista: Pago[] = [];

      Object.keys(data).forEach((diaKey) => {
        Object.keys(data[diaKey]).forEach((pagoKey) => {
          lista.push({
            id: pagoKey,
            fechaKey: diaKey,
            ...data[diaKey][pagoKey],
          });
        });
      });

      setPagosOriginales(lista);
    });
  }, [db]);

  const limpiarTodo = () => {
    setPagos([]);
    setPagoSeleccionado(null);
    setEditandoPago(null);
    setModoEdicion(false);
    setBusqueda("");
    setComentarioCancelacion("");
    setMostrarCancelacion(false);
    setPage(1);
  };

  const seleccionarPago = (pago: Pago) => {
    if (modoEdicion) {
      const continuar = window.confirm(
        "Tienes cambios sin guardar. Si cambias de factura se perderán. ¿Continuar?"
      );

      if (!continuar) return;
    }

    setPagoSeleccionado(pago);
    setEditandoPago(null);
    setModoEdicion(false);
    setMostrarCancelacion(false);
    setComentarioCancelacion("");
  };

  const buscarFactura = () => {
    if (!busqueda.trim()) {
      alert("Ingresa un número de factura para buscar.");
      return;
    }

    const filtrados = pagosOriginales.filter((p) =>
      p.factura.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (filtrados.length === 0) {
      alert("❌ No se encontró esa factura.");
      limpiarTodo();
      return;
    }

    setPagos(filtrados);
    setPagoSeleccionado(filtrados[0]);
    setPage(1);
    setModoEdicion(false);
    setEditandoPago(null);
    setMostrarCancelacion(false);
  };

  const mostrarTodo = () => {
    setPagos(pagosOriginales);
    setPagoSeleccionado(pagosOriginales[0] || null);
    setPage(1);
    setModoEdicion(false);
    setEditandoPago(null);
    setMostrarCancelacion(false);
  };

  const iniciarEdicion = () => {
    if (!pagoSeleccionado) return;

    setEditandoPago({ ...pagoSeleccionado });
    setModoEdicion(true);
    setMostrarCancelacion(false);
  };

  const cancelarEdicion = () => {
    setEditandoPago(null);
    setModoEdicion(false);
  };

  const handleChange = (
    campo: keyof Pago,
    valor: string | number | boolean
  ) => {
    if (!editandoPago) return;

    setEditandoPago({
      ...editandoPago,
      [campo]: valor,
    });
  };

  const guardarCambios = async () => {
    if (!editandoPago || !editandoPago.fechaKey) {
      alert("No se puede actualizar este pago.");
      return;
    }

    await update(
      ref(db, `corte-caja/${editandoPago.fechaKey}/${editandoPago.id}`),
      editandoPago
    );

    setPagos((prev) =>
      prev.map((p) => (p.id === editandoPago.id ? editandoPago : p))
    );

    setPagosOriginales((prev) =>
      prev.map((p) => (p.id === editandoPago.id ? editandoPago : p))
    );

    setPagoSeleccionado(editandoPago);
    setEditandoPago(null);
    setModoEdicion(false);

    alert("Pago actualizado ✔");
  };

  const eliminarPago = async () => {
    if (!pagoSeleccionado || !pagoSeleccionado.fechaKey) return;

    if (!window.confirm("⚠️ ¿Eliminar este pago?")) return;

    await remove(
      ref(db, `corte-caja/${pagoSeleccionado.fechaKey}/${pagoSeleccionado.id}`)
    );

    setPagos((prev) => prev.filter((p) => p.id !== pagoSeleccionado.id));
    setPagosOriginales((prev) =>
      prev.filter((p) => p.id !== pagoSeleccionado.id)
    );

    setPagoSeleccionado(null);
    setEditandoPago(null);
    setModoEdicion(false);

    alert("Pago eliminado ❌");
  };

  const cancelarFactura = async () => {
    if (!pagoSeleccionado || !pagoSeleccionado.fechaKey) return;

    if (!comentarioCancelacion.trim()) {
      alert("⚠️ Escribe un comentario de cancelación.");
      return;
    }

    if (!window.confirm("❗¿Seguro que deseas CANCELAR esta factura?")) return;

    const pagoCancelado: Pago = {
      ...pagoSeleccionado,
      estatus: false,
      comentarios: comentarioCancelacion,
    };

    await update(
      ref(db, `corte-caja/${pagoSeleccionado.fechaKey}/${pagoSeleccionado.id}`),
      {
        estatus: false,
        comentarios: comentarioCancelacion,
      }
    );

    setPagos((prev) =>
      prev.map((p) => (p.id === pagoCancelado.id ? pagoCancelado : p))
    );

    setPagosOriginales((prev) =>
      prev.map((p) => (p.id === pagoCancelado.id ? pagoCancelado : p))
    );

    setPagoSeleccionado(pagoCancelado);
    setComentarioCancelacion("");
    setMostrarCancelacion(false);

    alert("❌ Factura cancelada correctamente");
  };

  const pagoVista = modoEdicion ? editandoPago : pagoSeleccionado;

  return (
    <div>
      <h2 className="caja-title">🛠 Modificar Pagos</h2>

      <div className="modificar-caja-layout">
        {/* IZQUIERDA */}
        <div className="modificar-caja-lista">
          <h3>Facturas</h3>

          <input
            className="input-caja1"
            type="number"
            placeholder="Buscar factura..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div className="btn-container modificar-caja-botones">
            <button className="btn btn-green" onClick={buscarFactura}>
              Buscar
            </button>

            <button className="btn btn-blue" onClick={mostrarTodo}>
              Mostrar todo
            </button>

            <button className="btn btn-red" onClick={limpiarTodo}>
              Limpiar
            </button>
          </div>

          <div className="facturas-lista">
            <div className="facturas-lista-header">Factura</div>

            {datosPaginados.length === 0 ? (
              <p className="sin-facturas">No hay facturas para mostrar.</p>
            ) : (
              datosPaginados.map((p) => (
                <button
                  key={p.id}
                  className={
                    pagoSeleccionado?.id === p.id
                      ? "factura-item factura-item-activa"
                      : "factura-item"
                  }
                  onClick={() => seleccionarPago(p)}
                >
                  {p.factura}
                </button>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="paginacion-simple">
              <button
                className="btn btn-blue"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>

              <span>
                Página {page} de {totalPages}
              </span>

              <button
                className="btn btn-blue"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>

        {/* DERECHA */}
        <div className="modificar-caja-detalle">
          <h3>Detalle de la factura</h3>

          {!pagoVista ? (
            <div className="visor-vacio">
              Selecciona una factura del lado izquierdo.
            </div>
          ) : (
            <>
              <div className="detalle-factura-grid">
                <label>Factura:</label>
                {modoEdicion ? (
                  <input
                    className="input-caja1"
                    type="text"
                    value={pagoVista.factura}
                    onChange={(e) => handleChange("factura", e.target.value)}
                  />
                ) : (
                  <p>{pagoVista.factura}</p>
                )}

                <label>Fecha:</label>
                {modoEdicion ? (
                  <input
                    className="input-caja1"
                    type="text"
                    value={pagoVista.fecha}
                    onChange={(e) => handleChange("fecha", e.target.value)}
                  />
                ) : (
                  <p>{pagoVista.fecha}</p>
                )}

                <label>Transacción:</label>
                {modoEdicion ? (
                  <input
                    className="input-caja1"
                    type="number"
                    value={pagoVista.transaccion}
                    onChange={(e) =>
                      handleChange("transaccion", Number(e.target.value))
                    }
                  />
                ) : (
                  <p>{pagoVista.transaccion}</p>
                )}

                <label>Método:</label>
                {modoEdicion ? (
                  <select
                    className="input-caja1"
                    value={pagoVista.metodo}
                    onChange={(e) => handleChange("metodo", e.target.value)}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta_credito">Tarjeta Crédito</option>
                    <option value="tarjeta_debito">Tarjeta Débito</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="credito">Crédito Clientes</option>
                    <option value="otro">Otro</option>
                  </select>
                ) : (
                  <p>{pagoVista.metodo}</p>
                )}

                <label>Cantidad:</label>
                {modoEdicion ? (
                  <input
                    className="input-caja1"
                    type="number"
                    value={pagoVista.cantidad}
                    onChange={(e) =>
                      handleChange("cantidad", Number(e.target.value))
                    }
                  />
                ) : (
                  <p>${Number(pagoVista.cantidad || 0).toFixed(2)}</p>
                )}

                <label>Estatus:</label>
                {modoEdicion ? (
                  <select
                    className="input-caja1"
                    value={pagoVista.estatus ? "Vigente" : "Cancelada"}
                    onChange={(e) =>
                      handleChange("estatus", e.target.value === "Vigente")
                    }
                  >
                    <option value="Vigente">Vigente</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                ) : (
                  <p className={pagoVista.estatus ? "estatus-vigente" : "estatus-cancelada"}>
                    {pagoVista.estatus ? "Vigente" : "Cancelada"}
                  </p>
                )}

                <label>Comentarios:</label>
                {modoEdicion ? (
                  <input
                    className="input-caja1"
                    type="text"
                    value={pagoVista.comentarios || ""}
                    onChange={(e) =>
                      handleChange("comentarios", e.target.value)
                    }
                  />
                ) : (
                  <p>{pagoVista.comentarios || "Sin comentarios"}</p>
                )}
              </div>

              {mostrarCancelacion && (
                <div className="caja-bloque">
                  <label>Motivo de cancelación:</label>
                  <input
                    className="input-caja1"
                    type="text"
                    value={comentarioCancelacion}
                    onChange={(e) => setComentarioCancelacion(e.target.value)}
                    placeholder="Ej: Cliente devolvió la pieza"
                  />

                  <button className="btn btn-red" onClick={cancelarFactura}>
                    Confirmar cancelación
                  </button>
                </div>
              )}

              <div className="detalle-acciones">
                {modoEdicion ? (
                  <>
                    <button className="btn btn-green" onClick={guardarCambios}>
                      Guardar cambios
                    </button>

                    <button className="btn btn-red" onClick={cancelarEdicion}>
                      Cancelar edición
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-blue" onClick={iniciarEdicion}>
                      Editar
                    </button>

                    <button
                      className="btn btn-yellow"
                      onClick={() => setMostrarCancelacion(true)}
                      disabled={!pagoSeleccionado?.estatus}
                    >
                      Cancelar factura
                    </button>

                    <button className="btn btn-red" onClick={eliminarPago}>
                      Eliminar
                    </button>

                    <button className="btn btn-purple" onClick={limpiarTodo}>
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModificarCaja;