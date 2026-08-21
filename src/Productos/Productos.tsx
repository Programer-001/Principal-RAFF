// src/productos_editor.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
    ref,
    get,
    set,
    remove,
    update,
} from "firebase/database";
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,
} from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

import { formatearMoneda } from "../funciones/formato_moneda";
import { db, auth, storage } from "../firebase/config";
import "../css/productos.css";

/* =========================================================
   TIPOS
========================================================= */

interface EmpleadoPerfil {
    nombre?: string;
    username?: string;
    email?: string;
    uid?: string;
    area?: string;
    puesto?: string;
}

interface ImagenProducto {
    id: string;
    url: string;
    path: string;
    orden: number;
    principal?: boolean;
}

interface CamposVisiblesProducto {
    [campo: string]: boolean;
}

interface Producto {
    id: string;
    Producto: string;
    PrecioNeto: number;
    PrecioProveedor?: number;
    habilitado: boolean;

    descripcion?: string;
    marca?: string;
    modelo?: string;
    unidad?: string;
    voltaje?: string;
    potencia?: string;
    material?: string;
    medida?: string;
    dimensiones?: string;
    categoria?: string;
    subcategoria?: string;
    proveedor?: string;
    codigoProveedor?: string;
    codigoInterno?: string;
    sku?: string;
    existencia?: number;
    stockMinimo?: number;
    ubicacion?: string;
    notas?: string;

    imagenes?: Record<string, ImagenProducto>;
    camposVisibles?: CamposVisiblesProducto;

    [campo: string]: any;
}

interface FormularioProducto {
    Producto: string;
    PrecioNeto: number;
    PrecioProveedor: number;
    descripcion: string;
    marca: string;
    modelo: string;
    unidad: string;
    voltaje: string;
    potencia: string;
    material: string;
    medida: string;
    dimensiones: string;
    categoria: string;
    subcategoria: string;
    proveedor: string;
    codigoProveedor: string;
    codigoInterno: string;
    sku: string;
    existencia: number;
    stockMinimo: number;
    ubicacion: string;
    notas: string;
}

interface CampoConfig {
    key: keyof FormularioProducto;
    label: string;
    tipo: "texto" | "numero" | "textarea";
}

/* =========================================================
   CAMPOS
========================================================= */

const camposConfigurables: CampoConfig[] = [
    { key: "PrecioNeto", label: "Precio Neto", tipo: "numero" },
    { key: "PrecioProveedor", label: "Precio Proveedor", tipo: "numero" },
    { key: "descripcion", label: "Descripción", tipo: "textarea" },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "modelo", label: "Modelo", tipo: "texto" },
    { key: "unidad", label: "Unidad", tipo: "texto" },
    { key: "voltaje", label: "Voltaje", tipo: "texto" },
    { key: "potencia", label: "Potencia", tipo: "texto" },
    { key: "material", label: "Material", tipo: "texto" },
    { key: "medida", label: "Medida", tipo: "texto" },
    { key: "dimensiones", label: "Dimensiones", tipo: "texto" },
    { key: "categoria", label: "Categoría", tipo: "texto" },
    { key: "subcategoria", label: "Subcategoría", tipo: "texto" },
    { key: "proveedor", label: "Proveedor", tipo: "texto" },
    { key: "codigoProveedor", label: "Código Proveedor", tipo: "texto" },
    { key: "codigoInterno", label: "Código Interno", tipo: "texto" },
    { key: "sku", label: "SKU", tipo: "texto" },
    { key: "existencia", label: "Existencia", tipo: "numero" },
    { key: "stockMinimo", label: "Stock mínimo", tipo: "numero" },
    { key: "ubicacion", label: "Ubicación", tipo: "texto" },
    { key: "notas", label: "Notas", tipo: "textarea" },
];

const formularioVacio: FormularioProducto = {
    Producto: "",
    PrecioNeto: 0,
    PrecioProveedor: 0,
    descripcion: "",
    marca: "",
    modelo: "",
    unidad: "",
    voltaje: "",
    potencia: "",
    material: "",
    medida: "",
    dimensiones: "",
    categoria: "",
    subcategoria: "",
    proveedor: "",
    codigoProveedor: "",
    codigoInterno: "",
    sku: "",
    existencia: 0,
    stockMinimo: 0,
    ubicacion: "",
    notas: "",
};

const camposVisiblesDefault: CamposVisiblesProducto = {
    PrecioNeto: true,
    PrecioProveedor: false,
    descripcion: true,
    marca: true,
    modelo: true,
    unidad: true,
    voltaje: true,
    potencia: true,
    material: true,
    medida: true,
    dimensiones: true,
    categoria: true,
    subcategoria: true,
    proveedor: false,
    codigoProveedor: false,
    codigoInterno: true,
    sku: true,
    existencia: true,
    stockMinimo: false,
    ubicacion: true,
    notas: true,
};

/* =========================================================
   COMPONENTE
========================================================= */

