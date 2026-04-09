//src/cotizadores/Tubular.totalExpress
import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
import { tablasPrecios, TipoResistencia } from "../datos/PrecioTipoResistencia";
import {
  obtenerDescuento,
  descuentosTubular,
} from "../datos/PrecioTipoResistencia";
import { ItemCotizado } from "../cotizador";

interface Props {
  data?: ItemCotizado;
  onGuardar: (item: ItemCotizado) => void;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

const Tubular = ({ data, onGuardar, setDirty }: Props) => {
  const [diametro, setDiametro] = useState<TipoResistencia | "">("");
  const [longitud, setLongitud] = useState<number>(0); //Longitud
  //const [soldarCable, setSoldarCable] = useState("");
  //const [cableParaSoldar, setCableParaSoldar] = useState("");
  const [tipoPlaca, setTipoPlaca] = useState("");
  const [precioPlaca, setPrecioPlaca] = useState(0);
  const [cantidadPlaca, setCantidadPlaca] = useState(0);
  const [desoldarTornillo, setDesoldarTornillo] = useState(false);
  const [termoposoBase, setTermoposoBase] = useState(false);
  const [cambiarTornillo, setCambiarTornillo] = useState(false);
  const totalPlaca = tipoPlaca ? precioPlaca * cantidadPlaca : 0;
  const [puentes, setPuentes] = useState(false);
  const [longitudCable, setLongitudCable] = useState(0);
  const [cantidadCable, setCantidadCable] = useState(0);
  const [cantidadDesoldar, setCantidadDesoldar] = useState(0);
  const [cantidadBarrenos, setCantidadBarrenos] = useState(0);
  const [servicioExpress, setServicioExpress] = useState(false);
  const [cantidadPuentes, setCantidadPuentes] = useState(0);
  const [cantidadTermoposo, setCantidadTermoposo] = useState(0);
  const [cantidadTapon, setCantidadTapon] = useState(0);
  const [cantidadResistencias, setCantidadResistencias] = useState(0);
  const [voltaje, setVoltaje] = useState<number>(0);
  const [potencia, setPotencia] = useState<number>(0);
    const [muestra, setMuestra] = useState(data?.datos?.muestra || "");
    const [mostrarDetalle, setMostrarDetalle] = useState(false);
    const [aleta, setAleta] = useState(false);
    const [datosAdicionales, setDatosAdicionales] = useState("");
  //-------------------------------------------------------------------------------->>
  const [catalogos, setCatalogos] = useState<any>({});
  const [seleccionados, setSeleccionados] = useState<any>({});
  useEffect(() => {
    const rutas = [
      "tornillo",
      "borne",
      "Diametro_de_tubo",
      "Aspecto de la resistencia",
      "desoldar_base",
      "dobleces",
      "soldadura_resistencia",
      "soldar_cable_resistencia",
      "cable_para_soldar",
      "tapones_macho",
      "barrenos",
      "sellos",
      "servicios",
    ];

    const cargarDatos = async () => {
      const nuevosCatalogos: any = {};

      for (const ruta of rutas) {
        const snapshot = await get(ref(db, `cotizador/${ruta}`));

        if (snapshot.exists()) {
          const data = snapshot.val();

          nuevosCatalogos[ruta] = Object.keys(data).map((key) => ({
            id: key,
            tipo: data[key].Tipo,
            precio: Number(data[key].Precio),
          }));
        }
      }

      setCatalogos(nuevosCatalogos);
    };

    cargarDatos();
  }, []);

  const renderSelect = (nombre: string) => (
    <select
      value={seleccionados[nombre]?.id || ""}
      onChange={(e) => {
        const id = e.target.value;

        const seleccionado = catalogos[nombre]?.find(
          (item: any) => item.id === id
        );

        setSeleccionados((prev: any) => ({
          ...prev,
          [nombre]: seleccionado || null,
        }));
      }}
    >
      <option value="">Seleccione...</option>

      {catalogos[nombre]?.map((item: any) => (
        <option key={item.id} value={item.id}>
          {item.tipo}
        </option>
      ))}
    </select>
  );
  //funcion para sacar el precio del tubo
  const obtenerPrecioPorCm = (tipo: TipoResistencia, cm: number): number => {
    const tabla = tablasPrecios[tipo];
    if (!tabla) return 0;

    const rango = tabla.find((r) => cm >= r.min && cm <= r.max);

    return rango ? rango.precio : 0;
  };
  //Calcular Aletada
  const calcularAletada = (cm: number) => {
    const longitud = Number(cm) || 0;
    const precio_aleta = 1300;
    if (longitud <= 100) return precio_aleta;
    return longitud * (precio_aleta / 100);
  };
  //variable que guarga el precio del tubo
    const totalTubo =
        diametro && longitud
            ? obtenerPrecioPorCm(diametro, longitud) * longitud
            : 0;
  //opciones para entrar a soldar cable
  const tipoSoldarCable = seleccionados["soldar_cable_resistencia"]?.tipo || "";

  const tipoCableParaSoldar = seleccionados["cable_para_soldar"]?.tipo || "";
  //Calcular el precio del cable
  // Este lo sacas de tu select (precio del cable)
  const precioCable = seleccionados["cable_para_soldar"]?.precio ?? 0;

  const calcularPrecioCable = (
    longitudCm: number,
    cantidad: number,
    precioMetro: number
  ) => {
    if (!longitudCm || !cantidad || !precioMetro) return 0;

    const totalMetros = (longitudCm * cantidad) / 100;
    return totalMetros * precioMetro;
  };
  // Guarda el precio del cable en variable
  const totalCable =
    tipoSoldarCable !== "NO" &&
    tipoSoldarCable !== "" &&
    tipoCableParaSoldar !== "NO" &&
    tipoCableParaSoldar !== ""
      ? calcularPrecioCable(longitudCable, cantidadCable, precioCable)
      : 0;
  //calcular desoldar tornillo (variable)
  const totalDesoldartornillo = desoldarTornillo
    ? (Number(cantidadDesoldar) || 0) * 100
    : 0;
  //Calcular barrenos
  const tipoBarrenos = seleccionados["barrenos"]?.tipo || "";
  const precioBarrenos = seleccionados["barrenos"]?.precio ?? 0;
  const totalBarrenos =
    tipoBarrenos !== "NO" && tipoBarrenos !== ""
      ? (Number(cantidadBarrenos) || 0) * (Number(precioBarrenos) || 0)
      : 0;
  //Servicio express
  const totalExpress = servicioExpress ? 1.3 : 0;
  //Precio puentes
  const totalPuentes = puentes ? (Number(cantidadPuentes) || 0) * 40 : 0;
  //Precio del termoposo
  const totalTermoposo = termoposoBase
    ? (Number(cantidadTermoposo) || 0) * 200
    : 0;
  //Tapones macho calcular el precio por cantidad
  const tipoTapon = seleccionados["tapones_macho"]?.tipo || "";
  const precioTapon = seleccionados["tapones_macho"]?.precio ?? 0;
  const totalTapon =
    tipoTapon !== "NO" && tipoTapon !== ""
      ? (Number(cantidadTapon) || 0) * (Number(precioTapon) || 0)
            : 0;

    //Calcular aletada por metros
    const totalAleta = aleta ? calcularAletada(longitud) : 0;
  //---------------------------TOTAL------------------------------------->>

  const precioBorne = Number(seleccionados["borne"]?.precio) || 0;
  const precioDobleces = Number(seleccionados["dobleces"]?.precio) || 0;
  const precioTornillo = Number(seleccionados["tornillo"]?.precio) || 0;
  const precioSoldadura =
    Number(seleccionados["soldadura_resistencia"]?.precio) || 0;
  const precioDesoldarbase =
    Number(seleccionados["desoldar_base"]?.precio) || 0;
  const precioSello = Number(seleccionados["sellos"]?.precio) || 0;
  const precioServicios = Number(seleccionados["servicios"]?.precio) || 0;
  const descuento = obtenerDescuento(cantidadResistencias, descuentosTubular);
  let totalResistencia =
    Number(cantidadResistencias) *
      (Number(totalTubo) + precioBorne + precioDobleces + precioTornillo + totalAleta ) +
    precioSoldadura +
    precioDesoldarbase +
    totalCable +
    totalDesoldartornillo +
    totalTapon +
    totalBarrenos +
    totalTermoposo +
    totalPlaca +
    totalPuentes +
      precioSello +
    precioServicios;
  // aplicar descuento
  const totalConDescuento = totalResistencia * (1 - descuento);
  let totalconiva = totalConDescuento * 1.16;
  if (servicioExpress) {
    totalconiva = totalconiva * totalExpress;
  }

  //FUNCION RESET
  const resetForm = () => {
    setDiametro("");
    setLongitud(0);
    setCantidadResistencias(0);
    setVoltaje(0);
    setPotencia(0);

    setSeleccionados({});

    setLongitudCable(0);
    setCantidadCable(0);

    setCantidadDesoldar(0);
    setCantidadBarrenos(0);
    setCantidadPuentes(0);
    setCantidadTermoposo(0);
    setCantidadTapon(0);

    setTipoPlaca("");
    setPrecioPlaca(0);
    setCantidadPlaca(0);

      setServicioExpress(false);
      setAleta(false);
    setDesoldarTornillo(false);
    setPuentes(false);
    setTermoposoBase(false);
      setMuestra("");
      setDatosAdicionales("");
  };

  //descripcion

  const textoDobleces = (() => {
    const tipo = seleccionados["dobleces"]?.tipo;
    if (!tipo || tipo === "NO") return "";

    const numero = parseInt(tipo);
    if (!numero) return tipo;

    return numero === 1 ? "1 DOBLEZ" : `${numero} DOBLECES`;
  })();
  const agregar = (label: string, valor: any) => {
    if (!valor || valor === "NO") return "";
    return ` / ${label}: ${valor}`;
  };

  const agregarCantidad = (label: string, valor: any, cantidad: number) => {
    if (!valor || valor === "NO") return "";
    return ` / ${label}: ${valor}${cantidad ? ` (${cantidad})` : ""}`;
  };

    const descripcion = `
  ${cantidadResistencias || 0} RESISTENCIA ${diametro || ""} DE ${longitud || 0
        } CM
  / ${voltaje || 0}V - ${potencia || 0}W
  / TUBO: ${diametro || ""}

  ${aleta ? " / CON ALETA" : ""}
  
  ${textoDobleces ? `/ ${textoDobleces}` : ""}
  
  ${agregar("TORNILLO", seleccionados["tornillo"]?.tipo)}
  ${agregar("DESOLDAR BASE", seleccionados["desoldar_base"]?.tipo)}
  ${agregar("SOLDADURA", seleccionados["soldadura_resistencia"]?.tipo)}
  ${agregar("BORNE", seleccionados["borne"]?.tipo)}
  
  ${agregar("SOLDAR CABLE", tipoSoldarCable)}
  ${agregarCantidad("CABLE", tipoCableParaSoldar, cantidadCable)}
  ${cantidadCable && longitudCable
            ? ` / LONGITUD CABLE: ${longitudCable} CM`
            : ""
        }
  
  ${desoldarTornillo && cantidadDesoldar
            ? ` / DESOLDAR TORNILLO (${cantidadDesoldar})`
            : ""
        }
  
  ${agregarCantidad("TAPÓN", tipoTapon, cantidadTapon)}
  ${agregarCantidad("BARRENOS", tipoBarrenos, cantidadBarrenos)}
  
  ${termoposoBase ? ` / TERMOPOSO (${cantidadTermoposo})` : ""}
  
  ${tipoPlaca ? ` / ${tipoPlaca.toUpperCase()} (${cantidadPlaca})` : ""}
  
  ${puentes ? ` / PUENTES (${cantidadPuentes})` : ""}
  
  ${agregar("SELLOS", seleccionados["sellos"]?.tipo)}
  ${agregar("SERVICIOS", seleccionados["servicios"]?.tipo)}
  
  ${servicioExpress ? " / SERVICIO EXPRESS" : ""}
  ${muestra === "si" ? ` / DEJO MUESTRA` : ""}
  ${datosAdicionales ? ` / DATOS ADICIONALES: ${datosAdicionales}` : ""}
`
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
  //----------------------useEffect-----------------------------------
  // Reset cable
  useEffect(() => {
    if (tipoSoldarCable === "NO" || tipoSoldarCable === "") {
      setLongitudCable(0);
      setCantidadCable(0);
    }
  }, [tipoSoldarCable]);

  // Reset desoldar
  useEffect(() => {
    if (!desoldarTornillo) {
      setCantidadDesoldar(0);
    }
  }, [desoldarTornillo]);
  //Reset barrenos
  useEffect(() => {
    if (tipoBarrenos === "NO" || tipoBarrenos === "") {
      setCantidadBarrenos(0);
    }
  }, [tipoBarrenos]);

  useEffect(() => {
    if (!puentes) {
      setCantidadPuentes(0);
    }
  }, [puentes]);

  useEffect(() => {
    if (!termoposoBase) {
      setCantidadTermoposo(0);
    }
  }, [termoposoBase]);

  useEffect(() => {
    if (tipoTapon === "NO" || tipoTapon === "") {
      setCantidadTapon(0);
    }
  }, [tipoTapon]);
  //RESET
  useEffect(() => {
    if (data) {
      const d = data.datos;

      // 🔹 básicos
      setDiametro(d.diametro || "");
      setLongitud(d.longitud || 0);
      setCantidadResistencias(d.cantidadResistencias || 0);
      setVoltaje(d.voltaje || 0);
      setPotencia(d.potencia || 0);

      // 🔹 seleccionados
      setSeleccionados(d.seleccionados || {});

      // 🔹 cables (INPUTS, no totales)
      setLongitudCable(d.longitudCable || 0);
      setCantidadCable(d.cantidadCable || 0);

        // 🔹 flags
        setAleta(!!d.aleta);
      setDesoldarTornillo(!!d.totalDesoldartornillo);
      setPuentes(!!d.totalPuentes);
      setTermoposoBase(!!d.totalTermoposo);
      setServicioExpress(!!d.totalExpress);

      // 🔹 placa
      setTipoPlaca(d.tipoPlaca || "");
        setMuestra(data.datos?.muestra || "");
        setDatosAdicionales(d.datosAdicionales || "");
    }
  }, [data]);
  //-----------------------log---------------------

  console.log("Cable seleccionado:", seleccionados["cable_para_soldar"]);
  console.log("Precio cable:", precioCable);
  console.log("Longitud:", longitudCable);
  console.log("Cantidad:", cantidadCable);
  console.log("TotalCable:", totalCable);
  //---------------------------HTML------------------------------------
  return (
    <>
      <div className="form-container">
        <div>
          <h1>Tubular</h1>
        </div>

        <div>
          {/* Número de resistencias */}
          <div className="form-row">
            <label>Número de resistencias</label>
            <input
              type="number"
              min={0}
              value={cantidadResistencias === 0 ? "" : cantidadResistencias}
              onChange={(e) => setCantidadResistencias(Number(e.target.value))}
            />
          </div>

          {/* Voltaje */}
          <div className="form-row">
            <label>Voltaje</label>
            <input
              type="number"
              value={voltaje === 0 ? "" : voltaje}
              onChange={(e) => setVoltaje(Number(e.target.value))}
            />
          </div>

          {/* Potencia */}
          <div className="form-row">
            <label>Potencia</label>
            <input
              type="number"
              value={potencia === 0 ? "" : potencia}
              onChange={(e) => setPotencia(Number(e.target.value))}
            />
          </div>

          {/* Longitud */}
          <div className="form-row">
            <label>Longitud (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={longitud === 0 ? "" : longitud}
              onChange={(e) => setLongitud(Number(e.target.value))}
            />
          </div>

          {/* Aspecto Resistencia 
    <div>
      <label>Aspecto Resistencia</label>
      {renderSelect("Aspecto de la resistencia")}
    </div>
    */}

          {/* Diámetro Tubo */}
          <div className="form-row">
            <label>Diámetro Tubo</label>
            <select
              value={diametro}
              onChange={(e) => setDiametro(e.target.value as TipoResistencia)}
            >
              <option value="">Seleccione...</option>
              <option value="5/16 tp 304">5/16 tp 304</option>
              <option value="5/16 tp 316">5/16 tp 316</option>
              <option value="5/16 tp 304 circunferencial">
                5/16 tp 304 circunferencial
              </option>
              <option value="5/16 tp 316 circunferencial">
                5/16 tp 316 circunferencial
              </option>
              <option value="7/16 tp 304">7/16 tp 304</option>
              <option value="7/16 tp 316">7/16 tp 316</option>
              <option value="7/16 tp 304 circunferencial">
                7/16 tp 304 circunferencial
              </option>
              <option value="7/16 tp 316 circunferencial">
                7/16 tp 316 circunferencial
              </option>
              <option value="5/16 cobre">5/16 cobre</option>
              <option value="7/16 cobre">7/16 cobre</option>
            </select>
          </div>
          {/* Borne */}
          <div className="form-row">
            <label>Borne</label>
            {renderSelect("borne")}
          </div>
          {/* Dobleces */}
          <div className="form-row">
            <label>Dobleces</label>
            {renderSelect("dobleces")}
          </div>

          {/* Tornillo */}
          <div className="form-row">
            <label>Tornillo</label>
            {renderSelect("tornillo")}
          </div>

          {/* Desoldar Resistencia de Base */}
          <div className="form-row">
            <label>Desoldar Resistencia de Base</label>
            {renderSelect("desoldar_base")}
          </div>

          {/* --------------------------------------------------------------------------------------------------------------------------------------------*/}

          {/* Soldadura en resistencia */}
          <div className="form-row">
            <label>Soldadura en resistencia</label>
            {renderSelect("soldadura_resistencia")}
          </div>

          {/* Soldar cable en resistencia */}
          <div className="form-row">
            <label>Soldar cable en resistencia</label>
            {renderSelect("soldar_cable_resistencia")}
          </div>

          {/* Cable para soldar */}
          {tipoSoldarCable !== "NO" && tipoSoldarCable !== "" && (
            <div className="form-row">
              <label>Cable para soldar</label>
              {renderSelect("cable_para_soldar")}
            </div>
          )}

          {/* Longitud y cantidad de cable */}
          {tipoSoldarCable !== "NO" &&
            tipoSoldarCable !== "" &&
            tipoCableParaSoldar &&
            tipoCableParaSoldar !== "NO" && (
              <>
                <div className="form-row">
                  <label>Longitud de cable para soldar</label>
                  <input
                type="number"
                value={longitudCable === 0 ? "" : longitudCable}
                    onChange={(e) => setLongitudCable(Number(e.target.value))}
                  />
                </div>

                <div className="form-row">
                  <label>Cantidad de cables</label>
                  <input
                  type="number"
                  value={cantidadCable === 0 ? "" : cantidadCable}
                    onChange={(e) => setCantidadCable(Number(e.target.value))}
                  />
                </div>
              </>
            )}

          {/* Desoldar resistencia de tornillo */}
          <div className="form-row checkbox-row">
            <label>Desoldar resistencia de tornillo</label>
            <input
              type="checkbox"
              checked={desoldarTornillo}
              onChange={() => setDesoldarTornillo(!desoldarTornillo)}
            />
          </div>

          {/* Cantidad de resistencias a desoldar */}
          {desoldarTornillo && (
            <div className="form-row">
              <label>Cantidad de resistencias a desoldar</label>
              <input
                type="number"
                onChange={(e) => setCantidadDesoldar(Number(e.target.value))}
              />
            </div>
          )}

          {/* Tapon macho */}
          <div className="form-row">
            <label>Tapon macho</label>
            {renderSelect("tapones_macho")}
          </div>

          {tipoTapon !== "NO" && tipoTapon !== "" && (
            <div className="form-row">
              <label>Cantidad de tapones</label>
              <input
                type="number"
                onChange={(e) => setCantidadTapon(Number(e.target.value))}
              />
            </div>
          )}

          {/* Barrenos */}
          <div className="form-row">
            <label>Barrenos</label>
            {renderSelect("barrenos")}
          </div>

          {tipoBarrenos !== "NO" && tipoBarrenos !== "" && (
            <div className="form-row">
              <label>Cantidad de barrenados</label>
              <input
                type="number"
                onChange={(e) => setCantidadBarrenos(Number(e.target.value))}
              />
            </div>
          )}

          {/* Termoposo en Base */}
          <div className="form-row checkbox-row">
            <label>Termoposo en Base</label>
            <input
              type="checkbox"
              checked={termoposoBase}
              onChange={() => setTermoposoBase(!termoposoBase)}
            />
          </div>

          {/* Cantidad de termoposos */}
          {termoposoBase && (
            <div className="form-row">
              <label>Cantidad de termoposos</label>
              <input
                type="number"
                onChange={(e) => setCantidadTermoposo(Number(e.target.value))}
              />
            </div>
          )}

          {/* Placa / Base / Brida */}
          <div className="form-row">
            <label>Placa / Base / Brida</label>
            <select
              onChange={(e) => {
                setTipoPlaca(e.target.value);
                setPrecioPlaca(0);
                setCantidadPlaca(0);
              }}
            >
              <option value="">Seleccione...</option>
              <option value="Placa">Placa</option>
              <option value="Base">Base</option>
              <option value="Brida">Brida</option>
            </select>
          </div>

          {tipoPlaca !== "" && (
            <>
              <div className="form-row">
                <label>Precio ({tipoPlaca})</label>
                <input
                  type="number"
                  onChange={(e) => setPrecioPlaca(Number(e.target.value))}
                />
              </div>

              <div className="form-row">
                <label>Cantidad ({tipoPlaca})</label>
                <input
                  type="number"
                  onChange={(e) => setCantidadPlaca(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {/* Cantidad de tornillos */}
          {cambiarTornillo && (
            <div className="form-row">
              <label>Cantidad de tornillos</label>
              <input type="number" />
            </div>
          )}

          {/* Puentes */}
          <div className="form-row checkbox-row">
            <label>Puentes</label>
            <input
              type="checkbox"
              checked={puentes}
              onChange={() => setPuentes(!puentes)}
            />
          </div>

          {/* Cantidad de puentes */}
          {puentes && (
            <div className="form-row">
              <label>Cantidad de puentes</label>
              <input
                type="number"
                onChange={(e) => setCantidadPuentes(Number(e.target.value))}
              />
            </div>
          )}

          {/* Sellos */}
          <div className="form-row">
            <label>Sellos</label>
            {renderSelect("sellos")}
                  </div>
        {/* Aleta */}
        <div className="form-row checkbox-row">
            <label>Aleta (según longitud)</label>
            <input
                type="checkbox"
                checked={aleta}
                onChange={() => setAleta(!aleta)}
            />
        </div>
          {/* Otros Servicios */}
          <div className="form-row">
            <label>Otros Servicios</label>
            {renderSelect("servicios")}
          </div>

          {/* Servicio Express */}
          <div className="form-row checkbox-row">
            <label>Servicio Express</label>
            <input
              type="checkbox"
              checked={servicioExpress}
              onChange={() => setServicioExpress(!servicioExpress)}
            />
          </div>


            {/* MUESTRA */}
            <div className="form-row">
              <label>Muestra </label>
              <select
                value={muestra}
                onChange={(e) => {
                  setMuestra(e.target.value);
                }}
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

          {/* DERECHA (DESCRIPCIÓN) */}

          <div className="form-row textarea-row full-width descripcion-row">
            <div className="descripcion-box">
              <label className="descripcion-title">Descripción</label>
              <p className="descripcion-texto">{descripcion}</p>
            </div>
          </div>

          {/* ---------------------------------------------Fin del DIV de cotizador-------------------------------------------------------------->> */}
              </div>
              <h2>Subtotal Tubular: $ {totalConDescuento.toFixed(2)}</h2>
              <h1>Total: $ {totalconiva.toFixed(2)}</h1>
              {/*<h3>Descuento aplicado: {(descuento * 100).toFixed(0)}%</h3>*/}
              <button
                  className="btn btn-blue"
                  onClick={() => {
                      onGuardar({
                          id: data?.id || Date.now().toString(),
                          tipo: "tubular",
                          descripcion: descripcion,
                          //totalConDescuento PORQUE EL IVA SE CALCULA EN EL RESUMEN DE ORDENES DE TRABAJO, cotizador.tsx
                          total: Number(totalConDescuento.toFixed(2)),
                          datos: {
                              // 🔹 básicos
                              diametro,
                              longitud,
                              cantidadResistencias,
                              voltaje,
                              potencia,

                              // 🔹 selección
                              seleccionados,

                              // 🔹 cables
                              tipoSoldarCable,
                              longitudCable,
                              cantidadCable,
                              totalCable,

                              // 🔹 extras
                              totalDesoldartornillo,
                              totalTapon,
                              totalBarrenos,
                              totalTermoposo,
                              totalPlaca,
                              tipoPlaca,
                              totalPuentes,

                              aleta,
                              totalAleta,

                              // 🔹 otros
                              totalExpress,
                              totalTubo,
                              muestra,
                              datosAdicionales,
                          },
                      });
                      resetForm();
                      setDirty(false);
                  }}
              >
                  {data ? "ACTUALIZAR" : "AGREGAR"}
              </button >
      </div>
      {/* -------------------------------------------------------------------------------------------------------------->> */}

    

          {/* -------------------------------------------------------VARIABLES CUADRO----------------------------------------------------->> */}
          <div style={{ marginBottom: 10 }}>
              <label style={{ cursor: "pointer", fontWeight: "bold" }}>
                  <input
                      type="checkbox"
                      checked={mostrarDetalle}
                      onChange={(e) => setMostrarDetalle(e.target.checked)}
                      style={{ marginRight: 8 }}
                  />
                  Mostrar detalle técnico
              </label>
          </div>
          {mostrarDetalle && (
              <h3>
                  Voltaje: {voltaje || "--"}V
                  <br />
                  Potencia: {potencia || "--"}W
                  <br />
                  Cantidad de resistencias: {cantidadResistencias || "--"}
                  <br />
                  Total Tubular: {totalTubo ? `$ ${totalTubo.toFixed(2)}` : "--"}
                  <br />
                  Precio por cm:{" "}
                  {diametro ? obtenerPrecioPorCm(diametro, longitud) : "--"}
                  <br />
                  Tornillo: {seleccionados["tornillo"]?.precio ?? "--"}
                  <br />
                  Borne: {seleccionados["borne"]?.precio ?? "--"}
                  <br />
                  Desoldar de base: {seleccionados["desoldar_base"]?.precio ?? "--"}
                  <br />
                  Dobleces: {seleccionados["dobleces"]?.precio ?? "--"}
                  <br />
                  Soldadura en resistencia:{" "}
                  {seleccionados["soldadura_resistencia"]?.precio ?? "--"}
                  <br />
                  Soldar cable: {tipoSoldarCable || "--"}
                  <br />
                  Total cable: {totalCable ? `$ ${totalCable.toFixed(2)}` : "--"}
                  <br />
                  Desoldar tornillo:{" "}
                  {totalDesoldartornillo ? `$ ${totalDesoldartornillo}` : "--"}
                  <br />
                  Tapon macho: {totalTapon ? `$ ${totalTapon}` : "--"}
                  <br />
                  Barrenos: {totalBarrenos ? `$ ${totalBarrenos}` : "--"}
                  <br />
                  Termoposo: {totalTermoposo ? `$ ${totalTermoposo}` : "--"}
                  <br />
                  Tipo{tipoPlaca}: {totalPlaca ? `$ ${totalPlaca.toFixed(2)}` : "--"}
                  <br />
                  Puentes: {totalPuentes ? `$ ${totalPuentes}` : "--"}
                  <br />
                  Sello: {seleccionados["sellos"]?.precio ?? "--"}
                  <br />
                  Aleta: {totalAleta ? `$ ${totalAleta.toFixed(2)}` : "--"}
                  <br />
                  Otros Servicios: {seleccionados["servicios"]?.precio ?? "--"}
                  <br />
                  Servicio express: % {totalExpress.toFixed(2)}
              </h3>
          )}
          {/* --------------------------------------------FIN DE CUADRO VARIABLES------------------------------------------------------------------>> */}
    </>
  );
};

export default Tubular;
