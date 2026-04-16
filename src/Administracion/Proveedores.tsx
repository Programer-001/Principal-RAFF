//src/Administracion/Proveedores.tsx
import React, { useState, useEffect } from "react";
import { ref, push, set, get, update } from "firebase/database";
import { db } from "../firebase/config";

interface Proveedor {
    id?: string;
    nombre: string;
    alias: string;
    rfc: string;
    domicilio: string;
    colonia: string;
    municipio: string;
    estado: string;
    cp: string;
    pais: string;
    vendedor: string;
    telefono: string;
    whatsapp: string;
    email: string;
    notas: string;
}

const Proveedores: React.FC = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [busqueda, setBusqueda] = useState("");

    const [modoEditar, setModoEditar] = useState(false);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState(false);

    const [editandoId, setEditandoId] = useState<string | null>(null);

    const [form, setForm] = useState<Proveedor>({
        nombre: "",
        alias: "",
        rfc: "",
        domicilio: "",
        colonia: "",
        municipio: "",
        estado: "",
        cp: "",
        pais: "",
        vendedor: "",
        telefono: "",
        whatsapp: "",
        email: "",
        notas: "",
    });

    const direccionCompleta = `${form.domicilio}, ${form.colonia}, ${form.municipio}, ${form.estado}, ${form.cp}, ${form.pais}`;

    const whatsappNumero = (form.whatsapp || "").replace(/\D/g, "");

    const whatsappLink =
        whatsappNumero !== ""
            ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(
                `Hola ${form.alias || form.nombre}`
            )}`
            : "";

    const cargarProveedores = async () => {
        const snapshot = await get(ref(db, "proveedores"));

        if (!snapshot.exists()) return;

        const data = snapshot.val();

        const lista = Object.keys(data).map((id) => ({
            id,
            ...data[id],
        }));

        setProveedores(lista);
    };

    useEffect(() => {
        cargarProveedores();
    }, []);

    const handleChange = (campo: keyof Proveedor, valor: string) => {
        setForm({
            ...form,
            [campo]: valor,
        });
    };

    const guardarProveedor = async () => {
        if (!form.nombre.trim()) {
            alert("El proveedor necesita un nombre");
            return;
        }

        try {
            if (editandoId) {
                await update(ref(db, `proveedores/${editandoId}`), form);
            } else {
                const nuevoRef = push(ref(db, "proveedores"));
                await set(nuevoRef, form);
            }

            limpiarFormulario();
            cargarProveedores();
        } catch (error) {
            console.error(error);
            alert("Error al guardar proveedor");
        }
    };

    const limpiarFormulario = () => {
        setForm({
            nombre: "",
            alias: "",
            rfc: "",
            domicilio: "",
            colonia: "",
            municipio: "",
            estado: "",
            cp: "",
            pais: "",
            vendedor: "",
            telefono: "",
            whatsapp: "",
            email: "",
            notas: "",
        });

        setEditandoId(null);
        setModoEditar(false);
        setProveedorSeleccionado(false);
    };

    const seleccionarProveedor = (p: Proveedor) => {
        setForm(p);
        setEditandoId(p.id || null);
        setModoEditar(false);
        setProveedorSeleccionado(true);
    };

    const nuevoProveedor = () => {
        setForm({
            nombre: "",
            alias: "",
            rfc: "",
            domicilio: "",
            colonia: "",
            municipio: "",
            estado: "",
            cp: "",
            pais: "",
            vendedor: "",
            telefono: "",
            whatsapp: "",
            email: "",
            notas: "",
        });

        setEditandoId(null);
        setModoEditar(true);
        setProveedorSeleccionado(true);
    };

    const proveedoresFiltrados = proveedores.filter((p) =>
        (p.nombre + p.alias).toLowerCase().includes(busqueda.toLowerCase())
    );

    const Campo = ({
        label,
        valor,
        campo,
    }: {
        label: string;
        valor: string;
        campo: keyof Proveedor;
    }) => (
        <div style={{ marginBottom: 10 }}>
            <label style={{ fontWeight: "bold" }}>{label}</label>

            {modoEditar ? (
                <input
                    value={valor}
                    onChange={(e) => handleChange(campo, e.target.value)}
                    style={{ width: "100%" }}
                />
            ) : (
                <p>{valor || "-"}</p>
            )}
        </div>
    );

    return (
        <div style={{
            padding: 20,
            display: "flex",
            gap: 30,
            width: "100%",
            maxWidth: 1300,
            margin: "0 auto",
        }}>
            {/* PANEL IZQUIERDO */}

            <div
                style={{
                    flex: 2,
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                {!proveedorSeleccionado ? (
                    <div
                        style={{
                            height: 300,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#777",
                            fontSize: 18,
                        }}
                    >
                        Selecciona un proveedor o presiona "Nuevo"
                    </div>
                ) : (
                    <>
                        <h1>{form.nombre || "Nuevo proveedor"}</h1>

                        {/* BOTON WHATSAPP */}

                        {!modoEditar && whatsappNumero && (
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-block",
                                    marginBottom: 15,
                                    padding: "8px 14px",
                                    background: "#25D366",
                                    color: "white",
                                    textDecoration: "none",
                                    borderRadius: 5,
                                    fontWeight: "bold",
                                }}
                            >
                                WhatsApp
                            </a>
                        )}

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 20,
                            }}
                        >
                            <Campo label="Alias" valor={form.alias} campo="alias" />
                            <Campo label="RFC" valor={form.rfc} campo="rfc" />

                            <Campo
                                label="Domicilio"
                                valor={form.domicilio}
                                campo="domicilio"
                            />
                            <Campo label="CP" valor={form.cp} campo="cp" />

                            <Campo label="Colonia" valor={form.colonia} campo="colonia" />
                            <Campo
                                label="Municipio"
                                valor={form.municipio}
                                campo="municipio"
                            />

                            <Campo label="Estado" valor={form.estado} campo="estado" />
                            <Campo label="País" valor={form.pais} campo="pais" />

                            <Campo label="Vendedor" valor={form.vendedor} campo="vendedor" />
                            <Campo label="Teléfono" valor={form.telefono} campo="telefono" />

                            <Campo label="WhatsApp" valor={form.whatsapp} campo="whatsapp" />
                        </div>

                        <Campo label="Email" valor={form.email} campo="email" />

                        <div style={{ marginBottom: 10 }}>
                            <label style={{ fontWeight: "bold" }}>Notas</label>

                            {modoEditar ? (
                                <textarea
                                    value={form.notas}
                                    onChange={(e) => handleChange("notas", e.target.value)}
                                    style={{ width: "100%", height: 70 }}
                                />
                            ) : (
                                <p>{form.notas || "-"}</p>
                            )}
                        </div>

                        {/* BOTONES */}

                        <div style={{ marginTop: 15 }}>
                            {!modoEditar && (
                                <button
                                    onClick={() => setModoEditar(true)}
                                    style={{
                                        padding: 10,
                                        background: "#1976d2",
                                        color: "white",
                                        border: "none",
                                        marginRight: 10,
                                        cursor: "pointer",
                                    }}
                                >
                                    Editar
                                </button>
                            )}

                            {modoEditar && (
                                <button
                                    onClick={guardarProveedor}
                                    style={{
                                        padding: 10,
                                        background: "#2e7d32",
                                        color: "white",
                                        border: "none",
                                        marginRight: 10,
                                        cursor: "pointer",
                                    }}
                                >
                                    Guardar
                                </button>
                            )}

                            <button
                                onClick={nuevoProveedor}
                                style={{
                                    padding: 10,
                                    background: "#777",
                                    color: "white",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                Nuevo
                            </button>
                        </div>

                        {/* MAPA */}

                        {form.domicilio && (
                            <div style={{ marginTop: 30 }}>
                                <h3>Ubicación</h3>

                                <iframe
                                    title="mapa"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                                        direccionCompleta
                                    )}&output=embed`}
                                />

                                <div style={{ marginTop: 10 }}>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                            direccionCompleta
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Abrir en Google Maps
                                    </a>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* LIBRETA */}

            <div
                style={{
                    flex: 1,
                    borderLeft: "1px solid #ccc",
                    paddingLeft: 20,
                    minWidth: 250,
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                <h3>Libreta de proveedores</h3>

                <button
                    onClick={nuevoProveedor}
                    style={{
                        width: "100%",
                        padding: 8,
                        marginBottom: 10,
                        background: "#1976d2",
                        color: "white",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    + Nuevo proveedor
                </button>

                <input
                    placeholder="Buscar proveedor..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ width: "100%", padding: 6, marginBottom: 10 }}
                />

                {proveedoresFiltrados.map((p) => (
                    <div
                        key={p.id}
                        onClick={() => seleccionarProveedor(p)}
                        style={{
                            padding: 10,
                            border: "1px solid #ccc",
                            marginBottom: 8,
                            cursor: "pointer",
                            background: "#f5f5f5",
                        }}
                    >
                        <strong>{p.alias || "SIN ALIAS"}</strong>
                        <br />
                        <small>{p.nombre}</small>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Proveedores;
