//src/plantillas/plantillaPermiso.ts
export const generarFormatoPermiso = async (permiso: any) => {
    const nuevaVentana = window.open("", "_blank");
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
            return tipo || "-";
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
            return formaPago || "-";
    }
};

const esPermisoPorHora =
    permiso.tipo === "entrada_tarde" ||
    permiso.tipo === "salida_temprano";

const textoHora =
    permiso.tipo === "entrada_tarde"
        ? "Hora autorizada de entrada"
        : "Hora autorizada de salida";

    if (nuevaVentana) {
        // 🔥 Cargar logo SVG igual que en tu otra plantilla
        const response = await fetch("/svg/logo_negro.svg");
        const logoSvg = await response.text();

        nuevaVentana.document.write(`
      <html>
      <head>
        <title>Formato Permiso de Trabajo</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 20px; 
          }

          .contenedor-permisos {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .container { 
            width: 90%; 
            border: 2px solid black; 
            padding: 20px; 
            text-align: left; 
          }

          h2 { text-align: center; }

          .info { margin-bottom: 15px; }

          .firma {
            margin-top: 30px;
            display: flex;
            justify-content: space-between; 
            text-align: center;
          }

          .firma div {
            margin-top: 40px;
            border-top: 1px solid black;
            padding-top: 5px;
            width: 45%;
          }

          .logo-wrap {
            text-align: center;
            margin-bottom: 5px;

          }

          .logo-wrap svg {
            width: 180px;
            height: auto;
          }

          @media print {
            .logo-wrap {
              text-align: center;
              margin-bottom: 10px;
            }

            .logo-wrap svg {
              width: 180px;
              height: auto;
              display: inline-block;
            }
          }
        </style>
      </head>

      <body>
        <div class="contenedor-permisos">

          ${[1, 2]
                .map(
                    (_, i) => `
            <div class="container">
              <div class="logo-wrap">
                ${logoSvg}
              </div>

              <h2>
                ${i === 0
                            ? "Solicitud de Permiso"
                            : "Solicitud de Permiso (Copia para el empleado)"
                        }
              </h2>

              <div class="info">
                     <p><strong>Código:</strong> ${permiso.id}</p>
                    <p><strong>Empleado:</strong> ${permiso.empleado}</p>
                    <p><strong>Tipo:</strong> ${obtenerTextoTipo(permiso.tipo)}</p>
                    <p><strong>Forma de Pago:</strong> ${obtenerTextoFormaPago(permiso.formaPago)}</p>

                    ${
                        esPermisoPorHora
                            ? `
                                <p><strong>Fecha:</strong> ${permiso.inicio}</p>
                                <p><strong>${textoHora}:</strong> ${permiso.horaPermiso || "-"}</p>
                              `
                            : `
                                <p><strong>Inicio:</strong> ${permiso.inicio}</p>
                                <p><strong>Fin:</strong> ${permiso.fin}</p>
                              `
                    }

                ${permiso.tipo === "vacaciones"
                            ? `<p>Hago constar que se me entregó el pago correspondiente a la prima vacacional por los días antes mencionados.</p>`
                            : ""
                        }
              </div>

              <div class="firma">
                <div>
                  <p>Firma del Empleado</p>
                  ${permiso.empleado}
                </div>
                <div>
                  <p>Firma del Encargado</p>
                </div>
              </div>
            </div>
          `
                )
                .join("")}

        </div>

<script>
  window.onload = () => {
    setTimeout(() => {
      window.focus();
      window.print();
    }, 500);
  };

  window.onafterprint = () => {
    window.close();
  };
</script>

      </body>
      </html>
    `);

        nuevaVentana.document.close();
    }
};