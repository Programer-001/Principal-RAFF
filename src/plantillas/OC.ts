import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

interface ItemOrden {
  descripcion: string;
  cantidad: number;
  unidad: string;
}

interface OrdenData {
  folio: string;
  productos: ItemOrden[];
}

export const generarPDFOrdenCompra = async (orden: OrdenData) => {
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
  // LOGO CENTRADO (VECTOR REAL)
  // =========================
  const imgWidth = 60; // ancho final en mm
  const logoY = 15;
  const x = pageWidth / 2 - imgWidth / 2;

  await doc.svg(svgElement, {
    x,
    y: logoY,
    width: imgWidth,
  });

  // 🔹 Altura aproximada del logo
  const imgHeight = 25; // puedes ajustar si lo ves muy alto

  const tituloY = logoY + imgHeight + 20;
  const folioY = tituloY + 10;
  const tablaY = folioY + 10;

  // =========================
  // TÍTULO
  // =========================
  doc.setFontSize(18);
  doc.text("ORDEN DE COMPRA", pageWidth / 2, tituloY, {
    align: "center",
  });

  // =========================
  // FOLIO
  // =========================
  doc.setFontSize(12);
  doc.text(`Folio: ${orden.folio}`, pageWidth / 2, folioY, {
    align: "center",
  });

  // =========================
  // TABLA
  // =========================
  autoTable(doc, {
    startY: tablaY,
    head: [["Descripción", "Cantidad", "Unidad"]],
    body: orden.productos.map((item) => [
      item.descripcion,
      item.cantidad.toString(),
      item.unidad,
    ]),
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [0, 0, 0],
    },
  });

  doc.save(`Orden de compra ${orden.folio}.pdf`);
};
