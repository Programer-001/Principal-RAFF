import React, { useEffect, useMemo, useState, useRef } from "react";
import { getDatabase, ref, get, set, remove } from "firebase/database";
import { app } from "../firebase/config";

interface Nota {
    id: string;
    titulo: string;
    contenido: string;
    createdAt: number;
}

interface NotasProps {
    empleadoId: string;
    empleadoNombre: string;
}

const MAX_NOTAS = 10;

const Notas: React.FC<NotasProps> = ({ empleadoId }) => {
    const db = getDatabase(app);

    const [notas, setNotas] = useState<Nota[]>([]);
    const [abierta, setAbierta] = useState(false);
    const [titulo, setTitulo] = useState("");
    const [contenido, setContenido] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [notaSeleccionadaId, setNotaSeleccionadaId] = useState<string | null>(null);

    const tituloLimpio = useMemo(() => titulo.trim(), [titulo]);
    const contenidoLimpio = useMemo(() => contenido.trim(), [contenido]);
    const notaRef = useRef<HTMLDivElement | null>(null);

    const cargarNotas = async () => {
        if (!empleadoId) return;

        try {
            const notasRef = ref(db, `notas_empleados/${empleadoId}`);
            const snap = await get(notasRef);

            if (!snap.exists()) {
                setNotas([]);
                return;
            }

            const data = snap.val() || {};

            const lista: Nota[] = Object.keys(data).map((key) => ({
                id: data[key].id || key,
                titulo: data[key].titulo || "",
                contenido: data[key].contenido || "",
                createdAt: data[key].createdAt || 0,
            }));

            lista.sort((a, b) => b.createdAt - a.createdAt);
            setNotas(lista);
        } catch (error) {
            console.error("Error al cargar notas:", error);
        }
    };

    useEffect(() => {
        cargarNotas();
    }, [empleadoId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!abierta) return;

            if (notaRef.current && !notaRef.current.contains(event.target as Node)) {
                limpiarFormulario(); // 🔥 cierra sin guardar
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [abierta]);

    const insertarVineta = () => {
        setContenido((prev) => {
            if (!prev.trim()) return "• ";
            return `${prev}\n• `;
        });
    };

    const limpiarFormulario = () => {
        setTitulo("");
        setContenido("");
        setAbierta(false);
        setNotaSeleccionadaId(null);
    };

    const abrirNuevaNota = () => {
        setNotaSeleccionadaId(null);
        setTitulo("");
        setContenido("");
        setAbierta(true);
    };

    const abrirNota = (nota: Nota) => {
        setNotaSeleccionadaId(nota.id);
        setTitulo(nota.titulo || "");
        setContenido(nota.contenido || "");
        setAbierta(true);
    };

    const guardarNota = async () => {
        if (!empleadoId) return;

        if (!tituloLimpio && !contenidoLimpio) {
            setAbierta(false);
            return;
        }

        if (!tituloLimpio) {
            alert("La nota necesita título.");
            return;
        }

        try {
            setGuardando(true);

            let noteId = notaSeleccionadaId;

            if (!noteId) {
                const notasOrdenadas = [...notas].sort((a, b) => b.createdAt - a.createdAt);

                if (notasOrdenadas.length >= MAX_NOTAS) {
                    alert("Este empleado ya tiene 10 notas. Elimina una para agregar otra.");
                    return;
                }

                noteId = `nota_${Date.now()}`;
            }

            const notaAGuardar: Nota = {
                id: noteId,
                titulo: tituloLimpio,
                contenido: contenidoLimpio,
                createdAt: notaSeleccionadaId
                    ? notas.find((n) => n.id === notaSeleccionadaId)?.createdAt || Date.now()
                    : Date.now(),
            };

            await set(ref(db, `notas_empleados/${empleadoId}/${noteId}`), notaAGuardar);

            await cargarNotas();
            limpiarFormulario();
        } catch (error) {
            console.error("Error al guardar nota:", error);
            alert("No se pudo guardar la nota.");
        } finally {
            setGuardando(false);
        }
    };

    const eliminarNota = async (nota: Nota) => {
        const confirmar = window.confirm(`¿Seguro que deseas eliminar la nota "${nota.titulo}"?`);
        if (!confirmar) return;

        try {
            await remove(ref(db, `notas_empleados/${empleadoId}/${nota.id}`));

            if (notaSeleccionadaId === nota.id) {
                limpiarFormulario();
            }

            await cargarNotas();
        } catch (error) {
            console.error("Error al eliminar nota:", error);
            alert("No se pudo eliminar la nota.");
        }
    };

    return (
        <div className="notas-layout">
            {/* IZQUIERDA */}
            <div className="notas-panel-izquierdo">
                <div className="notas-card" ref={notaRef}>
                    {!abierta ? (
                        <div className="nota-cerrada" onClick={abrirNuevaNota}>
                            Crear una nota...
                        </div>
                    ) : (
                        <div className="nota-abierta">
                            <input
                                className="nota-titulo-input"
                                type="text"
                                placeholder="Título"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                            />

                            <textarea
                                className="nota-contenido-input"
                                placeholder="Crear una nota..."
                                value={contenido}
                                onChange={(e) => setContenido(e.target.value)}
                                rows={8}
                            />

                            <div className="nota-acciones">
                                <button
                                    type="button"
                                    className="btn-vineta"
                                    onClick={insertarVineta}
                                    title="Agregar viñeta"
                                >
                                    • Viñeta
                                </button>

                                <div className="nota-acciones-derecha">
                                    <button
                                        type="button"
                                        className="btn-cerrar-nota"
                                        onClick={limpiarFormulario}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-cerrar-nota"
                                        onClick={guardarNota}
                                        disabled={guardando}
                                    >
                                        {guardando ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DERECHA */}
            <div className="notas-panel-derecho">
                <div className="notas-panel-derecho-header">
                    <h3>Notas guardadas</h3>
                    <span>{notas.length}/{MAX_NOTAS}</span>
                </div>

                <div className="notas-lista">
                    {notas.length === 0 ? (
                        <div className="sin-notas">No hay notas guardadas.</div>
                    ) : (
                        notas.map((nota) => (
                            <div
                                key={nota.id}
                                className={`nota-item ${notaSeleccionadaId === nota.id ? "nota-item-activa" : ""}`}
                                onClick={() => abrirNota(nota)}
                                title="Abrir nota"
                            >
                                <span className="nota-item-titulo">
                                    {nota.titulo}
                                </span>

                                <button
                                    type="button"
                                    className="nota-item-eliminar"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        eliminarNota(nota);
                                    }}
                                    title="Eliminar nota"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notas;