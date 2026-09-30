import React, { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { db } from "../../firebase/config";

// =========================================================
// TIPOS
// =========================================================

export type CatalogoItem = {
  id: string;
  tipo: string;
};

export type ProductoExtraStock = {
  descripcion: string;
  precio: string;
};

export type ValoresStockTubular = {
  voltaje: string;
  potencia: string;

  maxWatts: boolean;
  sacarWatts: boolean;

  longitud: string;
  diametro: string;

  borne: string;
  dobleces: string;
  tornillo: string;

  desoldarBase: string;
  cantidadDesoldarBase: string;

  soldaduraResistencia: string;

  soldarCableResistencia: string;
  cableParaSoldar: string;
  longitudCable: string;
  cantidadCable: string;

  desoldarTornillo: boolean;
  cantidadDesoldar: string;

  taponMacho: string;
  cantidadTapon: string;

  barrenos: string;
  cantidadBarrenos: string;

  termoposoBase: boolean;
  cantidadTermoposo: string;

  tipoPlaca: string;
  precioPlaca: string;
  cantidadPlaca: string;

  puentes: boolean;
  cantidadPuentes: string;

  sellos: string;
  cantidadSellos: string;

  aleta: boolean;

  datosAdicionales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresTubularVacios: ValoresStockTubular = {
  voltaje: "",
  potencia: "",

  maxWatts: false,
  sacarWatts: false,

  longitud: "",
  diametro: "",

  borne: "",
  dobleces: "",
  tornillo: "",

  desoldarBase: "",
  cantidadDesoldarBase: "",

  soldaduraResistencia: "",

  soldarCableResistencia: "",
  cableParaSoldar: "",
  longitudCable: "",
  cantidadCable: "",

  desoldarTornillo: false,
  cantidadDesoldar: "",

  taponMacho: "",
  cantidadTapon: "",

  barrenos: "",
  cantidadBarrenos: "",

  termoposoBase: false,
  cantidadTermoposo: "",

  tipoPlaca: "",
  precioPlaca: "",
  cantidadPlaca: "",

  puentes: false,
  cantidadPuentes: "",

  sellos: "",
  cantidadSellos: "",

  aleta: false,

  datosAdicionales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockTubular;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockTubular>
  >;

  productosExtras: ProductoExtraStock[];

  setProductosExtras: React.Dispatch<
    React.SetStateAction<ProductoExtraStock[]>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockTubular: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
  productosExtras,
  setProductosExtras,
}) => {
  // =======================================================
  // CATÁLOGOS
  // =======================================================

  const [diametros, setDiametros] =
    useState<CatalogoItem[]>([]);

  const [bornes, setBornes] =
    useState<CatalogoItem[]>([]);

  const [dobleces, setDobleces] =
    useState<CatalogoItem[]>([]);

  const [tornillos, setTornillos] =
    useState<CatalogoItem[]>([]);

  const [
    soldadurasResistencia,
    setSoldadurasResistencia,
  ] = useState<CatalogoItem[]>([]);

  const [
    soldarCableOpciones,
    setSoldarCableOpciones,
  ] = useState<CatalogoItem[]>([]);

  const [
    cablesParaSoldar,
    setCablesParaSoldar,
  ] = useState<CatalogoItem[]>([]);

  const [
    desoldarBaseOpciones,
    setDesoldarBaseOpciones,
  ] = useState<CatalogoItem[]>([]);

  const [taponesMacho, setTaponesMacho] =
    useState<CatalogoItem[]>([]);

  const [
    barrenosOpciones,
    setBarrenosOpciones,
  ] = useState<CatalogoItem[]>([]);

  const [
    sellosOpciones,
    setSellosOpciones,
  ] = useState<CatalogoItem[]>([]);

  // =======================================================
  // CARGAR CATÁLOGO
  // =======================================================

  const cargarCatalogo = async (
    ruta: string
  ): Promise<CatalogoItem[]> => {
    try {
      const snapshot = await get(
        ref(db, `cotizador/${ruta}`)
      );

      if (!snapshot.exists()) {
        return [];
      }

      const data = snapshot.val();

      return Object.keys(data).map((id) => ({
        id,
        tipo: data[id]?.Tipo || "",
      }));
    } catch (error) {
      console.error(
        `Error cargando catálogo ${ruta}:`,
        error
      );

      return [];
    }
  };

  // =======================================================
  // CARGAR TODOS LOS CATÁLOGOS
  // =======================================================

  useEffect(() => {
    const cargarCatalogos = async () => {
      const [
        listaBornes,
        listaDobleces,
        listaTornillos,
        listaDiametros,
        listaSoldaduras,
        listaSoldarCable,
        listaCables,
        listaDesoldarBase,
        listaTaponesMacho,
        listaBarrenos,
        listaSellos,
      ] = await Promise.all([
        cargarCatalogo("borne"),
        cargarCatalogo("dobleces"),
        cargarCatalogo("tornillo"),
        cargarCatalogo("Diametro_del_tubo"),
        cargarCatalogo(
          "soldadura_resistencia"
        ),
        cargarCatalogo(
          "soldar_cable_resistencia"
        ),
        cargarCatalogo(
          "cable_para_soldar"
        ),
        cargarCatalogo(
          "desoldar_base"
        ),
        cargarCatalogo(
          "tapones_macho"
        ),
        cargarCatalogo(
          "barrenos"
        ),
        cargarCatalogo(
          "sellos"
        ),
      ]);

      setBornes(listaBornes);
      setDobleces(listaDobleces);
      setTornillos(listaTornillos);
      setDiametros(listaDiametros);

      setSoldadurasResistencia(
        listaSoldaduras
      );

      setSoldarCableOpciones(
        listaSoldarCable
      );

      setCablesParaSoldar(
        listaCables
      );

      setDesoldarBaseOpciones(
        listaDesoldarBase
      );

      setTaponesMacho(
        listaTaponesMacho
      );

      setBarrenosOpciones(
        listaBarrenos
      );

      setSellosOpciones(
        listaSellos
      );
    };

    cargarCatalogos();
  }, []);

  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockTubular,
    valor: string | boolean
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // =======================================================
  // CAMBIAR TIPO PLACA
  // =======================================================

  const cambiarTipoPlaca = (
    tipo: string
  ) => {
    setValores((prev) => ({
      ...prev,

      tipoPlaca: tipo,

      // Si quitamos la placa, también
      // limpiamos sus datos dependientes.
      precioPlaca:
        tipo !== ""
          ? prev.precioPlaca
          : "",

      cantidadPlaca:
        tipo !== ""
          ? prev.cantidadPlaca
          : "",
    }));
  };

  // =======================================================
  // PRODUCTOS EXTRAS
  // =======================================================

  const agregarProductoExtra = () => {
    setProductosExtras((prev) => [
      ...prev,
      {
        descripcion: "",
        precio: "",
      },
    ]);
  };

  const cambiarProductoExtra = (
    index: number,
    campo: keyof ProductoExtraStock,
    valor: string
  ) => {
    setProductosExtras((prev) =>
      prev.map((producto, i) =>
        i === index
          ? {
              ...producto,
              [campo]: valor,
            }
          : producto
      )
    );
  };

  const eliminarProductoExtra = (
    index: number
  ) => {
    setProductosExtras((prev) =>
      prev.filter(
        (_, i) => i !== index
      )
    );
  };

  // =======================================================
  // AUXILIAR: ¿TIENE OPCIÓN ACTIVA?
  // =======================================================

  const opcionActiva = (
    valor: string
  ) => {
    const limpio = String(
      valor || ""
    )
      .trim()
      .toUpperCase();

    return (
      limpio !== "" &&
      limpio !== "NO"
    );
  };

  // =======================================================
  // LECTURA
  // =======================================================

  const renderLectura = (
    etiqueta: string,
    valor: React.ReactNode
  ) => (
    <div className="res-stock-campo-lectura">
      <label>{etiqueta}</label>

      <span>
        {valor === "" ||
        valor === null ||
        valor === undefined
          ? "--"
          : valor}
      </span>
    </div>
  );

  // =======================================================
  // SELECT
  // =======================================================

  const renderSelect = (
    etiqueta: string,
    campo: keyof ValoresStockTubular,
    opciones: CatalogoItem[]
  ) => (
    <div className="res-stock-campo">
      <label>{etiqueta}</label>

      <select
        value={String(
          valores[campo] ?? ""
        )}
        onChange={(e) =>
          cambiarValor(
            campo,
            e.target.value
          )
        }
      >
        <option value="">
          Seleccione...
        </option>

        {opciones.map((item) => (
          <option
            key={item.id}
            value={item.tipo}
          >
            {item.tipo}
          </option>
        ))}
      </select>
    </div>
  );

  // =======================================================
  // FILTRO TORNILLOS
  // Para 7/16 no mostrar tornillos 1/2
  // =======================================================

  const tornillosFiltrados =
    tornillos.filter((item) => {
      if (
        !valores.diametro.includes(
          "7/16"
        )
      ) {
        return true;
      }

      // Conservamos NO
      if (
        item.tipo
          .trim()
          .toUpperCase() === "NO"
      ) {
        return true;
      }

      return !/\b1\s*\/\s*2\b/.test(
        item.tipo
      );
    });

  // =======================================================
  // MODO LECTURA
  // =======================================================

  if (!modoEdicion) {
    return (
      <div className="res-stock-informacion">
        {renderLectura(
          "Voltaje",
          valores.voltaje
            ? `${valores.voltaje} V`
            : "--"
        )}

        {renderLectura(
          "Potencia",
          valores.potencia
            ? `${valores.potencia} W`
            : "--"
        )}

        {renderLectura(
          "MAX WATTS",
          valores.maxWatts
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "SACAR WATTS",
          valores.sacarWatts
            ? "Sí"
            : "No"
        )}

        {renderLectura(
          "Longitud",
          valores.longitud
            ? `${valores.longitud} cm`
            : "--"
        )}

        {renderLectura(
          "Diámetro Tubo",
          valores.diametro
        )}

        {renderLectura(
          "Borne",
          valores.borne
        )}

        {renderLectura(
          "Dobleces",
          valores.dobleces
        )}

        {renderLectura(
          "Tornillo",
          valores.tornillo
        )}

        {renderLectura(
          "Desoldar resistencia de base",
          valores.desoldarBase
        )}

        {opcionActiva(
          valores.desoldarBase
        ) &&
          renderLectura(
            "Cantidad a desoldar de base",
            valores.cantidadDesoldarBase
          )}

        {renderLectura(
          "Soldadura en resistencia",
          valores.soldaduraResistencia
        )}

        {renderLectura(
          "Soldar cable en resistencia",
          valores.soldarCableResistencia
        )}

        {opcionActiva(
          valores.soldarCableResistencia
        ) && (
          <>
            {renderLectura(
              "Cable para soldar",
              valores.cableParaSoldar
            )}

            {opcionActiva(
              valores.cableParaSoldar
            ) && (
              <>
                {renderLectura(
                  "Longitud de cable",
                  valores.longitudCable
                    ? `${valores.longitudCable} cm`
                    : "--"
                )}

                {renderLectura(
                  "Cantidad de cables",
                  valores.cantidadCable
                )}
              </>
            )}
          </>
        )}

        {renderLectura(
          "Desoldar resistencia de tornillo",
          valores.desoldarTornillo
            ? "Sí"
            : "No"
        )}

        {valores.desoldarTornillo &&
          renderLectura(
            "Cantidad a desoldar",
            valores.cantidadDesoldar
          )}

        {renderLectura(
          "Tapón macho",
          valores.taponMacho
        )}

        {opcionActiva(
          valores.taponMacho
        ) &&
          renderLectura(
            "Cantidad de tapones",
            valores.cantidadTapon
          )}

        {renderLectura(
          "Barrenos",
          valores.barrenos
        )}

        {opcionActiva(
          valores.barrenos
        ) &&
          renderLectura(
            "Cantidad de barrenados",
            valores.cantidadBarrenos
          )}

        {renderLectura(
          "Termoposo en Base",
          valores.termoposoBase
            ? "Sí"
            : "No"
        )}

        {valores.termoposoBase &&
          renderLectura(
            "Cantidad de termoposos",
            valores.cantidadTermoposo
          )}

        {renderLectura(
          "Placa / Base / Brida / Lámina",
          valores.tipoPlaca
        )}

        {valores.tipoPlaca &&
          renderLectura(
            "Precio",
            valores.precioPlaca
              ? `$${Number(
                  valores.precioPlaca
                ).toFixed(2)}`
              : "--"
          )}

        {valores.tipoPlaca &&
          renderLectura(
            "Cantidad",
            valores.cantidadPlaca
          )}

        {renderLectura(
          "Puentes",
          valores.puentes
            ? "Sí"
            : "No"
        )}

        {valores.puentes &&
          renderLectura(
            "Cantidad de puentes",
            valores.cantidadPuentes
          )}

        {renderLectura(
          "Sellos",
          valores.sellos
        )}

        {opcionActiva(
          valores.sellos
        ) &&
          renderLectura(
            "Cantidad de sellos",
            valores.cantidadSellos
          )}

        {renderLectura(
          "Aleta",
          valores.aleta
            ? "Sí"
            : "No"
        )}

        <div className="res-stock-campo-lectura">
          <label>
            Productos Extras
          </label>

          {productosExtras.length ===
          0 ? (
            <span>--</span>
          ) : (
            <div>
              {productosExtras.map(
                (extra, index) => (
                  <div key={index}>
                    {extra.descripcion} — $
                    {Number(
                      extra.precio || 0
                    ).toFixed(2)}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="res-stock-campo-lectura res-stock-datos-lectura">
          <label>
            Datos adicionales
          </label>

          <span>
            {valores.datosAdicionales ||
              "--"}
          </span>
        </div>
      </div>
    );
  }

  // =======================================================
  // MODO EDICIÓN
  // =======================================================

  return (
    <div className="res-stock-formulario">
      {/* VOLTAJE */}

      <div className="res-stock-campo">
        <label>Voltaje</label>

        <input
          type="number"
          min={0}
          value={valores.voltaje}
          onChange={(e) =>
            cambiarValor(
              "voltaje",
              e.target.value
            )
          }
        />
      </div>

      {/* POTENCIA */}

      <div className="res-stock-campo">
        <label>Potencia</label>

        <input
          type="number"
          min={0}
          value={valores.potencia}
          onChange={(e) =>
            cambiarValor(
              "potencia",
              e.target.value
            )
          }
        />
      </div>

      {/* MAX WATTS */}

      <div className="res-stock-campo res-stock-check">
        <label>MAX WATTS</label>

        <input
          type="checkbox"
          checked={valores.maxWatts}
          onChange={(e) =>
            cambiarValor(
              "maxWatts",
              e.target.checked
            )
          }
        />
      </div>

      {/* SACAR WATTS */}

      <div className="res-stock-campo res-stock-check">
        <label>SACAR WATTS</label>

        <input
          type="checkbox"
          checked={valores.sacarWatts}
          onChange={(e) =>
            cambiarValor(
              "sacarWatts",
              e.target.checked
            )
          }
        />
      </div>

      {/* LONGITUD */}

      <div className="res-stock-campo">
        <label>
          Longitud (cm)
        </label>

        <input
          type="number"
          min={0}
          value={valores.longitud}
          onChange={(e) =>
            cambiarValor(
              "longitud",
              e.target.value
            )
          }
        />
      </div>

      {/* DIÁMETRO */}

      {renderSelect(
        "Diámetro Tubo",
        "diametro",
        diametros
      )}

      {/* BORNE */}

      {renderSelect(
        "Borne",
        "borne",
        bornes
      )}

      {/* DOBLECES */}

      {renderSelect(
        "Dobleces",
        "dobleces",
        dobleces
      )}

      {/* TORNILLO */}

      {renderSelect(
        "Tornillo",
        "tornillo",
        tornillosFiltrados
      )}

      {/* DESOLDAR BASE */}

      {renderSelect(
        "Desoldar resistencia de base",
        "desoldarBase",
        desoldarBaseOpciones
      )}

      {opcionActiva(
        valores.desoldarBase
      ) && (
        <div className="res-stock-campo">
          <label>
            Cantidad a desoldar de base
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadDesoldarBase
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadDesoldarBase",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* SOLDADURA */}

      {renderSelect(
        "Soldadura en resistencia",
        "soldaduraResistencia",
        soldadurasResistencia
      )}

      {/* SOLDAR CABLE */}

      {renderSelect(
        "Soldar cable en resistencia",
        "soldarCableResistencia",
        soldarCableOpciones
      )}

      {opcionActiva(
        valores.soldarCableResistencia
      ) && (
        <>
          {renderSelect(
            "Cable para soldar",
            "cableParaSoldar",
            cablesParaSoldar
          )}

          {opcionActiva(
            valores.cableParaSoldar
          ) && (
            <>
              <div className="res-stock-campo">
                <label>
                  Longitud de cable para soldar
                </label>

                <input
                  type="number"
                  min={0}
                  value={
                    valores.longitudCable
                  }
                  onChange={(e) =>
                    cambiarValor(
                      "longitudCable",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="res-stock-campo">
                <label>
                  Cantidad de cables
                </label>

                <input
                  type="number"
                  min={0}
                  value={
                    valores.cantidadCable
                  }
                  onChange={(e) =>
                    cambiarValor(
                      "cantidadCable",
                      e.target.value
                    )
                  }
                />
              </div>
            </>
          )}
        </>
      )}

      {/* DESOLDAR TORNILLO */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Desoldar resistencia de tornillo
        </label>

        <input
          type="checkbox"
          checked={
            valores.desoldarTornillo
          }
          onChange={(e) =>
            cambiarValor(
              "desoldarTornillo",
              e.target.checked
            )
          }
        />
      </div>

      {valores.desoldarTornillo && (
        <div className="res-stock-campo">
          <label>
            Cantidad a desoldar
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadDesoldar
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadDesoldar",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* TAPÓN MACHO */}

      {renderSelect(
        "Tapón macho",
        "taponMacho",
        taponesMacho
      )}

      {opcionActiva(
        valores.taponMacho
      ) && (
        <div className="res-stock-campo">
          <label>
            Cantidad de tapones
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadTapon
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadTapon",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* BARRENOS */}

      {renderSelect(
        "Barrenos",
        "barrenos",
        barrenosOpciones
      )}

      {opcionActiva(
        valores.barrenos
      ) && (
        <div className="res-stock-campo">
          <label>
            Cantidad de barrenados
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadBarrenos
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadBarrenos",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* TERMOPOZO */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Termoposo en Base
        </label>

        <input
          type="checkbox"
          checked={
            valores.termoposoBase
          }
          onChange={(e) =>
            cambiarValor(
              "termoposoBase",
              e.target.checked
            )
          }
        />
      </div>

      {valores.termoposoBase && (
        <div className="res-stock-campo">
          <label>
            Cantidad de termoposos
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadTermoposo
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadTermoposo",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* ===================================================
          PLACA / BASE / BRIDA / LÁMINA
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Placa / Base / Brida / Lámina
        </label>

        <select
          value={valores.tipoPlaca}
          onChange={(e) =>
            cambiarTipoPlaca(
              e.target.value
            )
          }
        >
          <option value="">
            Seleccione...
          </option>

          <option value="Placa">
            Placa
          </option>

          <option value="Base">
            Base
          </option>

          <option value="Brida">
            Brida
          </option>

          <option value="Lamina">
            Lámina
          </option>
        </select>
      </div>

      {valores.tipoPlaca !== "" && (
        <>
          <div className="res-stock-campo">
            <label>Precio</label>

            <input
              type="number"
              min={0}
              step="any"
              value={
                valores.precioPlaca
              }
              onChange={(e) =>
                cambiarValor(
                  "precioPlaca",
                  e.target.value
                )
              }
            />
          </div>

          <div className="res-stock-campo">
            <label>Cantidad</label>

            <input
              type="number"
              min={0}
              step={1}
              value={
                valores.cantidadPlaca
              }
              onChange={(e) =>
                cambiarValor(
                  "cantidadPlaca",
                  e.target.value
                )
              }
            />
          </div>
        </>
      )}

      {/* PUENTES */}

      <div className="res-stock-campo res-stock-check">
        <label>Puentes</label>

        <input
          type="checkbox"
          checked={valores.puentes}
          onChange={(e) =>
            cambiarValor(
              "puentes",
              e.target.checked
            )
          }
        />
      </div>

      {valores.puentes && (
        <div className="res-stock-campo">
          <label>
            Cantidad de puentes
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadPuentes
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadPuentes",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* SELLOS */}

      {renderSelect(
        "Sellos",
        "sellos",
        sellosOpciones
      )}

      {opcionActiva(
        valores.sellos
      ) && (
        <div className="res-stock-campo">
          <label>
            Cantidad de sellos
          </label>

          <input
            type="number"
            min={0}
            value={
              valores.cantidadSellos
            }
            onChange={(e) =>
              cambiarValor(
                "cantidadSellos",
                e.target.value
              )
            }
          />
        </div>
      )}

      {/* ALETA */}

      <div className="res-stock-campo res-stock-check">
        <label>Aleta</label>

        <input
          type="checkbox"
          checked={valores.aleta}
          onChange={(e) =>
            cambiarValor(
              "aleta",
              e.target.checked
            )
          }
        />
      </div>

      {/* PRODUCTOS EXTRAS */}

      <div className="res-stock-productos-extras">
        <label>
          Productos Extras
        </label>

        {productosExtras.map(
          (extra, index) => (
            <div
              key={index}
              className="res-stock-producto-extra"
            >
              <input
                type="text"
                placeholder="Descripción"
                value={
                  extra.descripcion
                }
                onChange={(e) =>
                  cambiarProductoExtra(
                    index,
                    "descripcion",
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                min={0}
                placeholder="Precio"
                value={
                  extra.precio
                }
                onChange={(e) =>
                  cambiarProductoExtra(
                    index,
                    "precio",
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                className="res-stock-btn-extra-eliminar"
                onClick={() =>
                  eliminarProductoExtra(
                    index
                  )
                }
              >
                X
              </button>
            </div>
          )
        )}

        <button
          type="button"
          className="res-stock-btn-extra-agregar"
          onClick={
            agregarProductoExtra
          }
        >
          + AGREGAR PRODUCTO EXTRA
        </button>
      </div>

      {/* DATOS ADICIONALES */}

      <div className="res-stock-campo res-stock-textarea">
        <label>
          Datos Adicionales
        </label>

        <textarea
          value={
            valores.datosAdicionales
          }
          onChange={(e) =>
            cambiarValor(
              "datosAdicionales",
              e.target.value
            )
          }
        />
      </div>
    </div>
  );
};

export default StockTubular;