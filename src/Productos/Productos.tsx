//src/productos_editor.tsx
import React, { useEffect, useState } from "react";
import { ref, get, set, remove, update } from "firebase/database";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../firebase/config";

interface EmpleadoPerfil {
    nombre?: string;
    username?: string;
    email?: string;
    uid?: string;
    area?: string;
    puesto?: string;
}
interface Producto {
    id: string;
    Producto: string;
    PrecioNeto: number;
    PrecioProveedor?: number;
    habilitado: boolean;
}

const Productos_editor: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [nombre, setNombre] = useState("");
    const [precioNeto, setPrecioNeto] = useState<number>(0);
    const [precioProveedor, setPrecioProveedor] = useState<number>(0);
    const [editandoId, setEditandoId] = useState<string | null>(null);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [productoSeleccionado, setProductoSeleccionado] =
        useState<Producto | null>(null);

    const [columnaOrden, setColumnaOrden] = useState<string>("Producto");
    const [direccionOrden, setDireccionOrden] = useState<"asc" | "desc">("asc");
    const [user, setUser] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<EmpleadoPerfil | null>(null);
    //Cargar empleados
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (usuario) => {
            setUser(usuario);

            if (!usuario?.uid) {
                setPerfil(null);
                return;
            }

            try {
                const snapshot = await get(ref(db, "RH/Empleados"));

                if (!snapshot.exists()) {
                    setPerfil(null);
                    return;
                }

                const empleados = snapshot.val();
                let encontrado: EmpleadoPerfil | null = null;

                for (const key in empleados) {
                    const emp = empleados[key];
                    if (emp?.uid === usuario.uid) {
                        encontrado = emp;
                        break;
                    }
                }

                setPerfil(encontrado);
            } catch (error) {
                console.error("Error cargando perfil en productos:", error);
                setPerfil(null);
            }
        });

        return () => unsub();
    }, []);

    const areaUsuario = perfil?.area || "";
    const esAdministracion = areaUsuario === "Administración";
    const esMostrador = areaUsuario === "Mostrador";
    const puedeEditarProductos = esAdministracion;

    // 🔹 Cargar productos
    const cargarProductos = async () => {
        const snapshot = await get(ref(db, "Productos"));

        if (snapshot.exists()) {
            const data = snapshot.val();

            const lista: Producto[] = Object.keys(data).map((key) => ({
                id: key,
                Producto: data[key].Producto,
                PrecioNeto: data[key]["Precio neto"] || data[key].PrecioNeto || 0,
                PrecioProveedor: data[key].PrecioProveedor || 0,
                habilitado:
                    data[key].habilitado === undefined ? true : data[key].habilitado,
            }));

            setProductos(lista);
        }
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    // 🔎 Filtrar productos
    const productosFiltrados = productos.filter((p) =>
        p.Producto.toLowerCase().includes(busqueda.toLowerCase())
    );

    // 🔹 Ordenar tabla
    const ordenar = (columna: string) => {
        let direccion: "asc" | "desc" = "asc";

        if (columnaOrden === columna && direccionOrden === "asc") {
            direccion = "desc";
        }

        setColumnaOrden(columna);
        setDireccionOrden(direccion);

        const productosOrdenados = [...productos].sort((a, b) => {
            if (columna === "Producto") {
                return direccion === "asc"
                    ? a.Producto.localeCompare(b.Producto)
                    : b.Producto.localeCompare(a.Producto);
            }

            if (columna === "PrecioNeto") {
                return direccion === "asc"
                    ? a.PrecioNeto - b.PrecioNeto
                    : b.PrecioNeto - a.PrecioNeto;
            }

            if (columna === "PrecioProveedor") {
                return direccion === "asc"
                    ? (a.PrecioProveedor || 0) - (b.PrecioProveedor || 0)
                    : (b.PrecioProveedor || 0) - (a.PrecioProveedor || 0);
            }

            if (columna === "habilitado") {
                return direccion === "asc"
                    ? Number(b.habilitado) - Number(a.habilitado)
                    : Number(a.habilitado) - Number(b.habilitado);
            }

            return 0;
        });

        setProductos(productosOrdenados);
    };

    const flecha = (col: string) => {
        if (columnaOrden !== col) return "";
        return direccionOrden === "asc" ? " ▲" : " ▼";
    };

    // ➕ Guardar
    const guardarProducto = async () => {
        if (!nombre) {
            alert("El nombre es obligatorio");
            return;
        }

        const datos = {
            Producto: nombre,
            PrecioNeto: Number(precioNeto.toFixed(2)),
            PrecioProveedor: Number(precioProveedor.toFixed(2)),
        };

        if (editandoId) {
            await update(ref(db, `Productos/${editandoId}`), datos);
        } else {
            const nuevoId = Date.now().toString();

            await set(ref(db, `Productos/${nuevoId}`), {
                ...datos,
                habilitado: true,
            });
        }

        cancelarFormulario();
        setProductoSeleccionado(null);
        setBusqueda("");
        cargarProductos();
    };

    const cancelarFormulario = () => {
        setNombre("");
        setPrecioNeto(0);
        setPrecioProveedor(0);
        setEditandoId(null);
        setMostrarFormulario(false);
    };

    // 📝 Editar
    const editarProducto = (producto: Producto) => {
        setNombre(producto.Producto);
        setPrecioNeto(producto.PrecioNeto);
        setPrecioProveedor(producto.PrecioProveedor || 0);
        setEditandoId(producto.id);
        setMostrarFormulario(true);
    };

    // ❌ Eliminar
    const eliminarProducto = async (id: string) => {
        if (!window.confirm("¿Eliminar producto definitivamente?")) return;

        await remove(ref(db, `Productos/${id}`));

        setProductoSeleccionado(null);
        setBusqueda("");

        cargarProductos();
    };

    // 🔄 Habilitar
    const toggleHabilitado = async (producto: Producto) => {
        await update(ref(db, `Productos/${producto.id}`), {
            habilitado: !producto.habilitado,
        });

        cargarProductos();
    };
    console.log("perfil productos:", perfil);
    console.log("area productos:", perfil?.area);
    return (
        <div style={{ padding: 20 }}>
            <h2>Editor de Productos</h2>

            {/* BUSCADOR */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="search-input"
                />

                {puedeEditarProductos && (
                    <button onClick={() => setMostrarFormulario(true)}>
                        + Agregar Producto
                    </button>
                )}
            </div>

            {/* RESULTADOS BUSQUEDA */}
            {busqueda && (
                <div style={{ marginBottom: 20 }}>
                    {productosFiltrados.slice(0, 5).map((p) => (
                        <div
                            key={p.id}
                            style={{
                                cursor: "pointer",
                                padding: 5,
                                borderBottom: "1px solid #ccc",
                            }}
                            onClick={() => {
                                setProductoSeleccionado(p);
                                setBusqueda("");
                            }}
                        >
                            {p.Producto}
                        </div>
                    ))}
                </div>
            )}

            {/* PRODUCTO SELECCIONADO */}
            {productoSeleccionado && (
                <div
                    style={{
                        marginBottom: 20,
                        border: "1px solid #ccc",
                        padding: 10,
                        borderRadius: 5,
                    }}
                >
                    <h3>{productoSeleccionado.Producto}</h3>

                    <p>Precio Neto: ${productoSeleccionado.PrecioNeto.toFixed(2)}</p>

                    {puedeEditarProductos && (
                        <p>Proveedor: ${(productoSeleccionado.PrecioProveedor || 0).toFixed(2)}</p>
                    )}

                    {puedeEditarProductos && (
                        <>
                            <button onClick={() => editarProducto(productoSeleccionado)}>
                                Editar
                            </button>

                            <button
                                onClick={() => eliminarProducto(productoSeleccionado.id)}
                                style={{ marginLeft: 10 }}
                            >
                                Eliminar
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => {
                            setProductoSeleccionado(null);
                            setBusqueda("");
                        }}
                        style={{ marginLeft: 10 }}
                    >
                        Cerrar
                    </button>
                </div>
            )}

            {/* FORMULARIO */}
            {mostrarFormulario && puedeEditarProductos && (
                <div style={{ marginBottom: 20 }}>
                    <h3>{editandoId ? "Editar producto" : "Nuevo producto"}</h3>

                    <input
                        type="text"
                        placeholder="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        style={{ marginRight: 10 }}
                    />

                    <input
                        type="number"
                        placeholder="Precio Neto"
                        value={precioNeto}
                        onChange={(e) => setPrecioNeto(Number(e.target.value))}
                        style={{ marginRight: 10 }}
                    />

                    <input
                        type="number"
                        placeholder="Precio Proveedor"
                        value={precioProveedor}
                        onChange={(e) => setPrecioProveedor(Number(e.target.value))}
                        style={{ marginRight: 10 }}
                    />

                    <button onClick={guardarProducto}>
                        {editandoId ? "Actualizar" : "Guardar"}
                    </button>

                    <button onClick={cancelarFormulario} style={{ marginLeft: 10 }}>
                        Cancelar
                    </button>
                </div>
            )}

            {/* TABLA */}
            <div className="table-scroll">
                <table className="caja-table">
                    <thead>
                        <tr>
                            <th
                                onClick={() => ordenar("Producto")}
                                style={{ cursor: "pointer" }}
                            >
                                Producto{flecha("Producto")}
                            </th>

                            <th
                                onClick={() => ordenar("PrecioNeto")}
                                style={{ cursor: "pointer" }}
                            >
                                Precio Neto{flecha("PrecioNeto")}
                            </th>

                            {puedeEditarProductos && (
                                <>
                                    <th
                                        onClick={() => ordenar("PrecioProveedor")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        Precio Proveedor{flecha("PrecioProveedor")}
                                    </th>

                                    <th
                                        onClick={() => ordenar("habilitado")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        Habilitado{flecha("habilitado")}
                                    </th>

                                    <th>Editar</th>
                                    <th>Eliminar</th>
                                </>
                            )}
                        </tr>
                    </thead>

                    <tbody>
                        {productos
                            .filter((p) => (esMostrador ? p.habilitado : true))
                            .map((p) => (
                            <tr
                                key={p.id}
                                style={{
                                    backgroundColor: puedeEditarProductos
                                        ? p.habilitado
                                            ? "white"
                                            : "#ffe5e5"
                                        : "white",
                                }}
                            >
                                <td>{p.Producto}</td>
                                <td>${p.PrecioNeto.toFixed(2)}</td>

                                {puedeEditarProductos && (
                                    <>
                                        <td>${(p.PrecioProveedor || 0).toFixed(2)}</td>

                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={p.habilitado}
                                                onChange={() => toggleHabilitado(p)}
                                            />
                                        </td>

                                        <td>
                                            <button onClick={() => editarProducto(p)}>Editar</button>
                                        </td>

                                        <td>
                                            <button onClick={() => eliminarProducto(p.id)}>X</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Productos_editor;
