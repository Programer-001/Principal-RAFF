import React, { useState } from "react";
import {
    calcularCartuchoAltaProveedor,
    diametros,
} from "../datos/Resistencia_alta_C";
import "../css/calculadoraCartuchos.css";

const formatoMoneda = (valor: number) =>
    valor.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
    });

const CalculadoraCartuchos: React.FC = () => {
    const [tipo, setTipo] = useState<"pulgadas" | "milimetros">("pulgadas");
    const [diametro, setDiametro] = useState("1/4");
    const [mm, setMm] = useState(0);
    const [longitudCm, setLongitudCm] = useState(0);
    const [cableCm, setCableCm] = useState(25);
    const [terminal90, setTerminal90] = useState(false);
    const [descuento30, setDescuento30] = useState(false);
    const [resultado, setResultado] = useState<any>(null);

    const calcular = () => {
        const r = calcularCartuchoAltaProveedor({
            tipo,
            diametro,
            mm,
            longitudCm,
            cableCm,
            terminal90,
            descuento30,
        });

        setResultado(r);
    };

    return (
        <div className="calculadora-cartuchos-page">
            <div className="calculadora-cartuchos-form">
                <h2>Calculadora de Cartuchos de alta concentración</h2>

                <div className="form-row">
                    <label>Tipo</label>
                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                checked={tipo === "pulgadas"}
                                onChange={() => setTipo("pulgadas")}
                            />
                            Pulgadas
                        </label>

                        <label>
                            <input
                                type="radio"
                                checked={tipo === "milimetros"}
                                onChange={() => setTipo("milimetros")}
                            />
                            Milímetros
                        </label>
                    </div>
                </div>

                {tipo === "pulgadas" ? (
                    <div className="form-row">
                        <label>Diámetro</label>
                        <select
                            value={diametro}
                            onChange={(e) => setDiametro(e.target.value)}
                        >
                            {diametros.map((d) => (
                                <option key={d.label} value={d.label}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="form-row">
                        <label>Diámetro mm</label>
                        <input
                            type="number"
                            min={0}
                            value={mm || ""}
                            onChange={(e) => setMm(Number(e.target.value))}
                        />
                    </div>
                )}

                <div className="form-row">
                    <label>Longitud del cartucho cm</label>
                    <input
                        type="number"
                        min={0}
                        value={longitudCm || ""}
                        onChange={(e) => setLongitudCm(Number(e.target.value))}
                    />
                </div>

                <div className="form-row">
                    <label>Longitud del cable cm</label>
                    <input
                        type="number"
                        min={0}
                        value={cableCm || ""}
                        onChange={(e) => setCableCm(Number(e.target.value))}
                    />
                </div>

                <div className="cartuchos-checkbox-row">
                    <label className="cartuchos-checkbox-line">
                        <input
                            type="checkbox"
                            checked={terminal90}
                            onChange={(e) => setTerminal90(e.target.checked)}
                        />
                        Terminal de 90°
                    </label>
                </div>

                <div className="cartuchos-checkbox-row">
                    <label className="cartuchos-checkbox-line">
                        <input
                            type="checkbox"
                            checked={descuento30}
                            onChange={(e) => setDescuento30(e.target.checked)}
                        />
                        Aplicar descuento 30%
                    </label>
                </div>

                <button className="btn btn-blue" onClick={calcular}>
                    Calcular
                </button>
            </div>

            {resultado && (
                <div className="calculadora-cartuchos-resumen">
                    <p>
                        <strong>Diámetro Comercial:</strong>{" "}
                        {resultado.diametro}&quot;
                    </p>

                    <p>
                        <strong>Longitud Solicitada:</strong>{" "}
                        {resultado.longitudSolicitada} cm
                    </p>

                    <p>
                        <strong>Longitud Comercial:</strong>{" "}
                        {resultado.longitudComercialCm} cm (
                        {resultado.longitudComercialPulgadas}&quot;)
                    </p>

                    <hr />

                    <p>
                        <strong>Precio Base:</strong>{" "}
                        {formatoMoneda(resultado.precioBase)}
                    </p>

                    <p>
                        <strong>Incremento Milimétrico:</strong>{" "}
                        {formatoMoneda(resultado.incrementoMilimetrico)}
                    </p>

                    <p>
                        <strong>Excedente Cable:</strong>{" "}
                        {formatoMoneda(resultado.excedenteCable)}
                    </p>

                    <p>
                        <strong>Terminal 90°:</strong>{" "}
                        {formatoMoneda(resultado.terminal)}
                    </p>

                    <p>
                        <strong>Descuento:</strong>{" "}
                        {formatoMoneda(resultado.descuento)}
                    </p>

                    <hr />

                    <h2>Total: {formatoMoneda(resultado.total)}</h2>
                </div>
            )}
        </div>
    );
};

export default CalculadoraCartuchos;