//src/cotizadores/Tubular.totalExpress
import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase/config";
import { tablasPrecios, TipoResistencia } from "../datos/PrecioTipoResistencia";
import { resistenciasStock } from "../datos/resistencias_stock";
import { formatearMoneda, procesarInputMoneda } from "../funciones/formato_moneda";
import {obtenerDescuento, descuentosTubular} from "../datos/PrecioTipoResistencia";
import ProductosExtras, {ProductoExtra} from "./ProductosExtras";
import { ItemCotizado } from "../cotizador";
import { FiCopy } from "react-icons/fi";

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

const Tubular = ({ data, onGuardar, setDirty, perfil }: Props) => {
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
  const [cantidadDesoldarBase, setCantidadDesoldarBase] = useState(0);
  const [cantidadSellos, setCantidadSellos] = useState(0);
  const [voltaje, setVoltaje] = useState<number>(0);
    const [potencia, setPotencia] = useState<number>(0);
    const [maxWatts, setMaxWatts] = useState(!!data?.datos?.maxWatts);
    const [sacarWatts, setSacarWatts] = useState(!!data?.datos?.sacarWatts);
    const [muestra, setMuestra] = useState(data?.datos?.muestra || "");
    const [mostrarDetalle, setMostrarDetalle] = useState(false);
    const [aleta, setAleta] = useState(false);
    const [datosAdicionales, setDatosAdicionales] = useState("");
    const [extrasActivos, setExtrasActivos] = useState(false);
const [productosExtras, setProductosExtras] = useState<ProductoExtra[]>([]);
    const esAdministracion = perfil?.area === "Administración";
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
// Función para cargar datos de Firebase
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
// Función para renderizar un select genérico
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
  /*
  ======================================================================  
 ZONA DE CALCULOS PARA TUBULAR
  ======================================================================
  */
  const obtenerPrecioPorCm = (tipo: TipoResistencia, cm: number): number => {
    const tabla = tablasPrecios[tipo];
    if (!tabla) return 0;

    const rango = tabla.find((r) => cm >= r.min && cm <= r.max);

    return rango ? rango.precio : 0;
  };
  //Calcular Aletada
const calcularAletada = (cm: number) => {
  const longitud = Number(cm) || 0;
  const precioPorCm = 13; // $1300 / 100 cm

  if (longitud <= 0) return 0;

  // 50 cm o menos se cobra como 50 cm
  if (longitud <= 50) return 50 * precioPorCm;

  // Más de 50 cm se cobra por longitud real
  return longitud * precioPorCm;
};
// Verificar si se puede usar aleta según el diámetro
const puedeUsarAleta =
  diametro === "7/16 tp 304" ||
  diametro === "7/16 tp 316";
  // La aleta solo se puede usar para ciertos diámetros, pero el precio solo cambia para 7/16, así que se cobra aletada solo si es 7/16 y el checkbox está activo
const esAletada716 = aleta &&(diametro === "7/16 tp 304" || diametro === "7/16 tp 316");
  //variable que guarga el precio del tubo
const totalTubo =
  diametro && longitud
    ? esAletada716
      ? calcularAletada(longitud)
      : obtenerPrecioPorCm(diametro, longitud) * longitud
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
    //caclula desoldar base con cantidad

    //Calcular aletada por metros
    const totalAleta = esAletada716 ? calcularAletada(longitud) : 0;
// Total productos extras
const totalProductosExtras = productosExtras.reduce(
  (acc, item) =>
    acc + (Number(item.cantidad) || 0) * (Number(item.precio) || 0),
  0
);
  //---------------------------TOTAL------------------------------------->>

  const precioBorne = Number(seleccionados["borne"]?.precio) || 0;
  const precioDobleces = Number(seleccionados["dobleces"]?.precio) || 0;
  const precioTornillo = Number(seleccionados["tornillo"]?.precio) || 0;
  const precioSoldadura =
    Number(seleccionados["soldadura_resistencia"]?.precio) || 0;
    
    const precioSello = Number(seleccionados["sellos"]?.precio) || 0;

    const totalSellos =
        seleccionados["sellos"]?.tipo &&
            seleccionados["sellos"]?.tipo !== "NO"
            ? (Number(cantidadSellos) || 0) * precioSello
            : 0;

  const precioServicios = Number(seleccionados["servicios"]?.precio) || 0;
    const descuento = obtenerDescuento(cantidadResistencias, descuentosTubular);
    const tipoDesoldarBase = seleccionados["desoldar_base"]?.tipo || "";
    const precioDesoldarbase = Number(seleccionados["desoldar_base"]?.precio) || 0;
    const totalDesoldarBase =
        tipoDesoldarBase !== "NO" && tipoDesoldarBase !== ""
            ? precioDesoldarbase * (Number(cantidadDesoldarBase) || 0)
            : 0;
  let totalResistencia =
    Number(cantidadResistencias) *
      (Number(totalTubo) + precioBorne + precioDobleces + precioTornillo +  precioSoldadura ) +
      //precioSoldadura+ <-- LO QUITE POR MIENTRAS
     totalDesoldarBase +
    totalCable +
    totalDesoldartornillo +
    totalTapon +
    totalBarrenos +
    totalTermoposo +
    totalPlaca +
    totalPuentes +
    totalSellos +
    precioServicios+
    totalProductosExtras;
  // aplicar descuento
    let totalConDescuento = totalResistencia * (1 - descuento);
    if (servicioExpress) {
        totalConDescuento = totalConDescuento * totalExpress;
    }
  let totalconiva = totalConDescuento * 1.16;

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
    setCantidadSellos(0);
    setCantidadDesoldar(0);
    setCantidadBarrenos(0);
    setCantidadPuentes(0);
    setCantidadTermoposo(0);
    setCantidadTapon(0);

    setTipoPlaca("");
    setPrecioPlaca(0);
    setCantidadPlaca(0);
      setCantidadDesoldarBase(0);
      setServicioExpress(false);
      setAleta(false);
    setDesoldarTornillo(false);
    setPuentes(false);
    setTermoposoBase(false);
      setMuestra("");
      setDatosAdicionales("");
      setMaxWatts(false);
      setSacarWatts(false);
      setExtrasActivos(false);
      setProductosExtras([]);
  };

  /*
  ======================================================================  
 DESCRIPCIÓN DINÁMICA PARA TUBULAR
  ======================================================================
  */

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
  /  ${voltaje || 0}V - ${maxWatts ? "MAX WATTS" : sacarWatts ? "SACAR WATTS" : `${potencia || 0}W`}

  ${aleta ? " / CON ALETA" : ""}
  
  ${textoDobleces ? `/ ${textoDobleces}` : ""}
  
  ${agregar("TORNILLO", seleccionados["tornillo"]?.tipo)}
  ${tipoDesoldarBase && tipoDesoldarBase !== "NO"
            ? ` / DESOLDAR BASE: ${tipoDesoldarBase}${cantidadDesoldarBase ? ` (${cantidadDesoldarBase})` : ""
            }`
            : ""}
  ${agregar("", seleccionados["soldadura_resistencia"]?.tipo)}
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
  
 ${agregarCantidad("SELLOS", seleccionados["sellos"]?.tipo, cantidadSellos)}
  ${agregar("SERVICIOS", seleccionados["servicios"]?.tipo)}
  ${productosExtras.length > 0
  ? productosExtras
      .map(
        (item) =>
          ` / EXTRA: ${item.descripcion} (${item.cantidad})`
      )
      .join("")
  : ""}
  
  ${servicioExpress ? " / SERVICIO EXPRESS" : ""}
  ${muestra === "si" ? ` / DEJO MUESTRA` : ""}
  ${datosAdicionales ? ` / DATOS ADICIONALES: ${datosAdicionales}` : ""}
