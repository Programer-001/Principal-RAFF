// src/Reportes/ReporteOrdenTrabajo.tsx

import React, { useEffect, useState } from 'react';

import { getDatabase, get, ref, runTransaction, push,update } from 'firebase/database';

import { app, auth } from '../firebase/config';
import ModificarCliente, { ModificacionCliente } from './ModificarCliente';



type Obj = Record<string, any>;

type Cambio = { ruta: string; anterior: any; nuevo: any; etiqueta: string };

type Registro = { id: string; fecha: string; usuario: string; uid: string; cambios: Cambio[]; tipo: string; origen?: string };

const db = getDatabase(app);

const estilos: Record<string, React.CSSProperties> = {

  pagina: { padding: 20, maxWidth: 1250, margin: '0 auto', fontFamily: 'Arial, sans-serif', color: '#172033' },

  tarjeta: { background: '#fff', border: '1px solid #dce3eb', borderRadius: 10, padding: 18, marginTop: 18 },

  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },

  etiqueta: { fontSize: 12, color: '#596579', marginBottom: 4 },

  valor: { fontWeight: 600, overflowWrap: 'anywhere' },

  boton: { padding: '10px 15px', border: 0, borderRadius: 6, background: '#174ea6', color: '#fff', cursor: 'pointer' },

  entrada: { padding: 9, width: '100%', boxSizing: 'border-box', border: '1px solid #b7c1d0', borderRadius: 6 },

  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },

  celda: { borderBottom: '1px solid #e5e9ef', padding: '10px 8px', textAlign: 'left', verticalAlign: 'top', overflowWrap: 'anywhere' },

};

const texto = (v: any): string => v === null || v === undefined || String(v).trim() === '' ? '—' : String(v);

const fecha = (v: any): string => {

  if (v === null || v === undefined || v === '') return '—';

  if (typeof v === 'number' || /^\d{4}-\d\d-\d\dT/.test(String(v))) {

    const d = new Date(v); return isNaN(d.getTime()) ? texto(v) : d.toLocaleString('es-MX');

  }

  return String(v);

};

const fechaInput = (v: any): string => {
  if (!v) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  return m ? `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2]}-${m[1]}` : '';
};

