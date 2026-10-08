// src/Reportes/ModificarCliente.tsx
import React, { useEffect, useMemo, useState } from 'react';

type Datos = Record<string, any>;

export type ClienteCatalogo = {
    id: string;
    nombre: string;
    datos: Datos;
};

export type ModificacionCliente = {
    clienteId: string | null;
    clienteSnapshot: Datos;
    envio: boolean;
};

type Props = {
    abierto: boolean;
    clienteId?: string | null;
    clienteSnapshot?: Datos | null;
    envio?: boolean | null;
    clientes: ClienteCatalogo[];
    onCerrar: () => void;
    onAceptar: (cambio: ModificacionCliente) => void;
};

type Modo = 'registrado' | 'temporal';

const estilos: Record<string, React.CSSProperties> = {
    fondo: {
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(10, 20, 35, 0.65)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16,
    },
    ventana: {
        background: '#fff', borderRadius: 12, width: 'min(100%, 800px)',
        maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box',
        color: '#172033', fontFamily: 'Arial, sans-serif',
        boxShadow: '0 18px 60px rgba(0,0,0,.22)',
    },
    cabecera: {
        padding: '18px 22px', borderBottom: '1px solid #dce3eb',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    },
    cuerpo: { padding: 22 },
    opcion: {
        display: 'flex', alignItems: 'center', gap: 9,
        fontWeight: 600, cursor: 'pointer', marginBottom: 12,
    },
    entrada: {
        width: '100%', padding: '10px 11px', border: '1px solid #b7c1d0',
        borderRadius: 6, boxSizing: 'border-box', fontSize: 14,
    },
    etiqueta: { fontSize: 12, color: '#596579', marginBottom: 5, display: 'block' },
    rejilla: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 13,
    },
    boton: {
        padding: '10px 16px', border: 0, borderRadius: 6,
        background: '#174ea6', color: 'white', cursor: 'pointer',
    },
    secundario: {
        padding: '10px 16px', border: '1px solid #b7c1d0', borderRadius: 6,
        background: 'white', color: '#172033', cursor: 'pointer',
    },
};

const normalizar = (valor: unknown): string =>
    String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const campos = [
    { campo: 'nombre', titulo: 'Nombre' },
    { campo: 'razonSocial', titulo: 'Razón social' },
    { campo: 'telefono', titulo: 'Teléfono' },
    { campo: 'rfc', titulo: 'RFC' },
    { campo: 'email', titulo: 'Email' },
    { campo: 'giro', titulo: 'Giro' },
] as const;