`
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    //----------------------useEffect-----------------------------------
    //max potencia
    useEffect(() => {
        if (maxWatts) setSacarWatts(false);
    }, [maxWatts]);
    //sacar watts
    useEffect(() => {
        if (sacarWatts) setMaxWatts(false);
    }, [sacarWatts]);
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

    useEffect(() => {
        if (tipoDesoldarBase === "NO" || tipoDesoldarBase === "") {
            setCantidadDesoldarBase(0);
        }
    }, [tipoDesoldarBase]);

    useEffect(() => {
        if (!seleccionados["sellos"] || seleccionados["sellos"]?.tipo === "NO") {
            setCantidadSellos(0);
        }
    }, [seleccionados["sellos"]]);

    useEffect(() => {
  if (!puedeUsarAleta) {
    setAleta(false);
  }
}, [diametro]);

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
    setMaxWatts(!!d.maxWatts);
    setSacarWatts(!!d.sacarWatts);
      // 🔹 seleccionados
      setSeleccionados(d.seleccionados || {});

      // 🔹 cables (INPUTS, no totales)
      setLongitudCable(d.longitudCable || 0);
      setCantidadCable(d.cantidadCable || 0);

        // 🔹 flags
        setAleta(!!d.aleta);
        setDesoldarTornillo(!!d.totalDesoldartornillo);
        setCantidadDesoldarBase(d.cantidadDesoldarBase || 0);
        setPuentes(!!d.totalPuentes);
        setTermoposoBase(!!d.totalTermoposo);
        setServicioExpress(!!d.totalExpress);
        setCantidadSellos(d.cantidadSellos || 0);
        setCantidadBarrenos(d.cantidadBarrenos || 0);

      // 🔹 placa
        setTipoPlaca(d.tipoPlaca || "");
        setPrecioPlaca(d.precioPlaca || 0);
        setCantidadPlaca(d.cantidadPlaca || 0);
        setMuestra(d.muestra || "");
        setDatosAdicionales(d.datosAdicionales || "");

        setCantidadTapon(d.cantidadTapon || 0);
        setCantidadPuentes(d.cantidadPuentes || 0);
        // 🔹 productos extras
        setExtrasActivos(!!d.extrasActivos);
        setProductosExtras(d.productosExtras || []);

    }
  }, [data]);

    // FUNCION STOCK
const aplicarStock = (stock: any) => {
  setVoltaje(Number(stock.valores.voltaje));
  setPotencia(Number(stock.valores.potencia));
  setLongitud(Number(stock.valores.longitud));
  setDiametro(stock.valores.diametro);
  setDatosAdicionales(stock.valores.datosAdicionales);

  setSeleccionados((prev: any) => ({
    ...prev,

    dobleces: catalogos["dobleces"]?.find(
      (item: any) => item.tipo === stock.valores.dobleces
    ),

    tornillo: catalogos["tornillo"]?.find(
      (item: any) => item.tipo === stock.valores.tornillo
    ),

    borne: catalogos["borne"]?.find(
      (item: any) => item.tipo === stock.valores.borne
    ),
  }));

  
};

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
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e") {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const valor = e.target.value;

                if (valor === "") {
                  setCantidadResistencias(0);
                } else {
                  setCantidadResistencias(Math.max(0, Number(valor)));
                }
              }}
            />
          </div>

          {/* Voltaje */}
          <div className="form-row">
            <label>Voltaje</label>
            <input
              type="number"
              min={0}
              value={voltaje === 0 ? "" : voltaje}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const valor = e.target.value;

                if (valor === "") {
                  setVoltaje(0);
                } else {
                  setVoltaje(Math.max(0, Number(valor)));
                }
              }}
            />
          </div>

          {/* Potencia */}
          <div className="form-row">
            <label>Potencia</label>
            <input
              type="number"
              min={0}
              value={potencia === 0 ? "" : potencia}
              onKeyDown={(e) => {
                if (["-", "+", "e", "E"].includes(e.key)  ) {
                  e.preventDefault();
                }
              }}
              onChange={(e) => {
                const valor = e.target.value;

                if (valor === "") {
                  setPotencia(0);
                } else {
                  setPotencia(Math.max(0, Number(valor)));
                }
              }}
            />
        </div>
        {/* Max Watts */}
        <div className="form-row checkbox-row">
            <label>MAX WATTS</label>
            <input
                type="checkbox"
                checked={maxWatts}
                onChange={(e) => {
                    const value = e.target.checked;
                    setMaxWatts(value);
                    if (value) setSacarWatts(false);
                }}
            />
                  </div>
        {/* Sacar Watts */}
        <div className="form-row checkbox-row">
            <label>SACAR WATTS</label>
            <input
                type="checkbox"
                checked={sacarWatts}
                onChange={(e) => {
                    const value = e.target.checked;
                    setSacarWatts(value);
                    if (value) setMaxWatts(false);
                }}
            />
        </div>
        {/* Longitud */}
        <div className="form-row">
          <label>Longitud (cm)</label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={longitud === 0 ? "" : longitud}
            onKeyDown={(e) => {
              if (["-", "+", "e", "E"].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const valor = e.target.value;

              if (valor === "") {
                setLongitud(0);
              } else {
                setLongitud(Math.max(0, Number(valor)));
              }
            }}
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
        {tipoDesoldarBase !== "NO" && tipoDesoldarBase !== "" && (
            <div className="form-row">
                <label>Cantidad a desoldar de base</label>
                <input
                    type="number"
                    min={0}
                    value={cantidadDesoldarBase === 0 ? "" : cantidadDesoldarBase}
                    onChange={(e) => setCantidadDesoldarBase(Number(e.target.value))}
                />
            </div>
        )}
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
                min={0}   
                value={longitudCable === 0 ? "" : longitudCable}
                    onChange={(e) => setLongitudCable(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e") {
                        e.preventDefault();
                      }
                    }}
                  />
                </div>

                <div className="form-row">
                  <label>Cantidad de cables</label>
                  <input
                  type="number"
                  value={cantidadCable === 0 ? "" : cantidadCable}
                    onChange={(e) => setCantidadCable(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "-" || e.key === "e") {
                        e.preventDefault();
                      }
                    }}
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
                min={0}
                value={cantidadDesoldar === 0 ? "" : cantidadDesoldar}
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
                min={0}
                value={cantidadTapon === 0 ? "" : cantidadTapon}
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
                min={0}
                value={cantidadBarrenos === 0 ? "" : cantidadBarrenos}
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
                min={0}
                value={cantidadTermoposo === 0 ? "" : cantidadTermoposo}
                onKeyDown={(e) => {
                  if (e.key === "-" || e.key === "e") {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const valor = e.target.value;

                  if (valor === "") {
                    setCantidadTermoposo(0);
                  } else {
                    setCantidadTermoposo(Math.max(0, Number(valor)));
                  }
                }}
              />
            </div>
          )}

          {/* Placa / Base / Brida */}
          <div className="form-row">
            <label>Placa / Base / Brida</label>
            <select
              value={tipoPlaca}
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
                  value={precioPlaca === 0 ? "" : precioPlaca}
                  onChange={(e) => setPrecioPlaca(Number(e.target.value))}
                />
              </div>

              <div className="form-row">
                <label>Cantidad ({tipoPlaca})</label>
                <input
                  type="number"
                  value={cantidadPlaca === 0 ? "" : cantidadPlaca}
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
                min={0}
                value={cantidadPuentes === 0 ? "" : cantidadPuentes}
                onChange={(e) => setCantidadPuentes(Number(e.target.value))}
              />
            </div>
          )}

        {/* Sellos */}
        <div className="form-row">
            <label>Sellos</label>
            {renderSelect("sellos")}
        </div>

        {seleccionados["sellos"]?.tipo &&
            seleccionados["sellos"]?.tipo !== "NO" && (
                <div className="form-row">
                    <label>Cantidad de sellos</label>
                    <input
                        type="number"
                        min={0}
                        value={cantidadSellos === 0 ? "" : cantidadSellos}
                        onChange={(e) => setCantidadSellos(Number(e.target.value))}
                    />
                </div>
            )}
          {/* Aleta */}
          <div className="form-row checkbox-row">
            <label>
              Aleta (solo 7/16)
            </label>

            <input
              type="checkbox"
              checked={aleta}
              disabled={!puedeUsarAleta}
              onChange={() => setAleta(!aleta)}
            />
          </div>
          {/* Otros Servicios */}
          <div className="form-row">
            <label>Otros Servicios</label>
            {renderSelect("servicios")}
          </div>
          {/* Productos extras */}
            <ProductosExtras
            activo={extrasActivos}
            setActivo={setExtrasActivos}
            productosExtras={productosExtras}
            setProductosExtras={setProductosExtras}
          />
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

          {/* ---------------------------------------------Fin del DIV de cotizador-------------------------------------------------------------->> */}
              </div>
              <h2>Subtotal Tubular: {formatearMoneda(totalConDescuento)}</h2>
              <h1>Total: {formatearMoneda(totalconiva)}</h1>
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
                              maxWatts,
                              sacarWatts,

                              // 🔹 selección
                              seleccionados,

                              // 🔹 cables
                              tipoSoldarCable,
                              longitudCable,
                              cantidadCable,
                              totalCable,

                              // 🔹 extras
                              cantidadDesoldarBase,
                              totalDesoldarBase,
                              totalDesoldartornillo,
                              totalTapon,
                              totalBarrenos,
                              cantidadBarrenos,
                              totalTermoposo,
                              totalPlaca,
                              tipoPlaca,
                              cantidadPlaca,
                              precioPlaca,
                              totalPuentes,
                              //sellos
                              cantidadSellos,
                              totalSellos,
                              //aleta
                              aleta,
                              totalAleta,
                              cantidadTapon,
                              cantidadPuentes,
                              // 🔹 productos extras
                              extrasActivos,
                              productosExtras,
                              totalProductosExtras,
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
          {esAdministracion && (
              <>

              {/* BOTONES DE STOCK */}
                    <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 20,
                  }}
                >
                  {resistenciasStock.map((stock) => (
                    <button
                      key={stock.nombre}
                      type="button"
                      onClick={() => aplicarStock(stock)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {stock.nombre}
                    </button>
                  ))}
                </div>
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
                  <div className="resumen-detalle">
                    <p>
                      <strong>Voltaje</strong>
                      <span>{voltaje || "--"}V</span>
                    </p>

                    <p>
                      <strong>Potencia</strong>
                      <span>{potencia || "--"}W</span>
                    </p>

                    <p>
                      <strong>Cantidad de resistencias</strong>
                      <span>{cantidadResistencias || "--"}</span>
                    </p>

                    <p>
                      <strong>Total Tubular</strong>
                      <span>{totalTubo ? formatearMoneda(totalTubo) : "--"}</span>
                    </p>

                    <p>
                      <strong>Precio por cm</strong>
                      <span>
                        {diametro
                          ? formatearMoneda(obtenerPrecioPorCm(diametro, longitud))
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Tornillo</strong>
                      <span>
                        {seleccionados["tornillo"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["tornillo"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Borne</strong>
                      <span>
                        {seleccionados["borne"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["borne"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Desoldar de base</strong>
                      <span>
                        {seleccionados["desoldar_base"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["desoldar_base"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Dobleces</strong>
                      <span>
                        {seleccionados["dobleces"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["dobleces"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Soldadura en resistencia</strong>
                      <span>
                        {seleccionados["soldadura_resistencia"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["soldadura_resistencia"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Soldar cable</strong>
                      <span>{tipoSoldarCable || "--"}</span>
                    </p>

                    <p>
                      <strong>Total cable</strong>
                      <span>{totalCable ? formatearMoneda(totalCable) : "--"}</span>
                    </p>

                    <p>
                      <strong>Desoldar tornillo</strong>
                      <span>
                        {totalDesoldartornillo
                          ? formatearMoneda(totalDesoldartornillo)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Tapón macho</strong>
                      <span>{totalTapon ? formatearMoneda(totalTapon) : "--"}</span>
                    </p>

                    <p>
                      <strong>Barrenos</strong>
                      <span>{totalBarrenos ? formatearMoneda(totalBarrenos) : "--"}</span>
                    </p>

                    <p>
                      <strong>Termoposo</strong>
                      <span>{totalTermoposo ? formatearMoneda(totalTermoposo) : "--"}</span>
                    </p>

                    <p>
                      <strong>Puentes</strong>
                      <span>{totalPuentes ? formatearMoneda(totalPuentes) : "--"}</span>
                    </p>

                    <p>
                      <strong>Sello</strong>
                      <span>
                        {seleccionados["sellos"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["sellos"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Aleta</strong>
                      <span>{totalAleta ? formatearMoneda(totalAleta) : "--"}</span>
                    </p>

                    <p>
                      <strong>Placa / Base / Brida</strong>
                      <span>
                        {tipoPlaca || "--"} - {cantidadPlaca ? `x${cantidadPlaca}` : "--"} -
                        Precio unitario: {precioPlaca ? formatearMoneda(precioPlaca) : "--"} -
                        Total: {totalPlaca ? formatearMoneda(totalPlaca) : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Otros Servicios</strong>
                      <span>
                        {seleccionados["servicios"]?.precio !== undefined
                          ? formatearMoneda(seleccionados["servicios"]?.precio)
                          : "--"}
                      </span>
                    </p>

                    <p>
                      <strong>Servicio express</strong>
                      <span>% {totalExpress.toFixed(2)}</span>
                    </p>

                    <p>
                      <strong>Productos extras</strong>
                      <span>
                        {totalProductosExtras
                          ? formatearMoneda(totalProductosExtras)
                          : "--"}
                      </span>
                    </p>
                  </div>
                  )}
              </>
          )}
          {/* --------------------------------------------FIN DE CUADRO VARIABLES------------------------------------------------------------------>> */}
    </>
  );
};

export default Tubular;
