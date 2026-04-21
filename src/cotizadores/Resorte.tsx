import React, { useState, useEffect } from "react";
import { ItemCotizado } from "../cotizador";
import { formatearMoneda } from "../funciones/formato_moneda";
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

  // total general
  const totalGeneral = totalPorResorte * cantidadResortesNum;
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
        <div className="form-row textarea-row full-width descripcion-row">
          <div className="descripcion-box">
            <label className="descripcion-title">Descripción</label>
            <p className="descripcion-texto">{descripcion}</p>
          </div>
        </div>
      </div>
      {/*Fin de los inputs */}

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
            },
          });

          // limpiar formulario
          setCantidadResortes("");
          setohms("");
          setTipoAlambre("");
          setAlambreSeleccionado("");
          setTerminalSeleccionada("");
          setCantidadTerminales("");

          setDirty(false);
        }}
      >
        {data ? "ACTUALIZAR" : "AGREGAR"}
          </button>
          <h2> <strong>Subtotal:</strong> ${formatearMoneda(totalGeneral)}</h2>
          <h1> <strong>Total:</strong> ${formatearMoneda(totalGeneral * 1.16)}</h1>
          {/*Mostrar los resultados*/}
          {esAdministracion && (
              <div style={{ marginTop: "20px" }}>


                  <h3>Resultados</h3>

                  <div>
                      <strong>Resistencia del alambre (ohms x metro):</strong>{" "}
                      {resistenciaPorMetro.toFixed(4)} Ω/m
                  </div>

                  <div>
                      <strong>Metros necesarios por resorte:</strong>{" "}
                      {metrosNecesarios.toFixed(2)} m
                  </div>

                  <div>
                      <strong>Precio por metro:</strong> ${formatearMoneda(precioAlambrePorMetro)}
                  </div>

                  <div>
                      <strong>Costo del alambre por resorte:</strong> $
                      ${formatearMoneda(costoAlambre)}
                  </div>

                  {mostrarCantidadTerminales && (
                      <div>
                          <strong>Terminales por resorte:</strong> {cantidadTerminalesNum} x $
                          {formatearMoneda(precioTerminal)} = ${formatearMoneda(costoTerminales)}
                      </div>
                  )}

                  <div>
                      <strong>50% fabricación:</strong> ${formatearMoneda(costoFabricacion)}
                  </div>

                  <div>
                      <strong>subtotal por resorte:</strong> ${formatearMoneda(totalPorResorte)}
                  </div>

                  <div>
                      <strong>subtotal general:</strong> ${formatearMoneda(totalGeneral)}
                  </div>
              </div>
          )}
    </>
  );
};
export default Resorte;
