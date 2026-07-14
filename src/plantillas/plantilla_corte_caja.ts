import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

import { getDatabase, get, ref } from "firebase/database";
import { app } from "../firebase/config";

interface PagoCaja {
    id: string;
    transaccion: number;
    cantidad: number;
    metodo: string;
    factura: string;
    fecha: string;
    estatus: boolean;
    comentarios: string;
}

interface JsPDFConAutoTable extends jsPDF {
    lastAutoTable?: {
        finalY: number;
    };
}

const formatearMonedaPDF = (cantidad: number): string => {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 2,
    }).format(Number(cantidad || 0));
};

const formatearMetodo = (metodo: string): string => {
    const metodos: Record<string, string> = {
        efectivo: "Efectivo",
        cheque: "Cheque",
        tarjeta_credito: "Tarjeta crédito",
        tarjeta_debito: "Tarjeta débito",
        transferencia: "Transferencia",
        credito: "Crédito clientes",
        otro: "Otro",
    };

    return metodos[metodo] || metodo.replace("_", " ");
};

const formatearFechaCaja = (fecha: string): string => {
    if (fecha.length !== 8) {
        return fecha;
    }

    const dia = fecha.substring(0, 2);
    const mes = fecha.substring(2, 4);
    const anio = fecha.substring(4, 8);

    return `${dia}/${mes}/${anio}`;
};

const agregarLogo = async (doc: jsPDF): Promise<void> => {
    try {
        const response = await fetch("/svg/logo_negro.svg");

        if (!response.ok) {
            throw new Error("No se pudo cargar el logo");
        }

        const svgText = await response.text();

        const parser = new DOMParser();

        const svgElement = parser.parseFromString(
            svgText,
            "image/svg+xml"
        ).documentElement;

        await doc.svg(svgElement, {
            x: 14,
            y: 8,
            width: 45,
            height: 22,
        });
    } catch (error) {
        console.error("No se pudo agregar el logo al PDF:", error);
    }
};

const agregarPiePagina = (doc: jsPDF): void => {
    const totalPaginas = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina);

        doc.setDrawColor(180);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(90);

        doc.text(
            "RAFF Especialistas Térmicos",
            14,
            pageHeight - 9
        );

        doc.text(
            `Página ${pagina} de ${totalPaginas}`,
            pageWidth - 14,
            pageHeight - 9,
            {
                align: "right",
            }
        );
    }
};

