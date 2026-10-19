import React, { useEffect, useState } from "react";
import {
    calcularCartuchoAltaProveedor,
    cargarTablaCartuchoAlta,
    diametros,
} from "../datos/Resistencia_alta_C";
import "../css/calculadoraCartuchos.css";

const formatoMoneda = (valor: number) =>
    valor.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const CalculadoraCartuchos: React.FC = () => {
    const [tipo, setTipo] = useState<"pulgadas" | "milimetros">("pulgadas");
    const [diametro, setDiametro] = useState("1/4");
    const [mm, setMm] = useState(0);
    const [longitudCm, setLongitudCm] = useState(0);
    const [cableCm, setCableCm] = useState(25);
    const [terminal90, setTerminal90] = useState(false);
    const [descuento30, setDescuento30] = useState(false);
    const [resultado, setResultado] = useState<ReturnType<typeof calcularCartuchoAltaProveedor> | null>(null);
    const [estadoTabla, setEstadoTabla] = useState<"cargando" | "lista" | "error">("cargando");
    const [mensajeError, setMensajeError] = useState("");

    useEffect(() => {
        let activo = true;
        cargarTablaCartuchoAlta()
            .then(() => { if (activo) setEstadoTabla("lista"); })
            .catch((error) => {
                console.error("Error cargando tabla Cartucho Alta:", error);
                if (activo) {
                    setEstadoTabla("error");
                    setMensajeError("No fue posible cargar los precios desde Firebase.");
                }
            });
        return () => { activo = false; };
    }, []);

    // Cero o números negativos dejan el campo vacío.
    const numeroPositivo = (valor: string): number => {
        const numero = Number(valor);
        return Number.isFinite(numero) && numero > 0 ? numero : 0;
    };

    // La rueda del mouse desplaza la página, sin modificar el valor del input.
    const bloquearScrollNumerico = (e: React.WheelEvent<HTMLInputElement>) => {
        e.currentTarget.blur();
    };

    const calcular = () => {
        setMensajeError("");
        setResultado(null);
        if (estadoTabla !== "lista") {
            setMensajeError("Espera a que se carguen los precios desde Firebase.");
            return;
        }
        if (longitudCm <= 0 || (tipo === "milimetros" && mm <= 0)) {
            setMensajeError("Ingresa una longitud y un diámetro válidos.");
            return;
        }
        try {
            const r = calcularCartuchoAltaProveedor({
                tipo, diametro, mm, longitudCm, cableCm, terminal90, descuento30,
            });
            setResultado(r);
        } catch (error) {
            console.error("Error calculando Cartucho Alta:", error);
            setMensajeError("No se pudo calcular el precio. Revisa los datos y la tabla de Firebase.");
        }
    };

    return (
        <div className="calculadora-cartuchos-page">
            <div className="calculadora-cartuchos-form">
                <h2>Calculadora de Cartuchos de alta concentración</h2>
                {estadoTabla === "cargando" && <p role="status">Cargando precios desde Firebase...</p>}
                {estadoTabla === "error" && <p role="alert">No se pudieron cargar los precios desde Firebase.</p>}
                <div className="form-row">
                    <label>Tipo</label>
                    <div className="radio-group">
                        <label>
                            <input type="radio" checked={tipo === "pulgadas"} onChange={() => { setTipo("pulgadas"); setResultado(null); }} />
                            Pulgadas
                        </label>
                        <label>
                            <input type="radio" checked={tipo === "milimetros"} onChange={() => { setTipo("milimetros"); setResultado(null); }} />
                            Milímetros
                        </label>
                    </div>
                </div>
                {tipo === "pulgadas" ? (
                    <div className="form-row">
                        <label>Diámetro</label>
                        <select value={diametro} onChange={(e) => { setDiametro(e.target.value); setResultado(null); }}>
                            {diametros.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="form-row">
                        <label>Diámetro mm</label>
                        <input type="number" min={0} value={mm || ""} onWheel={bloquearScrollNumerico}
                            onChange={(e) => { setMm(numeroPositivo(e.target.value)); setResultado(null); }} />
                    </div>
                )}
                <div className="form-row">
                    <label>Longitud del cartucho cm</label>
                    <input type="number" min={0} value={longitudCm || ""} onWheel={bloquearScrollNumerico}
                        onChange={(e) => { setLongitudCm(numeroPositivo(e.target.value)); setResultado(null); }} />
                </div>
                <div className="form-row">
                    <label>Longitud del cable cm</label>
                    <input type="number" min={0} value={cableCm || ""} onWheel={bloquearScrollNumerico}
                        onChange={(e) => { setCableCm(numeroPositivo(e.target.value)); setResultado(null); }} />
                </div>
                <div className="cartuchos-checkbox-row">
                    <label className="cartuchos-checkbox-line">
                        <input type="checkbox" checked={terminal90} onChange={(e) => { setTerminal90(e.target.checked); setResultado(null); }} />
                        Terminal de 90°
                    </label>
                </div>
                <div className="cartuchos-checkbox-row">
                    <label className="cartuchos-checkbox-line">
                        <input type="checkbox" checked={descuento30} onChange={(e) => { setDescuento30(e.target.checked); setResultado(null); }} />
                        Aplicar descuento 30%
                    </label>
                </div>
                {mensajeError && <p role="alert" style={{ color: "#b91c1c" }}>{mensajeError}</p>}
                <button className="btn btn-blue" onClick={calcular} disabled={estadoTabla !== "lista"}>Calcular</button>
            </div>
            {resultado && (
                <div className="calculadora-cartuchos-resumen">
                    <p><strong>Diámetro Comercial:</strong> {resultado.diametro}&quot;</p>
                    <p><strong>Longitud Solicitada:</strong> {resultado.longitudSolicitada} cm</p>
                    <p><strong>Longitud Comercial:</strong> {resultado.longitudComercialCm} cm ({resultado.longitudComercialPulgadas}&quot;)</p>
                    <hr />
                    <p><strong>Precio Base:</strong> {formatoMoneda(resultado.precioBase)}</p>
                    <p><strong>Incremento Milimétrico:</strong> {formatoMoneda(resultado.incrementoMilimetrico)}</p>
                    <p><strong>Excedente de cartucho ($1.70/cm):</strong> {formatoMoneda(resultado.excedenteLongitud)}</p>
                    <p><strong>Excedente Cable:</strong> {formatoMoneda(resultado.excedenteCable)}</p>
                    <p><strong>Terminal 90°:</strong> {formatoMoneda(resultado.terminal)}</p>
                    <p><strong>Descuento:</strong> {formatoMoneda(resultado.descuento)}</p>
                    <hr />
                    <h2>Total: {formatoMoneda(resultado.total)}</h2>
                </div>
            )}
        </div>
    );
};

export default CalculadoraCartuchos;