const Productos_editor: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [busqueda, setBusqueda] = useState("");

    const [productoSeleccionado, setProductoSeleccionado] =
        useState<Producto | null>(null);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);

    const [formulario, setFormulario] =
        useState<FormularioProducto>(formularioVacio);

    const [camposVisibles, setCamposVisibles] =
        useState<CamposVisiblesProducto>(camposVisiblesDefault);

    const [perfil, setPerfil] =
        useState<EmpleadoPerfil | null>(null);

    const [columnaOrden, setColumnaOrden] =
        useState<string>("Producto");

    const [direccionOrden, setDireccionOrden] =
        useState<"asc" | "desc">("asc");

    const [indiceImagen, setIndiceImagen] = useState(0);
    const [subiendoImagen, setSubiendoImagen] = useState(false);

    /* =====================================================
       USUARIO / PERFIL
    ===================================================== */

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (usuario) => {
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
                console.error(
                    "Error cargando perfil en productos:",
                    error
                );

                setPerfil(null);
            }
        });

        return () => unsub();
    }, []);

    const areaUsuario = perfil?.area || "";

    const esAdministracion =
        areaUsuario === "Administración";

    const esMostrador =
        areaUsuario === "Mostrador";

    const puedeEditarProductos =
        esAdministracion;

    /* =====================================================
       CARGAR PRODUCTOS
    ===================================================== */

    const cargarProductos = async () => {
        const snapshot = await get(ref(db, "Productos"));

        if (!snapshot.exists()) {
            setProductos([]);
            return;
        }

        const data = snapshot.val();

        const lista: Producto[] = Object.keys(data).map((key) => {
            const productoFirebase = data[key] || {};

            return {
                // Conserva TODOS los campos que ya tenga Firebase
                ...productoFirebase,

                id: key,

                Producto:
                    productoFirebase.Producto || "",

                PrecioNeto:
                    productoFirebase.PrecioNeto ??
                    productoFirebase["Precio neto"] ??
                    0,

                PrecioProveedor:
                    productoFirebase.PrecioProveedor ?? 0,

                habilitado:
                    productoFirebase.habilitado === undefined
                        ? true
                        : productoFirebase.habilitado,

                imagenes:
                    productoFirebase.imagenes || {},

                camposVisibles:
                    productoFirebase.camposVisibles || {},
            };
        });

        setProductos(lista);
    };

    useEffect(() => {
        cargarProductos();
    }, []);

    /* =====================================================
       BUSCADOR
    ===================================================== */

    const productosFiltrados = productos.filter((producto) =>
        producto.Producto
            ?.toLowerCase()
            .includes(busqueda.toLowerCase())
    );

    /* =====================================================
       ORDENAR
    ===================================================== */

    const ordenar = (columna: string) => {
        let direccion: "asc" | "desc" = "asc";

        if (
            columnaOrden === columna &&
            direccionOrden === "asc"
        ) {
            direccion = "desc";
        }

        setColumnaOrden(columna);
        setDireccionOrden(direccion);

        const ordenados = [...productos].sort((a, b) => {
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
                    ? (a.PrecioProveedor || 0) -
                          (b.PrecioProveedor || 0)
                    : (b.PrecioProveedor || 0) -
                          (a.PrecioProveedor || 0);
            }

            if (columna === "habilitado") {
                return direccion === "asc"
                    ? Number(b.habilitado) -
                          Number(a.habilitado)
                    : Number(a.habilitado) -
                          Number(b.habilitado);
            }

            return 0;
        });

        setProductos(ordenados);
    };

    const flecha = (columna: string) => {
        if (columnaOrden !== columna) return "";

        return direccionOrden === "asc"
            ? " ▲"
            : " ▼";
    };

    /* =====================================================
       FORMULARIO
    ===================================================== */

    const cambiarFormulario = (
        campo: keyof FormularioProducto,
        valor: string | number
    ) => {
        setFormulario((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));
    };

    const abrirNuevoProducto = () => {
        setEditandoId(null);
        setFormulario({ ...formularioVacio });
        setCamposVisibles({ ...camposVisiblesDefault });
        setMostrarFormulario(true);
    };

    const cerrarFormulario = () => {
        setMostrarFormulario(false);
        setEditandoId(null);
        setFormulario({ ...formularioVacio });
        setCamposVisibles({ ...camposVisiblesDefault });
    };

    /* =====================================================
       EDITAR PRODUCTO
    ===================================================== */

    const editarProducto = (producto: Producto) => {
        setFormulario({
            Producto: producto.Producto || "",
            PrecioNeto: producto.PrecioNeto || 0,
            PrecioProveedor: producto.PrecioProveedor || 0,
            descripcion: producto.descripcion || "",
            marca: producto.marca || "",
            modelo: producto.modelo || "",
            unidad: producto.unidad || "",
            voltaje: producto.voltaje || "",
            potencia: producto.potencia || "",
            material: producto.material || "",
            medida: producto.medida || "",
            dimensiones: producto.dimensiones || "",
            categoria: producto.categoria || "",
            subcategoria: producto.subcategoria || "",
            proveedor: producto.proveedor || "",
            codigoProveedor: producto.codigoProveedor || "",
            codigoInterno: producto.codigoInterno || "",
            sku: producto.sku || "",
            existencia: producto.existencia || 0,
            stockMinimo: producto.stockMinimo || 0,
            ubicacion: producto.ubicacion || "",
            notas: producto.notas || "",
        });

        setCamposVisibles({
            ...camposVisiblesDefault,
            ...(producto.camposVisibles || {}),
        });

        setEditandoId(producto.id);

        setProductoSeleccionado(null);
        setMostrarFormulario(true);
    };

    /* =====================================================
       GUARDAR PRODUCTO
    ===================================================== */

    const guardarProducto = async () => {
        if (!formulario.Producto.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        const datos = {
            ...formulario,

            Producto:
                formulario.Producto.trim(),

            PrecioNeto:
                Number(formulario.PrecioNeto.toFixed(2)),

            "Precio neto":
                Number(formulario.PrecioNeto.toFixed(2)),

            PrecioProveedor:
                Number(
                    formulario.PrecioProveedor.toFixed(2)
                ),

            camposVisibles,
        };

        try {
            if (editandoId) {
                await update(
                    ref(db, `Productos/${editandoId}`),
                    datos
                );
            } else {
                const nuevoId = Date.now().toString();

                await set(
                    ref(db, `Productos/${nuevoId}`),
                    {
                        ...datos,
                        habilitado: true,
                    }
                );
            }

            cerrarFormulario();

            setProductoSeleccionado(null);
            setBusqueda("");

            await cargarProductos();
        } catch (error) {
            console.error(
                "Error guardando producto:",
                error
            );

            alert("No se pudo guardar el producto.");
        }
    };

    /* =====================================================
       HABILITAR
    ===================================================== */

    const toggleHabilitado = async (
        producto: Producto
    ) => {
        await update(
            ref(db, `Productos/${producto.id}`),
            {
                habilitado: !producto.habilitado,
            }
        );

        await cargarProductos();
    };

    /* =====================================================
       CONVERTIR A WEBP
    ===================================================== */

    const convertirImagenAWebP = (
        archivo: File,
        maxDimension = 1200,
        calidad = 0.8
    ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();

            const objectUrl =
                URL.createObjectURL(archivo);

            img.onload = () => {
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                if (
                    width > maxDimension ||
                    height > maxDimension
                ) {
                    const escala = Math.min(
                        maxDimension / width,
                        maxDimension / height
                    );

                    width = Math.round(
                        width * escala
                    );

                    height = Math.round(
                        height * escala
                    );
                }

                const canvas =
                    document.createElement("canvas");

                canvas.width = width;
                canvas.height = height;

                const ctx =
                    canvas.getContext("2d");

                if (!ctx) {
                    URL.revokeObjectURL(objectUrl);

                    reject(
                        new Error(
                            "No se pudo crear el canvas"
                        )
                    );

                    return;
                }

                ctx.drawImage(
                    img,
                    0,
                    0,
                    width,
                    height
                );

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(
                            objectUrl
                        );

                        if (!blob) {
                            reject(
                                new Error(
                                    "No se pudo convertir la imagen"
                                )
                            );

                            return;
                        }

                        resolve(blob);
                    },
                    "image/webp",
                    calidad
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);

                reject(
                    new Error(
                        "No se pudo leer la imagen"
                    )
                );
            };

            img.src = objectUrl;
        });
    };

    /* =====================================================
       SUBIR IMÁGENES
    ===================================================== */

    const subirImagenes = async (
        archivos: FileList | null
    ) => {
        if (
            !productoSeleccionado ||
            !archivos ||
            archivos.length === 0
        ) {
            return;
        }

        try {
            setSubiendoImagen(true);

            const producto =
                productoSeleccionado;

            const imagenesActuales =
                producto.imagenes || {};

            const cantidadActual =
                Object.keys(imagenesActuales).length;

            const nuevasImagenes:
                Record<string, ImagenProducto> = {};

            let imagenesAgregadas = 0;

            for (
                let i = 0;
                i < archivos.length;
                i++
            ) {
                const archivo = archivos[i];

                if (
                    !archivo.type.startsWith("image/")
                ) {
                    continue;
                }

                const imagenWebP =
                    await convertirImagenAWebP(
                        archivo
                    );

                /*
                    Cada imagen obtiene un UUID.

                    productos/
                       ID_PRODUCTO/
                          UUID.webp
                */

                const imagenId =
                    crypto.randomUUID();

                const path =
                    `productos/${producto.id}/${imagenId}.webp`;

                const referenciaStorage =
                    storageRef(storage, path);

                await uploadBytes(
                    referenciaStorage,
                    imagenWebP,
                    {
                        contentType:
                            "image/webp",
                    }
                );

                const url =
                    await getDownloadURL(
                        referenciaStorage
                    );

                nuevasImagenes[imagenId] = {
                    id: imagenId,
                    url,
                    path,

                    orden:
                        cantidadActual +
                        imagenesAgregadas +
                        1,

                    principal:
                        cantidadActual === 0 &&
                        imagenesAgregadas === 0,
                };

                imagenesAgregadas++;
            }

            const imagenesFinales = {
                ...imagenesActuales,
                ...nuevasImagenes,
            };

            await update(
                ref(
                    db,
                    `Productos/${producto.id}`
                ),
                {
                    imagenes:
                        imagenesFinales,
                }
            );

            setProductoSeleccionado({
                ...producto,
                imagenes:
                    imagenesFinales,
            });

            setIndiceImagen(0);

            await cargarProductos();
        } catch (error) {
            console.error(
                "Error subiendo imagen:",
                error
            );

            alert(
                "No se pudo subir la imagen."
            );
        } finally {
            setSubiendoImagen(false);
        }
    };

    /* =====================================================
       ELIMINAR IMAGEN
    ===================================================== */

    const eliminarImagen = async (
        imagen: ImagenProducto
    ) => {
        if (!productoSeleccionado) {
            return;
        }

        if (
            !window.confirm(
                "¿Eliminar esta imagen?"
            )
        ) {
            return;
        }

        try {
            await deleteObject(
                storageRef(
                    storage,
                    imagen.path
                )
            );
        } catch (error) {
            console.warn(
                "No se pudo eliminar físicamente la imagen:",
                error
            );
        }

        const imagenesActuales = {
            ...(productoSeleccionado.imagenes ||
                {}),
        };

        delete imagenesActuales[imagen.id];

        const restantes = Object.values(
            imagenesActuales
        ).sort(
            (a, b) =>
                a.orden - b.orden
        );

        const imagenesReordenadas:
            Record<string, ImagenProducto> = {};

        restantes.forEach(
            (img, index) => {
                imagenesReordenadas[img.id] = {
                    ...img,
                    orden: index + 1,
                    principal:
                        index === 0,
                };
            }
        );

        await update(
            ref(
                db,
                `Productos/${productoSeleccionado.id}`
            ),
            {
                imagenes:
                    imagenesReordenadas,
            }
        );

        setProductoSeleccionado({
            ...productoSeleccionado,
            imagenes:
                imagenesReordenadas,
        });

        setIndiceImagen(0);

        await cargarProductos();
    };

    /* =====================================================
       HACER IMAGEN PRINCIPAL
    ===================================================== */

    const hacerImagenPrincipal = async (
        imagenId: string
    ) => {
        if (!productoSeleccionado) {
            return;
        }

        const actuales =
            productoSeleccionado.imagenes || {};

        const ordenados =
            Object.values(actuales).sort(
                (a, b) =>
                    a.orden - b.orden
            );

        const seleccionada =
            ordenados.find(
                (img) =>
                    img.id === imagenId
            );

        if (!seleccionada) {
            return;
        }

        const otros =
            ordenados.filter(
                (img) =>
                    img.id !== imagenId
            );

        const nuevos = [
            seleccionada,
            ...otros,
        ];

        const resultado:
            Record<string, ImagenProducto> = {};

        nuevos.forEach(
            (img, index) => {
                resultado[img.id] = {
                    ...img,
                    orden: index + 1,
                    principal:
                        index === 0,
                };
            }
        );

        await update(
            ref(
                db,
                `Productos/${productoSeleccionado.id}`
            ),
            {
                imagenes: resultado,
            }
        );

        setProductoSeleccionado({
            ...productoSeleccionado,
            imagenes: resultado,
        });

        setIndiceImagen(0);

        await cargarProductos();
    };

    /* =====================================================
       ELIMINAR PRODUCTO
    ===================================================== */

    const eliminarProducto = async (
        id: string
    ) => {
        if (
            !window.confirm(
                "¿Eliminar producto definitivamente?"
            )
        ) {
            return;
        }

        const producto =
            productos.find(
                (p) => p.id === id
            );

        /*
            Eliminar primero las imágenes
            que tenga el producto en Storage.
        */

        if (producto?.imagenes) {
            for (
                const imagen of Object.values(
                    producto.imagenes
                )
            ) {
                try {
                    await deleteObject(
                        storageRef(
                            storage,
                            imagen.path
                        )
                    );
                } catch (error) {
                    console.warn(
                        "No se pudo borrar:",
                        imagen.path,
                        error
                    );
                }
            }
        }

        await remove(
            ref(
                db,
                `Productos/${id}`
            )
        );

        setProductoSeleccionado(null);
        setBusqueda("");

        await cargarProductos();
    };

    /* =====================================================
       IMÁGENES ORDENADAS
    ===================================================== */

    const imagenesProducto =
        useMemo(() => {
            if (
                !productoSeleccionado?.imagenes
            ) {
                return [];
            }

            return Object.values(
                productoSeleccionado.imagenes
            ).sort(
                (a, b) =>
                    a.orden - b.orden
            );
        }, [productoSeleccionado]);

    /* =====================================================
       CAMPOS EXTRA DE FIREBASE
    ===================================================== */

    const camposExtrasProducto =
        useMemo(() => {
            if (!productoSeleccionado) {
                return [];
            }

            const conocidos = new Set([
                "id",
                "Producto",
                "PrecioNeto",
                "Precio neto",
                "PrecioProveedor",
                "habilitado",
                "imagenes",
                "camposVisibles",
                ...camposConfigurables.map(
                    (campo) => campo.key
                ),
            ]);

            return Object.keys(
                productoSeleccionado
            ).filter(
                (campo) =>
                    !conocidos.has(campo)
            );
        }, [productoSeleccionado]);

    /* =====================================================
       VISIBILIDAD
    ===================================================== */

    const campoVisible = (
        producto: Producto,
        campo: string
    ) => {
        /*
            Administración ve todos los datos.
        */

        if (puedeEditarProductos) {
            return true;
        }

        return (
            producto.camposVisibles?.[
                campo
            ] === true
        );
    };

    /* =====================================================
       FORMATEAR VALORES
    ===================================================== */

    const obtenerValorCampo = (
        producto: Producto,
        campo: string
    ) => {
        const valor =
            producto[campo];

        if (
            campo === "PrecioNeto" ||
            campo === "PrecioProveedor" ||
            campo === "Precio neto"
        ) {
            return formatearMoneda(
                Number(valor || 0)
            );
        }

        if (
            valor === undefined ||
            valor === null ||
            valor === ""
        ) {
            return "—";
        }

        if (
            typeof valor === "boolean"
        ) {
            return valor ? "Sí" : "No";
        }

        if (
            typeof valor === "object"
        ) {
            return JSON.stringify(valor);
        }

        return String(valor);
    };

    const etiquetaCampo = (
        campo: string
    ) => {
        return campo
            .replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
            )
            .replace(/_/g, " ")
            .replace(
                /^./,
                (letra) =>
                    letra.toUpperCase()
            );
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="productos-page">

            {/* =================================================
                ENCABEZADO
            ================================================= */}

            <div className="productos-header">
                <div>
                    <h2>Editor de Productos</h2>

                    <p>
                        Consulta y administra los productos registrados.
                    </p>
                </div>

                {puedeEditarProductos && (
                    <button
                        className="productos-btn productos-btn-primary"
                        onClick={
                            abrirNuevoProducto
                        }
                    >
                        + Agregar Producto
                    </button>
                )}
            </div>

            {/* =================================================
                BUSCADOR
            ================================================= */}

            <div className="productos-search-wrapper">
                <span className="productos-search-icon">
                    🔎
                </span>

                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={busqueda}
                    onChange={(e) =>
                        setBusqueda(
                            e.target.value
                        )
                    }
                    className="productos-search-input"
                />
            </div>

            {/* =================================================
                RESULTADOS BÚSQUEDA
            ================================================= */}

            {busqueda.trim() !== "" && (
                <div className="productos-resultados">
                    {productosFiltrados.length >
                    0 ? (
                        productosFiltrados
                            .slice(0, 30)
                            .map((producto) => (
                                <button
                                    type="button"
                                    key={
                                        producto.id
                                    }
                                    className="productos-resultado-item"
                                    onClick={() => {
                                        setProductoSeleccionado(
                                            producto
                                        );

                                        setIndiceImagen(
                                            0
                                        );

                                        setBusqueda(
                                            ""
                                        );
                                    }}
                                >
                                    <span className="productos-resultado-nombre">
                                        {
                                            producto.Producto
                                        }
                                    </span>

                                    <span className="productos-resultado-precio">
                                        {formatearMoneda(
                                            producto.PrecioNeto
                                        )}
                                    </span>
                                </button>
                            ))
                    ) : (
                        <div className="productos-sin-resultados">
                            No se encontraron productos.
                        </div>
                    )}
                </div>
            )}

            {/* =================================================
                TABLA
            ================================================= */}

            <div className="productos-tabla-card">
                <div className="productos-tabla-scroll">
                    <table className="productos-tabla">
                        <thead>
                            <tr>
                                <th
                                    className="productos-ordenable"
                                    onClick={() =>
                                        ordenar(
                                            "Producto"
                                        )
                                    }
                                >
                                    Producto
                                    {flecha(
                                        "Producto"
                                    )}
                                </th>

                                <th
                                    className="productos-ordenable"
                                    onClick={() =>
                                        ordenar(
                                            "PrecioNeto"
                                        )
                                    }
                                >
                                    Precio Neto
                                    {flecha(
                                        "PrecioNeto"
                                    )}
                                </th>

                                {puedeEditarProductos && (
                                    <>
                                        <th
                                            className="productos-ordenable"
                                            onClick={() =>
                                                ordenar(
                                                    "PrecioProveedor"
                                                )
                                            }
                                        >
                                            Precio Proveedor
                                            {flecha(
                                                "PrecioProveedor"
                                            )}
                                        </th>

                                        <th className="productos-col-centro">
                                            Estado
                                        </th>

                                        <th className="productos-col-acciones">
                                            Acciones
                                        </th>
                                    </>
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {productos
                                .filter((producto) =>
                                    esMostrador
                                        ? producto.habilitado
                                        : true
                                )
                                .map((producto) => (
                                    <tr
                                        key={
                                            producto.id
                                        }
                                        className={
                                            !producto.habilitado
                                                ? "producto-deshabilitado"
                                                : ""
                                        }
                                        onClick={() => {
                                            setProductoSeleccionado(
                                                producto
                                            );

                                            setIndiceImagen(
                                                0
                                            );
                                        }}
                                    >
                                        <td className="productos-nombre-tabla">
                                            {
                                                producto.Producto
                                            }
                                        </td>

                                        <td>
                                            {formatearMoneda(
                                                producto.PrecioNeto
                                            )}
                                        </td>

                                        {puedeEditarProductos && (
                                            <>
                                                <td>
                                                    {formatearMoneda(
                                                        producto.PrecioProveedor ||
                                                            0
                                                    )}
                                                </td>

                                                <td
                                                    className="productos-col-centro"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <label className="productos-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                producto.habilitado
                                                            }
                                                            onChange={() =>
                                                                toggleHabilitado(
                                                                    producto
                                                                )
                                                            }
                                                        />

                                                        <span className="productos-switch-slider" />
                                                    </label>
                                                </td>

                                                <td
                                                    className="productos-acciones-tabla"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <button
                                                        className="productos-btn-icon productos-btn-edit"
                                                        title="Editar producto"
                                                        onClick={() =>
                                                            editarProducto(
                                                                producto
                                                            )
                                                        }
                                                    >
                                                        ✏️
                                                    </button>

                                                    <button
                                                        className="productos-btn-icon productos-btn-delete"
                                                        title="Eliminar producto"
                                                        onClick={() =>
                                                            eliminarProducto(
                                                                producto.id
                                                            )
                                                        }
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* =================================================
                MODAL EDITOR ADMINISTRACIÓN
            ================================================= */}

            {mostrarFormulario &&
                puedeEditarProductos && (
                    <div
                        className="productos-modal-overlay"
                        onMouseDown={(e) => {
                            if (
                                e.target ===
                                e.currentTarget
                            ) {
                                cerrarFormulario();
                            }
                        }}
                    >
                        <div className="productos-editor-modal">
                            <div className="productos-modal-header">
                                <div>
                                    <span className="productos-modal-subtitulo">
                                        {editandoId
                                            ? "MODIFICAR PRODUCTO"
                                            : "NUEVO PRODUCTO"}
                                    </span>

                                    <h2>
                                        {editandoId
                                            ? formulario.Producto ||
                                              "Editar producto"
                                            : "Agregar producto"}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    className="productos-modal-cerrar"
                                    onClick={
                                        cerrarFormulario
                                    }
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="productos-editor-body">
                                {/* NOMBRE */}

                                <div className="productos-editor-seccion">
                                    <h3>
                                        Información del producto
                                    </h3>

                                    <div className="productos-form-grid">
                                        <label className="productos-field productos-field-doble">
                                            <span>
                                                Nombre del producto
                                                <b> *</b>
                                            </span>

                                            <input
                                                type="text"
                                                value={
                                                    formulario.Producto
                                                }
                                                onChange={(e) =>
                                                    cambiarFormulario(
                                                        "Producto",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Ej. Resistencia cartucho 220V"
                                                autoFocus
                                            />
                                        </label>

                                        {camposConfigurables
                                            .filter(
                                                (campo) =>
                                                    campo.tipo !==
                                                    "textarea"
                                            )
                                            .map(
                                                (campo) => (
                                                    <label
                                                        key={
                                                            campo.key
                                                        }
                                                        className="productos-field"
                                                    >
                                                        <span>
                                                            {
                                                                campo.label
                                                            }
                                                        </span>

                                                        <input
                                                            type={
                                                                campo.tipo ===
                                                                "numero"
                                                                    ? "number"
                                                                    : "text"
                                                            }
                                                            value={
                                                                formulario[
                                                                    campo.key
                                                                ] as
                                                                    | string
                                                                    | number
                                                            }
                                                            onChange={(e) =>
                                                                cambiarFormulario(
                                                                    campo.key,
                                                                    campo.tipo ===
                                                                        "numero"
                                                                        ? Number(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                        : e
                                                                              .target
                                                                              .value
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                )
                                            )}
                                    </div>

                                    <div className="productos-textareas-grid">
                                        {camposConfigurables
                                            .filter(
                                                (campo) =>
                                                    campo.tipo ===
                                                    "textarea"
                                            )
                                            .map(
                                                (campo) => (
                                                    <label
                                                        key={
                                                            campo.key
                                                        }
                                                        className="productos-field"
                                                    >
                                                        <span>
                                                            {
                                                                campo.label
                                                            }
                                                        </span>

                                                        <textarea
                                                            value={
                                                                formulario[
                                                                    campo.key
                                                                ] as string
                                                            }
                                                            onChange={(e) =>
                                                                cambiarFormulario(
                                                                    campo.key,
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            rows={
                                                                4
                                                            }
                                                        />
                                                    </label>
                                                )
                                            )}
                                    </div>
                                </div>

                                {/* VISIBILIDAD */}

                                <div className="productos-editor-seccion productos-visibilidad-seccion">
                                    <div className="productos-visibilidad-header">
                                        <div>
                                            <h3>
                                                Datos visibles para usuarios
                                            </h3>

                                            <p>
                                                Selecciona qué información aparecerá en la ficha del producto.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="productos-visibles-grid">
                                        {camposConfigurables.map(
                                            (campo) => (
                                                <label
                                                    key={
                                                        campo.key
                                                    }
                                                    className={
                                                        camposVisibles[
                                                            campo
                                                                .key
                                                        ]
                                                            ? "productos-visible-card activo"
                                                            : "productos-visible-card"
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            camposVisibles[
                                                                campo
                                                                    .key
                                                            ] ===
                                                            true
                                                        }
                                                        onChange={(e) =>
                                                            setCamposVisibles(
                                                                (
                                                                    anterior
                                                                ) => ({
                                                                    ...anterior,

                                                                    [campo
                                                                        .key]:
                                                                        e
                                                                            .target
                                                                            .checked,
                                                                })
                                                            )
                                                        }
                                                    />

                                                    <span className="productos-visible-check">
                                                        ✓
                                                    </span>

                                                    <span>
                                                        {
                                                            campo.label
                                                        }
                                                    </span>
                                                </label>
                                            )
                                        )}

                                        {editandoId &&
                                            (() => {
                                                const productoActual =
                                                    productos.find(
                                                        (
                                                            producto
                                                        ) =>
                                                            producto.id ===
                                                            editandoId
                                                    );

                                                if (
                                                    !productoActual
                                                ) {
                                                    return null;
                                                }

                                                const conocidos =
                                                    new Set([
                                                        "id",
                                                        "Producto",
                                                        "PrecioNeto",
                                                        "Precio neto",
                                                        "PrecioProveedor",
                                                        "habilitado",
                                                        "imagenes",
                                                        "camposVisibles",
                                                        ...camposConfigurables.map(
                                                            (
                                                                c
                                                            ) =>
                                                                c.key
                                                        ),
                                                    ]);

                                                return Object.keys(
                                                    productoActual
                                                )
                                                    .filter(
                                                        (
                                                            campo
                                                        ) =>
                                                            !conocidos.has(
                                                                campo
                                                            )
                                                    )
                                                    .map(
                                                        (
                                                            campo
                                                        ) => (
                                                            <label
                                                                key={
                                                                    campo
                                                                }
                                                                className={
                                                                    camposVisibles[
                                                                        campo
                                                                    ]
                                                                        ? "productos-visible-card activo"
                                                                        : "productos-visible-card"
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        camposVisibles[
                                                                            campo
                                                                        ] ===
                                                                        true
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setCamposVisibles(
                                                                            (
                                                                                anterior
                                                                            ) => ({
                                                                                ...anterior,

                                                                                [campo]:
                                                                                    e
                                                                                        .target
                                                                                        .checked,
                                                                            })
                                                                        )
                                                                    }
                                                                />

                                                                <span className="productos-visible-check">
                                                                    ✓
                                                                </span>

                                                                <span>
                                                                    {etiquetaCampo(
                                                                        campo
                                                                    )}
                                                                </span>
                                                            </label>
                                                        )
                                                    );
                                            })()}
                                    </div>
                                </div>
                            </div>

                            <div className="productos-editor-footer">
                                <button
                                    type="button"
                                    className="productos-btn productos-btn-secondary"
                                    onClick={
                                        cerrarFormulario
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="productos-btn productos-btn-primary"
                                    onClick={
                                        guardarProducto
                                    }
                                >
                                    {editandoId
                                        ? "Guardar cambios"
                                        : "Crear producto"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* =================================================
                MODAL FICHA PRODUCTO
            ================================================= */}

            {productoSeleccionado && (
                <div
                    className="productos-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            setProductoSeleccionado(
                                null
                            );
                        }
                    }}
                >
                    <div className="productos-ficha-modal">
                        <div className="productos-modal-header">
                            <div>
                                <span className="productos-modal-subtitulo">
                                    PRODUCTO
                                </span>

                                <h2>
                                    {
                                        productoSeleccionado.Producto
                                    }
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="productos-modal-cerrar"
                                onClick={() =>
                                    setProductoSeleccionado(
                                        null
                                    )
                                }
                            >
                                ✕
                            </button>
                        </div>

                        <div className="productos-ficha-body">
                            {/* ==========================
                                IZQUIERDA - DATOS
                            ========================== */}

                            <div className="productos-ficha-datos">
                                <div className="productos-ficha-titulo">
                                    <h3>
                                        Información
                                    </h3>

                                    {puedeEditarProductos && (
                                        <span
                                            className={
                                                productoSeleccionado.habilitado
                                                    ? "productos-estado activo"
                                                    : "productos-estado inactivo"
                                            }
                                        >
                                            {productoSeleccionado.habilitado
                                                ? "Activo"
                                                : "Deshabilitado"}
                                        </span>
                                    )}
                                </div>

                                <div className="productos-datos-lista">
                                    {camposConfigurables.map(
                                        (campo) => {
                                            if (
                                                !campoVisible(
                                                    productoSeleccionado,
                                                    campo.key
                                                )
                                            ) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={
                                                        campo.key
                                                    }
                                                    className="productos-dato-row"
                                                >
                                                    <span className="productos-dato-label">
                                                        {
                                                            campo.label
                                                        }
                                                    </span>

                                                    <span className="productos-dato-valor">
                                                        {obtenerValorCampo(
                                                            productoSeleccionado,
                                                            campo.key
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    )}

                                    {/* CAMPOS QUE YA EXISTAN
                                        EN FIREBASE Y NO ESTÉN
                                        EN NUESTRA LISTA */}

                                    {camposExtrasProducto.map(
                                        (campo) => {
                                            if (
                                                !campoVisible(
                                                    productoSeleccionado,
                                                    campo
                                                )
                                            ) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={
                                                        campo
                                                    }
                                                    className="productos-dato-row"
                                                >
                                                    <span className="productos-dato-label">
                                                        {etiquetaCampo(
                                                            campo
                                                        )}
                                                    </span>

                                                    <span className="productos-dato-valor">
                                                        {obtenerValorCampo(
                                                            productoSeleccionado,
                                                            campo
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>

                                {puedeEditarProductos && (
                                    <button
                                        className="productos-btn productos-btn-primary productos-editar-ficha"
                                        onClick={() =>
                                            editarProducto(
                                                productoSeleccionado
                                            )
                                        }
                                    >
                                        ✏️ Editar producto
                                    </button>
                                )}
                            </div>

                            {/* ==========================
                                DERECHA - IMÁGENES
                            ========================== */}

                            <div className="productos-imagen-area">
                                <div className="productos-imagen-contenedor">
                                    {imagenesProducto.length >
                                    0 ? (
                                        <img
                                            className="productos-imagen-principal"
                                            src={
                                                imagenesProducto[
                                                    indiceImagen
                                                ]?.url
                                            }
                                            alt={
                                                productoSeleccionado.Producto
                                            }
                                        />
                                    ) : (
                                        <div className="productos-sin-imagen">
                                            <span className="productos-sin-imagen-icon">
                                                🖼️
                                            </span>

                                            <strong>
                                                Sin imagen
                                            </strong>

                                            <small>
                                                {puedeEditarProductos
                                                    ? "Agrega una fotografía para este producto."
                                                    : "Este producto todavía no tiene fotografía."}
                                            </small>
                                        </div>
                                    )}

                                    {imagenesProducto.length >
                                        1 && (
                                        <>
                                            <button
                                                type="button"
                                                className="productos-slider-btn productos-slider-prev"
                                                onClick={() =>
                                                    setIndiceImagen(
                                                        (
                                                            indiceImagen -
                                                            1 +
                                                            imagenesProducto.length
                                                        ) %
                                                            imagenesProducto.length
                                                    )
                                                }
                                            >
                                                ‹
                                            </button>

                                            <button
                                                type="button"
                                                className="productos-slider-btn productos-slider-next"
                                                onClick={() =>
                                                    setIndiceImagen(
                                                        (
                                                            indiceImagen +
                                                            1
                                                        ) %
                                                            imagenesProducto.length
                                                    )
                                                }
                                            >
                                                ›
                                            </button>
                                        </>
                                    )}

                                    {imagenesProducto[
                                        indiceImagen
                                    ]?.principal && (
                                        <span className="productos-badge-principal">
                                            Principal
                                        </span>
                                    )}
                                </div>

                                {imagenesProducto.length >
                                    0 && (
                                    <div className="productos-slider-contador">
                                        {indiceImagen +
                                            1}{" "}
                                        de{" "}
                                        {
                                            imagenesProducto.length
                                        }
                                    </div>
                                )}

                                {/* MINIATURAS */}

                                {imagenesProducto.length >
                                    1 && (
                                    <div className="productos-miniaturas">
                                        {imagenesProducto.map(
                                            (
                                                imagen,
                                                index
                                            ) => (
                                                <button
                                                    type="button"
                                                    key={
                                                        imagen.id
                                                    }
                                                    className={
                                                        index ===
                                                        indiceImagen
                                                            ? "productos-miniatura-wrapper activa"
                                                            : "productos-miniatura-wrapper"
                                                    }
                                                    onClick={() =>
                                                        setIndiceImagen(
                                                            index
                                                        )
                                                    }
                                                >
                                                    <img
                                                        className="productos-miniatura"
                                                        src={
                                                            imagen.url
                                                        }
                                                        alt={`Imagen ${
                                                            index +
                                                            1
                                                        }`}
                                                    />
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                                {/* ADMINISTRAR IMÁGENES */}

                                {puedeEditarProductos && (
                                    <div className="productos-imagen-admin">
                                        <label
                                            className={
                                                subiendoImagen
                                                    ? "productos-subir-label deshabilitado"
                                                    : "productos-subir-label"
                                            }
                                        >
                                            <span>
                                                {subiendoImagen
                                                    ? "⏳ Procesando y subiendo..."
                                                    : "📷 Agregar imágenes"}
                                            </span>

                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                disabled={
                                                    subiendoImagen
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    subirImagenes(
                                                        e
                                                            .target
                                                            .files
                                                    );

                                                    e.target.value =
                                                        "";
                                                }}
                                            />
                                        </label>

                                        <p className="productos-imagen-ayuda">
                                            Las imágenes se convierten automáticamente a WebP y se reducen a un máximo de 1200 px.
                                        </p>

                                        {imagenesProducto.length >
                                            0 && (
                                            <div className="productos-imagen-acciones">
                                                {!imagenesProducto[
                                                    indiceImagen
                                                ]
                                                    ?.principal && (
                                                    <button
                                                        type="button"
                                                        className="productos-btn productos-btn-secondary"
                                                        onClick={() =>
                                                            hacerImagenPrincipal(
                                                                imagenesProducto[
                                                                    indiceImagen
                                                                ]
                                                                    .id
                                                            )
                                                        }
                                                    >
                                                        ⭐ Hacer principal
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="productos-btn productos-btn-danger"
                                                    onClick={() =>
                                                        eliminarImagen(
                                                            imagenesProducto[
                                                                indiceImagen
                                                            ]
                                                        )
                                                    }
                                                >
                                                    🗑️ Eliminar imagen
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {imagenesProducto.length >
                                    0 &&
                                    puedeEditarProductos && (
                                        <div className="productos-storage-info">
                                            <span>
                                                Storage
                                            </span>

                                            <code>
                                                {
                                                    imagenesProducto[
                                                        indiceImagen
                                                    ]?.path
                                                }
                                            </code>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Productos_editor;