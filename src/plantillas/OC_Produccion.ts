/// Este archivo contiene la función para generar el PDF de la orden de compra de producción, utilizando jsPDF y svg2pdf para incluir el logo en formato SVG.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

interface ItemSolicitud {
  descripcion: string;
  cantidad: number;
  unidad: string;
  cantidadRecibida?: number;
  noTienen?: boolean;
}

interface SolicitudDataPDF {
  folio: string;
  fecha?: string;
  supervisor?: string;
  productos: ItemSolicitud[];
}

export const generarPDFOrdenCompraProduccion = async (
  orden: SolicitudDataPDF
) => {
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

  const imgWidth = 60;
  const logoY = 15;
  const x = pageWidth / 2 - imgWidth / 2;

  await doc.svg(svgElement, {
    x,
    y: logoY,
    width: imgWidth,
  });

  const tituloY = logoY + 45;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEN DE COMPRA", pageWidth / 2, tituloY, {
    align: "center",
  });

  doc.setFontSize(14);
  doc.text("PRODUCCIÓN", pageWidth / 2, tituloY + 8, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Folio: ${orden.folio}`, pageWidth / 2, tituloY + 18, {
    align: "center",
  });

  if (orden.fecha) {
    doc.text(`Fecha: ${orden.fecha}`, pageWidth / 2, tituloY + 25, {
      align: "center",
    });
  }

  autoTable(doc, {
    startY: tituloY + 35,
    head: [["Descripción", "Cantidad", "Unidad", "Estado"]],
    body: orden.productos.map((item) => [
      item.descripcion,
      String(item.cantidad),
      item.unidad || "Pieza(s)",
      item.noTienen ? "NO TIENEN" : "SOLICITADO",
    ]),
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const item = orden.productos[data.row.index];

        if (item?.noTienen) {
          data.cell.styles.textColor = [180, 0, 0];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  
// Ajuste para que la firma no quede muy abajo
  const finalY = (doc as any).lastAutoTable.finalY || tituloY + 35;

let firmaY = finalY + 25;

if (firmaY > 245) {
  doc.addPage();
  firmaY = 60;
}

doc.setDrawColor(0, 0, 0);
doc.line(pageWidth / 2 - 45, firmaY, pageWidth / 2 + 45, firmaY);

doc.setFontSize(11);
doc.setFont("helvetica", "bold");
doc.text("AUTORIZÓ", pageWidth / 2, firmaY + 7, {
  align: "center",
});

doc.setFont("helvetica", "normal");
doc.text(
  `Supervisor: ${orden.supervisor || "________________"}`,
  pageWidth / 2,
  firmaY + 14,
  { align: "center" }
);

  doc.save(`Orden de compra producción ${orden.folio}.pdf`);
};