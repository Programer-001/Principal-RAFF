import React, { useState, useEffect } from "react";
import { ItemCotizado } from "../cotizador";
import { FiCopy } from "react-icons/fi";
import {
    calcularPrecioCuarzo,
    diametrosCuarzo,
    largosCuarzo,
    DiametroCuarzo,
    obtenerPrecioCuarzoProveedor,
} from "../datos/cuarzo";
import { formatearMoneda } from "../funciones/formato_moneda";

interface Props {
    data?: ItemCotizado;
    onGuardar: (item: ItemCotizado) => void;
    setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

const Cuarzo = ({ data, onGuardar, setDirty }: Props) => {
    const [cantidad, setCantidad] = useState<number>(0);
    const [voltaje, setVoltaje] = useState<number>(0);
    const [potencia, setPotencia] = useState<number>(0);
    const [diametro, setDiametro] = useState<DiametroCuarzo | "">("");
    const [largo, setLargo] = useState<number>(0);

    const [cable, setCable] = useState<boolean>(false);
    const [terminalTornillo, setTerminalTornillo] = useState<boolean>(false);

    const [muestra, setMuestra] = useState<string>("");
    const [datosAdicionales, setDatosAdicionales] = useState<string>("");
    const [servicioExpress, setServicioExpress] = useState(false);

    useEffect(() => {
        if (data) {
            setCantidad(data.datos.cantidad || 0);
            setVoltaje(data.datos.voltaje || 0);
            setPotencia(data.datos.potencia || 0);
            setDiametro(data.datos.diametro || "");
            setLargo(data.datos.largo || 0);

            setCable(data.datos.cable || false);
            setTerminalTornillo(data.datos.terminalTornillo || false);

            setMuestra(data.datos.muestra || "");
            setDatosAdicionales(data.datos.datosAdicionales || "");
            setServicioExpress(data.datos.servicioExpress || false);
        }
    }, [data]);

    const calcularTotalCuarzo = () => {
        return calcularPrecioCuarzo(diametro, largo, cantidad);
    };

    const precioProveedor = obtenerPrecioCuarzoProveedor(diametro, largo);
    // total general
    const totalBase = calcularTotalCuarzo();
    const precioCalculado =servicioExpress ? totalBase * 1.3: totalBase;

    const resetForm = () => {
        setCantidad(0);
        setVoltaje(0);
        setPotencia(0);
        setDiametro("");
        setLargo(0);

        setCable(false);
        setTerminalTornillo(false);

        setMuestra("");
        setServicioExpress(false);
        setDatosAdicionales("");
    };

    const agregar = (texto: string, condicion: boolean) => {
        return condicion ? ` / ${texto}` : "";
    };

    const descripcionCuarzo = `
${cantidad || 0} RESISTENCIA(S) DE CUARZO
${agregar(`VOLTAJE: ${voltaje}V`, voltaje > 0)}
${agregar(`POTENCIA: ${potencia}W`, potencia > 0)}
${agregar(`DIÁMETRO: ${diametro}`, !!diametro)}
${agregar(`LARGO: ${largo}`, largo > 0)}
${agregar(`CABLE`, cable)}
${agregar(`TERMINAL TORNILLO`, terminalTornillo)}
${agregar(`MUESTRA: ${muestra.toUpperCase()}`, !!muestra)}
${agregar(`SERVICIO EXPRESS`, servicioExpress)}
${agregar(
        `DATOS ADICIONALES: ${datosAdicionales.toUpperCase()}`,
        !!datosAdicionales
    )}
`
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return (
        <div className="form-container">
            <h1>Cuarzo</h1>

            <div className="form-row">
                <label>Cantidad:</label>
                <input
                    type="number"
                    value={cantidad === 0 ? "" : cantidad}
                    onChange={(e) => {
                        setCantidad(parseFloat(e.target.value) || 0);
                        
                    }}
                />
            </div>

            <div className="form-row">
                <label>Voltaje:</label>
                <input
                    type="number"
                    value={voltaje === 0 ? "" : voltaje}
                    onChange={(e) => {
                        setVoltaje(parseFloat(e.target.value) || 0);
                        
                    }}
                />
            </div>

            <div className="form-row">
                <label>Potencia:</label>
                <input
                    type="number"
                    value={potencia === 0 ? "" : potencia}
                    onChange={(e) => {
                        setPotencia(parseFloat(e.target.value) || 0);
                       
                    }}
                />
            </div>

            <div className="form-row">
                <label>Diámetro:</label>
                <select
                    value={diametro}
                    onChange={(e) => {
                        setDiametro(e.target.value as DiametroCuarzo);
                     
                    }}
                >
                    <option value="">Seleccione...</option>
                    {diametrosCuarzo.map((d) => (
                        <option key={d} value={d}>
                            {d}"
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-row">
                <label>Largo:</label>
                <select
                    value={largo || ""}
                    onChange={(e) => {
                        setLargo(Number(e.target.value));
                        
                    }}
                >
                    <option value="">Seleccione...</option>
                    {largosCuarzo.map((l) => (
                        <option key={l} value={l}>
                            {l} cm
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-row checkbox-row">
                <label>Cable</label>
                <input
                    type="checkbox"
                    checked={cable}
                    onChange={(e) => {
                        setCable(e.target.checked);
                        
                    }}
                />
            </div>

            <div className="form-row checkbox-row">
                <label>Terminal tornillo</label>
                <input
                    type="checkbox"
                    checked={terminalTornillo}
                    onChange={(e) => {
                        setTerminalTornillo(e.target.checked);
                        
                    }}
                />
            </div>

            <div className="form-row">
                <label>Muestra</label>
                <select
                    value={muestra}
                    onChange={(e) => {
                        setMuestra(e.target.value);
                        
                    }}
                >
                    <option value="">Seleccione...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                </select>
            </div>

            <div className="form-row checkbox-row">
            <label>Servicio Express (+30%):</label>
            <input
                type="checkbox"
                checked={servicioExpress}
                onChange={(e) => setServicioExpress(e.target.checked)}
            />
            </div>

            <div className="form-row textarea-row">
                <label>Datos Adicionales: </label>
                <textarea
                    value={datosAdicionales}
                    onChange={(e) => {
                        setDatosAdicionales(e.target.value);
                        
                    }}
                    placeholder="Ej. terminal especial, salida lateral, etc."
                />
            </div>
            {/* DESCRIPCIÓN FORMATEADA PARA COPIAR */ }
            <div className="form-row textarea-row full-width descripcion-row">
                <div className="descripcion-box">
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                        }}
                    >
                        <label className="descripcion-title">Descripción</label>

                        <button
                            type="button"
                            title="Copiar descripción"
                            onClick={() =>
                                navigator.clipboard.writeText(descripcionCuarzo)
                            }
                            style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                padding: 4,
                            }}
                        >
                            <FiCopy size={18} />
                        </button>
                    </div>

                    <p className="descripcion-texto">{descripcionCuarzo}</p>
                </div>
            </div>

            {/* TOTAL */}
                <h2>Subtotal: {formatearMoneda(precioCalculado)}</h2>
                <h1> total: {formatearMoneda(precioCalculado * 1.16)}</h1>

            <button
                className="btn btn-blue"
                onClick={() => {
                    onGuardar({
                        id: data?.id || Date.now().toString(),
                        tipo: "cuarzo",
                        descripcion: descripcionCuarzo,
                        total: Number(precioCalculado.toFixed(2)),
                        datos: {
                            cantidad,
                            voltaje,
                            potencia,
                            diametro,
                            largo,
                            cable,
                            terminalTornillo,
                            muestra,
                            servicioExpress,
                            datosAdicionales,
                        },
                    });

                    resetForm();
                    setDirty(false);
                }}
            >
                {data ? "ACTUALIZAR" : "AGREGAR"}
            </button>
        </div>
    );
};

export default Cuarzo;