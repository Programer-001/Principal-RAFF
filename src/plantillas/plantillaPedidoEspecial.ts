// src/plantillas/plantillaPedidoEspecial.ts
import jsPDF from "jspdf";
import "svg2pdf.js";

interface PartidaProveedor {
    cantidad: number;
    descripcion: string;
    potencia: string;
    voltaje: string;
}

interface PedidoProveedorData {
    folio: string;
    proveedor: string;
    partidas: PartidaProveedor[];
}

export const generarPDFPedidoProveedor = async (data: PedidoProveedorData) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // =========================
    // LOGO
    // =========================
    const response = await fetch("/svg/logo_negro.svg");
    const svgText = await response.text();

    const parser = new DOMParser();
    const svgElement = parser.parseFromString(
        svgText,
        "image/svg+xml"
    ).documentElement;

    await doc.svg(svgElement, {
        x: 20,
        y: 18,
        width: 45,
    });

    // =========================
    // CAJA PEDIDO (ARRIBA DERECHA)
    // =========================
    const boxWidthPedido = 40;
    const boxHeightPedido = 18;
    const boxX = pageWidth - boxWidthPedido - 20;
    const boxY = 20;

    // Marco
    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidthPedido, boxHeightPedido);

    // Encabezado negro
    doc.setFillColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidthPedido, 6, "F");

    // Texto "PEDIDO"
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("PEDIDO", boxX + boxWidthPedido / 2, boxY + 4.5, {
        align: "center",
    });

    // Número de pedido
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(data.folio, boxX + boxWidthPedido / 2, boxY + 13.5, {
        align: "center",
    });

    // =========================
    // EMPRESA
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RAFF Especialistas térmicos", 75, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("RFC: RET231130AN2", 75, 29);
    doc.text("Reforma 1462, Santa Tere, 44600", 75, 34);
    doc.text("Guadalajara, Jalisco, México", 75, 39);
    doc.text("Tel (33)40409058", 75, 44);

    // =========================
    // TITULO
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("PEDIDO ESPECIAL", 20, 58);

    // =========================
    // FECHA DE HOY
    // =========================
    const hoy = new Date();
    const fechaHoy =
        hoy.getDate().toString().padStart(2, "0") +
        "/" +
        (hoy.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        hoy.getFullYear();

    // =========================
    // DATOS GENERALES
    // =========================
    doc.setFontSize(11);

    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(fechaHoy, 35, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Proveedor:", 20, 76);
    doc.setFont("helvetica", "normal");
    doc.text(data.proveedor || "--", 42, 76);

    // =========================
    // TABLA
    // =========================
    let y = 86;

    const marginX = 20;
    const totalWidth = pageWidth - marginX * 2;

    const colCantidad = 22;
    const colDescripcion = 92;
    const colPotencia = 28;
    const colVoltaje = totalWidth - colCantidad - colDescripcion - colPotencia;

    const nuevaPaginaSiHaceFalta = (altoNecesario: number) => {
        if (y + altoNecesario > pageHeight - 20) {
            doc.addPage();
            y = 20;

            // repetir encabezado de tabla
            dibujarEncabezadoTabla();
        }
    };

    const dibujarEncabezadoTabla = () => {
        doc.setDrawColor(0);
        doc.setFillColor(230, 230, 230);
        doc.rect(marginX, y, totalWidth, 8, "F");

        // divisiones
        doc.rect(marginX, y, colCantidad, 8);
        doc.rect(marginX + colCantidad, y, colDescripcion, 8);
        doc.rect(marginX + colCantidad + colDescripcion, y, colPotencia, 8);
        doc.rect(
            marginX + colCantidad + colDescripcion + colPotencia,
            y,
            colVoltaje,
            8
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Cantidad", marginX + 2, y + 5);
        doc.text("Descripción", marginX + colCantidad + 2, y + 5);
        doc.text(
            "Potencia",
            marginX + colCantidad + colDescripcion + 2,
            y + 5
        );
        doc.text(
            "Voltaje",
            marginX + colCantidad + colDescripcion + colPotencia + 2,
            y + 5
        );

        y += 8;
    };

    dibujarEncabezadoTabla();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    data.partidas.forEach((p) => {
        const descripcionLineas = doc.splitTextToSize(
            p.descripcion || "-",
            colDescripcion - 4
        );

        const lineHeight = 5;
        const paddingY = 3;
        const alturaTexto = descripcionLineas.length * lineHeight;
        const alturaFila = Math.max(12, alturaTexto + paddingY * 2);

        nuevaPaginaSiHaceFalta(alturaFila);

        // celdas
        doc.rect(marginX, y, colCantidad, alturaFila);
        doc.rect(marginX + colCantidad, y, colDescripcion, alturaFila);
        doc.rect(
            marginX + colCantidad + colDescripcion,
            y,
            colPotencia,
            alturaFila
        );
        doc.rect(
            marginX + colCantidad + colDescripcion + colPotencia,
            y,
            colVoltaje,
            alturaFila
        );

        // textos
        doc.text(String(p.cantidad || 0), marginX + 2, y + 6);
        doc.text(descripcionLineas, marginX + colCantidad + 2, y + 6);
        doc.text(
            p.potencia && p.potencia.trim() !== "" ? p.potencia : "-",
            marginX + colCantidad + colDescripcion + 2,
            y + 6
        );
        doc.text(
            p.voltaje && p.voltaje.trim() !== "" ? p.voltaje : "-",
            marginX + colCantidad + colDescripcion + colPotencia + 2,
            y + 6
        );

        y += alturaFila;
    });

    // =========================
    // GUARDAR
    // =========================
    doc.save(`PEDIDO_${data.folio}.pdf`);
};