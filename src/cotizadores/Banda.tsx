// src/cotizadores/Banda.tsx
import React, { useState, useEffect } from "react";
import { calcularPrecio } from "../funciones/calculos";
import { tipoCable, termopar, tira } from "../datos/tipoCable";
import { ItemCotizado } from "../cotizador";

interface Props {
  data?: ItemCotizado;
  onGuardar: (item: ItemCotizado) => void;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

const Banda = ({ data, onGuardar, setDirty }: Props) => {
  const [diametro, setDiametro] = useState<number>(0);
  const [ancho, setAncho] = useState<number>(0);
  const [precio, setPrecio] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(0);
  const [selector, setSelector] = useState<number>(0);
  const [voltaje, setVoltaje] = useState<number>(0);
  const [potencia, setPotencia] = useState<number>(0);
  const [muestra, setMuestra] = useState("");

  const mostrarOpciones =
    cantidad > 0 &&
    (selector === 5 || (diametro > 0 && ancho > 0)) &&
    voltaje > 0 &&
    potencia > 0;

  // Checks
  const [barrilCincho, setBarrilCincho] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [barrenos, setBarrenos] = useState(false);
  const [fabricar440, setFabricar440] = useState(false);
  const [trifasica, setTrifasica] = useState(false);
  const [caja, setCaja] = useState(false);
  const [express, setExpress] = useState(false);
  const [excedente, setExcedente] = useState(false);
  const [servicioExpress, setServicioExpress] = useState(false);

  // Input numérico
  const [colocarCables, setColocarCables] = useState<number>(0);

  // ---- Cables ----
  const [usarCables, setUsarCables] = useState(false);
  const [tipoCableSeleccionado, setTipoCableSeleccionado] =
    useState<string>("");
  const [longitudCm, setLongitudCm] = useState<number>(0);

  //--- Barrenos
  const [numBarrenos, setNumBarrenos] = useState<number>(0);

  //--- Termopar
  const [usarTermopar, setUsarTermopar] = useState(false);
  const [tipoTermoparSeleccionado, setTipoTermoparSeleccionado] =
    useState<string>("");
  const [longitudTermoparCm, setLongitudTermoparCm] = useState<number>(0);

  //--- Tira
    const [longitudTiraCm, setLongitudTiraCm] = useState<number>(0);
    //Datos adicionales
    const [datosAdicionales, setDatosAdicionales] = useState("");

  useEffect(() => {
    if (data) {
      setDiametro(data.datos.diametro || 0);
      setAncho(data.datos.ancho || 0);
      setCantidad(data.datos.cantidad || 0);
      setVoltaje(data.datos.voltaje || 0);
      setPotencia(data.datos.potencia || 0);
      setSelector(data.datos.selector || 0);

      // Extras
      setBarrilCincho(data.datos.barrilCincho || false);
      setStuck(data.datos.stuck || false);
      setBarrenos(data.datos.barrenos || false);
      setNumBarrenos(data.datos.numBarrenos || 0);
      setFabricar440(data.datos.fabricar440 || false);
      setTrifasica(data.datos.trifasica || false);
      setCaja(data.datos.caja || false);
      setExpress(data.datos.express || false);
      setExcedente(data.datos.excedente || false);
      setServicioExpress(data.datos.servicioExpress || false);

      setUsarCables(data.datos.usarCables || false);
      setTipoCableSeleccionado(data.datos.tipoCableSeleccionado || "");
      setLongitudCm(data.datos.longitudCm || 0);

      setUsarTermopar(data.datos.usarTermopar || false);
      setTipoTermoparSeleccionado(data.datos.tipoTermoparSeleccionado || "");
      setLongitudTermoparCm(data.datos.longitudTermoparCm || 0);

      setLongitudTiraCm(data.datos.longitudTiraCm || 0);
        setMuestra(data.datos.muestra || "");
        setDatosAdicionales(data.datos.datosAdicionales || "");

    }
  }, [data]);
    useEffect(() => {
        if (voltaje >= 440) {
            setFabricar440(true);
        } else {
            setFabricar440(false);
        }
    }, [voltaje]);

  const calcularTotalBanda = () => {
    let resultado = 0;

    let diametroPulgadas = diametro / 2.54;
    const anchoPulgadas = ancho / 2.54;

    if (selector === 5) {
      const longitudPulgadas = longitudTiraCm / 2.54;
      const longitudRedondeada = Math.ceil(longitudPulgadas / 2) * 2;

      const precioTira = tira.find(
        (t) => t.longitud === longitudRedondeada
      )?.precio;

      if (!precioTira) return 0;

      resultado = precioTira * cantidad;
    } else {
      if (selector === 2) diametroPulgadas = (diametroPulgadas * 2) / Math.PI;
      if (selector === 3) diametroPulgadas = diametroPulgadas / Math.PI;

      resultado = calcularPrecio(diametroPulgadas, anchoPulgadas) ?? 0;
    }

    if (barrilCincho) resultado += 300;
    if (stuck) resultado += 80;
    if (caja) resultado += 70;
    if (barrenos && numBarrenos > 0) resultado += numBarrenos * 30;
    if (colocarCables > 0) resultado += colocarCables;

    if (usarCables && tipoCableSeleccionado && longitudCm > 0) {
      const cable = tipoCable.find((c) => c.nombre === tipoCableSeleccionado);
      if (cable) {
        const metros = Math.ceil(longitudCm / 100);
        resultado += cable.precio * metros;
      }
    }

    if (usarTermopar && tipoTermoparSeleccionado && longitudTermoparCm > 0) {
      const t = termopar.find((tp) => tp.nombre === tipoTermoparSeleccionado);
      if (t) {
        const metros = Math.ceil(longitudTermoparCm / 100);
        resultado += t.precio * metros;
      }
    }

    if (fabricar440) resultado *= 1.1;
    if (trifasica) resultado *= 1.2;
    if (express) resultado *= 1.3;
    if (excedente) resultado *= 1.25;
    if (selector !== 5) resultado *= cantidad ?? 1;

    if (cantidad >= 10 && cantidad < 20) resultado *= 0.95;
    else if (cantidad >= 20 && cantidad < 30) resultado *= 0.85;
    else if (cantidad >= 30 && cantidad < 40) resultado *= 0.8;
    else if (cantidad >= 40) resultado *= 0.75;

    if (servicioExpress) {
      resultado *= 1.3;
    }

    return resultado;
  };
  const precioCalculado = calcularTotalBanda();

  const resetForm = () => {
    // Principales
    setDiametro(0);
    setAncho(0);
    setPrecio(0);
    setCantidad(0);
    setSelector(0);
    setVoltaje(0);
    setPotencia(0);
    setMuestra("");

    // Checks
    setBarrilCincho(false);
    setStuck(false);
    setBarrenos(false);
    setFabricar440(false);
    setTrifasica(false);
    setCaja(false);
    setExpress(false);
    setExcedente(false);
    setServicioExpress(false);

    // Extras numéricos
    setColocarCables(0);
    setNumBarrenos(0);

    // Cables
    setUsarCables(false);
    setTipoCableSeleccionado("");
    setLongitudCm(0);

    // Termopar
    setUsarTermopar(false);
    setTipoTermoparSeleccionado("");
    setLongitudTermoparCm(0);

    // Tira
      setLongitudTiraCm(0);
      // Datos adicionales
      setDatosAdicionales("");
  };

  const agregar = (texto: string, condicion: boolean) => {
    return condicion ? ` / ${texto}` : "";
  };

  const tiposBanda: Record<number, string> = {
    1: "MICA",
    2: "SEMICURVA",
    3: "PLANA",
    4: "CERAMICA",
    5: "TIRA",
  };

  const tipoBandaTexto = tiposBanda[selector] || "";

  const descripcionBanda = `
${cantidad || 0} BANDA ${tipoBandaTexto || ""}
${agregar(`VOLTAJE: ${voltaje}V`, voltaje > 0)}
${agregar(`POTENCIA: ${potencia}W`, potencia > 0)}
${
  selector === 5
    ? agregar(`LONGITUD: ${longitudTiraCm} CM`, longitudTiraCm > 0)
    : agregar(`DIÁMETRO: ${diametro} CM`, diametro > 0)
}
${agregar(`ANCHO: ${ancho} CM`, ancho > 0)}
${agregar(`BARRIL Y CINCHO`, barrilCincho)}
${agregar(`STUCK`, stuck)}
${agregar(`BARRENOS O RESAQUES (${numBarrenos})`, barrenos && numBarrenos > 0)}
${agregar(
  `COLOCAR CABLES: ${tipoCableSeleccionado} (${longitudCm} CM)`,
  usarCables && !!tipoCableSeleccionado && longitudCm > 0
)}
${agregar(`FABRICAR A 440V`, fabricar440)}
${agregar(`TRIFASICA`, trifasica)}
${agregar(`CAJA`, caja)}
${agregar(
  `TERMOPAR: ${tipoTermoparSeleccionado} (${longitudTermoparCm} CM)`,
  usarTermopar && !!tipoTermoparSeleccionado && longitudTermoparCm > 0
)}
${agregar(`SERVICIO EXPRESS`, express)}
${agregar(`EXCEDENTE DE BANDA`, excedente)}
${agregar(`SERVICIO EXPRESS GENERAL`, servicioExpress)}
${agregar(`MUESTRA: ${muestra.toUpperCase()}`, !!muestra)}
${agregar(`DATOS ADICIONALES: ${datosAdicionales.toUpperCase()}`, !!datosAdicionales)}
`
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <div className="form-container">
      <h1>Banda</h1>

      <div className="form-row">
        <label>
          <strong>Cantidad:</strong>
        </label>
        <input
          type="number"
          value={cantidad === 0 ? "" : cantidad}
          onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="form-row">
        <label>
          <strong>Tipo:</strong>
        </label>
        <select
          value={selector}
          onChange={(e) => {
            const nuevoSelector = parseFloat(e.target.value);

            setSelector(nuevoSelector);

            if (nuevoSelector === 5) {
              setDiametro(0);
              setAncho(4);
            } else {
              setLongitudTiraCm(0);
            }

            setPrecio(0);
            setBarrilCincho(false);
            setStuck(false);
            setBarrenos(false);
            setFabricar440(false);
            setTrifasica(false);
            setCaja(false);
            setExpress(false);
            setExcedente(false);
            setServicioExpress(false);

            setColocarCables(0);
            setNumBarrenos(0);

            setUsarCables(false);
            setTipoCableSeleccionado("");
            setLongitudCm(0);

            setUsarTermopar(false);
            setTipoTermoparSeleccionado("");
            setLongitudTermoparCm(0);

              setMuestra("");
              setDatosAdicionales("");
          }}
        >
          <option value={0}>Seleccione...</option>
          <option value={1}>MICA</option>
          <option value={2}>SEMICURVA</option>
          <option value={3}>PLANA</option>
          <option value={4}>CERAMICA</option>
          <option value={5}>TIRA</option>
        </select>
      </div>

      {selector !== 5 && (
        <div className="form-row">
          <label>
            <strong>Diámetro (cm):</strong>
          </label>
          <input
            type="number"
            value={diametro === 0 ? "" : diametro}
            onChange={(e) => setDiametro(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      {selector === 5 ? (
        <>
          <div className="form-row">
            <label>
              <strong>Longitud (cm):</strong>
            </label>
            <input
              type="number"
              value={longitudTiraCm === 0 ? "" : longitudTiraCm}
              onChange={(e) =>
                setLongitudTiraCm(parseFloat(e.target.value) || 0)
              }
            />
          </div>

          <div className="form-row">
            <label>
              <strong>Ancho (cm):</strong>
            </label>
            <input type="number" value={4} disabled />
          </div>
        </>
      ) : (
        <div className="form-row">
          <label>
            <strong>Ancho (cm):</strong>
          </label>
          <input
            type="number"
            value={ancho === 0 ? "" : ancho}
            onChange={(e) => setAncho(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      <div className="form-row">
        <label>
          <strong>Voltaje (Volts):</strong>
        </label>
        <input
          type="number"
          value={voltaje === 0 ? "" : voltaje}
          onChange={(e) => setVoltaje(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="form-row">
        <label>
          <strong>Potencia (Watts):</strong>
        </label>
        <input
          type="number"
          value={potencia === 0 ? "" : potencia}
          onChange={(e) => setPotencia(parseFloat(e.target.value) || 0)}
        />
      </div>

      {mostrarOpciones && (
        <>
          <h3>Opciones adicionales</h3>

          <div className="form-row checkbox-row">
            <label>Barril y Cincho (+$300 + IVA)</label>
            <input
              type="checkbox"
              checked={barrilCincho}
              onChange={(e) => setBarrilCincho(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Stuck (+$80 + IVA)</label>
            <input
              type="checkbox"
              checked={stuck}
              onChange={(e) => setStuck(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Barrenos o Resaques (+$30 + IVA)</label>
            <input
              type="checkbox"
              checked={barrenos}
              onChange={(e) => setBarrenos(e.target.checked)}
            />
          </div>

          {barrenos && (
            <div className="form-row">
              <label>Número de barrenos</label>
              <input
                type="number"
                value={numBarrenos === 0 ? "" : numBarrenos}
                onChange={(e) =>
                  setNumBarrenos(parseFloat(e.target.value) || 0)
                }
              />
            </div>
          )}

          <div className="form-row checkbox-row">
            <label>Colocar Cables</label>
            <input
              type="checkbox"
              checked={usarCables}
              onChange={(e) => setUsarCables(e.target.checked)}
            />
          </div>

          {usarCables && (
            <>
              <div className="form-row">
                <label>Tipo de cable</label>
                <select
                  value={tipoCableSeleccionado}
                  onChange={(e) => setTipoCableSeleccionado(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {tipoCable.map((cable, index) => (
                    <option key={index} value={cable.nombre}>
                      {cable.nombre} (${cable.precio.toFixed(2)} / m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Longitud (cm)</label>
                <input
                  type="number"
                  value={longitudCm === 0 ? "" : longitudCm}
                  onChange={(e) =>
                    setLongitudCm(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </>
          )}

          <div className="form-row checkbox-row">
            <label>Fabricar a 440V (+10%)</label>
            <input
              type="checkbox"
              checked={fabricar440}
              disabled
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Trifasica (+20%)</label>
            <input
              type="checkbox"
              checked={trifasica}
              onChange={(e) => setTrifasica(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Caja ($70 + IVA)</label>
            <input
              type="checkbox"
              checked={caja}
              onChange={(e) => setCaja(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Termopar</label>
            <input
              type="checkbox"
              checked={usarTermopar}
              onChange={(e) => setUsarTermopar(e.target.checked)}
            />
          </div>

          {usarTermopar && (
            <>
              <div className="form-row">
                <label>Tipo de termopar</label>
                <select
                  value={tipoTermoparSeleccionado}
                  onChange={(e) => setTipoTermoparSeleccionado(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {termopar.map((t, index) => (
                    <option key={index} value={t.nombre}>
                      {t.nombre} (${t.precio.toFixed(2)} / m)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Longitud (cm)</label>
                <input
                  type="number"
                  value={longitudTermoparCm === 0 ? "" : longitudTermoparCm}
                  onChange={(e) =>
                    setLongitudTermoparCm(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </>
          )}

          <div className="form-row checkbox-row">
            <label>Servicio Express (+30%)</label>
            <input
              type="checkbox"
              checked={express}
              onChange={(e) => setExpress(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Excedente de Banda (+25%)</label>
            <input
              type="checkbox"
              checked={excedente}
              onChange={(e) => setExcedente(e.target.checked)}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Servicio Express</label>
            <input
              type="checkbox"
              checked={servicioExpress}
              onChange={() => setServicioExpress(!servicioExpress)}
            />
          </div>


        </>
          )}
          {/*hasta aqui lo de ocultar opciones*/}
          <div className="form-row">
              <label>Muestra</label>
              <select
                  value={muestra}
                  onChange={(e) => setMuestra(e.target.value)}
              >
                  <option value="">Seleccione...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
              </select>
          </div>
          {/* DATOS ADICIONALES */}
          <div className="form-row textarea-row">
              <label>Datos Adicionales: </label>
              <textarea
                  value={datosAdicionales}
                  onChange={(e) => setDatosAdicionales(e.target.value)}
                  placeholder="Ej. salida a 90°"
              />
          </div>

      <div className="form-row textarea-row full-width descripcion-row">
        <div className="descripcion-box">
          <label className="descripcion-title">Descripción</label>
          <p className="descripcion-texto">{descripcionBanda}</p>
        </div>
      </div>

      <h3 style={{ marginTop: "20px" }}>
        💰  Subtotal: ${precioCalculado.toFixed(2)} MXN
      </h3>

          <button
              className="btn btn-blue"
        onClick={() => {
          onGuardar({
            id: data?.id || Date.now().toString(),
            tipo: "banda",
            descripcion: descripcionBanda,
            total: Number(precioCalculado.toFixed(2)),
            datos: {
              diametro,
              ancho,
              cantidad,
              voltaje,
              potencia,
              selector,
              barrilCincho,
              stuck,
              barrenos,
              numBarrenos,
              fabricar440,
              trifasica,
              caja,
              express,
              excedente,
              servicioExpress,
              usarCables,
              tipoCableSeleccionado,
              longitudCm,
              usarTermopar,
              tipoTermoparSeleccionado,
              longitudTermoparCm,
              longitudTiraCm,
              muestra,
              datosAdicionales,
            },
          });

          resetForm();
          setDirty(false);
        }}
      >
        {data ? "ACTUALIZAR" : "AGREGAR"}
      </button>
    </div>
  );
};

export default Banda;
