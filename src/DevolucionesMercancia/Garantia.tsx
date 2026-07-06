//src/DevolucionesMercancia/Garantia.tsx
//este archivo contiene el componente para crear un documento de garantía. Se puede seleccionar un cliente existente o capturar uno temporal. Se puede buscar clientes por nombre, razón social o RFC. Al guardar, se genera un folio único y se almacena en Firebase Realtime Database.

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

    estado: string;
    setEstado: React.Dispatch<React.SetStateAction<string>>;

    otRelacionada: string;
    setOtRelacionada: React.Dispatch<React.SetStateAction<string>>;

    diagnostico: string;
    setDiagnostico: React.Dispatch<React.SetStateAction<string>>;

    resolucion: string;
    setResolucion: React.Dispatch<React.SetStateAction<string>>;

    observaciones: string;
    setObservaciones: React.Dispatch<React.SetStateAction<string>>;

    importe: number;
};

const Garantia: React.FC<Props> = ({
    productos,
    setProductos,
    motivo,
    setMotivo,
    estado,
    setEstado,
    otRelacionada,
    setOtRelacionada,
    diagnostico,
    setDiagnostico,
    resolucion,
    setResolucion,
    observaciones,
    setObservaciones,
    importe,
}) => {
    return (
        <div className="garantia-form">
            <SaldoAFavor
                productos={productos}
                setProductos={setProductos}
                motivo={motivo}
                setMotivo={setMotivo}
                vigencia=""
                setVigencia={() => {}}
                importe={importe}
                mostrarVigencia={false}
                titulo="🛡️ Garantía"
            />

            <div className="form-row">
                <label>OT relacionada</label>

                <input
                    type="text"
                    placeholder="OT-00000 (Opcional)"
                    value={otRelacionada}
                    onChange={(e) =>
                        setOtRelacionada(e.target.value)
                    }
                />
            </div>

            <div className="form-row">
                <label>Estado</label>

                <select
                    value={estado}
                    onChange={(e) =>
                        setEstado(e.target.value)
                    }
                >
                    <option value="recibida">
                        Recibida
                    </option>

                    <option value="revision">
                        En revisión
                    </option>

                    <option value="autorizada">
                        Autorizada
                    </option>

                    <option value="rechazada">
                        Rechazada
                    </option>

                    <option value="entregada">
                        Entregada
                    </option>
                </select>
            </div>

            <div className="form-row">
                <label>Diagnóstico</label>

                <textarea
                    rows={4}
                    value={diagnostico}
                    onChange={(e) =>
                        setDiagnostico(e.target.value)
                    }
                />
            </div>

            <div className="form-row">
                <label>Resolución</label>

                <select
                    value={resolucion}
                    onChange={(e) =>
                        setResolucion(e.target.value)
                    }
                >
                    <option value="">
                        Selecciona...
                    </option>

                    <option value="reparar">
                        Reparar
                    </option>

                    <option value="reemplazar">
                        Reemplazar
                    </option>

                    <option value="no_aplica">
                        No aplica garantía
                    </option>

                    <option value="pendiente">
                        Pendiente
                    </option>
                </select>
            </div>

            <div className="form-row">
                <label>Observaciones</label>

                <textarea
                    rows={4}
                    value={observaciones}
                    onChange={(e) =>
                        setObservaciones(e.target.value)
                    }
                />
            </div>
        </div>
    );
};

export default Garantia;