export const generarPDFCorteCaja = async (
    fecha: string
): Promise<void> => {
    try {
        const db = getDatabase(app);

        const pagosRef = ref(
            db,
            `corte-caja/${fecha}`
        );

        const snapshot = await get(pagosRef);

        if (!snapshot.exists()) {
            alert(
                "No hay movimientos de caja registrados para este día."
            );
            return;
        }

        const data = snapshot.val();

        const pagos = Object.values(data) as PagoCaja[];

        pagos.sort(
            (a, b) =>
                Number(a.transaccion || 0) -
                Number(b.transaccion || 0)
        );

        const pagosActivos = pagos.filter(
            (pago) => pago.estatus === true
        );

        const pagosCancelados = pagos.filter(
            (pago) => pago.estatus === false
        );

        const calcularTotal = (metodo: string): number => {
            return pagosActivos
                .filter(
                    (pago) => pago.metodo === metodo
                )
                .reduce(
                    (total, pago) =>
                        total + Number(pago.cantidad || 0),
                    0
                );
        };

        const totalEfectivo =
            calcularTotal("efectivo");

        const totalCheque =
            calcularTotal("cheque");

        const totalTarjetaCredito =
            calcularTotal("tarjeta_credito");

        const totalTarjetaDebito =
            calcularTotal("tarjeta_debito");

        const totalTransferencia =
            calcularTotal("transferencia");

        const totalCreditoClientes =
            calcularTotal("credito");

        const totalOtro =
            calcularTotal("otro");

        const totalGeneral = pagosActivos.reduce(
            (total, pago) =>
                total + Number(pago.cantidad || 0),
            0
        );

        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "letter",
        }) as JsPDFConAutoTable;

        const pageWidth =
            doc.internal.pageSize.getWidth();

        await agregarLogo(doc);

        // Datos de la empresa
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);

        doc.text(
            "RAFF Especialistas Térmicos",
            pageWidth - 14,
            12,
            {
                align: "right",
            }
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);

        doc.text(
            "Reforma 1462, Santa Tere",
            pageWidth - 14,
            17,
            {
                align: "right",
            }
        );

        doc.text(
            "Guadalajara, Jalisco, México",
            pageWidth - 14,
            21,
            {
                align: "right",
            }
        );

        doc.text(
            "Tel. (33) 4040 9058",
            pageWidth - 14,
            25,
            {
                align: "right",
            }
        );

        // Línea de encabezado
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(14, 33, pageWidth - 14, 33);

        // Título
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);

        doc.text(
            "CORTE DE CAJA",
            pageWidth / 2,
            43,
            {
                align: "center",
            }
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(
            `Fecha del corte: ${formatearFechaCaja(fecha)}`,
            pageWidth / 2,
            50,
            {
                align: "center",
            }
        );

        doc.setFontSize(8);

        doc.text(
            `Generado: ${new Date().toLocaleDateString(
                "es-MX"
            )} ${new Date().toLocaleTimeString("es-MX")}`,
            pageWidth / 2,
            56,
            {
                align: "center",
            }
        );

        // Resumen de movimientos
        const resumenY = 65;

        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(180);
        doc.roundedRect(
            14,
            resumenY,
            pageWidth - 28,
            24,
            2,
            2,
            "FD"
        );

        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);

        doc.text(
            "RESUMEN",
            19,
            resumenY + 7
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        doc.text(
            `Movimientos registrados: ${pagos.length}`,
            19,
            resumenY + 14
        );

        doc.text(
            `Pagos activos: ${pagosActivos.length}`,
            80,
            resumenY + 14
        );

        doc.text(
            `Pagos cancelados: ${pagosCancelados.length}`,
            135,
            resumenY + 14
        );

        // Totales por método
        const totalesY = resumenY + 31;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);

        doc.text(
            "TOTALES POR MÉTODO DE PAGO",
            14,
            totalesY
        );

        autoTable(doc, {
            startY: totalesY + 4,

            head: [
                [
                    "Método",
                    "Total",
                    "Método",
                    "Total",
                ],
            ],

            body: [
                [
                    "Efectivo",
                    formatearMonedaPDF(totalEfectivo),
                    "Cheque",
                    formatearMonedaPDF(totalCheque),
                ],
                [
                    "Tarjeta crédito",
                    formatearMonedaPDF(
                        totalTarjetaCredito
                    ),
                    "Tarjeta débito",
                    formatearMonedaPDF(
                        totalTarjetaDebito
                    ),
                ],
                [
                    "Transferencia",
                    formatearMonedaPDF(
                        totalTransferencia
                    ),
                    "Crédito clientes",
                    formatearMonedaPDF(
                        totalCreditoClientes
                    ),
                ],
                [
                    "Otro",
                    formatearMonedaPDF(totalOtro),
                    "TOTAL GENERAL",
                    formatearMonedaPDF(totalGeneral),
                ],
            ],

            theme: "grid",

            headStyles: {
                fillColor: [0, 0, 0],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center",
                fontSize: 8,
            },

            bodyStyles: {
                fontSize: 8,
                textColor: [0, 0, 0],
                cellPadding: 2,
            },

            columnStyles: {
                0: {
                    cellWidth: 42,
                },
                1: {
                    cellWidth: 42,
                    halign: "right",
                },
                2: {
                    cellWidth: 42,
                },
                3: {
                    cellWidth: 42,
                    halign: "right",
                },
            },

            margin: {
                left: 14,
                right: 14,
            },

            didParseCell: (hookData) => {
                if (
                    hookData.section === "body" &&
                    hookData.row.index === 3 &&
                    (
                        hookData.column.index === 2 ||
                        hookData.column.index === 3
                    )
                ) {
                    hookData.cell.styles.fillColor = [
                        0,
                        0,
                        0,
                    ];

                    hookData.cell.styles.textColor = [
                        255,
                        255,
                        255,
                    ];

                    hookData.cell.styles.fontStyle =
                        "bold";
                }
            },
        });

        const detalleY =
            (doc.lastAutoTable?.finalY || 130) + 10;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0);

        doc.text(
            "DETALLE DE MOVIMIENTOS",
            14,
            detalleY
        );

        autoTable(doc, {
            startY: detalleY + 4,

            head: [
                [
                    "#",
                    "Factura",
                    "Método",
                    "Cantidad",
                    "Estado",
                    "Comentarios",
                ],
            ],

            body: pagos.map((pago) => [
                pago.transaccion,
                pago.factura || "-",
                formatearMetodo(pago.metodo),
                formatearMonedaPDF(pago.cantidad),
                pago.estatus
                    ? "Activo"
                    : "CANCELADO",
                pago.comentarios || "-",
            ]),

            theme: "grid",

            headStyles: {
                fillColor: [0, 0, 0],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center",
                fontSize: 7.5,
            },

            bodyStyles: {
                fontSize: 7.5,
                textColor: [0, 0, 0],
                cellPadding: 1.8,
                valign: "middle",
            },

            columnStyles: {
                0: {
                    cellWidth: 11,
                    halign: "center",
                },
                1: {
                    cellWidth: 29,
                },
                2: {
                    cellWidth: 33,
                },
                3: {
                    cellWidth: 30,
                    halign: "right",
                },
                4: {
                    cellWidth: 23,
                    halign: "center",
                },
                5: {
                    cellWidth: 56,
                },
            },

            margin: {
                left: 14,
                right: 14,
                bottom: 22,
            },

            showHead: "everyPage",

            didParseCell: (hookData) => {
                if (hookData.section !== "body") {
                    return;
                }

                const pago =
                    pagos[hookData.row.index];

                if (!pago || pago.estatus) {
                    return;
                }

                hookData.cell.styles.fillColor = [
                    254,
                    226,
                    226,
                ];

                hookData.cell.styles.textColor = [
                    185,
                    28,
                    28,
                ];

                if (hookData.column.index === 4) {
                    hookData.cell.styles.fontStyle =
                        "bold";
                }
            },
        });

        let finalY =
            (doc.lastAutoTable?.finalY || detalleY) + 10;

        const pageHeight =
            doc.internal.pageSize.getHeight();

        // Si no hay espacio para las firmas, agrega otra página
        if (finalY > pageHeight - 45) {
            doc.addPage();
            finalY = 35;
        }

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(90);

        doc.text(
            "Nota: Los pagos cancelados aparecen en el reporte, pero no forman parte del total general.",
            14,
            finalY
        );

        finalY += 25;

        doc.setDrawColor(0);

        doc.line(
            25,
            finalY,
            85,
            finalY
        );

        doc.line(
            pageWidth - 85,
            finalY,
            pageWidth - 25,
            finalY
        );

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        doc.text(
            "Caja",
            55,
            finalY + 5,
            {
                align: "center",
            }
        );

        doc.text(
            "Administración",
            pageWidth - 55,
            finalY + 5,
            {
                align: "center",
            }
        );

        agregarPiePagina(doc);

        const fechaArchivo = formatearFechaCaja(fecha)
            .replace("/", "-");

        doc.save(
            `Corte_Caja_${fechaArchivo}.pdf`
        );
    } catch (error) {
        console.error(
            "Error al generar el PDF de caja:",
            error
        );

        alert(
            "No se pudo generar el PDF del corte de caja."
        );
    }
};