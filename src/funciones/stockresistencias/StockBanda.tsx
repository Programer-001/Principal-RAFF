import React from "react";
import {
  tipoCable,
  termopar as catalogoTermopar,
} from "../../datos/tipoCable";

// =========================================================
// TIPOS
// =========================================================

export type ValoresStockBanda = {
  tipo: string;

  diametro: string;
  ancho: string;
  longitudTiraCm: string;

  voltaje: string;
  potencia: string;

  barrilCincho: boolean;
  stuck: boolean;

  barrenosResaques: boolean;
  numBarrenos: string;

  colocarCables: boolean;
  tipoCableSeleccionado: string;
  longitudCm: string;
  cantidadCables: string;

  fabricar440: boolean;
  trifasica: boolean;
  caja: boolean;

  termopar: boolean;
  tipoTermoparSeleccionado: string;
  longitudTermoparCm: string;

  excedenteBanda: boolean;

  datosAdicionales: string;
};

// =========================================================
// VALORES VACÍOS
// =========================================================

export const valoresBandaVacios: ValoresStockBanda = {
  tipo: "",

  diametro: "",
  ancho: "",
  longitudTiraCm: "",

  voltaje: "",
  potencia: "",

  barrilCincho: false,
  stuck: false,

  barrenosResaques: false,
  numBarrenos: "",

  colocarCables: false,
  tipoCableSeleccionado: "",
  longitudCm: "",
  cantidadCables: "",

  fabricar440: false,
  trifasica: false,
  caja: false,

  termopar: false,
  tipoTermoparSeleccionado: "",
  longitudTermoparCm: "",

  excedenteBanda: false,

  datosAdicionales: "",
};

// =========================================================
// PROPS
// =========================================================

type Props = {
  modoEdicion: boolean;

  valores: ValoresStockBanda;

  setValores: React.Dispatch<
    React.SetStateAction<ValoresStockBanda>
  >;
};

// =========================================================
// COMPONENTE
// =========================================================

