export const generarFormatoPermiso = async (permiso: any) => {
    const nuevaVentana = window.open("", "_blank");

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
                <p><strong>Tipo:</strong> ${permiso.tipo}</p>
                <p><strong>Forma de Pago:</strong> ${permiso.formaPago}</p>
                <p><strong>Inicio:</strong> ${permiso.inicio}</p>
                <p><strong>Fin:</strong> ${permiso.fin}</p>

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
            setTimeout(() => window.print(), 500);
          };
        </script>
      </body>
      </html>
    `);

        nuevaVentana.document.close();
    }
};