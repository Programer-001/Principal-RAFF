// src/Administracion/BandaProveedor/index.tsx
import React, { useState } from "react";
import ProovedorBanda from "./proovedor_banda";
import ConsultaPagos from "./consulta_pagos";

type Pestana = "cotizador" | "consulta";

const BandaProveedor: React.FC = () => {
  const [pestana, setPestana] = useState<Pestana>("cotizador");

  const estiloPestana = (activa: boolean): React.CSSProperties => ({
    border: "none",
    borderBottom: activa ? "3px solid #0f172a" : "3px solid transparent",
    background: "transparent",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: activa ? 700 : 400,
    color: activa ? "#0f172a" : "#64748b",
    fontSize: 15,
  });

  return (
    <div style={{ width: "100%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
        <h1 style={{ marginBottom: 12 }}>Banda Proveedor</h1>
        <nav aria-label="Secciones de Banda Proveedor" style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
          <button type="button" style={estiloPestana(pestana === "cotizador")} onClick={() => setPestana("cotizador")}>
            Cotizador
          </button>
          <button type="button" style={estiloPestana(pestana === "consulta")} onClick={() => setPestana("consulta")}>
            Consulta y pagos
          </button>
        </nav>
      </div>
      {/* Se mantienen montadas ambas vistas para no perder órdenes sin guardar al cambiar de pestaña. */}
      <div style={{ display: pestana === "cotizador" ? "block" : "none" }}>
        <ProovedorBanda />
      </div>
      <div style={{ display: pestana === "consulta" ? "block" : "none" }}>
        <ConsultaPagos />
      </div>
    </div>
  );
};

export default BandaProveedor;
