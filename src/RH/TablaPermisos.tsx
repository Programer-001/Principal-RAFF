// src/RH/TablaPermisos.tsx

import React, { useMemo, useState } from "react";

import "../css/TablaPermisos.css";


interface Permiso {
    id: string;
    empleadoId?: string;
    empleado: string;
    tipo: string;
    inicio: string;
    fin: string;
    formaPago: string;
    horaPermiso?: string;
}


interface TablaPermisosProps {
    permisos: Permiso[];
    onEditar: (permiso: Permiso) => void;
    onEliminar: (id: string) => void;
    onImprimir: (permiso: Permiso) => void;
    onCerrar: () => void;
}


const TablaPermisos: React.FC<TablaPermisosProps> = ({
    permisos,
    onEditar,
    onEliminar,
    onImprimir,
    onCerrar,
}) => {

    const [busqueda, setBusqueda] = useState("");

    const [tipoFiltro, setTipoFiltro] = useState("");

    const [pagoFiltro, setPagoFiltro] = useState("");


    const obtenerTextoTipo = (tipo: string) => {

        switch (tipo) {

            case "vacaciones":
                return "Vacaciones";

            case "Enfermedad":
                return "Enfermedad";

            case "Personal":
                return "Día personal";

            case "entrada_tarde":
                return "Entrada tarde";

            case "salida_temprano":
                return "Salida temprano";

            default:
                return tipo;

        }

    };


    const obtenerTextoFormaPago = (formaPago: string) => {

        switch (formaPago) {

            case "vacaciones":
                return "Día de vacaciones";

            case "Tiempo":
                return "Tiempo acumulado";

            case "Sueldo":
                return "Descuento salarial";

            case "salario_60_receta":
                return "Salario 60% (receta médica)";

            default:
                return formaPago;

        }

    };


    const permisosFiltrados = useMemo(() => {

        const texto =
            busqueda
                .trim()
                .toLowerCase();


        return permisos.filter((permiso) => {

            const coincideBusqueda =
                !texto ||
                permiso.empleado
                    ?.toLowerCase()
                    .includes(texto) ||
                permiso.id
                    ?.toLowerCase()
                    .includes(texto);


            const coincideTipo =
                !tipoFiltro ||
                permiso.tipo === tipoFiltro;


            const coincidePago =
                !pagoFiltro ||
                permiso.formaPago === pagoFiltro;


            return (
                coincideBusqueda &&
                coincideTipo &&
                coincidePago
            );

        });

    }, [
        permisos,
        busqueda,
        tipoFiltro,
        pagoFiltro
    ]);


    return (

        <div
            className="permisos-modal-overlay"
            onClick={onCerrar}
        >

            <div
                className="permisos-modal"
                onClick={(e) =>
                    e.stopPropagation()
                }
            >


                {/* =========================
                    ENCABEZADO
                ========================= */}

                <div className="permisos-modal-header">

                    <div className="permisos-modal-titulo">

                        <h2>
                            Permisos registrados
                        </h2>

                        <span>
                            {permisosFiltrados.length} permiso(s) encontrado(s)
                        </span>

                    </div>


                    <button
                        type="button"
                        className="permisos-cerrar-x"
                        onClick={onCerrar}
                        title="Cerrar"
                    >
                        ×
                    </button>

                </div>


                {/* =========================
                    FILTROS
                ========================= */}

                <div className="permisos-filtros">

                    <input
                        type="text"
                        placeholder="Buscar empleado o ID..."
                        value={busqueda}
                        onChange={(e) =>
                            setBusqueda(
                                e.target.value
                            )
                        }
                    />


                    <select
                        value={tipoFiltro}
                        onChange={(e) =>
                            setTipoFiltro(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Todos los tipos
                        </option>

                        <option value="vacaciones">
                            Vacaciones
                        </option>

                        <option value="Enfermedad">
                            Enfermedad
                        </option>

                        <option value="Personal">
                            Día personal
                        </option>

                        <option value="entrada_tarde">
                            Entrada tarde
                        </option>

                        <option value="salida_temprano">
                            Salida temprano
                        </option>

                    </select>


                    <select
                        value={pagoFiltro}
                        onChange={(e) =>
                            setPagoFiltro(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Todas las formas de pago
                        </option>

                        <option value="vacaciones">
                            Día de vacaciones
                        </option>

                        <option value="Tiempo">
                            Tiempo acumulado
                        </option>

                        <option value="Sueldo">
                            Descuento salarial
                        </option>

                        <option value="salario_60_receta">
                            Salario 60%
                        </option>

                    </select>


                    {(busqueda ||
                        tipoFiltro ||
                        pagoFiltro) && (

                        <button
                            type="button"
                            className="permisos-limpiar"
                            onClick={() => {

                                setBusqueda("");

                                setTipoFiltro("");

                                setPagoFiltro("");

                            }}
                        >
                            Limpiar
                        </button>

                    )}

                </div>


                {/* =========================
                    TABLA
                ========================= */}

                <div className="permisos-tabla-contenedor">

                    <table className="permisos-tabla">

                        <thead>

                            <tr>

                                <th className="permisos-col-id">
                                    ID
                                </th>

                                <th className="permisos-col-empleado">
                                    Empleado
                                </th>

                                <th className="permisos-col-tipo">
                                    Tipo
                                </th>

                                <th className="permisos-col-pago">
                                    Pago
                                </th>

                                <th className="permisos-col-fecha">
                                    Inicio
                                </th>

                                <th className="permisos-col-fecha">
                                    Fin
                                </th>

                                <th className="permisos-col-hora">
                                    Hora
                                </th>

                                <th className="permisos-col-acciones">
                                    Acciones
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {permisosFiltrados.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan={8}
                                        className="permisos-sin-resultados"
                                    >
                                        No se encontraron permisos.
                                    </td>

                                </tr>

                            ) : (

                                permisosFiltrados.map(
                                    (permiso) => (

                                        <tr key={permiso.id}>


                                            {/* ID */}

                                            <td>
                                                {permiso.id}
                                            </td>


                                            {/* EMPLEADO */}

                                            <td>
                                                {permiso.empleado}
                                            </td>


                                            {/* TIPO */}

                                            <td>
                                                {obtenerTextoTipo(
                                                    permiso.tipo
                                                )}
                                            </td>


                                            {/* PAGO */}

                                            <td>
                                                {obtenerTextoFormaPago(
                                                    permiso.formaPago
                                                )}
                                            </td>


                                            {/* INICIO */}

                                            <td className="permisos-fecha">
                                                {permiso.inicio}
                                            </td>


                                            {/* FIN */}

                                            <td className="permisos-fecha">
                                                {permiso.fin}
                                            </td>


                                            {/* HORA */}

                                            <td className="permisos-col-hora">

                                                {permiso.horaPermiso || "-"}

                                            </td>


                                            {/* ACCIONES */}

                                            <td className="permisos-col-acciones">

                                                <div className="permisos-acciones">


                                                    <button
                                                        type="button"
                                                        className="
                                                            permisos-accion
                                                            permisos-accion-editar
                                                        "
                                                        onClick={() =>
                                                            onEditar(
                                                                permiso
                                                            )
                                                        }
                                                        title="Editar permiso"
                                                    >
                                                        ✏️
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="
                                                            permisos-accion
                                                            permisos-accion-imprimir
                                                        "
                                                        onClick={() =>
                                                            onImprimir(
                                                                permiso
                                                            )
                                                        }
                                                        title="Imprimir permiso"
                                                    >
                                                        🖨️
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="
                                                            permisos-accion
                                                            permisos-accion-eliminar
                                                        "
                                                        onClick={() =>
                                                            onEliminar(
                                                                permiso.id
                                                            )
                                                        }
                                                        title="Eliminar permiso"
                                                    >
                                                        ×
                                                    </button>


                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>

                </div>


                {/* =========================
                    PIE
                ========================= */}

                <div className="permisos-modal-footer">

                    <button
                        type="button"
                        className="permisos-btn-cerrar"
                        onClick={onCerrar}
                    >
                        Cerrar
                    </button>

                </div>


            </div>

        </div>

    );

};


export default TablaPermisos;