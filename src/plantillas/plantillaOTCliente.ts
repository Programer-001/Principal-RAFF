import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatearMoneda } from "../funciones/formato_moneda";
import "svg2pdf.js";

interface Concepto {
  partida: string;
  descripcion: string;
  subtotal: number;
}

interface OTClienteData {
    otLabel: string;
    factura?: string;
    fecha: string;
    clienteNombre: string;
    telefono?: string;
    envio: boolean;
    empresa?: string;
    razonSocial?: string;
    asesor?: string;

    conceptos: Concepto[];

    subtotal: number;
    iva: number;
    total: number;
}

export const generarPDFOTCliente = async (data: OTClienteData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

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
    y: 20,
    width: 45,
  });
    // =========================
    // CAJA OT (ARRIBA DERECHA)
    // =========================
    const boxWidth = 35;
    const boxHeight = 18;
    const boxX = pageWidth - boxWidth - 20;
    const boxY = 20;

    // Marco
    doc.setDrawColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidth, boxHeight);

    // Encabezado negro
    doc.setFillColor(0, 0, 0);
    doc.rect(boxX, boxY, boxWidth, 6, "F");

    // Texto "OT"
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OT", boxX + boxWidth / 2, boxY + 4.5, { align: "center" });

    // Número
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(data.otLabel.replace("OT-", ""), boxX + boxWidth / 2, boxY + 13.5, {
        align: "center",
    });
  // =========================
  // EMPRESA
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RAFF Especialistas térmicos", 75, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("RFC: RET231130AN2", 75, 30);
  doc.text("Reforma 1462, Santa Tere, 44600", 75, 35);
  doc.text("Guadalajara, Jalisco, México", 75, 40);
  doc.text("Tel (33)40409058", 75, 45);

  // =========================
  // TITULO
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`ORDEN DE TRABAJO (CLIENTE)`, 20, 60);

    // =========================
    // DATOS OT
    // =========================
    doc.setFontSize(11);

    // MISMO RENGLÓN
    doc.setFont("helvetica", "bold");
    doc.text("Asesor:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.asesor || "--", 40, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Factura:", 90, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.factura && data.factura.trim() !== "" ? data.factura : "--", 115, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 150, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.fecha, 165, 70);

  // =========================
  // CLIENTE
  // =========================
    let y = 80;

    // RAZÓN SOCIAL
    if (data.razonSocial && data.razonSocial.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Razón social:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.razonSocial, 52, y);
        y += 7;
    }

    // CLIENTE
    if (data.clienteNombre && data.clienteNombre.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.clienteNombre, 45, y);
        y += 7;
    }

    // EMPRESA
    if (data.empresa && data.empresa.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Empresa:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.empresa, 45, y);
        y += 7;
    }

    // TELÉFONO
    if (data.telefono && data.telefono.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Teléfono:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.telefono, 45, y);
        y += 7;
    }

    // ENVÍO
    doc.setFont("helvetica", "bold");
    doc.text("Envío:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.envio ? "Sí" : "No", 45, y);

  // =========================
  // CONCEPTOS
  // =========================
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Conceptos", 20, y);

  // =========================
  // TABLA
  // =========================
  autoTable(doc, {
    startY: y + 5,
    head: [["Partida", "Descripción", "Subtotal"]],
    body: data.conceptos.map((c) => [
      c.partida,
      c.descripcion,
        `$ ${formatearMoneda(c.subtotal)}`,
    ]),
    styles: { fontSize: 9 },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 28 }, // partida más compacta
      1: { cellWidth: 110 }, // 🔥 descripción más grande
      2: { cellWidth: 32, halign: "right" }, // subtotal fijo a la derecha
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // =========================
  // FIRMA
  // =========================
  doc.line(20, finalY + 20, 90, finalY + 20);

  doc.setFontSize(10);
  doc.text("Firma de conformidad", 20, finalY + 25);

  doc.text(data.clienteNombre, 20, finalY + 30);

  // =========================
  // TOTALES
  // =========================
    const totalesX = pageWidth - 60;

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", totalesX, finalY + 10);
    doc.text("IVA:", totalesX, finalY + 16);
    doc.text("Total:", totalesX, finalY + 22);

    doc.setFont("helvetica", "normal");
    doc.text(`$ ${formatearMoneda(data.subtotal)}`, pageWidth - 20, finalY + 10, {
        align: "right",
    });
    doc.text(`$ ${formatearMoneda(data.iva)}`, pageWidth - 20, finalY + 16, {
        align: "right",
    });
    doc.text(`$ ${formatearMoneda(data.total)}`, pageWidth - 20, finalY + 22, {
        align: "right",
    });
  // =========================
  // TERMINOS Y CONDICIONES
  // =========================
  const textoTerminos = `
TÉRMINOS Y CONDICIONES

Tiempo de entrega para resistencias tubulares, de banda y cartucho de baja concentración: de 15 a 20 días hábiles.

Tiempo de entrega para resistencias de cartucho de alta concentración: 25 días hábiles.

En caso de que el producto sea terminado antes del plazo indicado, se notificará oportunamente al cliente.

Cualquier validación de garantía deberá solicitarse dentro de un periodo máximo de 5 días hábiles a partir de la entrega del trabajo.

La garantía aplica únicamente por defectos de fabricación, quedando excluidos los daños ocasionados por instalación incorrecta, puesta en marcha inadecuada, manipulación o alteración del producto, o uso distinto al recomendado.

No aplica garantía en productos fabricados conforme a especificaciones del cliente cuando se hayan recomendado previamente otras características de diseño o fabricación.
`;

  const startYTerminos = finalY + 35;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9); // 🔥 pequeño pero legible
  doc.text("TÉRMINOS Y CONDICIONES", 20, startYTerminos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8); // 🔥 aquí va lo pequeño elegante

  const textoFormateado = doc.splitTextToSize(textoTerminos, 170);

  doc.text(textoFormateado, 20, startYTerminos + 5);
  // =========================
  // GUARDAR
  // =========================
  doc.save(`${data.otLabel}.pdf`);
};
