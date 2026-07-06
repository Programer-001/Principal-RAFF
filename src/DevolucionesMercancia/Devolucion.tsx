// src/DevolucionesMercancia/Devolucion.tsx

import React from "react";
import SaldoAFavor from "./SaldoAFavor";
import type { ProductoDevolucionMercancia } from "./CrearDevolucion";

type Props = {
    productos: ProductoDevolucionMercancia[];
    setProductos: React.Dispatch<
        React.SetStateAction<ProductoDevolucionMercancia[]>
    >;
    motivo: string;
    setMotivo: React.Dispatch<React.SetStateAction<string>>;
    metodoPago: string;
    setMetodoPago: React.Dispatch<React.SetStateAction<string>>;
    fechaPago: string;
    setFechaPago: React.Dispatch<React.SetStateAction<string>>;
    importe: number;
};

const Devolucion: React.FC<Props> = ({
    productos,
    setProductos,
    motivo,
    setMotivo,
    metodoPago,
    setMetodoPago,
    fechaPago,
    setFechaPago,
    importe,
}) => {
    return (
        <div className="devolucion-form">
            <SaldoAFavor
                productos={productos}
                setProductos={setProductos}
                motivo={motivo}
                setMotivo={setMotivo}
                vigencia=""
                setVigencia={() => {}}
                importe={importe}
                mostrarVigencia={false}
                titulo="📦 Devolución de Mercancía"
            />

            <div className="form-row">
                <label>Método de pago</label>
                <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                >
                    <option value="">Selecciona...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                </select>
            </div>

            <div className="form-row">
                <label>Fecha de pago</label>
                <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                />
            </div>
        </div>
    );
};

export default Devolucion;