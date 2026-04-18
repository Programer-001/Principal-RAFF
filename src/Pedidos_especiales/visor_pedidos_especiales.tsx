// src/Administracion/visor_pedidos_especiales.tsx
import React, { useState } from "react";
import PedidosEspeciales from "../Pedidos_especiales/pedidos_especiales";
import ConsultaPedidosEspeciales from "../Pedidos_especiales/consulta_pedidos_especiales";

const VisorPedidosEspeciales: React.FC = () => {
    const [vista, setVista] = useState<"crear" | "consulta">("crear");

    return (
        <div>
            <h1>Pedidos Especiales</h1>

            {/* SUBMENU TIPO COTIZADOR */}
            <div className="cotizador-tabs">
                <div
                    className={`cotizador-tab ${vista === "crear" ? "active" : ""}`}
                    onClick={() => setVista("crear")}
                >
                    Crear Pedido
                </div>

                <div
                    className={`cotizador-tab ${vista === "consulta" ? "active" : ""}`}
                    onClick={() => setVista("consulta")}
                >
                    Consulta
                </div>
            </div>

            {/* CONTENIDO */}
            <div style={{ marginTop: 20 }}>
                {vista === "crear" && <PedidosEspeciales />}
                {vista === "consulta" && <ConsultaPedidosEspeciales />}
            </div>
        </div>
    );
};

export default VisorPedidosEspeciales;