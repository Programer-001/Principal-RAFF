// src/cotizadores/termopares.tsx
import React, { useEffect, useState } from "react";
import { termoparJ, termoparK, bulboTornilloTermopar } from "../datos/Termopares";
import { ItemCotizado } from "../cotizador";

interface Props {
    data?: ItemCotizado;
    onGuardar: (item: ItemCotizado) => void;
    setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

const termopar = ({ data, onGuardar, setDirty }: Props) => {
    const [cantidad, setCantidad] = useState<number>(0);
    const [tipo, setTipo] = useState<string>("");

    const [termoparCeramico, setTermoparCeramico] = useState<string>("");
    const [medidaClienteCm, setMedidaClienteCm] = useState<number>(0);

    const [bulboTornillo, setBulboTornillo] = useState<string>("");
    const [cambioMedidaBulbo, setCambioMedidaBulbo] = useState<number>(0);
    const [usarCambioMedidaBulbo, setUsarCambioMedidaBulbo] = useState(false);
    const [servicioExpress, setServicioExpress] = useState<boolean>(false);
    const [termoparEspecialP, setTermoparEspecialP] = useState<boolean>(false);

    const [datosAdicionales, setDatosAdicionales] = useState<string>("");

    useEffect(() => {
        if (data) {
            const d = data.datos || {};

            setCantidad(d.cantidad || 0);
            setTipo(d.tipo || "");
            setTermoparCeramico(d.termoparCeramico || "");
            setMedidaClienteCm(d.medidaClienteCm || 0);
            setBulboTornillo(d.bulboTornillo || "");
            setCambioMedidaBulbo(d.cambioMedidaBulbo || 0);
            setUsarCambioMedidaBulbo(!!d.usarCambioMedidaBulbo);
            setServicioExpress(!!d.servicioExpress);
            setTermoparEspecialP(!!d.termoparEspecialP);
            setDatosAdicionales(d.datosAdicionales || "");

        }
    }, [data]);

    useEffect(() => {
        setDirty(true);
    }, [
        cantidad,
        tipo,
        termoparCeramico,
        medidaClienteCm,
        bulboTornillo,
        cambioMedidaBulbo,
        servicioExpress,
        termoparEspecialP,
        datosAdicionales,
        setDirty,
    ]);

    const resetForm = () => {
        setCantidad(0);
        setTipo("");
        setTermoparCeramico("");
        setMedidaClienteCm(0);
        setBulboTornillo("");
        setCambioMedidaBulbo(0);
        setUsarCambioMedidaBulbo(false);
        setServicioExpress(false);
        setTermoparEspecialP(false);
        setDatosAdicionales("");
    };

    const agregar = (texto: string, condicion: boolean) => {
        return condicion ? ` / ${texto}` : "";
    };

    const descripcionTermopar = `
${cantidad || 0} TERMOPAR
${agregar(`TIPO: ${tipo}`, !!tipo)}
${agregar(`TERMOPAR CERAMICO: ${termoparCeramico}`, !!termoparCeramico)}
${agregar(`MEDIDA DE TERMOPAR EN CM: ${medidaClienteCm} CM`, medidaClienteCm > 0)}
${agregar(` ${bulboTornillo}`, !!bulboTornillo)}
${agregar(`CAMBIO DE MEDIDA DE BULBO: ${cambioMedidaBulbo} CM`, usarCambioMedidaBulbo && cambioMedidaBulbo > 0)}
${agregar(`SERVICIO EXPRESS`, servicioExpress)}
${agregar(`TERMOPAR ESPECIAL P`, termoparEspecialP)}
${agregar(`DATOS ADICIONALES: ${datosAdicionales.toUpperCase()}`, !!datosAdicionales)}
`
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    // 🔹Bloquea el select sino es K
    useEffect(() => {
        if (tipo !== "K") {
            setTermoparCeramico("");
        }
    }, [tipo]);
    // 🔹 OBTENER PRECIO DE TERMOPAR DEL ARCHIVO
    const obtenerPrecioTermopar = () => {
        if (!tipo || medidaClienteCm <= 0) {
            return { medidaSeleccionada: 0, precio: 0 };
        }

        const tabla = tipo === "J" ? termoparJ : termoparK;

        const encontrado = tabla.find((item) => medidaClienteCm <= item.medida_cm);

        if (encontrado) {
            return {
                medidaSeleccionada: encontrado.medida_cm,
                precio: encontrado.precio,
            };
        }

        // si se pasa del máximo
        const ultimo = tabla[tabla.length - 1];
        return {
            medidaSeleccionada: ultimo.medida_cm,
            precio: ultimo.precio,
        };
    };
    // 🔹 OBTENER PRECIO DE TERMOPAR CERAMICO
    const obtenerPrecioCeramica = () => {
        if (tipo !== "K") return 0;
        if (termoparCeramico === "K CON CERAMICA #8") return 18.97 * medidaClienteCm;
        if (termoparCeramico === "K CON CERAMICA #14") return 12.93 * medidaClienteCm;
        return 0;
    };
    // 🔹 OBTENER BULBO O TORNILLO
    const obtenerPrecioBulboTornillo = () => {
        if (!bulboTornillo) return 0;

        const encontrado = bulboTornilloTermopar.find(
            (item) => item.tipo === bulboTornillo
        );

        return encontrado ? encontrado.precio : 0;
    };
    // 🔹  Meida extra del bulbo
    const obtenerExtraMedidaBulbo = () => {
        if (!usarCambioMedidaBulbo) return 0;
        if (cambioMedidaBulbo <= 5.08) return 0;

        return ((cambioMedidaBulbo - 5.08) * 4)+200;
    };
    const totalExtraBulbo = obtenerExtraMedidaBulbo();
    const totalBulboTornillo = obtenerPrecioBulboTornillo();
    const totalCeramica = obtenerPrecioCeramica();

    const resultado = obtenerPrecioTermopar();//VARIABLE QUE SE CONECTA CON LAS TABLAS J Y K
    const totalBase = resultado.precio * (cantidad || 1);
    // si es K con cerámica, usa cerámica
    // en cualquier otro caso, usa base J/K
    const usarCeramica =
        tipo === "K" &&
        termoparCeramico !== "NO" &&
        termoparCeramico !== "";

    const subtotal = ((usarCeramica ? totalCeramica : totalBase) + totalBulboTornillo + totalExtraBulbo) * cantidad;
    const totalServicioExpress = servicioExpress ? subtotal * 0.3 : 0;
    const total = termoparEspecialP ? 0 : (subtotal + totalServicioExpress);

    return (
        <div className="form-container">
            <h1>Termopares</h1>

            <div className="form-row">
                <label>
                    <strong>Cantidad:</strong>
                </label>
                <input
                    type="number"
                    value={cantidad === 0 ? "" : cantidad}
                    onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                />
            </div>

            <div className="form-row">
                <label>
                    <strong>Tipo:</strong>
                </label>
                <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                >
                    <option value="">Seleccione...</option>
                    <option value="J">J</option>
                    <option value="K">K</option>
                </select>
            </div>

            <div className="form-row">
                <label>
                    <strong>Termopar ceramico:</strong>
                </label>
                <select
                    value={termoparCeramico}
                    onChange={(e) => setTermoparCeramico(e.target.value)}
                    disabled={tipo !== "K"}
                >
                    <option value="">Seleccione...</option>
                    <option value="K CON CERAMICA #8">K CON CERAMICA #8</option>
                    <option value="K CON CERAMICA #14">K CON CERAMICA #14</option>
                    <option value="NO">NO</option>
                </select>
            </div>

            <div className="form-row">
                <label>
                    <strong>Medida de termopar en cm (cliente):</strong>
                </label>
                <input
                    type="number"
                    value={medidaClienteCm === 0 ? "" : medidaClienteCm}
                    onChange={(e) => setMedidaClienteCm(parseFloat(e.target.value) || 0)}
                />
            </div>

            <div className="form-row">
                <label>
                    <strong>Bulbo / Tornillo:</strong>
                </label>
                <select
                    value={bulboTornillo}
                    disabled={usarCambioMedidaBulbo}
                    onChange={(e) => setBulboTornillo(e.target.value)}
                >
                    <option value="">Seleccione...</option>
                    <option value="BULBO 3/16 (DEFAULT)">BULBO 3/16 (DEFAULT)</option>
                    <option value="TORNILLO 1/4">TORNILLO 1/4</option>
                    <option value="TORNILLO 6MM">TORNILLO 6MM</option>
                    <option value="TORNILLO 3/16">TORNILLO 3/16</option>
                    <option value="TORNILLO 3/8">TORNILLO 3/8</option>
                    <option value="TORNILLO 1/2">TORNILLO 1/2</option>
                    <option value="CAMBIO DE BULBO + TORNILLO 1/4">
                        CAMBIO DE BULBO + TORNILLO 1/4
                    </option>
                    <option value="CAMBIO DE BULBO + TORNILLO 6MM">
                        CAMBIO DE BULBO + TORNILLO 6MM
                    </option>
                    <option value="CAMBIO DE BULBO + TORNILLO 3/16">
                        CAMBIO DE BULBO + TORNILLO 3/16
                    </option>
                    <option value="CAMBIO DE BULBO + TORNILLO 3/8">
                        CAMBIO DE BULBO + TORNILLO 3/8
                    </option>
                    <option value="CAMBIO DE BULBO + TORNILLO 1/2">
                        CAMBIO DE BULBO + TORNILLO 1/2
                    </option>
                    <option value="SIN BULBO">SIN BULBO</option>
                </select>
            </div>

            <div className="form-row checkbox-row">
                <label>Cambio de medida de bulbo</label>
                <input
                    type="checkbox"
                    checked={usarCambioMedidaBulbo}
                    disabled={!!bulboTornillo}
                    onChange={(e) => {
                        const checked = e.target.checked;
                        setUsarCambioMedidaBulbo(checked);

                        if (checked) {
                            setBulboTornillo("");
                        } else {
                            setCambioMedidaBulbo(0);
                        }
                    }}
                />
            </div>
            {usarCambioMedidaBulbo && (
                <div className="form-row">
                    <label>
                        <strong>Medida de bulbo en cm:</strong>
                    </label>
                    <input
                        type="number"
                        value={cambioMedidaBulbo === 0 ? "" : cambioMedidaBulbo}
                        onChange={(e) =>
                            setCambioMedidaBulbo(parseFloat(e.target.value) || 0)
                        }
                    />
                </div>
            )}


            <div className="form-row checkbox-row">
                <label>Servicio express</label>
                <input
                    type="checkbox"
                    checked={servicioExpress}
                    onChange={(e) => setServicioExpress(e.target.checked)}
                />
            </div>

            <div className="form-row checkbox-row">
                <label>Termopar especial P</label>
                <input
                    type="checkbox"
                    checked={termoparEspecialP}
                    onChange={(e) => setTermoparEspecialP(e.target.checked)}
                />
            </div>

            <div className="form-row textarea-row">
                <label>Datos adicionales:</label>
                <textarea
                    value={datosAdicionales}
                    onChange={(e) => setDatosAdicionales(e.target.value)}
                    placeholder="Escribe detalles adicionales"
                />
            </div>

            <div className="form-row textarea-row full-width descripcion-row">
                <div className="descripcion-box">
                    <label className="descripcion-title">Descripcion</label>
                    <p className="descripcion-texto">{descripcionTermopar}</p>
                </div>
            </div>
            <h3> Base: ${totalBase.toFixed(2)} | Cerámica: ${totalCeramica.toFixed(2)}</h3>
            <h3>Bulbo/Tornillo: ${totalBulboTornillo.toFixed(2)}</h3>
            <h1>
                Precio base: ${resultado.precio.toFixed(2)} | Medida tomada: {resultado.medidaSeleccionada} cm
            </h1>

            <h1>
                Total: ${total.toFixed(2)}
            </h1>
            <button
                className="btn btn-blue"
                onClick={() => {
                    onGuardar({
                        id: data?.id || Date.now().toString(),
                        tipo: "termopar",
                        descripcion: descripcionTermopar,
                        total: Number(total.toFixed(2)),
                        datos: {
                            cantidad,
                            tipo,
                            termoparCeramico,
                            medidaClienteCm,
                            bulboTornillo,
                            usarCambioMedidaBulbo,
                            cambioMedidaBulbo,
                            servicioExpress,
                            termoparEspecialP,
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

export default termopar;