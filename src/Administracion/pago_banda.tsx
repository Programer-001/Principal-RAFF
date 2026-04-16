import React, { useState, useEffect } from "react";
import { db } from "../firebase/config";
import { ref, get, set, update, onValue } from "firebase/database";
import { obtenerPrecioBanda } from "../datos/Precio_Banda_interno";
import { useNavigate } from "react-router-dom";
//import "../css/banda.css";
const Pago_Banda: React.FC = () => {
    const navigate = useNavigate();

    const [folio, setFolio] = useState("");
    const [datos, setDatos] = useState<any>(null);

    const [descripcion, setDescripcion] = useState("");

    const [diametro, setDiametro] = useState<number | "">("");
    const [ancho, setAncho] = useState<number | "">("");

    const [precioBase, setPrecioBase] = useState(0);

    const [useBarrenos, setUseBarrenos] = useState(false);
    const [barrenosCant, setBarrenosCant] = useState<number | "">("");
    const [barrenosPrecio, setBarrenosPrecio] = useState<number | "">("");

    const [usePlacas, setUsePlacas] = useState(false);
    const [placasCant, setPlacasCant] = useState<number | "">("");
    const [placasPrecio, setPlacasPrecio] = useState<number | "">("");

    const [useDobleces, setUseDobleces] = useState(false);
    const [doblecesCant, setDoblecesCant] = useState<number | "">("");
    const [doblecesPrecio, setDoblecesPrecio] = useState<number | "">("");

    const [use440V, setUse440V] = useState(false);

    const [foliosOrden, setFoliosOrden] = useState<any[]>([]);

    useEffect(() => {
        document.title = "Registrar Banda";

        const guardados = localStorage.getItem("orden_banda");

        if (guardados) {
            setFoliosOrden(JSON.parse(guardados));
        }
    }, []);

    useEffect(() => {
        if (diametro && ancho) {
            const precio = obtenerPrecioBanda(Number(ancho), Number(diametro));

            if (precio !== null) {
                setPrecioBase(precio);
            } else {
                setPrecioBase(0);
            }
        }
    }, [diametro, ancho]);

    const calcularTotal = () => {
        if (!datos) return 0;

        const cant = Number(datos.cantidad) || 1;
        const base = Number(precioBase) || 0;

        const bar = useBarrenos
            ? (Number(barrenosCant) || 0) * (Number(barrenosPrecio) || 0)
            : 0;

        const pla = usePlacas
            ? (Number(placasCant) || 0) * (Number(placasPrecio) || 0)
            : 0;

        const dob = useDobleces
            ? (Number(doblecesCant) || 0) * (Number(doblecesPrecio) || 0)
            : 0;

        let subtotal = cant * (base + bar + pla + dob);

        if (use440V) {
            subtotal = subtotal * 1.1;
        }

        return Math.round(subtotal * 100) / 100;
    };

    const total = calcularTotal();

    const buscarFolio = async () => {
        if (!folio.trim()) return;

        const ruta = ref(db, `produccion/CONTROL_DE_PRODUCCION_G/${folio}`);
        const snapshot = await get(ruta);

        if (!snapshot.exists()) {
            alert("Folio no encontrado");
            setDatos(null);
            return;
        }

        const data = snapshot.val();

        if (data.tipo !== "BANDA") {
            alert("Este folio no es BANDA");
            setDatos(null);
            return;
        }

        setDatos(data);
        setDescripcion(data.descripcion || "");
    };

    const agregarFolio = () => {
        if (!folio) return;

        const existe = foliosOrden.find((f) => f.folio === folio);

        if (existe) {
            alert("Este folio ya está agregado");
            return;
        }

        const extras: any[] = [];

        if (useBarrenos) {
            extras.push({
                tipo: "barrenos",
                cantidad: barrenosCant,
                precio: barrenosPrecio,
            });
        }

        if (usePlacas) {
            extras.push({
                tipo: "laminas",
                cantidad: placasCant,
                precio: placasPrecio,
            });
        }

        if (useDobleces) {
            extras.push({
                tipo: "dobleces",
                cantidad: doblecesCant,
                precio: doblecesPrecio,
            });
        }

        const nuevo = {
            folio,
            descripcion,
            diametro,
            ancho,
            precioBase,
            extras,
            voltaje_440: use440V,
            total,
        };

        const nuevaLista = [...foliosOrden, nuevo];

        setFoliosOrden(nuevaLista);

        localStorage.setItem("orden_banda", JSON.stringify(nuevaLista));

        limpiarFormulario();
    };

    const quitarFolio = (folioEliminar: string) => {
        const nuevaLista = foliosOrden.filter((f) => f.folio !== folioEliminar);

        setFoliosOrden(nuevaLista);

        localStorage.setItem("orden_banda", JSON.stringify(nuevaLista));
    };

    const limpiarFormulario = () => {
        setFolio("");
        setDescripcion("");

        setDiametro("");
        setAncho("");

        setUseBarrenos(false);
        setBarrenosCant("");
        setBarrenosPrecio("");

        setUsePlacas(false);
        setPlacasCant("");
        setPlacasPrecio("");

        setUseDobleces(false);
        setDoblecesCant("");
        setDoblecesPrecio("");

        setUse440V(false);

        setDatos(null);
    };

    const totalOrden = foliosOrden.reduce((acc, f) => acc + f.total, 0);

    const borrarTodo = () => {
        localStorage.removeItem("orden_banda");
        setFoliosOrden([]);
    };

    const crearOrden = () => {
        if (foliosOrden.length === 0) {
            alert("No hay folios agregados");
            return;
        }

        navigate("/pago_banda");
    };

    return (
        <div className="caja-container">
            <h1>Buscar Folio de banda</h1>
            {/* BUSCADOR */}
            <div className="busqueda_folio">
                <input
                    type="number"
                    placeholder="Ingresa folio..."
                    value={folio}
                    onChange={(e) => setFolio(e.target.value)}
                    inputMode="numeric"
                />

                <button className="btn btn-blue" onClick={buscarFolio}>
                    Buscar
                </button>
            </div>

            {datos && (
                <div>
                    <h2>Folio: {folio}</h2>
                    {/* CANTIDAD */}
                    <p>
                        <strong>Cantidad: </strong>
                        {datos.cantidad}
                    </p>
                    {/* DESCRIPCIÓN */}
                    <textarea value={descripcion} readOnly className="textarea-info" />
                    {/* CALCULAR BANDA */}
                    <div className="producto_extra">
                        <div>
                            Diámetro
                            <input
                                type="number"
                                placeholder="en pulgadas"
                                value={diametro}
                                onChange={(e) => setDiametro(e.target.value as any)}
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                            />
                        </div>
                        <div>
                            Ancho
                            <input
                                type="number"
                                placeholder="en pulgadas"
                                value={ancho}
                                onChange={(e) => setAncho(e.target.value as any)}
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                            />
                        </div>
                    </div>
                    {/* PRECIO BASE DE BANDA */}
                    <p>
                        <strong>Precio base:</strong> ${precioBase}
                    </p>
                    <hr />
                    {/* BARRENOS */}
                    <label className="titulo_opcion">
                        <input
                            type="checkbox"
                            checked={useBarrenos}
                            onChange={() => setUseBarrenos(!useBarrenos)}
                        />
                        Barrenos
                    </label>
                    {useBarrenos && (
                        <div className="producto_extra">
                            <div>
                                Cantidad
                                <input
                                    type="number"
                                    value={barrenosCant}
                                    onChange={(e) => setBarrenosCant(e.target.value as any)}
                                />
                            </div>

                            <div>
                                Precio unitario
                                <input
                                    type="number"
                                    value={barrenosPrecio}
                                    onChange={(e) => setBarrenosPrecio(e.target.value as any)}
                                />
                            </div>
                        </div>
                    )}
                    {/* LAMINAS */}

                    <label className="titulo_opcion">
                        <input
                            type="checkbox"
                            checked={usePlacas}
                            onChange={() => setUsePlacas(!usePlacas)}
                        />
                        Laminas
                    </label>
                    {usePlacas && (
                        <div className="producto_extra">
                            <div>
                                Cantidad
                                <input
                                    type="number"
                                    value={placasCant}
                                    onChange={(e) => setPlacasCant(e.target.value as any)}
                                />
                            </div>

                            <div>
                                Precio unitario
                                <input
                                    type="number"
                                    value={placasPrecio}
                                    onChange={(e) => setPlacasPrecio(e.target.value as any)}
                                />
                            </div>
                        </div>
                    )}

                    {/* DOBLECES */}

                    <label className="titulo_opcion">
                        <input
                            type="checkbox"
                            checked={useDobleces}
                            onChange={() => setUseDobleces(!useDobleces)}
                        />
                        Dobleces
                    </label>
                    {useDobleces && (
                        <div className="producto_extra">
                            <div>
                                Cantidad
                                <input
                                    type="number"
                                    value={doblecesCant}
                                    onChange={(e) => setDoblecesCant(e.target.value as any)}
                                />
                            </div>

                            <div>
                                Precio unitario
                                <input
                                    type="number"
                                    value={doblecesPrecio}
                                    onChange={(e) => setDoblecesPrecio(e.target.value as any)}
                                />
                            </div>
                        </div>
                    )}
                    {/* 440V */}
                    <label className="titulo_opcion">
                        <input
                            type="checkbox"
                            checked={use440V}
                            onChange={() => setUse440V(!use440V)}
                        />
                        440V (+10%)
                    </label>
                    <hr />
                    <h2>Total ${total}</h2>
                    <button className="btn btn-green" onClick={agregarFolio}>
                        Agregar Folio
                    </button>
                </div>
            )}

            <hr />

            <h2>🛒 Orden Banda</h2>

            {foliosOrden.map((f, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #ddd",
                        padding: "6px 0",
                    }}
                >
                    <div>
                        Folio {f.folio} — ${f.total}
                    </div>

                    <button
                        className="btn btn-delete"
                        onClick={() => quitarFolio(f.folio)}
                    >
                        ❌
                    </button>
                </div>
            ))}

            <h3>Total: ${totalOrden}</h3>
            <div className="btn-container">
                <button className="btn btn-purple" onClick={crearOrden}>
                    Crear Orden
                </button>

                <button className="btn btn-red" onClick={borrarTodo}>
                    Borrar Todo
                </button>
            </div>
        </div>
    );
};

export default Pago_Banda;
