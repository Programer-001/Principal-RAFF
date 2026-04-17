import React, { useState } from "react";
import Pago_Banda from "./pago_banda";
import Consulta_Pago_Banda from "./Consulta_Pago_Banda";

const PagosBanda: React.FC = () => {
    const [vista, setVista] = useState<"pago" | "consulta">("pago");

    return (
        <div>
            <h1>Pagos de banda</h1>

            {/* MENU TIPO COTIZADOR */}
            <div className="cotizador-tabs">
                <div
                    className={`cotizador-tab ${vista === "pago" ? "active" : ""}`}
                    onClick={() => setVista("pago")}
                >
                    Pago
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
                {vista === "pago" && <Pago_Banda />}
                {vista === "consulta" && <Consulta_Pago_Banda />}
            </div>
        </div>
    );
};

export default PagosBanda;