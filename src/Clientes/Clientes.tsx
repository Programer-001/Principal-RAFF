//src/Cientes/Clientess.tsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDatabase, ref, get, update, remove,push, set } from "firebase/database";
import * as pdfjsLib from "pdfjs-dist";
import {
    plantillaCatalogoClientes,
    CAMPOS_CATALOGO_CLIENTES,
    CampoCatalogoCliente,
} from "../plantillas/plantillaCatalogoClientes";
import { app } from "../firebase/config";
import "../css/formulario.css";

// Worker necesario para que PDF.js pueda leer el archivo en el navegador
pdfjsLib.GlobalWorkerOptions.workerSrc =
    window.location.origin + "/pdf.worker.min.mjs";

interface Cliente {
  id: string;
  nombre?: string;
  razonSocial?: string;
  rfc?: string;
  direccion?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  cp?: string;
  telefono?: string;
  email?: string;
  empresa?: string;
  giro?: string;
  regimenFiscal?: string;
  notas?: string;
  descuentoDefault?: number;

  credito?: {
    activo: boolean;
    limite?: number;
    dias?: number;
  };
}
interface Envio {
  id: string;
  folio?: string;
  fecha?: string;
  paqueteria?: string;
  guia?: string;
  estado?: string;
}

// ==========================================
// DATOS TEMPORALES LEÍDOS DE LA CONSTANCIA
// ==========================================
// Estos datos todavía NO se guardan en Firebase.
// Primero se muestran dentro del modal para que
// el usuario pueda revisarlos y seleccionar
// el régimen fiscal que desea utilizar.
// ==========================================
interface DatosConstanciaFiscal {
  rfc: string;
  esPersonaFisica: boolean;
  nombrePersonaFisica: string;
  razonSocial: string;
  empresa: string;
  direccion: string;
  numeroExterior: string;
  numeroInterior: string;
  colonia: string;
  localidad: string;
  municipio: string;
  estado: string;
  cp: string;
  giro: string;
  regimenes: string[];
}

const ITEMS_PER_PAGE = 20;

