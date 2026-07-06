//src/plantillas/plantilla_devolucion.ts
//esta plantilla genera un pdf de la devolucion de mercancia, saldo a favor o garantia
import jsPDF from "jspdf";
import "svg2pdf.js";

export type TipoDevolucionPDF = "saldo" | "devolucion" | "garantia";

export type ProductoDevolucionPDF = {
    descripcion: string;
    cantidad: number;
    precio: number;
};

export type DevolucionPDFData = {
    tipo: TipoDevolucionPDF;
    folio: string;
    fecha: string;
    clienteNombre: string;
    productos: ProductoDevolucionPDF[];
    motivo: string;
    importe: number;
    vigencia?: string;
    metodoPago?: string;
    fechaAplicacion?: string;
    observaciones?: string;
};

const tituloPorTipo = (tipo: TipoDevolucionPDF) => {
    if (tipo === "saldo") return "SALDO A FAVOR";
    if (tipo === "devolucion") return "DEVOLUCIÓN DE MERCANCÍA";
    return "GARANTÍA";
};

export const generarPDFDevolucion = async (data: DevolucionPDFData) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RAFF Especialistas térmicos", 75, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("RFC: RET231130AN2", 75, 29);
    doc.text("Reforma 1462, Santa Tere, 44600", 75, 34);
    doc.text("Guadalajara, Jalisco, México", 75, 39);
    doc.text("Tel (33)40409058", 75, 44);

    const boxX = pageWidth - 55;
    const boxY = 20;
    const boxWidth = 35;

    doc.rect(boxX, boxY, boxWidth, 18);
    doc.setFillColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidth, 6, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("FOLIO", boxX + boxWidth / 2, boxY + 4.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(data.folio, boxX + boxWidth / 2, boxY + 13.5, {
        align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(tituloPorTipo(data.tipo), pageWidth / 2, 62, {
        align: "center",
    });

    let y = 78;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.fecha || "--", 42, y);

    y += 10;

    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.clienteNombre || "--", 42, y);

    y += 10;

    const textoInicio =
        data.tipo === "garantia"
            ? "Se hace constar que el cliente entrega la siguiente mercancía para revisión de garantía:"
            : "Se hace constar que el cliente realizó la devolución de la siguiente mercancía:";

    doc.text(doc.splitTextToSize(textoInicio, 175), 20, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.text("Producto(s):", 20, y);
    y += 7;

    doc.setFont("helvetica", "normal");

    data.productos.forEach((p) => {
        const textoProducto = `${p.cantidad} - ${p.descripcion}`;
        const lineas = doc.splitTextToSize(textoProducto, 170);
        doc.text(lineas, 25, y);
        y += lineas.length * 6;
    });

    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text(
        data.tipo === "garantia"
            ? "Motivo de la garantía:"
            : "Motivo de la devolución:",
        20,
        y
    );

    y += 7;

    doc.setFont("helvetica", "normal");
    const motivoLineas = doc.splitTextToSize(data.motivo || "--", 170);
    doc.text(motivoLineas, 25, y);
    y += motivoLineas.length * 6 + 8;

    if (data.tipo === "saldo") {
        doc.setFont("helvetica", "bold");
        doc.text(`Importe del vale: $${data.importe.toFixed(2)}`, 20, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        const textoLegal =
            "Este vale podrá utilizarse como forma de pago en futuras compras dentro de la tienda por el importe indicado. No es canjeable por efectivo, salvo que la legislación aplicable disponga lo contrario. Es indispensable presentar este vale al momento de realizar la compra.";

        const lineasLegal = doc.splitTextToSize(textoLegal, 175);
        doc.text(lineasLegal, 20, y);
        y += lineasLegal.length * 6 + 6;

        doc.setFont("helvetica", "bold");
        doc.text("Vigencia:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.vigencia || "--", 43, y);
    }

    if (data.tipo === "devolucion") {
        doc.setFont("helvetica", "bold");
        doc.text(`Importe de devolución: $${data.importe.toFixed(2)}`, 20, y);
        y += 9;

        doc.text("Método de pago:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.metodoPago || "--", 55, y);
        y += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Fecha de aplicación:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.fechaAplicacion || "--", 65, y);
    }

    if (data.tipo === "garantia") {
        doc.setFont("helvetica", "bold");
        doc.text("Observaciones:", 20, y);
        y += 7;

        doc.setFont("helvetica", "normal");
        const obs = doc.splitTextToSize(data.observaciones || "--", 175);
        doc.text(obs, 25, y);
        y += obs.length * 6;
    }

    y += 25;

    doc.setFont("helvetica", "normal");
    doc.text("Firma de quien entrega: _______________________", 20, y);

    y += 15;

    doc.text("Firma del cliente: ____________________________", 20, y);

    doc.save(`${tituloPorTipo(data.tipo)}_${data.folio}.pdf`);
};