const StockBanda: React.FC<Props> = ({
  modoEdicion,
  valores,
  setValores,
}) => {
  // =======================================================
  // CAMBIAR VALOR
  // =======================================================

  const cambiarValor = (
    campo: keyof ValoresStockBanda,
    valor: string | boolean
  ) => {
    setValores((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // =======================================================
  // CAMBIAR TIPO DE BANDA
  // =======================================================

  const cambiarTipo = (tipo: string) => {
    setValores((prev) => {
      // TIRA
      if (tipo === "TIRA") {
        return {
          ...prev,

          tipo,

          // TIRA no usa diámetro
          diametro: "",

          // En Banda.tsx TIRA trabaja con ancho 4
          ancho: "4",

          // Opciones que no aplican a TIRA
          barrilCincho: false,

          barrenosResaques: false,
          numBarrenos: "",

          trifasica: false,
          caja: false,
          excedenteBanda: false,
        };
      }

      // Cualquier otro tipo
      return {
        ...prev,

        tipo,

        // Si salimos de TIRA limpiamos su longitud
        longitudTiraCm:
          prev.tipo === "TIRA"
            ? ""
            : prev.longitudTiraCm,

        // Si venimos de TIRA, quitamos el ancho fijo 4
        ancho:
          prev.tipo === "TIRA" &&
          prev.ancho === "4"
            ? ""
            : prev.ancho,
      };
    });
  };

  // =======================================================
  // BARRENOS
  // =======================================================

  const cambiarBarrenos = (
    checked: boolean
  ) => {
    setValores((prev) => ({
      ...prev,

      barrenosResaques: checked,

      numBarrenos: checked
        ? prev.numBarrenos
        : "",
    }));
  };

  // =======================================================
  // COLOCAR CABLES
  // =======================================================

  const cambiarColocarCables = (
    checked: boolean
  ) => {
    setValores((prev) => ({
      ...prev,

      colocarCables: checked,

      tipoCableSeleccionado: checked
        ? prev.tipoCableSeleccionado
        : "",

      longitudCm: checked
        ? prev.longitudCm
        : "",

      cantidadCables: checked
        ? prev.cantidadCables
        : "",
    }));
  };

  // =======================================================
  // TIPO DE CABLE
  // =======================================================

  const cambiarTipoCable = (
    tipo: string
  ) => {
    setValores((prev) => ({
      ...prev,

      tipoCableSeleccionado: tipo,

      longitudCm: tipo
        ? prev.longitudCm
        : "",

      cantidadCables: tipo
        ? prev.cantidadCables
        : "",
    }));
  };

  // =======================================================
  // TERMOPAR
  // =======================================================

  const cambiarTermopar = (
    checked: boolean
  ) => {
    setValores((prev) => ({
      ...prev,

      termopar: checked,

      tipoTermoparSeleccionado: checked
        ? prev.tipoTermoparSeleccionado
        : "",

      longitudTermoparCm: checked
        ? prev.longitudTermoparCm
        : "",
    }));
  };

  // =======================================================
  // TIPO DE TERMOPAR
  // =======================================================

  const cambiarTipoTermopar = (
    tipo: string
  ) => {
    setValores((prev) => ({
      ...prev,

      tipoTermoparSeleccionado: tipo,

      longitudTermoparCm: tipo
        ? prev.longitudTermoparCm
        : "",
    }));
  };

  // =======================================================
  // CAMBIAR VOLTAJE
  //
  // Igual que Banda.tsx:
  // 440V o mayor activa Fabricar a 440V.
  // =======================================================

  const cambiarVoltaje = (
    valor: string
  ) => {
    const numero =
      Number(valor) || 0;

    setValores((prev) => ({
      ...prev,

      voltaje: valor,

      fabricar440: numero >= 440,
    }));
  };

  // =======================================================
  // CAMPO LECTURA
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
  // MODO LECTURA
  // =======================================================

  if (!modoEdicion) {
    return (
      <div className="res-stock-informacion">
        {/* TIPO */}

        {renderLectura(
          "Tipo",
          valores.tipo
        )}

        {/* TIRA */}

        {valores.tipo === "TIRA" ? (
          <>
            {renderLectura(
              "Longitud",
              valores.longitudTiraCm
                ? `${valores.longitudTiraCm} cm`
                : "--"
            )}

            {renderLectura(
              "Ancho",
              valores.ancho
                ? `${valores.ancho} cm`
                : "--"
            )}
          </>
        ) : (
          <>
            {renderLectura(
              "Diámetro",
              valores.diametro
                ? `${valores.diametro} cm`
                : "--"
            )}

            {renderLectura(
              "Ancho",
              valores.ancho
                ? `${valores.ancho} cm`
                : "--"
            )}
          </>
        )}

        {/* VOLTAJE */}

        {renderLectura(
          "Voltaje",
          valores.voltaje
            ? `${valores.voltaje} V`
            : "--"
        )}

        {/* POTENCIA */}

        {renderLectura(
          "Potencia",
          valores.potencia
            ? `${valores.potencia} W`
            : "--"
        )}

        {/* BARRIL */}

        {valores.tipo !== "TIRA" &&
          renderLectura(
            "Barril y Cincho",
            valores.barrilCincho
              ? "Sí"
              : "No"
          )}

        {/* STUCK */}

        {renderLectura(
          "Stuck",
          valores.stuck
            ? "Sí"
            : "No"
        )}

        {/* BARRENOS */}

        {valores.tipo !== "TIRA" &&
          renderLectura(
            "Barrenos o Resaques",
            valores.barrenosResaques
              ? "Sí"
              : "No"
          )}

        {valores.tipo !== "TIRA" &&
          valores.barrenosResaques &&
          renderLectura(
            "Número de barrenos",
            valores.numBarrenos
          )}

        {/* CABLES */}

        {renderLectura(
          "Colocar Cables",
          valores.colocarCables
            ? "Sí"
            : "No"
        )}

        {valores.colocarCables && (
          <>
            {renderLectura(
              "Tipo de cable",
              valores.tipoCableSeleccionado
            )}

            {renderLectura(
              "Longitud de cable",
              valores.longitudCm
                ? `${valores.longitudCm} cm`
                : "--"
            )}

            {renderLectura(
              "Cantidad de cables",
              valores.cantidadCables
            )}
          </>
        )}

        {/* 440 */}

        {renderLectura(
          "Fabricar a 440V",
          valores.fabricar440
            ? "Sí"
            : "No"
        )}

        {/* TRIFÁSICA */}

        {valores.tipo !== "TIRA" &&
          renderLectura(
            "Trifásica",
            valores.trifasica
              ? "Sí"
              : "No"
          )}

        {/* CAJA */}

        {valores.tipo !== "TIRA" &&
          renderLectura(
            "Caja",
            valores.caja
              ? "Sí"
              : "No"
          )}

        {/* TERMOPAR */}

        {renderLectura(
          "Termopar",
          valores.termopar
            ? "Sí"
            : "No"
        )}

        {valores.termopar && (
          <>
            {renderLectura(
              "Tipo de termopar",
              valores.tipoTermoparSeleccionado
            )}

            {renderLectura(
              "Longitud del termopar",
              valores.longitudTermoparCm
                ? `${valores.longitudTermoparCm} cm`
                : "--"
            )}
          </>
        )}

        {/* EXCEDENTE */}

        {valores.tipo !== "TIRA" &&
          renderLectura(
            "Excedente de Banda",
            valores.excedenteBanda
              ? "Sí"
              : "No"
          )}

        {/* DATOS */}

        <div className="res-stock-campo-lectura res-stock-datos-lectura">
          <label>
            Datos Adicionales
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
      {/* ===================================================
          TIPO DE BANDA
      =================================================== */}

      <div className="res-stock-campo">
        <label>Tipo</label>

        <select
          value={valores.tipo}
          onChange={(e) =>
            cambiarTipo(
              e.target.value
            )
          }
        >
          <option value="">
            Seleccione...
          </option>

          <option value="MICA">
            MICA
          </option>

          <option value="SEMICURVA">
            SEMICURVA
          </option>

          <option value="PLANA">
            PLANA
          </option>

          <option value="CERAMICA">
            CERAMICA
          </option>

          <option value="TIRA">
            TIRA
          </option>
        </select>
      </div>

      {/* ===================================================
          MEDIDAS
      =================================================== */}

      {valores.tipo === "TIRA" ? (
        <>
          {/* LONGITUD TIRA */}

          <div className="res-stock-campo">
            <label>
              Longitud (cm)
            </label>

            <input
              type="number"
              min={0}
              step="any"
              value={
                valores.longitudTiraCm
              }
              onChange={(e) =>
                cambiarValor(
                  "longitudTiraCm",
                  e.target.value
                )
              }
            />
          </div>

          {/* ANCHO FIJO */}

          <div className="res-stock-campo">
            <label>
              Ancho (cm)
            </label>

            <input
              type="number"
              value="4"
              disabled
            />
          </div>
        </>
      ) : (
        <>
          {/* DIÁMETRO */}

          <div className="res-stock-campo">
            <label>
              Diámetro (cm)
            </label>

            <input
              type="number"
              min={0}
              step="any"
              value={
                valores.diametro
              }
              onChange={(e) =>
                cambiarValor(
                  "diametro",
                  e.target.value
                )
              }
            />
          </div>

          {/* ANCHO */}

          <div className="res-stock-campo">
            <label>
              Ancho (cm)
            </label>

            <input
              type="number"
              min={0}
              step="any"
              value={valores.ancho}
              onChange={(e) =>
                cambiarValor(
                  "ancho",
                  e.target.value
                )
              }
            />
          </div>
        </>
      )}

      {/* ===================================================
          VOLTAJE
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Voltaje (Volts)
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.voltaje}
          onChange={(e) =>
            cambiarVoltaje(
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          POTENCIA
      =================================================== */}

      <div className="res-stock-campo">
        <label>
          Potencia (Watts)
        </label>

        <input
          type="number"
          min={0}
          step="any"
          value={valores.potencia}
          onChange={(e) =>
            cambiarValor(
              "potencia",
              e.target.value
            )
          }
        />
      </div>

      {/* ===================================================
          OPCIONES ADICIONALES
      =================================================== */}

      <div className="res-stock-subtitulo">
        Opciones adicionales
      </div>

      {/* ===================================================
          BARRIL Y CINCHO
          No aplica para TIRA
      =================================================== */}

      {valores.tipo !== "TIRA" && (
        <div className="res-stock-campo res-stock-check">
          <label>
            Barril y Cincho
          </label>

          <input
            type="checkbox"
            checked={
              valores.barrilCincho
            }
            onChange={(e) =>
              cambiarValor(
                "barrilCincho",
                e.target.checked
              )
            }
          />
        </div>
      )}

      {/* ===================================================
          STUCK
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>Stuck</label>

        <input
          type="checkbox"
          checked={valores.stuck}
          onChange={(e) =>
            cambiarValor(
              "stuck",
              e.target.checked
            )
          }
        />
      </div>

      {/* ===================================================
          BARRENOS O RESAQUES
          No aplica para TIRA
      =================================================== */}

      {valores.tipo !== "TIRA" && (
        <>
          <div className="res-stock-campo res-stock-check">
            <label>
              Barrenos o Resaques
            </label>

            <input
              type="checkbox"
              checked={
                valores.barrenosResaques
              }
              onChange={(e) =>
                cambiarBarrenos(
                  e.target.checked
                )
              }
            />
          </div>

          {valores.barrenosResaques && (
            <div className="res-stock-campo">
              <label>
                Número de barrenos
              </label>

              <input
                type="number"
                min={0}
                step={1}
                value={
                  valores.numBarrenos
                }
                onChange={(e) =>
                  cambiarValor(
                    "numBarrenos",
                    e.target.value
                  )
                }
              />
            </div>
          )}
        </>
      )}

      {/* ===================================================
          COLOCAR CABLES
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Colocar Cables
        </label>

        <input
          type="checkbox"
          checked={
            valores.colocarCables
          }
          onChange={(e) =>
            cambiarColocarCables(
              e.target.checked
            )
          }
        />
      </div>

      {/* ===================================================
          SELECT TIPO DE CABLE
      =================================================== */}

      {valores.colocarCables && (
        <>
          <div className="res-stock-campo">
            <label>
              Tipo de cable
            </label>

            <select
              value={
                valores.tipoCableSeleccionado
              }
              onChange={(e) =>
                cambiarTipoCable(
                  e.target.value
                )
              }
            >
              <option value="">
                Seleccione...
              </option>

              {tipoCable.map(
                (cable, index) => (
                  <option
                    key={index}
                    value={cable.nombre}
                  >
                    {cable.nombre}
                  </option>
                )
              )}
            </select>
          </div>

          {/* LONGITUD CABLE */}

          <div className="res-stock-campo">
            <label>
              Longitud (cm)
            </label>

            <input
              type="number"
              min={0}
              step="any"
              disabled={
                !valores.tipoCableSeleccionado
              }
              value={
                valores.longitudCm
              }
              onChange={(e) =>
                cambiarValor(
                  "longitudCm",
                  e.target.value
                )
              }
            />
          </div>

          {/* CANTIDAD CABLES */}

          <div className="res-stock-campo">
            <label>
              Cantidad de cables
            </label>

            <input
              type="number"
              min={0}
              step={1}
              disabled={
                !valores.tipoCableSeleccionado
              }
              value={
                valores.cantidadCables
              }
              onChange={(e) =>
                cambiarValor(
                  "cantidadCables",
                  e.target.value
                )
              }
            />
          </div>
        </>
      )}

      {/* ===================================================
          FABRICAR A 440V
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>
          Fabricar a 440V
        </label>

        <input
          type="checkbox"
          checked={
            valores.fabricar440
          }
          disabled
        />
      </div>

      {/* ===================================================
          TRIFÁSICA
          No aplica para TIRA
      =================================================== */}

      {valores.tipo !== "TIRA" && (
        <div className="res-stock-campo res-stock-check">
          <label>
            Trifásica
          </label>

          <input
            type="checkbox"
            checked={
              valores.trifasica
            }
            onChange={(e) =>
              cambiarValor(
                "trifasica",
                e.target.checked
              )
            }
          />
        </div>
      )}

      {/* ===================================================
          CAJA
          No aplica para TIRA
      =================================================== */}

      {valores.tipo !== "TIRA" && (
        <div className="res-stock-campo res-stock-check">
          <label>Caja</label>

          <input
            type="checkbox"
            checked={valores.caja}
            onChange={(e) =>
              cambiarValor(
                "caja",
                e.target.checked
              )
            }
          />
        </div>
      )}

      {/* ===================================================
          TERMOPAR
      =================================================== */}

      <div className="res-stock-campo res-stock-check">
        <label>Termopar</label>

        <input
          type="checkbox"
          checked={valores.termopar}
          onChange={(e) =>
            cambiarTermopar(
              e.target.checked
            )
          }
        />
      </div>

      {/* ===================================================
          SELECT TIPO DE TERMOPAR
      =================================================== */}

      {valores.termopar && (
        <>
          <div className="res-stock-campo">
            <label>
              Tipo de termopar
            </label>

            <select
              value={
                valores.tipoTermoparSeleccionado
              }
              onChange={(e) =>
                cambiarTipoTermopar(
                  e.target.value
                )
              }
            >
              <option value="">
                Seleccione...
              </option>

              {catalogoTermopar.map(
                (item, index) => (
                  <option
                    key={index}
                    value={item.nombre}
                  >
                    {item.nombre}
                  </option>
                )
              )}
            </select>
          </div>

          {/* LONGITUD TERMOPAR */}

          <div className="res-stock-campo">
            <label>
              Longitud (cm)
            </label>

            <input
              type="number"
              min={0}
              step="any"
              disabled={
                !valores.tipoTermoparSeleccionado
              }
              value={
                valores.longitudTermoparCm
              }
              onChange={(e) =>
                cambiarValor(
                  "longitudTermoparCm",
                  e.target.value
                )
              }
            />
          </div>
        </>
      )}

      {/* ===================================================
          EXCEDENTE DE BANDA
          No aplica para TIRA
      =================================================== */}

      {valores.tipo !== "TIRA" && (
        <div className="res-stock-campo res-stock-check">
          <label>
            Excedente de Banda
          </label>

          <input
            type="checkbox"
            checked={
              valores.excedenteBanda
            }
            onChange={(e) =>
              cambiarValor(
                "excedenteBanda",
                e.target.checked
              )
            }
          />
        </div>
      )}

      {/* ===================================================
          DATOS ADICIONALES
      =================================================== */}

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
          placeholder="Datos adicionales..."
        />
      </div>
    </div>
  );
};

export default StockBanda;