const BuscarClientes: React.FC = () => {
  const db = getDatabase(app);
  //PARA EDICION DESDE COTIZADOR -> VARIABLES
  const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as any;
    const vieneDeCotizador = state?.modo === "editarDesdeCotizador";
    const clienteIdDesdeCotizador = state?.clienteId;
    const volverA = state?.volverA || "/cotizador";
    console.log("location.state en Clientes:", location.state);
    console.log("clienteIdDesdeCotizador:", clienteIdDesdeCotizador);
    //CLIENTES NUEVOS
    const [modoNuevo, setModoNuevo] = useState(false);

    // ==========================================
    // CONSTANCIA DE SITUACIÓN FISCAL PDF
    // ==========================================
    const [modalConstancia, setModalConstancia] = useState(false);
    const [archivoConstancia, setArchivoConstancia] = useState<File | null>(null);
    const [leyendoConstancia, setLeyendoConstancia] = useState(false);

    // ==========================================
    // VISTA PREVIA DE LA CONSTANCIA
    // ==========================================
    // Después de leer el PDF guardamos aquí los
    // datos encontrados. Todavía no modificamos
    // selectedCliente hasta presionar Confirmar.
    // ==========================================
    const [datosConstancia, setDatosConstancia] =
        useState<DatosConstanciaFiscal | null>(null);

    // Régimen que el usuario selecciona en el modal.
    // Si solamente existe uno, se selecciona
    // automáticamente.
    const [regimenConstanciaSeleccionado, setRegimenConstanciaSeleccionado] =
        useState("");

    // VARIABLES DEL CLIENTES
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [modoEditar, setModoEditar] = useState(false);
  const [enviosCliente, setEnviosCliente] = useState<Envio[]>([]);

  // ===============================
  // MODAL CATALOGO PDF
  // ===============================

  const [modalCatalogo, setModalCatalogo] = useState(false);

  const [catalogoTodosClientes, setCatalogoTodosClientes] =
      useState(true);

  const [busquedaCatalogo, setBusquedaCatalogo] =
      useState("");

  const [clientesSeleccionadosCatalogo, setClientesSeleccionadosCatalogo] =
      useState<Cliente[]>([]);

  const [camposCatalogo, setCamposCatalogo] =
      useState<string[]>([
          "razonSocial",
          "rfc",
          "telefono",
          "direccion",
          "colonia",
          "municipio",
          "estado",
          "cp",
      ]);

  // 🔎 BUSCAR CLIENTES
  const buscarClientes = async (texto: string) => {
    const snap = await get(ref(db, "Clientes"));
      const data = snap.val() || {};

    const lista = Object.keys(data).map((id) => ({
      id,
      ...data[id],
    }));

    const textoBusqueda = texto.toLowerCase();

    return lista.filter((c: any) => {
      const nombre = (c.nombre || "").toLowerCase();
      const razon = (c.razonSocial || "").toLowerCase();
      const rfc = (c.rfc || "").toLowerCase();

      return (
        nombre.includes(textoBusqueda) ||
        razon.includes(textoBusqueda) ||
        rfc.includes(textoBusqueda)
      );
    });
  };

const agregarClienteCatalogo = (
    cliente: Cliente
) => {
    const yaExiste =
        clientesSeleccionadosCatalogo.some(
            (c) => c.id === cliente.id
        );

    if (yaExiste) return;

    setClientesSeleccionadosCatalogo([
        ...clientesSeleccionadosCatalogo,
        cliente,
    ]);
};

const generarCatalogoClientes = async () => {
    const camposSeleccionados: CampoCatalogoCliente[] =
        CAMPOS_CATALOGO_CLIENTES.filter((campo) =>
            camposCatalogo.includes(campo.key)
        );

    if (camposSeleccionados.length === 0) {
        alert("Selecciona al menos una columna");
        return;
    }

    let lista: Cliente[] = [];

    // TODOS
    if (catalogoTodosClientes) {
        const snap = await get(ref(db, "Clientes"));

        const data = snap.val() || {};

        lista = Object.keys(data).map((id) => ({
            id,
            ...data[id],
        }));
    }

    // SOLO SELECCIONADOS
    else {
        lista = clientesSeleccionadosCatalogo;
    }

    if (lista.length === 0) {
        alert("No hay clientes seleccionados");
        return;
    }

    const doc = plantillaCatalogoClientes(
        lista,
        camposSeleccionados
    );

    doc.save("Catalogo_Clientes.pdf");

    setModalCatalogo(false);
};

  // 🔎 BUSCAR AL ESCRIBIR
  useEffect(() => {
    if (search.trim() === "") {
      setClientes([]);
      setPage(1);
      return;
    }
    const timeout = setTimeout(async () => {
      const resultados = await buscarClientes(search.trim());
      setClientes(resultados);
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);
    //COTIZADOR->CLIENTE
    useEffect(() => {
        const abrirClienteDirecto = async () => {
            console.log("Entró a abrirClienteDirecto");
            console.log("clienteIdDesdeCotizador:", clienteIdDesdeCotizador);
            if (!clienteIdDesdeCotizador) return;

            const snap = await get(ref(db, `Clientes/${clienteIdDesdeCotizador}`));
            if (!snap.exists()) return;

            const data = snap.val();

            setSelectedCliente({
                id: clienteIdDesdeCotizador,
                ...data,
            });

            setModoEditar(true);
            cargarEnviosCliente(clienteIdDesdeCotizador);
        };

        abrirClienteDirecto();
    }, [clienteIdDesdeCotizador]);
    //----------------------------------------------------->>
  const datosPaginados = clientes.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
    );
    // ==========================================
    // 📄 LEER CONSTANCIA DE SITUACIÓN FISCAL
    // ==========================================

    const limpiarTextoConstancia = (texto: string) => {
        return texto
            .replace(/\s+/g, " ")
            .replace(/\u00A0/g, " ")
            .trim();
    };

    // ==========================================
    // BUSCAR UN DATO DENTRO DEL TEXTO DEL PDF
    // ==========================================
    const obtenerDatoConstancia = (
        texto: string,
        inicio: RegExp,
        finales: RegExp[]
    ) => {
        const encontrado = texto.match(inicio);

        if (!encontrado || encontrado.index === undefined) {
            return "";
        }

        const posicionInicial = encontrado.index + encontrado[0].length;
        const resto = texto.substring(posicionInicial);

        let posicionFinal = resto.length;

        finales.forEach((final) => {
            const encontradoFinal = resto.search(final);

            if (encontradoFinal !== -1 && encontradoFinal < posicionFinal) {
                posicionFinal = encontradoFinal;
            }
        });

        return limpiarTextoConstancia(resto.substring(0, posicionFinal));
    };

    // ==========================================
    // CONVERTIR RÉGIMEN DEL SAT AL FORMATO
    // UTILIZADO POR EL SELECT DEL SISTEMA
    // ==========================================
    //
    // La Constancia del SAT normalmente muestra
    // el NOMBRE del régimen, no necesariamente
    // su clave numérica. Por eso hacemos esta
    // conversión cuando reconocemos el nombre.
    //
    // Si aparece un régimen que todavía no está
    // contemplado aquí, NO lo perdemos: regresamos
    // el texto original para que pueda mostrarse
    // y seleccionarse en el modal.
    // ==========================================
    const convertirRegimenFiscal = (regimen: string) => {
        const original = limpiarTextoConstancia(regimen);
        const texto = original
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if (texto.includes("general de ley personas morales")) {
            return "601 - General de Ley Personas Morales";
        }

        if (texto.includes("personas morales con fines no lucrativos")) {
            return "603 - Personas Morales con Fines no Lucrativos";
        }

        if (texto.includes("sueldos") && texto.includes("salarios")) {
            return "605 - Sueldos y Salarios";
        }

        if (texto.includes("arrendamiento")) {
            return "606 - Arrendamiento";
        }

        if (
            texto.includes("actividades empresariales") ||
            texto.includes("actividades empresariales y profesionales")
        ) {
            return "612 - Personas Físicas con Actividades Empresariales";
        }

        if (texto.includes("incorporacion fiscal")) {
            return "621 - Incorporación Fiscal";
        }

        if (
            texto.includes("simplificado de confianza") ||
            texto.includes("resico")
        ) {
            return "626 - RESICO";
        }

        // Si no conocemos todavía el régimen,
        // conservamos exactamente lo que leyó
        // la Constancia del SAT.
        return original;
    };

    // ==========================================
    // EXTRAER TODOS LOS REGÍMENES DEL PDF
    // ==========================================
    //
    // Una Constancia puede contener uno, dos
    // o más regímenes fiscales. Esta función
    // toma solamente la sección comprendida
    // entre "Regímenes:" y "Obligaciones:".
    //
    // Cada régimen normalmente termina antes
    // de su fecha de inicio, por ejemplo:
    //
    // Régimen Simplificado de Confianza 01/01/2022
    //
    // Si existe una fecha de fin, también se
    // ignora para quedarnos únicamente con
    // el nombre del régimen.
    // ==========================================
    const extraerRegimenesConstancia = (texto: string) => {
        const inicioRegimenes = texto.search(/Regímenes:/i);
        const inicioObligaciones = texto.search(/Obligaciones:/i);

        if (inicioRegimenes === -1) {
            return [] as string[];
        }

        const finSeccion =
            inicioObligaciones !== -1 && inicioObligaciones > inicioRegimenes
                ? inicioObligaciones
                : texto.length;

        let seccion = texto.substring(inicioRegimenes, finSeccion);

        seccion = seccion
            .replace(/Regímenes:/i, "")
            .replace(/Régimen\s+Fecha Inicio\s+Fecha Fin/i, "")
            .trim();

        const regimenesEncontrados: string[] = [];

        // Buscamos texto seguido por una fecha de inicio.
        // El patrón se repite para obtener todos los
        // regímenes que aparezcan en la constancia.
        const regex = /(.+?)\s+(\d{2}\/\d{2}\/\d{4})(?:\s+(\d{2}\/\d{2}\/\d{4}))?(?=\s|$)/g;

        let coincidencia: RegExpExecArray | null;

        while ((coincidencia = regex.exec(seccion)) !== null) {
            const nombreRegimen = limpiarTextoConstancia(coincidencia[1]);

            // Evitamos cadenas vacías o residuos de fechas.
            if (
                nombreRegimen &&
                !/^\d{2}\/\d{2}\/\d{4}$/.test(nombreRegimen)
            ) {
                regimenesEncontrados.push(
                    convertirRegimenFiscal(nombreRegimen)
                );
            }
        }

        // Quitamos duplicados manteniendo el orden.
        return Array.from(new Set(regimenesEncontrados));
    };

    // ==========================================
    // EXTRAER TEXTO COMPLETO DEL PDF
    // ==========================================
    const extraerTextoPDF = async (archivo: File) => {
        const buffer = await archivo.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: buffer,
        }).promise;

        let textoCompleto = "";

        for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina++) {
            const pagina = await pdf.getPage(numeroPagina);
            const contenido = await pagina.getTextContent();

            const textoPagina = contenido.items
                .map((item: any) => item.str || "")
                .join(" ");

            textoCompleto += " " + textoPagina;
        }

        return limpiarTextoConstancia(textoCompleto);
    };

    // ==========================================
    // PROCESAR CONSTANCIA FISCAL
    // ==========================================
    const procesarConstanciaFiscal = async () => {
        if (!archivoConstancia) {
            alert("Selecciona una constancia fiscal en PDF");
            return;
        }

        if (
            archivoConstancia.type &&
            archivoConstancia.type !== "application/pdf"
        ) {
            alert("El archivo debe ser un PDF");
            return;
        }

        try {
            setLeyendoConstancia(true);

            const texto = await extraerTextoPDF(archivoConstancia);

            console.log("TEXTO CONSTANCIA FISCAL:", texto);

            // ==========================================
            // VALIDAR QUE SEA CONSTANCIA DEL SAT
            // ==========================================
            const textoMinusculas = texto.toLowerCase();

            if (
                !textoMinusculas.includes("constancia de situación fiscal") &&
                !textoMinusculas.includes("constancia de situacion fiscal")
            ) {
                alert(
                    "El archivo no parece ser una Constancia de Situación Fiscal del SAT."
                );
                return;
            }

            // ==========================================
            // RFC
            // ==========================================
            const rfcMatch = texto.match(
                /RFC:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i
            );

            const rfc = rfcMatch?.[1]?.trim().toUpperCase() || "";

            // ==========================================
            // TIPO DE PERSONA SEGÚN RFC
            // ==========================================
            // Persona física = 13 caracteres
            // Persona moral  = 12 caracteres
            const esPersonaFisica = rfc.length === 13;
            const esPersonaMoral = rfc.length === 12;

            console.log(
                "TIPO DE PERSONA:",
                esPersonaFisica
                    ? "PERSONA FÍSICA"
                    : esPersonaMoral
                    ? "PERSONA MORAL"
                    : "RFC NO RECONOCIDO"
            );

            // ==========================================
            // PERSONA FÍSICA: NOMBRE Y APELLIDOS
            // ==========================================
            const nombres = obtenerDatoConstancia(
                texto,
                /Nombre \(s\):\s*/i,
                [
                    /Primer Apellido:/i,
                    /Segundo Apellido:/i,
                    /Fecha inicio de operaciones:/i,
                ]
            );

            const primerApellido = obtenerDatoConstancia(
                texto,
                /Primer Apellido:\s*/i,
                [/Segundo Apellido:/i, /Fecha inicio de operaciones:/i]
            );

            const segundoApellido = obtenerDatoConstancia(
                texto,
                /Segundo Apellido:\s*/i,
                [/Fecha inicio de operaciones:/i, /Estatus en el padrón:/i]
            );

            const nombrePersonaFisica = limpiarTextoConstancia(
                [nombres, primerApellido, segundoApellido]
                    .filter(Boolean)
                    .join(" ")
            );

            // ==========================================
            // RAZÓN SOCIAL / PERSONA MORAL
            // ==========================================
            const razonSocial =
                obtenerDatoConstancia(
                    texto,
                    /Denominación\/Razón Social:\s*/i,
                    [
                        /Régimen Capital:/i,
                        /Nombre Comercial:/i,
                        /Fecha inicio de operaciones:/i,
                    ]
                ) ||
                obtenerDatoConstancia(
                    texto,
                    /Denominacion\/Razon Social:\s*/i,
                    [
                        /Regimen Capital:/i,
                        /Nombre Comercial:/i,
                        /Fecha inicio de operaciones:/i,
                    ]
                );

            // ==========================================
            // NOMBRE COMERCIAL / EMPRESA
            // ==========================================
            const empresa = obtenerDatoConstancia(
                texto,
                /Nombre Comercial:\s*/i,
                [/Fecha inicio de operaciones:/i, /Estatus en el padrón:/i]
            );

            // ==========================================
            // CÓDIGO POSTAL
            // ==========================================
            const cpMatch = texto.match(/Código Postal:\s*(\d{5})/i);
            const cp = cpMatch?.[1] || "";

            // ==========================================
            // CALLE
            // ==========================================
            const direccion = obtenerDatoConstancia(
                texto,
                /Nombre de Vialidad:\s*/i,
                [/Número Exterior:/i, /Numero Exterior:/i]
            );

            // ==========================================
            // NÚMERO EXTERIOR
            // ==========================================
            const numeroExterior = obtenerDatoConstancia(
                texto,
                /Número Exterior:\s*/i,
                [/Número Interior:/i, /Nombre de la Colonia:/i]
            );

            // ==========================================
            // NÚMERO INTERIOR
            // ==========================================
            const numeroInterior = obtenerDatoConstancia(
                texto,
                /Número Interior:\s*/i,
                [/Nombre de la Colonia:/i, /Nombre de la Localidad:/i]
            );

            // ==========================================
            // COLONIA
            // ==========================================
            const colonia = obtenerDatoConstancia(
                texto,
                /Nombre de la Colonia:\s*/i,
                [/Nombre de la Localidad:/i, /Nombre del Municipio/i]
            );

            // ==========================================
            // LOCALIDAD
            // Algunos documentos del SAT ponen
            // colonia/localidad de manera diferente.
            // ==========================================
            const localidad = obtenerDatoConstancia(
                texto,
                /Nombre de la Localidad:\s*/i,
                [/Nombre del Municipio/i, /Nombre de la Entidad Federativa:/i]
            );

            // ==========================================
            // MUNICIPIO
            // ==========================================
            const municipio = obtenerDatoConstancia(
                texto,
                /Nombre del Municipio o Demarcación Territorial:\s*/i,
                [/Nombre de la Entidad Federativa:/i, /Entre Calle:/i]
            );

            // ==========================================
            // ESTADO
            // ==========================================
            const estado = obtenerDatoConstancia(
                texto,
                /Nombre de la Entidad Federativa:\s*/i,
                [/Entre Calle:/i, /Y Calle:/i, /Actividades Económicas:/i]
            );

            // ==========================================
            // ACTIVIDAD ECONÓMICA PRINCIPAL
            // ==========================================
            let giro = "";

            const actividadMatch = texto.match(
                /(?:Actividades Económicas:.*?)?\b1\s+(.+?)\s+\d{1,3}\s+\d{1,2}\/\d{1,2}\/\d{4}/i
            );

            if (actividadMatch) {
                giro = limpiarTextoConstancia(actividadMatch[1]);
            }

            // ==========================================
            // REGÍMENES FISCALES
            // ==========================================
            // Leemos TODOS los regímenes encontrados
            // en la Constancia. Si existe solamente
            // uno, lo seleccionamos automáticamente.
            // ==========================================
            const regimenes = extraerRegimenesConstancia(texto);

            const regimenAutomatico =
                regimenes.length === 1
                    ? regimenes[0]
                    : "";

            // ==========================================
            // MOSTRAR EN CONSOLA LO ENCONTRADO
            // ==========================================
            console.log({
                rfc,
                esPersonaFisica,
                esPersonaMoral,
                nombrePersonaFisica,
                razonSocial,
                empresa,
                direccion,
                numeroExterior,
                numeroInterior,
                colonia,
                localidad,
                municipio,
                estado,
                cp,
                giro,
                regimenes,
            });

            // ==========================================
            // GUARDAR DATOS TEMPORALES
            // ==========================================
            //
            // IMPORTANTE:
            // Aquí todavía NO llenamos selectedCliente.
            // Primero mostramos todo dentro del modal.
            // El formulario principal solamente se
            // modifica cuando el usuario presiona
            // "Confirmar datos".
            // ==========================================
            setDatosConstancia({
                rfc,
                esPersonaFisica,
                nombrePersonaFisica,
                razonSocial,
                empresa,
                direccion,
                numeroExterior,
                numeroInterior,
                colonia,
                localidad,
                municipio,
                estado,
                cp,
                giro,
                regimenes,
            });

            setRegimenConstanciaSeleccionado(regimenAutomatico);

            // No cerramos el modal.
            // Cambiará automáticamente a la vista
            // previa porque datosConstancia ya existe.
        } catch (error) {
            console.error("Error al leer constancia fiscal:", error);

            alert(
                "No se pudo leer la constancia fiscal. Verifica que sea un PDF original descargado del SAT."
            );
        } finally {
            setLeyendoConstancia(false);
        }
    };

    // ==========================================
    // ✅ CONFIRMAR DATOS DE LA CONSTANCIA
    // ==========================================
    //
    // Esta función se ejecuta únicamente cuando
    // el usuario ya revisó la vista previa y
    // seleccionó el régimen fiscal que desea usar.
    // ==========================================
    const confirmarDatosConstancia = () => {
        if (!datosConstancia) {
            return;
        }

        if (
            datosConstancia.regimenes.length > 0 &&
            !regimenConstanciaSeleccionado
        ) {
            alert("Selecciona un régimen fiscal antes de confirmar.");
            return;
        }

        setSelectedCliente((clienteActual) => {
            if (!clienteActual) return clienteActual;

            return {
                ...clienteActual,

                // ==========================================
                // NOMBRE
                //
                // Persona física:
                // Nombre + Primer Apellido + Segundo Apellido
                //
                // Persona moral:
                // Se deja vacío
                // ==========================================
                nombre:
                    datosConstancia.esPersonaFisica
                        ? datosConstancia.nombrePersonaFisica
                        : "",

                // ==========================================
                // RFC
                // ==========================================
                rfc:
                    datosConstancia.rfc ||
                    clienteActual.rfc ||
                    "",

                // ==========================================
                // RAZÓN SOCIAL
                //
                // Persona física:
                // Se utiliza su nombre completo.
                //
                // Persona moral:
                // Se utiliza la razón social del SAT.
                // ==========================================
                razonSocial:
                    datosConstancia.esPersonaFisica
                        ? datosConstancia.nombrePersonaFisica
                        : datosConstancia.razonSocial ||
                          clienteActual.razonSocial ||
                          "",

                // ==========================================
                // EMPRESA
                //
                // Persona física:
                // Se deja vacío para capturarlo manualmente
                // si trabaja para alguna empresa.
                //
                // Persona moral:
                // Nombre Comercial; si no existe,
                // utilizamos Razón Social como respaldo.
                // ==========================================
                empresa:
                    datosConstancia.esPersonaFisica
                        ? ""
                        : datosConstancia.empresa ||
                          datosConstancia.razonSocial ||
                          clienteActual.empresa ||
                          "",

                // ==========================================
                // DIRECCIÓN
                // ==========================================
                direccion:
                    datosConstancia.direccion ||
                    clienteActual.direccion ||
                    "",

                numeroExterior:
                    datosConstancia.numeroExterior ||
                    clienteActual.numeroExterior ||
                    "",

                numeroInterior:
                    datosConstancia.numeroInterior ||
                    clienteActual.numeroInterior ||
                    "",

                // Si la constancia no trae colonia,
                // usamos localidad como respaldo.
                colonia:
                    datosConstancia.colonia ||
                    datosConstancia.localidad ||
                    clienteActual.colonia ||
                    "",

                municipio:
                    datosConstancia.municipio ||
                    clienteActual.municipio ||
                    "",

                estado:
                    datosConstancia.estado ||
                    clienteActual.estado ||
                    "",

                cp:
                    datosConstancia.cp ||
                    clienteActual.cp ||
                    "",

                // ==========================================
                // EMPRESA / ACTIVIDAD
                // ==========================================
                giro:
                    datosConstancia.giro ||
                    clienteActual.giro ||
                    "",

                // ==========================================
                // RÉGIMEN FISCAL
                // ==========================================
                // Guardamos únicamente el régimen que el
                // usuario seleccionó dentro del modal.
                // ==========================================
                regimenFiscal:
                    regimenConstanciaSeleccionado ||
                    clienteActual.regimenFiscal ||
                    "",
            };
        });

        // Cerramos y limpiamos el modal después
        // de transferir los datos al formulario.
        setModalConstancia(false);
        setArchivoConstancia(null);
        setDatosConstancia(null);
        setRegimenConstanciaSeleccionado("");

        alert(
            "Datos de la constancia cargados. Revisa el formulario antes de agregar el cliente."
        );
    };

    // ==========================================
    // ❌ CANCELAR / LIMPIAR CONSTANCIA
    // ==========================================
    const cerrarModalConstancia = () => {
        if (leyendoConstancia) return;

        setModalConstancia(false);
        setArchivoConstancia(null);
        setDatosConstancia(null);
        setRegimenConstanciaSeleccionado("");
    };

    // 💾 GUARDAR CLIENTE
    const guardarClienteNuevo = async () => {
        if (!selectedCliente) return;

        const { id, ...datos } = selectedCliente;

        if (!datos.credito?.activo) {
            delete datos.credito;
        }

        const snap = await get(ref(db, "Clientes"));
        const data = snap.val() || {};

        const limpiar = (v: string) => (v || "").toLowerCase().trim();

        const existeDuplicado = Object.keys(data).some((key) => {
            const c = data[key] || {};

            return (
                (selectedCliente.rfc &&
                    limpiar(c.rfc) === limpiar(selectedCliente.rfc)) ||
                (selectedCliente.razonSocial &&
                    limpiar(c.razonSocial) === limpiar(selectedCliente.razonSocial))
            );
        });

        if (existeDuplicado) {
            alert("Ya existe un cliente con el mismo RFC o Razón Social");
            return;
        }

        const newRef = push(ref(db, "Clientes"));
        await set(newRef, datos);

        alert("Cliente creado");
        setModoNuevo(false);
        setModoEditar(false);
        setSelectedCliente(null);
    };
  // 💾 GUARDAR CLIENTE
    const guardarCliente = async () => {
        if (!selectedCliente) return;

        const { id, ...datos } = selectedCliente;

        if (!datos.credito?.activo) {
            delete datos.credito;
        }

        await update(ref(db, `Clientes/${id}`), datos);

        alert("Cliente actualizado");

        // 🔥 SI VIENE DEL COTIZADOR → REGRESAR
        if (vieneDeCotizador) {
            navigate(volverA, {
                state: {
                    modo: "regresoDesdeEditarCliente",
                    clienteActualizadoId: id,
                },
            });
            return;
        }

        setModoEditar(false);
    };

  // ❌ ELIMINAR CLIENTE
  const eliminarCliente = async (cliente: Cliente) => {
    if (!cliente.id) return;

    const confirmacion = window.confirm(
      `¿Eliminar al cliente ${cliente.nombre}?`
    );

    if (!confirmacion) return;

    await remove(ref(db, `Clientes/${cliente.id}`));

    setClientes(clientes.filter((c) => c.id !== cliente.id));

    if (selectedCliente?.id === cliente.id) {
      setSelectedCliente(null);
      setModoEditar(false);
    }

    alert("Cliente eliminado");
  };
  //Mostrar Envios
  const cargarEnviosCliente = async (clienteId: string) => {
    const snap = await get(ref(db, "Envios"));
    const data = snap.val() || {};

    const lista = Object.keys(data).map((id) => ({
      id,
      ...data[id],
    }));

    const filtrados = lista.filter((e: any) => e.clienteId === clienteId);

    setEnviosCliente(filtrados);
  };

  const direccionCompleta = selectedCliente
    ? `${selectedCliente.direccion || ""} ${
        selectedCliente.numeroExterior || ""
      }, ${selectedCliente.colonia || ""}, ${
        selectedCliente.municipio || ""
      }, ${selectedCliente.estado || ""}`
    : "";


  return (
    <div className="caja-container">
      <h2>Consulta de Clientes</h2>

          <div className="search-bar">
              <input
                  type="text"
                  placeholder="Buscar nombre, razón social o RFC"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
              />

              <button
                  className="btn btn-green"
                  onClick={() => {
                      setSelectedCliente({
                          id: "",
                          nombre: "",
                          razonSocial: "",
                          rfc: "",
                          direccion: "",
                          numeroExterior: "",
                          numeroInterior: "",
                          colonia: "",
                          municipio: "",
                          estado: "",
                          cp: "",
                          telefono: "",
                          email: "",
                          empresa: "",
                          giro: "",
                          regimenFiscal: "",
                          notas: "",
                          descuentoDefault: 0,
                      });
                      setModoEditar(true);
                      setModoNuevo(true);
                      setEnviosCliente([]);
                  }}
              >
                  + Nuevo Cliente
              </button>
              <button
                  className="btn btn-blue"
                  onClick={() => setModalCatalogo(true)}
              >
                  Catálogo PDF
                </button>
          </div>

      {/* RESULTADOS */}

      {search.trim() !== "" &&
        datosPaginados.length > 0 &&
        !selectedCliente && (
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Razón Social</th>
                  <th>RFC</th>
                  <th>Ficha</th>
                </tr>
              </thead>

              <tbody>
                {datosPaginados.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.razonSocial}</td>
                    <td>{c.rfc}</td>

                    <td>
                      <button
                        className="btn btn-blue"
                        onClick={() => {
                          setSelectedCliente(c);
                          setModoEditar(false);
                          cargarEnviosCliente(c.id);
                        }}
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* FICHA CLIENTE */}

      {selectedCliente && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            marginTop: 30,
          }}
        >
          {/* DATOS CLIENTE */}

          <div className="cliente-panel">
            {/* CLIENTE */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #ddd",
              }}
            >
              <h3
                className="seccion"
                style={{
                  borderBottom: "none",
                  marginBottom: 0,
                  flex: 1,
                }}
              >
                👤 CLIENTE
              </h3>

              {/* ==========================================
                  BOTÓN CONSTANCIA FISCAL
                  SOLO SE MUESTRA AL CREAR CLIENTE NUEVO
              ========================================== */}
              {modoEditar && (
                  <button
                      type="button"
                      className="btn btn-blue"
                      onClick={() => {
                          setArchivoConstancia(null);
                          setModalConstancia(true);
                      }}
                  >
                      📄 {modoNuevo ? "Cargar Constancia Fiscal" : "Actualizar desde Constancia"}
                  </button>
              )}
            </div>

            <div className="grid-form">
              <Campo
                label="Nombre"
                value={selectedCliente.nombre}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, nombre: v })
                }
              />

              <Campo
                label="Razón Social"
                value={selectedCliente.razonSocial}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, razonSocial: v })
                }
              />

              <Campo
                label="RFC"
                value={selectedCliente.rfc}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, rfc: v })
                }
              />
              <CampoSelect
                label="Régimen Fiscal"
                value={selectedCliente.regimenFiscal ?? ""}
                editar={modoEditar}
                options={[
                  "601 - General de Ley Personas Morales",
                  "603 - Personas Morales con Fines no Lucrativos",
                  "605 - Sueldos y Salarios",
                  "606 - Arrendamiento",
                  "612 - Personas Físicas con Actividades Empresariales",
                  "621 - Incorporación Fiscal",
                  "626 - RESICO",
                ]}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, regimenFiscal: v })
                }
              />
            </div>

            {/* DIRECCIÓN */}
            <h3 className="seccion">📍 DIRECCIÓN</h3>

            <div className="grid-form">
              <Campo
                label="Calle"
                value={selectedCliente.direccion}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, direccion: v })
                }
              />

              <Campo
                label="Número exterior"
                value={selectedCliente.numeroExterior}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, numeroExterior: v })
                }
              />

              <Campo
                label="Número interior"
                value={selectedCliente.numeroInterior}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, numeroInterior: v })
                }
              />

              <Campo
                label="Colonia"
                value={selectedCliente.colonia}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, colonia: v })
                }
              />

              <Campo
                label="Municipio"
                value={selectedCliente.municipio}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, municipio: v })
                }
              />

              <Campo
                label="Estado"
                value={selectedCliente.estado}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, estado: v })
                }
              />

              <Campo
                label="Código Postal"
                value={selectedCliente.cp}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, cp: v })
                }
              />
            </div>

            {/* CONTACTO */}
            <h3 className="seccion">📞 CONTACTO</h3>

            <div className="grid-form">
              <Campo
                label="Teléfono"
                value={selectedCliente.telefono}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, telefono: v })
                }
              />

              <Campo
                label="Email"
                value={selectedCliente.email}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, email: v })
                }
              />
            </div>

            <h3 className="seccion">🏢 EMPRESA</h3>

            <div className="grid-form">
              <Campo
                label="Nombre de Empresa"
                value={selectedCliente.empresa}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, empresa: v })
                }
              />

              <Campo
                label="Giro"
                value={selectedCliente.giro}
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({ ...selectedCliente, giro: v })
                }
              />
            </div>

            <h3 className="seccion">💲 DESCUENTO</h3>

            <div className="grid-form">
              <Campo
                label="Descuento (%)"
                value={
                  selectedCliente?.descuentoDefault !== undefined
                    ? selectedCliente.descuentoDefault * 100
                    : ""
                }
                editar={modoEditar}
                onChange={(v: string) =>
                  setSelectedCliente({
                    ...selectedCliente!,
                    descuentoDefault: Number(v) / 100, // 🔥 convierte a decimal
                  })
                }
              />
            </div>

            <h3 className="seccion">💳 CRÉDITO</h3>

            <div className="grid-form">
              {/* Checkbox */}
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedCliente?.credito?.activo || false}
                    disabled={!modoEditar}
                    onChange={(e) => {
                      if (!selectedCliente) return;

                      if (e.target.checked) {
                        setSelectedCliente({
                          ...selectedCliente,
                          credito: {
                            activo: true,
                            limite: 0,
                            dias: 0,
                          },
                        });
                      } else {
                        // 🔥 eliminar credito
                        const { credito, ...resto } = selectedCliente;
                        setSelectedCliente(resto);
                      }
                    }}
                  />
                  Cliente con crédito
                </label>
              </div>

              {/* Campos solo si tiene crédito */}
              {selectedCliente?.credito?.activo && (
                <>
                  <Campo
                    label="Límite de crédito"
                    value={selectedCliente.credito.limite}
                    editar={modoEditar}
                    onChange={(v: string) =>
                      setSelectedCliente({
                        ...selectedCliente,
                        credito: {
                          ...selectedCliente.credito!,
                          limite: Number(v),
                        },
                      })
                    }
                  />

                  <Campo
                    label="Días de crédito"
                    value={selectedCliente.credito.dias}
                    editar={modoEditar}
                    onChange={(v: string) =>
                      setSelectedCliente({
                        ...selectedCliente,
                        credito: {
                          ...selectedCliente.credito!,
                          dias: Number(v),
                        },
                      })
                    }
                  />
                </>
              )}
            </div>

            <h3 className="seccion">📦 ENVÍOS DEL CLIENTE</h3>

            {enviosCliente.length === 0 ? (
              <p>Este cliente no tiene envíos registrados.</p>
            ) : (
              <table className="caja-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Paquetería</th>
                    <th>Guía</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {enviosCliente.map((e) => (
                    <tr key={e.id}>
                      <td>{e.folio}</td>
                      <td>
                        {e.fecha
                          ? new Date(e.fecha).toLocaleDateString("es-MX")
                          : "-"}
                      </td>
                      <td>{e.paqueteria}</td>
                      <td>{e.guia}</td>
                      <td>{e.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* BOTONES */}

                      <div className="botones">
                          {modoNuevo ? (
                              <>
                                  <button onClick={guardarClienteNuevo} className="btn btn-green">
                                      Agregar
                                  </button>

                                  <button
                                      className="btn btn-purple"
                                      onClick={() => {
                                          setSelectedCliente(null);
                                          setModoEditar(false);
                                          setModoNuevo(false);
                                          setEnviosCliente([]);
                                      }}
                                  >
                                      Cancelar
                                  </button>
                              </>
                          ) : (
                              <>
                                  {!modoEditar && (
                                      <button
                                          onClick={() => setModoEditar(true)}
                                          className="btn btn-blue"
                                      >
                                          Editar
                                      </button>
                                  )}

                                  {modoEditar && (
                                      <button onClick={guardarCliente} className="btn btn-green">
                                          Guardar
                                      </button>
                                  )}

                                  <button
                                      className="btn btn-red"
                                      onClick={() => eliminarCliente(selectedCliente)}
                                  >
                                      Eliminar
                                  </button>

                                  <button
                                      className="btn btn-purple"
                                      onClick={() => {
                                          if (vieneDeCotizador) {
                                              navigate(volverA, {
                                                  state: {
                                                      modo: "regresoDesdeEditarCliente",
                                                      clienteActualizadoId: selectedCliente?.id || null,
                                                  },
                                              });
                                              return;
                                          }

                                          setSelectedCliente(null);
                                          setModoEditar(false);
                                          setModoNuevo(false);
                                          setEnviosCliente([]);
                                      }}
                                  >
                                      Cerrar
                                  </button>
                              </>
                          )}
                      </div>
          </div>

          {/* MAPA */}

          <div>
            <h3>Ubicación</h3>

            {direccionCompleta && (
              <iframe
                title="mapa"
                width="100%"
                height="350"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(
                  direccionCompleta
                )}&output=embed`}
              />
            )}
          </div>
        </div>
      )}
{/* ==========================================
    MODAL CONSTANCIA DE SITUACIÓN FISCAL
========================================== */}
      {modalConstancia && (
        <div className="modal-fondo">
          <div
            className="modal-contenido"
            style={{
              maxWidth: 760,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2>📄 Constancia de Situación Fiscal</h2>

            {/* ==========================================
                PASO 1 - CARGAR EL PDF
            ========================================== */}
            {!datosConstancia && (
              <>
                <p>
                  Selecciona la Constancia de Situación Fiscal original
                  descargada del SAT.
                </p>

                <p
                  style={{
                    fontSize: 14,
                    color: "#666",
                  }}
                >
                  Primero leeremos la información. Después podrás revisar todos
                  los datos encontrados y seleccionar el régimen fiscal antes
                  de llenar el formulario del cliente.
                </p>

                <div
                  style={{
                    marginTop: 20,
                    marginBottom: 20,
                    padding: 20,
                    border: "2px dashed #bbb",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0] || null;

                      setArchivoConstancia(archivo);

                      // Si el usuario selecciona otro PDF,
                      // limpiamos cualquier lectura anterior.
                      setDatosConstancia(null);
                      setRegimenConstanciaSeleccionado("");
                    }}
                  />

                  {archivoConstancia && (
                    <div
                      style={{
                        marginTop: 15,
                      }}
                    >
                      <strong>Archivo seleccionado:</strong>
                      <div>{archivoConstancia.name}</div>
                    </div>
                  )}
                </div>

                <div className="botones">
                  <button
                    type="button"
                    className="btn btn-green"
                    disabled={!archivoConstancia || leyendoConstancia}
                    onClick={procesarConstanciaFiscal}
                  >
                    {leyendoConstancia
                      ? "Leyendo PDF..."
                      : "Leer Constancia"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-purple"
                    disabled={leyendoConstancia}
                    onClick={cerrarModalConstancia}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {/* ==========================================
                PASO 2 - VISTA PREVIA DE LOS DATOS
            ========================================== */}
            {datosConstancia && (
              <>
                <p
                  style={{
                    fontSize: 14,
                    color: "#666",
                  }}
                >
                  Revisa la información encontrada. Estos datos todavía no se
                  han pasado al formulario del cliente.
                </p>

                {/* TIPO DE PERSONA */}
                <div
                  style={{
                    padding: "10px 12px",
                    marginBottom: 15,
                    background: "#f5f5f5",
                    borderRadius: 6,
                  }}
                >
                  <strong>Tipo:</strong>{" "}
                  {datosConstancia.esPersonaFisica
                    ? "Persona Física"
                    : "Persona Moral"}
                </div>

                {/* DATOS GENERALES */}
                <h3 className="seccion">👤 DATOS GENERALES</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 20px",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <strong>RFC</strong>
                    <div>{datosConstancia.rfc || "-"}</div>
                  </div>

                  <div>
                    <strong>Nombre</strong>
                    <div>
                      {datosConstancia.esPersonaFisica
                        ? datosConstancia.nombrePersonaFisica || "-"
                        : "-"}
                    </div>
                  </div>

                  <div>
                    <strong>Razón Social</strong>
                    <div>
                      {datosConstancia.esPersonaFisica
                        ? datosConstancia.nombrePersonaFisica || "-"
                        : datosConstancia.razonSocial || "-"}
                    </div>
                  </div>

                  <div>
                    <strong>Nombre Comercial / Empresa</strong>
                    <div>
                      {datosConstancia.esPersonaFisica
                        ? "-"
                        : datosConstancia.empresa ||
                          datosConstancia.razonSocial ||
                          "-"}
                    </div>
                  </div>

                  <div>
                    <strong>Actividad principal</strong>
                    <div>{datosConstancia.giro || "-"}</div>
                  </div>
                </div>

                {/* DIRECCIÓN */}
                <h3 className="seccion">📍 DIRECCIÓN</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 20px",
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <strong>Calle</strong>
                    <div>{datosConstancia.direccion || "-"}</div>
                  </div>

                  <div>
                    <strong>Número exterior</strong>
                    <div>{datosConstancia.numeroExterior || "-"}</div>
                  </div>

                  <div>
                    <strong>Número interior</strong>
                    <div>{datosConstancia.numeroInterior || "-"}</div>
                  </div>

                  <div>
                    <strong>Colonia / Localidad</strong>
                    <div>
                      {datosConstancia.colonia ||
                        datosConstancia.localidad ||
                        "-"}
                    </div>
                  </div>

                  <div>
                    <strong>Municipio</strong>
                    <div>{datosConstancia.municipio || "-"}</div>
                  </div>

                  <div>
                    <strong>Estado</strong>
                    <div>{datosConstancia.estado || "-"}</div>
                  </div>

                  <div>
                    <strong>Código Postal</strong>
                    <div>{datosConstancia.cp || "-"}</div>
                  </div>
                </div>

                {/* REGÍMENES */}
                <h3 className="seccion">💼 RÉGIMEN FISCAL</h3>

                {datosConstancia.regimenes.length > 0 ? (
                  <>
                    <p
                      style={{
                        fontSize: 14,
                        marginBottom: 10,
                      }}
                    >
                      {datosConstancia.regimenes.length === 1
                        ? "Se encontró un régimen fiscal:"
                        : "Se encontraron varios regímenes. Selecciona el que deseas utilizar:"}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        padding: 12,
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        marginBottom: 20,
                      }}
                    >
                      {datosConstancia.regimenes.map((regimen) => (
                        <label
                          key={regimen}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            name="regimenConstancia"
                            value={regimen}
                            checked={
                              regimenConstanciaSeleccionado === regimen
                            }
                            onChange={(e) =>
                              setRegimenConstanciaSeleccionado(e.target.value)
                            }
                          />

                          <span>{regimen}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 12,
                      border: "1px solid #e0b000",
                      borderRadius: 6,
                      marginBottom: 20,
                    }}
                  >
                    No se pudo detectar un régimen fiscal en la constancia.
                    Podrás seleccionarlo manualmente en el formulario.
                  </div>
                )}

                {/* BOTONES VISTA PREVIA */}
                <div className="botones">
                  <button
                    type="button"
                    className="btn btn-green"
                    disabled={
                      datosConstancia.regimenes.length > 0 &&
                      !regimenConstanciaSeleccionado
                    }
                    onClick={confirmarDatosConstancia}
                  >
                    Confirmar datos
                  </button>

                  <button
                    type="button"
                    className="btn btn-blue"
                    onClick={() => {
                      // Regresamos al paso de selección
                      // sin cerrar completamente el modal.
                      setDatosConstancia(null);
                      setRegimenConstanciaSeleccionado("");
                    }}
                  >
                    Cambiar archivo
                  </button>

                  <button
                    type="button"
                    className="btn btn-purple"
                    onClick={cerrarModalConstancia}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

{/* MODAL CATALOGO PDF */}
      {modalCatalogo && (
        <div className="modal-fondo">
          <div className="modal-contenido" style={{ maxWidth: 850 }}>
            <h2>Catálogo de Clientes</h2>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={catalogoTodosClientes}
                onChange={(e) => {
                  setCatalogoTodosClientes(e.target.checked);
                  setClientesSeleccionadosCatalogo([]);
                  setBusquedaCatalogo("");
                }}
              />
              Todos los clientes
            </label>

            {!catalogoTodosClientes && (
              <>
                <hr />

                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busquedaCatalogo}
                  onChange={async (e) => {
                    const valor = e.target.value;
                    setBusquedaCatalogo(valor);

                    if (valor.trim() === "") {
                      setClientes([]);
                      return;
                    }

                    const resultados = await buscarClientes(valor);
                    setClientes(resultados);
                  }}
                  className="search-input"
                />

                <div style={{ maxHeight: 180, overflowY: "auto", marginTop: 10 }}>
                  <table className="caja-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>RFC</th>
                        <th>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {clientes.map((c: Cliente) => (
                        <tr key={c.id}>
                          <td>{c.razonSocial || c.nombre}</td>
                          <td>{c.rfc}</td>
                          <td>
                            <button
                              className="btn btn-green"
                              onClick={() => agregarClienteCatalogo(c)}
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4>Clientes seleccionados</h4>

                {clientesSeleccionadosCatalogo.map((c: Cliente) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid #ddd",
                      padding: "6px 0",
                    }}
                  >
                    <span>{c.razonSocial || c.nombre}</span>

                    <button
                      className="btn btn-red"
                      onClick={() =>
                        setClientesSeleccionadosCatalogo(
                          clientesSeleccionadosCatalogo.filter(
                            (x: Cliente) => x.id !== c.id
                          )
                        )
                      }
                    >
                      X
                    </button>
                  </div>
                ))}
              </>
            )}

            <hr />

            <h3>Columnas del documento</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              {CAMPOS_CATALOGO_CLIENTES.map((campo) => (
                <label
                  key={campo.key}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={camposCatalogo.includes(campo.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCamposCatalogo([...camposCatalogo, campo.key]);
                      } else {
                        setCamposCatalogo(
                          camposCatalogo.filter((c) => c !== campo.key)
                        );
                      }
                    }}
                  />

                  {campo.label}
                </label>
              ))}
            </div>

            <div className="botones" style={{ marginTop: 20 }}>
              <button className="btn btn-green" onClick={generarCatalogoClientes}>
                Generar PDF
              </button>

              <button
                className="btn btn-purple"
                onClick={() => setModalCatalogo(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};



// COMPONENTE CAMPO REUTILIZABLE

const Campo = ({ label, value, editar, onChange }: any) => {
  return (
    <div style={{ marginBottom: 10 }}>
      <label className="campo-label">{label}</label>

      {editar ? (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p>{value}</p>
      )}
    </div>
  );
};

type CampoSelectProps = {
  label: string;
  value: string;
  editar: boolean;
  options: string[];
  onChange: (v: string) => void;
};

function CampoSelect({
  label,
  value,
  editar,
  options,
  onChange,
}: CampoSelectProps) {
  return (
    <div className="campo">
      <label className="campo-label">{label}</label>

      {editar ? (
        <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Seleccionar...</option>

          {/* Si el régimen leído del SAT no existe todavía
              dentro de la lista fija, lo agregamos de forma
              temporal para que el select pueda mostrarlo. */}
          {value && !options.includes(value) && (
            <option value={value}>{value}</option>
          )}

          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <div>{value}</div>
      )}
      


      
    </div>
    
  );
}
export default BuscarClientes;