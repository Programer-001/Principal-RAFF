// src/plantillaEnvio.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

interface ItemEnvio {
  descripcion: string;
  cantidad: number;
  unidad: string;
}

interface EnvioData {
  folio: string;
  destinoNombre: string;
  destinoCalle: string;
  destinoNumero: string;
  destinoInterior?: string;
  destinoColonia?: string;
  destinoCP: string;
  destinoMunicipio: string;
  destinoEstado: string;
  destinoTelefono?: string;
  guiapaqueteria?: string;
  paqueteria?: string;
  notaspaquete?: string;
  productos: ItemEnvio[];
}

export const generarPDFEnvio = async (envio: EnvioData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // =========================
  // CARGAR SVG
  // =========================
  const response = await fetch("/svg/logo_negro.svg");
  const svgText = await response.text();

  const parser = new DOMParser();
  const svgElement = parser.parseFromString(
    svgText,
    "image/svg+xml"
  ).documentElement;

  // =========================
  // LOGO
  // =========================
  const logoWidth = 45;
  const logoY = 20;

  await doc.svg(svgElement, {
    x: 20,
    y: logoY,
    width: logoWidth,
  });

  // =========================
  // DATOS EMPRESA
  // =========================
  const empresaX = 75;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RAFF Especialistas térmicos", empresaX, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("RFC: RET231130AN2", empresaX, 30);
  doc.text("Reforma 1462, Santa Tere, 44600", empresaX, 35);
  doc.text("Guadalajara, Jalisco, México", empresaX, 40);
  doc.text("Tel (33)40409058", empresaX, 46);

  // =========================
  // SAT
  // =========================
  const destinoY = 75;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SAT:", 20, destinoY);

  doc.setFont("helvetica", "normal");
  doc.text("32121600", 35, destinoY);

  // =========================
  // TITULO DESTINO
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("DESTINO", 20, destinoY + 10);

  // =========================
  // DATOS DESTINO
  // =========================
  let y = destinoY + 18;

  // Destinatario
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Destinatario:", 20, y);

  doc.setFont("helvetica", "normal");
  doc.text(envio.destinoNombre, 50, y);
  y += 7;

  // Dirección
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(envio.destinoCalle, 50, y);
  y += 7;

  // Colonia (si existe)
  if (envio.destinoColonia) {
    doc.setFont("helvetica", "bold");
    doc.text("Colonia:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(envio.destinoColonia, 50, y);
    y += 7;
  }

  // Interior (si existe)
  if (envio.destinoInterior) {
    doc.setFont("helvetica", "bold");
    doc.text("Interior:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(envio.destinoInterior, 50, y);
    y += 7;
  }

  // Código Postal
  doc.setFont("helvetica", "bold");
  doc.text("Código Postal:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(envio.destinoCP, 50, y);
  y += 7;

  // Municipio
  doc.setFont("helvetica", "bold");
  doc.text("Municipio:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(envio.destinoMunicipio, 50, y);
  y += 7;

  // Estado
  doc.setFont("helvetica", "bold");
  doc.text("Estado:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(envio.destinoEstado, 50, y);
  y += 7;

  // Teléfono
  if (envio.destinoTelefono) {
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(envio.destinoTelefono, 50, y);
    y += 7;
  }

  // Paquetería
  if (envio.paqueteria) {
    doc.setFont("helvetica", "bold");
    doc.text("Paquetería:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(envio.paqueteria, 50, y);
    y += 7;
  }

  // Guía
  if (envio.guiapaqueteria) {
    doc.setFont("helvetica", "bold");
    doc.text("Guía:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(envio.guiapaqueteria, 50, y);
    y += 7;
  }

  // =========================
  // ANOTACIONES
  // =========================
  if (envio.notaspaquete) {
    const recuadroWidth = 150;
    const recuadroHeight = 30;
    const recuadroX = 20;
    const recuadroY = y + 5;

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(recuadroX, recuadroY, recuadroWidth, recuadroHeight);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Anotaciones:", recuadroX + 2, recuadroY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const lineHeight = 4;
    const notas: string[] = doc.splitTextToSize(
      envio.notaspaquete,
      recuadroWidth - 4
    );
    let textY = recuadroY + 12;
    notas.forEach((line: string) => {
      doc.text(line, recuadroX + 2, textY);
      textY += lineHeight;
    });

    y = recuadroY + recuadroHeight + 5;
  }

  // =========================
  // FOLIO
  // =========================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Folio: ${envio.folio}`, pageWidth - 20, destinoY, {
    align: "right",
  });

  // =========================
  // TABLA PRODUCTOS
  // =========================
  autoTable(doc, {
    startY: y + 10,
    head: [["Descripción", "Cantidad", "Unidad"]],
    body: envio.productos.map((item) => [
      item.descripcion,
      item.cantidad.toString(),
      item.unidad,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: "bold" },
  });

  // =========================
  // GUARDAR
  // =========================
  doc.save(`Envio_${envio.folio}.pdf`);
};