const ModificarCliente: React.FC<Props> = ({
    abierto, clienteId, clienteSnapshot, envio, clientes, onCerrar, onAceptar,
}) => {
    const [modo, setModo] = useState<Modo>('temporal');
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState<string>('');
    const [datos, setDatos] = useState<Datos>({});
    const [envioLocal, setEnvioLocal] = useState(false);
    const [error, setError] = useState('');

    // Reinicia el formulario cada vez que se abre, con el borrador actual de la OT.
    useEffect(() => {
        if (!abierto) return;
        setDatos({ ...(clienteSnapshot || {}) });
        setSeleccionado(clienteId || '');
        setModo(clienteId ? 'registrado' : 'temporal');
        setEnvioLocal(envio === true);
        setBusqueda('');
        setError('');
    }, [abierto, clienteId, clienteSnapshot, envio]);

    const resultados = useMemo(() => {
        const termino = normalizar(busqueda);
        if (!termino) return [];
        return clientes.filter(c =>
            [c.nombre, c.datos.nombre, c.datos.nombrePersonaFisica,
            c.datos.razonSocial, c.datos.rfc].some(v => normalizar(v).includes(termino))
        ).slice(0, 40);
    }, [clientes, busqueda]);

    if (!abierto) return null;

    const actualizar = (campo: string, valor: string) => {
        setDatos(prev => ({ ...prev, [campo]: valor }));
    };

    const aceptar = () => {
        setError('');
        if (modo === 'registrado') {
            const cliente = clientes.find(c => c.id === seleccionado);
            if (!cliente) {
                setError('Selecciona un cliente registrado de los resultados.');
                return;
            }
            // Preserva datos actuales no incluidos en el catálogo, y actualiza los del cliente elegido.
            onAceptar({
                clienteId: cliente.id,
                clienteSnapshot: { ...(clienteSnapshot || {}), ...cliente.datos },
                envio: envioLocal,
            });
            return;
        }

        const nombre = String(datos.nombre || datos.nombrePersonaFisica || datos.razonSocial || '').trim();
        if (!nombre) {
            setError('Escribe el nombre o la razón social del cliente.');
            return;
        }
        const telefono = String(datos.telefono || '').replace(/\D/g, '');
        if (telefono && telefono.length !== 10) {
            setError('El teléfono debe tener 10 dígitos.');
            return;
        }
        onAceptar({
            clienteId: null,
            clienteSnapshot: { ...datos, telefono },
            envio: envioLocal,
        });
    };

    return (
        <div
            style={estilos.fondo}
            onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <section role="dialog" aria-modal="true" aria-labelledby="titulo-modificar-cliente" style={estilos.ventana}>
                <div style={estilos.cabecera}>
                    <h2 id="titulo-modificar-cliente" style={{ margin: 0, fontSize: 20 }}>MODIFICAR CLIENTE</h2>
                    <button type="button" style={estilos.secundario} onClick={onCerrar}>✕ Cerrar</button>
                </div>

                <div style={estilos.cuerpo}>
                    <label style={estilos.opcion}>
                        <input type="radio" name="modoModificarCliente" checked={modo === 'registrado'}
                            onChange={() => { setModo('registrado'); setError(''); }} />
                        Buscar cliente registrado
                    </label>

                    {modo === 'registrado' && (
                        <div style={{ marginBottom: 24, paddingLeft: 24 }}>
                            <label style={estilos.etiqueta} htmlFor="buscar-cliente-reporte">Buscar por nombre, razón social o RFC</label>
                            <input id="buscar-cliente-reporte" style={estilos.entrada} value={busqueda}
                                placeholder="Escribe para buscar en Clientes"
                                onChange={e => setBusqueda(e.target.value)} />
                            {busqueda.trim() && (
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #dce3eb', marginTop: 6, borderRadius: 6 }}>
                                    {resultados.length ? resultados.map(c => (
                                        <button key={c.id} type="button" onClick={() => { setSeleccionado(c.id); setError(''); }}
                                            style={{
                                                display: 'block', width: '100%', textAlign: 'left', padding: 10,
                                                background: seleccionado === c.id ? '#eaf2ff' : '#fff',
                                                border: 0, borderBottom: '1px solid #edf0f5', cursor: 'pointer'
                                            }}>
                                            <strong>{c.nombre}</strong>
                                            {c.datos.rfc ? <span style={{ color: '#596579' }}> · {c.datos.rfc}</span> : null}
                                            {seleccionado === c.id ? ' ✓' : ''}
                                        </button>
                                    )) : <p style={{ padding: 10 }}>No se encontraron clientes.</p>}
                                </div>
                            )}
                            {seleccionado && (
                                <p style={{ fontSize: 13, color: '#174ea6' }}>
                                    Seleccionado: {clientes.find(c => c.id === seleccionado)?.nombre || 'Cliente no disponible'}
                                </p>
                            )}
                        </div>
                    )}

                    <label style={estilos.opcion}>
                        <input type="radio" name="modoModificarCliente" checked={modo === 'temporal'}
                            onChange={() => { setModo('temporal'); setError(''); }} />
                        Cliente temporal / Modificar datos actuales
                    </label>

                    {modo === 'temporal' && (
                        <div style={{ ...estilos.rejilla, marginBottom: 24, paddingLeft: 24 }}>
                            {campos.map(({ campo, titulo }) => (
                                <label key={campo}>
                                    <span style={estilos.etiqueta}>{titulo}</span>
                                    <input
                                        style={estilos.entrada}
                                        value={String(datos[campo] ?? '')}
                                        onChange={e => actualizar(campo,
                                            campo === 'telefono' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value)}
                                    />
                                </label>
                            ))}
                        </div>
                    )}

                    <div style={{ borderTop: '1px solid #dce3eb', paddingTop: 17, marginTop: 10 }}>
                        <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Datos de envío</h3>
                        <label style={{ display: 'block', maxWidth: 220 }}>
                            <span style={estilos.etiqueta}>Envío</span>
                            <select style={estilos.entrada} value={envioLocal ? 'si' : 'no'}
                                onChange={e => setEnvioLocal(e.target.value === 'si')}>
                                <option value="no">No</option>
                                <option value="si">Sí</option>
                            </select>
                        </label>
                    </div>

                    {error && <p role="alert" style={{ color: '#b42318', marginTop: 15 }}>{error}</p>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 25 }}>
                        <button type="button" style={estilos.secundario} onClick={onCerrar}>Cancelar</button>
                        <button type="button" style={estilos.boton} onClick={aceptar}>Aceptar</button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ModificarCliente;
