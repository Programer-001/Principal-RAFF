import jsPDF from "jspdf";
import "svg2pdf.js";

interface OTProduccionPartidaData {
    otLabel: string;
    partida: string;
    fecha: string;
    clienteNombre: string;
    razonSocial?: string;
    telefono?: string;
    trabajador?: string;
    envio: boolean;
    factura?: number;
    descripcion: string;
    tipo?: string;
}

export const generarPDFOTProduccionPartida = async (
    data: OTProduccionPartidaData
) => {
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
    // CAJA OT (ARRIBA DERECHA)
    // =========================
    const boxWidthOT = 35;
    const boxHeightOT = 18;
    const boxX = pageWidth - boxWidthOT - 20;
    const boxY = 20;

    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidthOT, boxHeightOT);

    doc.setFillColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidthOT, 6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OT", boxX + boxWidthOT / 2, boxY + 4.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(data.otLabel.replace("OT-", ""), boxX + boxWidthOT / 2, boxY + 13.5, {
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
    doc.text(`ORDEN DE TRABAJO (PARTIDA DE PRODUCCIÓN)`, 20, 58);

    // =========================
    // DATOS GENERALES
    // =========================
    doc.setFontSize(11);

    // Fila 1
    doc.setFont("helvetica", "bold");
    doc.text("Trabajador:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.trabajador || "--", 45, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Factura:", 90, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.factura !== undefined && data.factura !== null ? String(data.factura) : "--", 108, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Fecha inicio:", 145, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.fecha || "--", 170, 70);

    // Fila 2
    doc.setFont("helvetica", "bold");
    doc.text("Partida:", 20, 76);
    doc.setFont("helvetica", "normal");
    doc.text(data.partida || "--", 38, 76);

    doc.setFont("helvetica", "bold");
    doc.text("Tipo:", 90, 76);
    doc.setFont("helvetica", "normal");
    doc.text(data.tipo || "--", 103, 76);

    doc.setFont("helvetica", "bold");
    doc.text("Envío:", 145, 76);
    doc.setFont("helvetica", "normal");
    doc.text(data.envio ? "Sí" : "No", 160, 76);

    // Bloque dinámico cliente
    let yInfo = 84;

    // =========================
    // DESCRIPCIÓN DE LA PARTIDA
    // =========================
    let y = yInfo + 10;
    const marginX = 20;
    const boxWidth = pageWidth - marginX * 2;

    const lineHeight = 5.5;
    const padding = 5;
    const tituloAltura = 10;
    const descripcionWidth = boxWidth - 10;

    const lineasDescripcion = doc.splitTextToSize(
        data.descripcion || "--",
        descripcionWidth
    );

    const altoDescripcion = lineasDescripcion.length * lineHeight;
    const altoTotal = tituloAltura + padding + altoDescripcion + padding + 4;

    if (y + altoTotal > pageHeight - 20) {
        doc.addPage();
        y = 20;
    }

    // Marco exterior
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(marginX, y, boxWidth, altoTotal);

    // Encabezado
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y, boxWidth, tituloAltura, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DESCRIPCIÓN", marginX + 3, y + 6.5);

    // Texto descripción
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(lineasDescripcion, marginX + 4, y + tituloAltura + padding + 2);

    // =========================
    // GUARDAR
    // =========================
    const nombreArchivo = `${data.otLabel}_${data.partida}_PRODUCCION.pdf`
        .replace(/\s+/g, "_")
        .replace(/[^\w.-]/g, "");

    doc.save(nombreArchivo);
};