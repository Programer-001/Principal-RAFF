import React, { useState, useEffect } from "react";
import { ItemCotizado } from "../cotizador";
import { formatearMoneda } from "../funciones/formato_moneda";
import { FiCopy } from "react-icons/fi";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
interface Props {
    data?: ItemCotizado;
    onGuardar: (item: ItemCotizado) => void;
    setDirty: React.Dispatch<React.SetStateAction<boolean>>;
    perfil?: {
        area?: string;
        puesto?: string;
        username?: string;
    };
}

interface OpcionFirebase {
  id: string;
  tipo?: string;
  precio?: number;
  resistencia?: number;
  [key: string]: any;
}

const Resorte = ({ data, onGuardar, setDirty,perfil }: Props) => {
  const [cantidadResortes, setCantidadResortes] = useState("");
  const [ohms, setohms] = useState("");
  const [TipoAlambre, setTipoAlambre] = useState("");

  const [alambreOptions, setAlambreOptions] = useState<OpcionFirebase[]>([]);
  const [terminalOptions, setTerminalOptions] = useState<OpcionFirebase[]>([]);

  const [alambreSeleccionado, setAlambreSeleccionado] = useState("");
  const [terminalSeleccionada, setTerminalSeleccionada] = useState("");
  const [cantidadTerminales, setCantidadTerminales] = useState("");
  const [servicioExpress, setServicioExpress] = useState(false);
    //Area administracion
    const esAdministracion = perfil?.area === "Administración";
  //------------------useEffect-------------------------------->>
  // cargar terminales una vez
  useEffect(() => {
    const cargarTerminales = async () => {
      try {
        const snapshot = await get(ref(db, "cotizador/terminales"));

        if (snapshot.exists()) {
          const data = snapshot.val();

          const opciones = Object.keys(data).map((key) => ({
            id: key,
            tipo: data[key].Tipo,
            precio: Number(data[key].Precio),
          }));

          setTerminalOptions(opciones);
        } else {
          setTerminalOptions([]);
        }
      } catch (error) {
        console.error("Error al cargar terminales:", error);
        setTerminalOptions([]);
      }
    };

    cargarTerminales();
  }, []);
  // cargar alambre según tipo seleccionado
  useEffect(() => {
    const cargarAlambres = async () => {
      try {
        if (!TipoAlambre) {
          setAlambreOptions([]);
          setAlambreSeleccionado("");
          return;
        }

        let ruta = "";

        if (TipoAlambre === "NICROMEL") {
          ruta = "cotizador/alambre_nicromel";
        } else if (TipoAlambre === "KANTHAL") {
          ruta = "cotizador/alambre_kanthal_d";
        }

        if (!ruta) {
          setAlambreOptions([]);
          return;
        }

        const snapshot = await get(ref(db, ruta));

        if (snapshot.exists()) {
          const data = snapshot.val();

          const opciones = Object.keys(data)
            .map((key) => ({
              id: key,
              tipo: data[key].Tipo,
              precio: Number(data[key].Precio),
              resistencia: Number(data[key].Resistencia),
            }))
            .filter((op) => op.precio > 0);

          setAlambreOptions(opciones);
        } else {
          setAlambreOptions([]);
        }

        setAlambreSeleccionado("");
      } catch (error) {
        console.error("Error al cargar alambres:", error);
        setAlambreOptions([]);
      }
    };

    cargarAlambres();
  }, [TipoAlambre]);

  //-------------------Funciones------------------------------->>
  const mostrarCantidadTerminales =
    terminalSeleccionada !== "" && terminalSeleccionada !== "NO";
  //Calculos

  const alambreActual = alambreOptions.find(
    (op) => op.id === alambreSeleccionado
  );
  const terminalActual = terminalOptions.find(
    (op) => op.id === terminalSeleccionada
  );

  const precioAlambrePorMetro = Number(alambreActual?.precio || 0);
  const resistenciaPorMetro = Number(alambreActual?.resistencia || 0);

  const precioTerminal = Number(terminalActual?.precio || 0);

  const ohmsPuntaAPunta = Number(ohms || 0);
  const cantidadResortesNum = Number(cantidadResortes || 0);
  const cantidadTerminalesNum = Number(cantidadTerminales || 0);

  // metros requeridos del alambre
  const metrosNecesarios =
    ohmsPuntaAPunta > 0 && resistenciaPorMetro > 0
      ? ohmsPuntaAPunta / resistenciaPorMetro
      : 0;

  // costo del alambre por resorte
  const costoAlambre = metrosNecesarios * precioAlambrePorMetro;

  // terminales por resorte
  const costoTerminales = mostrarCantidadTerminales
    ? precioTerminal * cantidadTerminalesNum
    : 0;

  // 50% de fabricación solo sobre el alambre
  const costoFabricacion = costoAlambre * 0.5;

  // total por resorte
  const totalPorResorte = costoAlambre + costoFabricacion + costoTerminales;

  // totalBase
  const totalBase =totalPorResorte * cantidadResortesNum;

  // total general
  const totalGeneral = servicioExpress? totalBase * 1.3 : totalBase;
  //-----------------------------------DESCRIPCION------------------->>

  const tipoAlambreSeleccionado = alambreActual?.tipo || "";
  const tipoTerminalSeleccionada =
    terminalSeleccionada === "NO" ? "NO" : terminalActual?.tipo || "";

  const descripcion = [
    `${cantidadResortes || 0} RESORTE${
      Number(cantidadResortes) > 1 ? "S" : ""
    } DE ${ohms || 0} OHMS`,

    TipoAlambre ? `/ ALAMBRE: ${TipoAlambre}` : null,

    tipoAlambreSeleccionado
      ? `/ CALIBRE DEL ALAMBRE: ${tipoAlambreSeleccionado}`
      : null,

    resistenciaPorMetro > 0
      ? `/ RESISTENCIA X METRO: ${resistenciaPorMetro.toFixed(4)}`
      : null,

    metrosNecesarios > 0
      ? `/ METROS NECESARIOS: ${metrosNecesarios.toFixed(2)} M`
      : null,

    tipoTerminalSeleccionada
      ? `/ TERMINALES: ${tipoTerminalSeleccionada}`
      : null,

    mostrarCantidadTerminales
      ? `/ ${cantidadTerminales || 0} TERMINAL${
          Number(cantidadTerminales) > 1 ? "ES" : ""
        }`
      : null,
    servicioExpress ? `/ SERVICIO EXPRESS` : null,
  ]
    .filter(Boolean)
    .join(" ");

  //----------useEffect DE EDITAR------------------------------->>

  useEffect(() => {
    if (!data) return;

    const d = data.datos || {};

    setCantidadResortes(d.cantidadResortes || "");
    setohms(d.ohms || "");
    setTipoAlambre(d.TipoAlambre || "");
    setCantidadTerminales(d.cantidadTerminales || "");
    setTerminalSeleccionada(d.terminalSeleccionada || "");
    setServicioExpress(!!d.servicioExpress);
  }, [data]);

  useEffect(() => {
    if (!data) return;

    const d = data.datos || {};

    if (alambreOptions.length > 0) {
      setAlambreSeleccionado(d.alambreSeleccionado || "");
    }

    if (d.terminalSeleccionada === "NO") {
      setTerminalSeleccionada("NO");
    } else if (terminalOptions.length > 0) {
      setTerminalSeleccionada(d.terminalSeleccionada || "");
    }
  }, [data, alambreOptions, terminalOptions]);
  //-----------------Html----------------------------------->>
  return (
    <>
      {/*inicio de los inputs */}
      <div className="form-container">
        <h1>Resortes</h1>

        <div className="form-row">
          <label>Cantidad: </label>
          <input
            type="number"
            value={cantidadResortes}
            onChange={(e) => setCantidadResortes(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>OHMS: </label>
          <input
            type="number"
            value={ohms}
            onChange={(e) => setohms(e.target.value)}
          />
        </div>

        <div className="form-row">
          <label>Tipo de alambre: </label>
          <select
            value={TipoAlambre}
            onChange={(e) => setTipoAlambre(e.target.value)}
          >
            <option value="">Selecciona</option>
            <option value="NICROMEL">NICROMEL</option>
            <option value="KANTHAL">KANTHAL</option>
          </select>
        </div>

        <div className="form-row">
          <label>Alambre del resorte: </label>
          {/*Aqui se ponen un selec de firebase cotizador/alambre_nicromel oalambre_kanthal_d */}
          <select
            value={alambreSeleccionado}
            onChange={(e) => setAlambreSeleccionado(e.target.value)}
            disabled={!TipoAlambre}
          >
            <option value="">Selecciona</option>
            {alambreOptions.map((op) => (
              <option key={op.id} value={op.id}>
                {op.tipo || op.id}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Terminales: </label>
          {/*Aqui se ponen un selec de firebase cotizador/terminales*/}
          <select
            value={terminalSeleccionada}
            onChange={(e) => setTerminalSeleccionada(e.target.value)}
          >
            <option value="">Selecciona</option>
            {terminalOptions.map((op) => (
              <option key={op.id} value={op.id}>
                {op.tipo || op.id}
              </option>
            ))}
          </select>
        </div>

        {mostrarCantidadTerminales && (
          <div className="form-row">
            <label>Cantidad de Terminales: </label>
            <input
              type="number"
              value={cantidadTerminales}
              onChange={(e) => setCantidadTerminales(e.target.value)}
            />
          </div>
        )}
        <div className="form-row checkbox-row">
        <label>Servicio Express (+30%):</label>
        <input
          type="checkbox"
          checked={servicioExpress}
          onChange={(e) => setServicioExpress(e.target.checked)}
        />
      </div>

        {/* DESCRIPCIÓN FORMATEADA PARA COPIAR */}
        <div className="form-row textarea-row full-width descripcion-row">
          <div className="descripcion-box">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <label className="descripcion-title">Descripción</label>

              <button
                type="button"
                title="Copiar descripción"
                onClick={() => navigator.clipboard.writeText(descripcion)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 4,
                }}
              >
                <FiCopy size={18} />
              </button>
            </div>

            <p className="descripcion-texto">{descripcion}</p>
          </div>
        </div>

          <h2>Subtotal: {formatearMoneda(totalGeneral)}</h2>
          <h1>Total: {formatearMoneda(totalGeneral * 1.16)}</h1>
          
          <button
              className="btn btn-blue"
        onClick={() => {
          onGuardar({
            id: data?.id || Date.now().toString(),
            tipo: "Resorte",
            descripcion,
            total: Number(totalGeneral.toFixed(2)),
            datos: {
              cantidadResortes,
              ohms,
              TipoAlambre,

              alambreSeleccionado,
              tipoAlambreSeleccionado: alambreActual?.tipo || "",
              precioAlambrePorMetro,

              resistenciaPorMetro,
              metrosNecesarios,
              costoAlambre,

              terminalSeleccionada,
              tipoTerminal: terminalActual?.tipo || "",
              cantidadTerminales,
              precioTerminal,
              costoTerminales,

              costoFabricacion,
              totalPorResorte,
              servicioExpress,
            },
          });

          // limpiar formulario
          setCantidadResortes("");
          setohms("");
          setTipoAlambre("");
          setAlambreSeleccionado("");
          setTerminalSeleccionada("");
          setCantidadTerminales("");
          setServicioExpress(false);

          setDirty(false);
        }}
      >
        {data ? "ACTUALIZAR" : "AGREGAR"}
      </button>

      
      {/*Fin de los inputs */}



          {/*Mostrar los resultados*/}
          {esAdministracion && (
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                marginTop: 15,
                background: "#f8f8f8",
                fontFamily: "monospace",
              }}
            >
              <h3>Variables de Resorte</h3>

              <p>
                <strong>Resistencia del alambre (ohms x metro):</strong>{" "}
                {resistenciaPorMetro.toFixed(4)} Ω/m
              </p>

              <p>
                <strong>Metros necesarios por resorte:</strong>{" "}
                {metrosNecesarios.toFixed(2)} m
              </p>

              <p>
                <strong>Precio por metro:</strong>{" "}
                {formatearMoneda(precioAlambrePorMetro)}
              </p>

              <p>
                <strong>Costo del alambre por resorte:</strong>{" "}
                {formatearMoneda(costoAlambre)}
              </p>

              {mostrarCantidadTerminales && (
                <p>
                  <strong>Terminales por resorte:</strong>{" "}
                  {cantidadTerminalesNum} × {formatearMoneda(precioTerminal)} ={" "}
                  {formatearMoneda(costoTerminales)}
                </p>
              )}

              <hr />

              <p>
                <strong>50% fabricación:</strong>{" "}
                {formatearMoneda(costoFabricacion)}
              </p>

              <p>
                <strong>Subtotal por resorte:</strong>{" "}
                {formatearMoneda(totalPorResorte)}
              </p>

              <hr />

              <p>
                <strong>Subtotal general:</strong>{" "}
                {formatearMoneda(totalGeneral)}
              </p>

              <p>
                <strong>Total + IVA:</strong>{" "}
                {formatearMoneda(totalGeneral * 1.16)}
              </p>
            </div>
          )}
          {/*Fin de todo el formulario con todo y botones de stock */}
          </div>
    </>
  );
};
export default Resorte;