const fechaGuardar = (valor: string, original: any): string => {
  if (!valor) return '';
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(String(original || ''))) {
    const [y, m, d] = valor.split('-'); return `${d}/${m}/${y.slice(-2)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(original || ''))) {
    const [y, m, d] = valor.split('-'); return `${d}/${m}/${y}`;
  }
  return valor;
};

const leer = (o: any, ruta: string): any => ruta.split('/').reduce((v, k) => v?.[k], o);

const escribir = (o: Obj, ruta: string, valor: any): void => {

  const partes = ruta.split('/'); let actual = o;

  partes.slice(0, -1).forEach(k => { if (!actual[k] || typeof actual[k] !== 'object') actual[k] = {}; actual = actual[k]; });

  const ultimo = partes[partes.length - 1];

  if (valor === null || valor === undefined) delete actual[ultimo]; else actual[ultimo] = valor;

};

const igual = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const facturasDeOT = (ot: Obj): string[] => {

  const origen = ot.facturas;

  const items = Array.isArray(origen) ? origen : origen && typeof origen === 'object' ? Object.values(origen) : origen ? [origen] : [];

  return Array.from(new Set(items.map((x: any) => String((x && typeof x === 'object' ? x.factura : x) ?? '').trim()).filter(Boolean)));

};

const seriesDe = (p: Obj): string[] => {

  const v = p.numerosSerie;

  return (Array.isArray(v) ? v : v && typeof v === 'object' ? Object.entries(v).sort(([a], [b]) => Number(a) - Number(b)).map(([, x]) => x) : v ? [v] : [])

    .map((x: unknown) => String(x ?? '').trim()).filter(Boolean);

};

const estadoGeneral = (o: Obj): string => {

  if (o.tipoDocumento === 'cotizacion') return 'cotizacion';

  if (o.estadoGeneral === 'entregada') return 'entregada';

  if (!o.taller) return 'pendiente_taller';

  const partidas = Object.values(o.trabajos || {}) as Obj[];

  return partidas.length && partidas.every(p => p.estadoProduccion === 'lista_para_entrega') ? 'completada' : 'fabricacion';

};

const protegido = (ruta: string) => {

  const partes = ruta.split('/');

  if (['facturas', 'pagado', 'subtotal', 'descuentoCliente', 'totalConDescuento', 'totalConIva', 'credito', 'envioFolio', 'clienteId', 'asesorId'].includes(partes[0])) return true;

  if (partes[0] === 'trabajos' && (partes.length < 3 || ![

    'trabajador', 'fechaInicio', 'fechaFin', 'estadoProduccion', 'materialSolicitado', 'materialEntregado', 'materialEntregaFecha', 'pedido_recibido',

    'numerosSerie', 'descripcion', 'inspeccion'

  ].includes(partes[2]))) return true;

  return false;

};

const Campo: React.FC<{ nombre: string; valor: any }> = ({ nombre, valor }) => <div><div style={estilos.etiqueta}>{nombre}</div><div style={estilos.valor}>{texto(valor)}</div></div>;

const Tabla: React.FC<{ columnas: string[]; filas: React.ReactNode[][] }> = ({ columnas, filas }) => <div style={{ overflowX: 'auto' }}><table style={estilos.tabla}><thead><tr>{columnas.map(c => <th key={c} style={{ ...estilos.celda, background: '#f2f5fa' }}>{c}</th>)}</tr></thead><tbody>{filas.length ? filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j} style={estilos.celda}>{c}</td>)}</tr>) : <tr><td colSpan={columnas.length} style={estilos.celda}>Sin registros.</td></tr>}</tbody></table></div>;

const Modal: React.FC<{ titulo: string; cerrar: () => void; children: React.ReactNode }> = ({ titulo, cerrar, children }) => <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(12,20,35,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 15 }} onMouseDown={e => { if (e.target === e.currentTarget) cerrar(); }}><section role="dialog" aria-modal="true" aria-label={titulo} style={{ background: 'white', borderRadius: 12, width: 'min(100%,950px)', maxHeight: '90vh', overflow: 'auto', padding: 20, boxSizing: 'border-box' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, alignItems: 'center' }}><h3>{titulo}</h3><button type="button" onClick={cerrar}>✕ Cerrar</button></div>{children}</section></div>;

const Editor: React.FC<{ nombre: string; valor: any; onChange: (v: any) => void; tipo?: string; opciones?: string[]; disabled?: boolean }> = ({ nombre, valor, onChange, tipo = 'text', opciones, disabled }) => <label style={{ display: 'block' }}><div style={estilos.etiqueta}>{nombre}</div>{opciones ? <select disabled={disabled} style={estilos.entrada} value={String(valor ?? '')} onChange={e => onChange(e.target.value)}><option value="">Seleccionar</option>{opciones.map((x: string) => <option key={x} value={x}>{x}</option>)}</select> : tipo === 'boolean' ? <select disabled={disabled} style={estilos.entrada} value={valor === true ? 'si' : valor === false ? 'no' : ''} onChange={e => onChange(e.target.value === '' ? undefined : e.target.value === 'si')}><option value="">Sin definir</option><option value="si">Sí</option><option value="no">No</option></select> : tipo === 'textarea' ? <textarea disabled={disabled} style={estilos.entrada} rows={3} value={String(valor ?? '')} onChange={e => onChange(e.target.value)} /> : <input disabled={disabled} type={tipo} style={estilos.entrada} value={String(valor ?? '')} onChange={e => onChange(e.target.value)} />}</label>;



// Filtros del personal según área y puesto registrados en RH/Empleados.
const normalizarTexto = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const esEmpleadoActivo = (empleado: Obj): boolean => {
  return empleado.activo === true;
};

const esAsesorPermitido = (empleado: Obj): boolean => {
  const area = normalizarTexto(empleado.area);
  const puesto = normalizarTexto(empleado.puesto);

  return (
    esEmpleadoActivo(empleado) &&
    (
      (area === "mostrador" && puesto === "asesor de ventas") ||
      (
        area === "administracion" &&
        [
          "gerente administrativo",
          "gerente operacional",
          "gerente operativo",
        ].includes(puesto)
      )
    )
  );
};

const esOperadorPermitido = (empleado: Obj): boolean =>
  esEmpleadoActivo(empleado) &&
  normalizarTexto(empleado.area) === "produccion" &&
  normalizarTexto(empleado.puesto) === "operador";

const ReporteOrdenTrabajo: React.FC = () => {

  const [numero, setNumero] = useState(''); const [clave, setClave] = useState('');

  const [ot, setOt] = useState<Obj | null>(null); const [borrador, setBorrador] = useState<Obj | null>(null);

  const [editando, setEditando] = useState(false); const [modal, setModal] = useState<'json' | 'historial' | null>(null);

  const [historial, setHistorial] = useState<Registro[]>([]); const [cargando, setCargando] = useState(false);

  const [guardando, setGuardando] = useState(false); const [error, setError] = useState('');

  const [movimientos, setMovimientos] = useState<{ ruta: string; datos: Obj }[]>([]);

  const [buscandoCorte, setBuscandoCorte] = useState(false); const [corteConsultado, setCorteConsultado] = useState(false);

  const [errorCorte, setErrorCorte] = useState('');

  const [clientes, setClientes] = useState<{ id: string; nombre: string; datos: Obj }[]>([]);

  const [empleados, setEmpleados] = useState<{ id: string; nombre: string; datos: Obj }[]>([]);

  const [usuario, setUsuario] = useState('Usuario');
  const [modalCliente, setModalCliente] = useState(false);

  useEffect(() => {
    let activo = true; (async () => {

      try {

        const [c, e] = await Promise.all([get(ref(db, 'Clientes')), get(ref(db, 'RH/Empleados'))]);

        if (!activo) return;

        setClientes(Object.entries(c.val() || {}).map(([id, datos]: [string, any]) => ({ id, nombre: datos.razonSocial || datos.nombre || datos.nombrePersonaFisica || id, datos })).sort((a, b) => a.nombre.localeCompare(b.nombre)));

        const lista = Object.entries(e.val() || {}).map(([id, datos]: [string, any]) => ({ id, nombre: datos.username || datos.nombre || id, datos }));

        setEmpleados(lista);

        const u = auth.currentUser;

        const emp = lista.find((x: { id: string; nombre: string; datos: Obj }) => x.datos.uid === u?.uid || (u?.email && String(x.datos.email || '').toLowerCase() === u.email.toLowerCase()));

        setUsuario(emp?.nombre || u?.email || 'Usuario');

      } catch (err) { console.error('Catálogos no disponibles', err); }

    })(); return () => { activo = false; };
  }, []);

  const cargarHistorial = async (key: string) => {

    try {
      const s = await get(ref(db, `historial_ediciones_ot/${key}`));

      setHistorial(Object.entries(s.val() || {}).map(([id, x]: [string, any]) => ({ id, ...x })).sort((a, b) => b.fecha.localeCompare(a.fecha)));

    } catch (err) { console.error(err); setError('No se pudo consultar el historial.'); }

  };

  const buscar = async (ev?: React.FormEvent) => {

    ev?.preventDefault(); const digitos = numero.replace(/\D/g, '');

    if (!digitos) { setError('Escribe un número de OT válido.'); return; }

    const key = `ot${digitos.padStart(5, '0')}`;

    setCargando(true); setError(''); setModalCliente(false); setOt(null); setEditando(false); setModal(null); setMovimientos([]); setCorteConsultado(false);

    try {
      const s = await get(ref(db, `ordenes_trabajo/${key}`)); if (!s.exists()) { setError(`No se encontró ${key}.`); return; }

      setClave(key); setOt(s.val()); setBorrador(s.val()); await cargarHistorial(key);

    } catch (err) { console.error(err); setError('No fue posible consultar la OT.'); } finally { setCargando(false); }

  };

  const editar = (ruta: string, valor: any) => setBorrador(prev => { if (!prev) return prev; const nuevo = structuredClone(prev); escribir(nuevo, ruta, valor); return nuevo; });

  const fechaEditar = (ruta: string, valor: string) => {
  if (ruta === "Entrada_Almacen") {
    if (!valor) {
      editar(ruta, null);
      return;
    }

    const [anio, mes, dia] = valor.split("-");

    editar(ruta, `${dia}/${mes}/${anio.slice(-2)}`);
    return;
  }

  editar(ruta, fechaGuardar(valor, leer(ot, ruta)));
};

  const aceptarCliente = (cambio: ModificacionCliente) => {
    setBorrador(prev => prev ? {
      ...prev,
      clienteId: cambio.clienteId,
      clienteSnapshot: cambio.clienteSnapshot,
      envio: cambio.envio,
    } : prev);
    setModalCliente(false);
  };

  const elegirAsesor = (id: string) => {

    const e = empleados.find((x: { id: string; nombre: string; datos: Obj }) => x.id === id); if (!e) return;

    setBorrador(prev => prev ? { ...prev, asesorId: id, asesorSnapshot: { ...(prev.asesorSnapshot || {}), id: e.datos.id || id, uid: e.datos.uid || '', nombre: e.datos.nombre || e.nombre, username: e.datos.username || e.nombre, area: e.datos.area || '', puesto: e.datos.puesto || '' } } : prev);

  };

  const cambiosDe = (antes: Obj, despues: Obj): Cambio[] => {

    const rutas: string[] = ['fecha', 'Entrada_Almacen', 'tipoDocumento', 'taller', 'clienteId', 'clienteSnapshot', 'envio', 'asesorId', 'asesorSnapshot'];

    Object.keys(despues.trabajos || {}).forEach(id => {

      ['trabajador', 'fechaInicio', 'fechaFin', 'estadoProduccion', 'materialSolicitado', 'materialEntregado', 'materialEntregaFecha', 'pedido_recibido', 'numerosSerie', 'descripcion'].forEach(c => rutas.push(`trabajos/${id}/${c}`));

      ['aprobado', 'usuario', 'fecha', 'observaciones'].forEach(c => rutas.push(`trabajos/${id}/inspeccion/${c}`));

    });

    return rutas.filter(r => !igual(leer(antes, r), leer(despues, r))).map(r => ({ ruta: r, anterior: leer(antes, r) ?? null, nuevo: leer(despues, r) ?? null, etiqueta: r }));

  };

    const guardarTransaccion = async (
      cambios: Cambio[],
      tipo: string,
      origen?: string
    ): Promise<boolean> => {
      if (!clave || !cambios.length) return false;

      if (
        cambios.some(
          (c) =>
            protegido(c.ruta) &&
            !["clienteId", "asesorId"].includes(c.ruta)
        )
      ) {
        setError("Se detectó un campo protegido. No se guardó nada.");
        return false;
      }

      const referenciaOT = ref(db, `ordenes_trabajo/${clave}`);

      // 1. Consultar la OT actual
      const consulta = await get(referenciaOT);

      if (!consulta.exists()) {
        setError("La orden de trabajo ya no existe en Firebase.");
        return false;
      }

      const actual = consulta.val() as Obj;

      // 2. Verificar que los campos no hayan cambiado
      const conflictos = cambios.filter(
        (c) => !igual(leer(actual, c.ruta), c.anterior)
      );

      if (conflictos.length > 0) {
        setError(
          "Estos campos cambiaron en Firebase: " +
            conflictos.map((c) => c.etiqueta).join(", ") +
            ". Vuelve a buscar la OT antes de guardar."
        );
        return false;
      }

      // 3. Preparar únicamente los cambios solicitados
      const siguiente = structuredClone(actual);

      const actualizaciones: Record<string, any> = {};

      cambios.forEach((c) => {
        escribir(siguiente, c.ruta, c.nuevo);

        actualizaciones[
          `ordenes_trabajo/${clave}/${c.ruta}`
        ] = c.nuevo ?? null;
      });

      // 4. Calcular estado general cuando corresponda
      const requiereRecalculo = cambios.some(
        (c) =>
          c.ruta === "tipoDocumento" ||
          c.ruta === "taller" ||
          /\/estadoProduccion$/.test(c.ruta)
      );

      if (requiereRecalculo) {
        const calculado = estadoGeneral(siguiente);

        if (
          siguiente.estadoGeneral !== calculado &&
          siguiente.estadoGeneral !== "entregada"
        ) {
          siguiente.estadoGeneral = calculado;

          actualizaciones[
            `ordenes_trabajo/${clave}/estadoGeneral`
          ] = calculado;
        }
      }

      // 5. Preparar historial
      const idHistorial = push(
        ref(db, `historial_ediciones_ot/${clave}`)
      ).key;

      if (!idHistorial) {
        throw new Error("No se pudo generar el ID del historial.");
      }

      actualizaciones[
        `historial_ediciones_ot/${clave}/${idHistorial}`
      ] = {
        fecha: new Date().toISOString(),
        usuario,
        uid: auth.currentUser?.uid || "",
        tipo,
        origen: origen || "",
        cambios,
      };

      // 6. Guardar cambios e historial en una sola operación
      await update(ref(db), actualizaciones);

      // 7. Consultar la OT actualizada
      const resultado = await get(referenciaOT);

      if (resultado.exists()) {
        const datos = resultado.val();

        setOt(datos);
        setBorrador(structuredClone(datos));
      }

      await cargarHistorial(clave);

      setError("");

      return true;
    };

  

  const guardar = async () => {

    if (!ot || !borrador) return;

    setError(''); const copia = structuredClone(borrador);

    if (copia.tipoDocumento === 'cotizacion') copia.taller = false;

    if (copia.tipoDocumento === 'orden_trabajo' && ot.tipoDocumento === 'cotizacion') copia.taller = false;

    if (copia.clienteSnapshot?.telefono && !/^\d{10}$/.test(String(copia.clienteSnapshot.telefono).replace(/\D/g, ''))) { setError('El teléfono debe contener 10 dígitos.'); return; }

    if (copia.tipoDocumento !== ot.tipoDocumento && copia.tipoDocumento === 'cotizacion' && ot.estadoGeneral === 'entregada') {

      setError('Una OT entregada requiere revisión administrativa antes de cambiar a cotización.'); return;

    }

    const cambios = cambiosDe(ot, copia);

    if (!cambios.length) { setEditando(false); return; }

    const resumen = cambios.map(c => `${c.etiqueta}: ${texto(typeof c.anterior === 'object' ? JSON.stringify(c.anterior) : c.anterior)} → ${texto(typeof c.nuevo === 'object' ? JSON.stringify(c.nuevo) : c.nuevo)}`).join('\n');

    if (!window.confirm(`¿Guardar ${cambios.length} cambio(s)?\n\n${resumen.slice(0, 1800)}\n\nLos datos históricos de producción se conservarán.`)) return;

    setGuardando(true);

    try { if (await guardarTransaccion(cambios, 'edicion')) { setEditando(false); setModalCliente(false); } } catch (err) { console.error(err); setError('Error al guardar. Revisa conexión y permisos de escritura.'); } finally { setGuardando(false); }

  };

  const revertir = async (registro: Registro) => {

    if (!ot) return;

    if (registro.cambios.some(c => protegido(c.ruta) && !['clienteId', 'asesorId'].includes(c.ruta))) { setError('Este registro incluye campos protegidos y no puede revertirse aquí.'); return; }

    const cambios = registro.cambios.map(c => ({ ruta: c.ruta, anterior: c.nuevo, nuevo: c.anterior, etiqueta: c.etiqueta }));

    if (!window.confirm(`¿Revertir los ${cambios.length} cambios de este registro?\nSolo se permitirá si los valores actuales siguen coincidiendo.`)) return;

    setGuardando(true); setError('');

    try { await guardarTransaccion(cambios, 'reversion', registro.id); } catch (err) { console.error(err); setError('No fue posible revertir.'); } finally { setGuardando(false); }

  };

  const facturas = ot ? facturasDeOT(ot) : [];

  const partidas = ot?.trabajos && typeof ot.trabajos === 'object' ? Object.entries(ot.trabajos).map(([id, datos]: [string, any]) => ({ id, datos })) : [];

  const buscarCorte = async () => {

    if (!ot || !facturas.length) return; setBuscandoCorte(true); setErrorCorte(''); setMovimientos([]); setCorteConsultado(false);

    try {
      const s = await get(ref(db, 'corte-caja')); const buscadas = new Set(facturas.map(f => f.replace(/\s+/g, '').toUpperCase())); const encontrados: { ruta: string; datos: Obj }[] = [];

      Object.entries(s.val() || {}).forEach(([dia, regs]: [string, any]) => Object.entries(regs || {}).forEach(([id, m]: [string, any]) => {

        const vals = Array.isArray(m?.factura) ? m.factura : [m?.factura];

        if (vals.some((x: unknown) => x != null && buscadas.has(String(x).replace(/\s+/g, '').toUpperCase()))) encontrados.push({ ruta: `corte-caja/${dia}/${id}`, datos: m });

      })); setMovimientos(encontrados); setCorteConsultado(true);

    } catch (err) { console.error(err); setErrorCorte('No se pudo consultar corte de caja.'); } finally { setBuscandoCorte(false); }

  };

  return <main style={estilos.pagina}>

    <h2>Reporte de orden de trabajo</h2><p>Consulta y corrección administrativa con historial de modificaciones.</p>

    <form onSubmit={buscar} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><input aria-label="Número de OT" placeholder="Ej. 888 u OT-00888" value={numero} onChange={e => setNumero(e.target.value)} style={{ ...estilos.entrada, width: 230 }} /><button disabled={cargando} style={estilos.boton}>{cargando ? 'Buscando…' : 'Buscar OT'}</button>

      {ot && <><button type="button" style={estilos.boton} onClick={() => window.print()}>Imprimir / guardar PDF</button><button type="button" style={estilos.boton} onClick={() => setModal('json')}>Ver JSON</button><button type="button" style={estilos.boton} onClick={() => setModal('historial')}>Historial ({historial.length})</button></>}</form>

    {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}

    {ot && <>

      <section style={estilos.tarjeta}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}><h3>{texto(ot.otLabel || `OT-${clave.slice(2)}`)} · Información general</h3>{!editando ? <button style={estilos.boton} onClick={() => { setBorrador(structuredClone(ot)); setEditando(true); }}>Editar datos</button> : <div style={{ display: 'flex', gap: 8 }}><button disabled={guardando} onClick={guardar} style={estilos.boton}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button><button disabled={guardando} onClick={() => { setEditando(false); setModalCliente(false); setBorrador(structuredClone(ot)); }}>Cancelar</button></div>}</div>

        <div style={estilos.rejilla}>

          <Campo nombre="Clave Firebase" valor={clave} />

          {editando && borrador ? <>

            <Editor nombre="Fecha registrada en mostrador" tipo="date" valor={fechaInput(borrador.fecha)} onChange={v => fechaEditar('fecha', v)} />

            <Editor nombre="Entrada a almacén" tipo="date" valor={fechaInput(borrador.Entrada_Almacen)} onChange={v => fechaEditar('Entrada_Almacen', v)} />

            <Campo nombre="Estado general (automático)" valor={estadoGeneral(borrador)} />

            <Editor nombre="Tipo de documento" valor={borrador.tipoDocumento || 'cotizacion'} opciones={['cotizacion', 'orden_trabajo']} onChange={v => { editar('tipoDocumento', v); if (v === 'cotizacion') editar('taller', false); }} />

            <div>
              <div style={estilos.etiqueta}>Cliente</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={estilos.valor}>{texto(borrador.clienteSnapshot?.razonSocial || borrador.clienteSnapshot?.nombre || borrador.clienteSnapshot?.nombrePersonaFisica || 'PÚBLICO GENERAL')}</span>
                <button type="button" aria-label="Modificar cliente" title="Modificar cliente" onClick={() => setModalCliente(true)} style={{ border: '1px solid #b7c1d0', borderRadius: 6, background: '#fff', padding: '5px 9px', fontSize: 19, cursor: 'pointer' }}>🔍</button>
              </div>
            </div>

            <Campo nombre="Teléfono" valor={borrador.clienteSnapshot?.telefono} />

            <label><div style={estilos.etiqueta}>Asesor</div><select style={estilos.entrada} value={String(borrador.asesorId || '')} onChange={e => elegirAsesor(e.target.value)}><option value="">Seleccionar asesor</option>{borrador.asesorId && !empleados.some(e => e.id === String(borrador.asesorId) && esAsesorPermitido(e.datos)) && <option value={String(borrador.asesorId)}>{borrador.asesorSnapshot?.username || borrador.asesorSnapshot?.nombre || 'Asesor anterior'} (asignado actualmente)</option>}{empleados.filter(e => esAsesorPermitido(e.datos)).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>

            <Campo nombre="Número de partidas" valor={partidas.length} />

            <Campo nombre="En taller (automático)" valor={borrador.tipoDocumento === 'cotizacion' ? 'No' : borrador.taller ? 'Sí' : 'No'} />

          </> : <>

            <Campo nombre="Fecha registrada en mostrador" valor={fecha(ot.fecha)} /><Campo nombre="Entrada a almacén" valor={fecha(ot.Entrada_Almacen)} /><Campo nombre="Estado general" valor={ot.estadoGeneral} /><Campo nombre="Tipo de documento" valor={ot.tipoDocumento} /><Campo nombre="Cliente" valor={ot.clienteSnapshot?.razonSocial || ot.clienteSnapshot?.nombre || 'PÚBLICO GENERAL'} /><Campo nombre="Teléfono" valor={ot.clienteSnapshot?.telefono} /><Campo nombre="Asesor" valor={ot.asesorSnapshot?.username || ot.asesorSnapshot?.nombre} /><Campo nombre="Número de partidas" valor={partidas.length} /><Campo nombre="En taller" valor={ot.taller === undefined ? '—' : ot.taller ? 'Sí' : 'No'} />

          </>}

          <Campo nombre="Envío" valor={(editando && borrador ? borrador.envio : ot.envio) === undefined ? '—' : (editando && borrador ? borrador.envio : ot.envio) ? 'Sí' : 'No'} /><Campo nombre="Folio de envío" valor={ot.envioFolio} />

        </div>

      </section>

      <section style={estilos.tarjeta}><h3>Importes y facturación · Solo lectura</h3><div style={estilos.rejilla}><Campo nombre="Subtotal" valor={ot.subtotal} /><Campo nombre="Descuento del cliente" valor={ot.descuentoCliente} /><Campo nombre="Total con descuento" valor={ot.totalConDescuento} /><Campo nombre="Total con IVA" valor={ot.totalConIva} /><Campo nombre="Crédito" valor={typeof ot.credito === 'object' ? JSON.stringify(ot.credito) : String(ot.credito ?? '—')} /><Campo nombre="Pagado" valor={typeof ot.pagado === 'object' ? JSON.stringify(ot.pagado) : String(ot.pagado ?? '—')} /><Campo nombre="Facturas vinculadas" valor={facturas.join(', ') || 'Sin factura vinculada'} /></div></section>

      <section style={estilos.tarjeta}><h3>Partidas de producción ({partidas.length})</h3><Tabla columnas={['Partida', 'Tipo', 'Operador', 'Estado', 'Inspeccionó', 'Resultado']} filas={partidas.map(({ id, datos: p }, i) => [texto(p.partida || `Partida ${i + 1} (${id})`), texto(p.tipo), texto(p.trabajador), texto(p.estadoProduccion), texto(p.inspeccion?.usuario), p.inspeccion?.aprobado === undefined ? '—' : p.inspeccion.aprobado ? 'Aprobada' : 'No aprobada'])} />

        {partidas.map(({ id, datos: p }, i) => {
          const b = borrador?.trabajos?.[id] || p; const r = (campo: string) => `trabajos/${id}/${campo}`; return <details key={id} style={{ marginTop: 14, border: '1px solid #e5e9ef', borderRadius: 8, padding: 12 }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{texto(p.partida || `Partida ${i + 1}`)} · Ver desglose completo</summary><div style={{ ...estilos.rejilla, marginTop: 16 }}>

            <Campo nombre="Clave de partida" valor={id} /><Campo nombre="Tipo" valor={p.tipo} />

            {editando ? <>

              <Editor nombre="Estado de producción" valor={b.estadoProduccion || ''} opciones={['en_fila', 'en_proceso', 'inspeccion', 'terminada', 'contactado', 'lista_para_entrega']} onChange={v => editar(r('estadoProduccion'), v)} />

              <label style={{ display: 'block' }}>
                <div style={estilos.etiqueta}>Operador asignado</div>
                <select
                  style={estilos.entrada}
                  value={String(b.trabajador ?? '')}
                  onChange={(e) => editar(r('trabajador'), e.target.value)}
                >
                  <option value="">Sin operador asignado</option>
                  {b.trabajador && !empleados.some(
                    (e) => esOperadorPermitido(e.datos) && e.nombre === b.trabajador
                  ) && (
                      <option value={String(b.trabajador)}>
                        {String(b.trabajador)} (asignado actualmente)
                      </option>
                    )}
                  {empleados
                    .filter((e) => esOperadorPermitido(e.datos))
                    .map((e) => (
                      <option key={e.id} value={e.nombre}>{e.nombre}</option>
                    ))}
                </select>
              </label>

              <Editor nombre="Inicio de fabricación" tipo="date" valor={fechaInput(b.fechaInicio)} onChange={v => fechaEditar(r('fechaInicio'), v)} />

              <Editor nombre="Fin de fabricación" tipo="date" valor={fechaInput(b.fechaFin)} onChange={v => fechaEditar(r('fechaFin'), v)} />

              <Editor nombre="Material solicitado" tipo="boolean" valor={b.materialSolicitado} onChange={v => editar(r('materialSolicitado'), v)} />

              <Editor nombre="Material entregado" tipo="boolean" valor={b.materialEntregado} onChange={v => editar(r('materialEntregado'), v)} />

              <Editor nombre="Fecha de entrega de material" tipo="date" valor={fechaInput(b.materialEntregaFecha)} onChange={v => fechaEditar(r('materialEntregaFecha'), v)} />

              <Editor nombre="Pedido recibido" valor={b.pedido_recibido || ''} onChange={v => editar(r('pedido_recibido'), v)} />

              <Editor nombre="Inspeccionó" valor={b.inspeccion?.usuario || ''} onChange={v => editar(r('inspeccion/usuario'), v)} />

              <Editor nombre="Fecha de inspección" tipo="date" valor={fechaInput(b.inspeccion?.fecha)} onChange={v => fechaEditar(r('inspeccion/fecha'), v)} />

              <Editor nombre="Resultado de inspección" tipo="boolean" valor={b.inspeccion?.aprobado} onChange={v => editar(r('inspeccion/aprobado'), v)} />

              <Editor nombre="Observaciones" tipo="textarea" valor={b.inspeccion?.observaciones || ''} onChange={v => editar(r('inspeccion/observaciones'), v)} />

              <Editor nombre="Números de serie (uno por línea)" tipo="textarea" valor={seriesDe(b).join('\n')} onChange={v => editar(r('numerosSerie'), String(v).split('\n').map(s => s.trim()).filter(Boolean))} />

            </> : <><Campo nombre="Estado de producción" valor={p.estadoProduccion} /><Campo nombre="Operador asignado" valor={p.trabajador} /><Campo nombre="Inicio de fabricación" valor={fecha(p.fechaInicio)} /><Campo nombre="Fin de fabricación" valor={fecha(p.fechaFin)} /><Campo nombre="Material solicitado" valor={p.materialSolicitado === undefined ? '—' : p.materialSolicitado ? 'Sí' : 'No'} /><Campo nombre="Material entregado" valor={p.materialEntregado === undefined ? '—' : p.materialEntregado ? 'Sí' : 'No'} /><Campo nombre="Fecha de entrega de material" valor={fecha(p.materialEntregaFecha)} /><Campo nombre="Pedido recibido" valor={p.pedido_recibido} /><Campo nombre="Inspeccionó" valor={p.inspeccion?.usuario} /><Campo nombre="Fecha de inspección" valor={fecha(p.inspeccion?.fecha)} /><Campo nombre="Resultado de inspección" valor={p.inspeccion?.aprobado === undefined ? '—' : p.inspeccion.aprobado ? 'Aprobada' : 'No aprobada'} /><Campo nombre="Observaciones" valor={p.inspeccion?.observaciones} /><Campo nombre="Números de serie" valor={seriesDe(p).join(', ') || 'No hay números de serie registrados'} /></>}

          </div><h4>Descripción</h4>{editando ? <Editor nombre="Descripción" tipo="textarea" valor={b.descripcion || ''} onChange={v => editar(r('descripcion'), v)} /> : <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{texto(p.descripcion)}</p>}</details>;
        })}

      </section>

      <section style={estilos.tarjeta}><h3>Movimientos relacionados en corte de caja · Solo lectura</h3>{!facturas.length ? <p>Esta OT no tiene números de factura vinculados.</p> : <><p>Facturas a localizar: <strong>{facturas.join(', ')}</strong></p><button style={estilos.boton} disabled={buscandoCorte} onClick={buscarCorte}>{buscandoCorte ? 'Consultando…' : 'Buscar movimientos por factura'}</button><p style={{ fontSize: 12, color: '#596579' }}>La búsqueda recorre corte-caja al pulsar el botón.</p>{errorCorte && <p style={{ color: '#b42318' }}>{errorCorte}</p>}{corteConsultado && <><p>{movimientos.length} movimiento(s) encontrado(s).</p><Tabla columnas={['Ruta', 'Factura', 'Fecha', 'Cantidad', 'Método', 'Estatus', 'Transacción', 'Comentarios', 'ID']} filas={movimientos.map(({ ruta, datos: m }) => [ruta, texto(m.factura), fecha(m.fecha), texto(m.cantidad), texto(m.metodo), texto(m.estatus), texto(m.transaccion), texto(m.comentarios), texto(m.id)])} /></>}</>}</section>

      {editando && borrador && (
        <ModificarCliente
          abierto={modalCliente}
          clienteId={borrador.clienteId ?? null}
          clienteSnapshot={borrador.clienteSnapshot ?? {}}
          envio={borrador.envio}
          clientes={clientes}
          onCerrar={() => setModalCliente(false)}
          onAceptar={aceptarCliente}
        />
      )}

      {modal === 'json' && <Modal titulo={`JSON original · ${clave}`} cerrar={() => setModal(null)}><p>Consulta únicamente. No permite modificar Firebase.</p><button onClick={() => navigator.clipboard.writeText(JSON.stringify(ot, null, 2))}>Copiar JSON</button><pre style={{ background: '#f3f6fa', padding: 15, borderRadius: 8, overflow: 'auto', maxHeight: '60vh', fontSize: 12 }}>{JSON.stringify(ot, null, 2)}</pre></Modal>}

      {modal === 'historial' && <Modal titulo={`Historial de cambios · ${clave}`} cerrar={() => setModal(null)}>{!historial.length ? <p>Sin modificaciones registradas desde este módulo.</p> : historial.map(h => <div key={h.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}><strong>{new Date(h.fecha).toLocaleString('es-MX')} · {h.usuario}</strong><p>{h.tipo === 'reversion' ? 'Reversión' : 'Edición'} {h.origen ? `(registro ${h.origen})` : ''}</p>{h.cambios.map((c, i) => <p key={i} style={{ fontSize: 13 }}><b>{c.etiqueta}:</b> {texto(typeof c.anterior === 'object' ? JSON.stringify(c.anterior) : c.anterior)} → {texto(typeof c.nuevo === 'object' ? JSON.stringify(c.nuevo) : c.nuevo)}</p>)}<button disabled={guardando || editando} onClick={() => revertir(h)}>↶ Revertir este registro</button></div>)}</Modal>}

    </>}

  </main>;

};

export default ReporteOrdenTrabajo;