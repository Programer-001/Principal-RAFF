import React, { useEffect, useMemo, useState } from "react";
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

const Notas: React.FC<NotasProps> = ({ empleadoId, empleadoNombre }) => {
    const db = getDatabase(app);

    const [notas, setNotas] = useState<Nota[]>([]);
    const [abierta, setAbierta] = useState(false);
    const [titulo, setTitulo] = useState("");
    const [contenido, setContenido] = useState("");
    const [guardando, setGuardando] = useState(false);

    const tituloLimpio = useMemo(() => titulo.trim(), [titulo]);
    const contenidoLimpio = useMemo(() => contenido.trim(), [contenido]);

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

            const notasOrdenadas = [...notas].sort((a, b) => b.createdAt - a.createdAt);

            if (notasOrdenadas.length >= MAX_NOTAS) {
                alert("Este empleado ya tiene 10 notas. Elimina una para agregar otra.");
                return;
            }

            const noteId = `nota_${Date.now()}`;

            const nuevaNota: Nota = {
                id: noteId,
                titulo: tituloLimpio,
                contenido: contenidoLimpio,
                createdAt: Date.now(),
            };

            await set(ref(db, `notas_empleados/${empleadoId}/${noteId}`), nuevaNota);

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
            await cargarNotas();
        } catch (error) {
            console.error("Error al eliminar nota:", error);
            alert("No se pudo eliminar la nota.");
        }
    };

    return (
        <div className="notas-wrapper">


            <div className="notas-card">
                {!abierta ? (
                    <div className="nota-cerrada" onClick={() => setAbierta(true)}>
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
                            rows={5}
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

                            <button
                                type="button"
                                className="btn-cerrar-nota"
                                onClick={guardarNota}
                                disabled={guardando}
                            >
                                {guardando ? "Guardando..." : "Cerrar"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="notas-lista">
                {notas.length === 0 ? (
                    <div className="sin-notas">No hay notas guardadas.</div>
                ) : (
                    notas.map((nota) => (
                        <div key={nota.id} className="nota-item">
                            <span className="nota-item-titulo" title={nota.titulo}>
                                {nota.titulo}
                            </span>

                            <button
                                type="button"
                                className="nota-item-eliminar"
                                onClick={() => eliminarNota(nota)}
                                title="Eliminar nota"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notas;