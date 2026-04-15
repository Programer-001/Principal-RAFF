// src/plantillas/plantillaOTProduccion.ts
import jsPDF from "jspdf";
import "svg2pdf.js";

interface ItemProduccion {
  partida: string;
  descripcion: string;
}

interface GrupoProduccion {
  titulo: string;
  items: ItemProduccion[];
}

interface OTProduccionData {
  otLabel: string;
  fecha: string;
    clienteNombre: string;
    razonSocial?: string;
    telefono?: string;
  asesor?: string;
  envio: boolean;
  grupos: GrupoProduccion[];
}

export const generarPDFOTProduccion = async (data: OTProduccionData) => {
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
    doc.text(`ORDEN DE TRABAJO ${data.otLabel} (PRODUCCIÓN)`, 20, 58);

    // =========================
    // DATOS GENERALES
    // =========================
    doc.setFontSize(11);

    // Fila 1
    doc.setFont("helvetica", "bold");
    doc.text("Compañero:", 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.asesor || "--", 48, 70);

    doc.setFont("helvetica", "bold");
    doc.text("Fecha:", 90, 68);
    doc.setFont("helvetica", "normal");
    doc.text(data.fecha, 107, 68);

    // Fila derecha
    doc.setFont("helvetica", "bold");
    doc.text("Envío:", 150, 76);
    doc.setFont("helvetica", "normal");
    doc.text(data.envio ? "Sí" : "No", 165, 76);

    // Bloque dinámico izquierdo
    let yInfo = 76;

    if (data.razonSocial && data.razonSocial.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Razón social:", 20, yInfo);
        doc.setFont("helvetica", "normal");
        doc.text(data.razonSocial, 50, yInfo);
        yInfo += 6;
    }

    if (data.clienteNombre && data.clienteNombre.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, yInfo);
        doc.setFont("helvetica", "normal");
        doc.text(data.clienteNombre, 38, yInfo);
        yInfo += 6;
    }

    if (data.telefono && data.telefono.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Teléfono:", 20, yInfo);
        doc.setFont("helvetica", "normal");
        doc.text(data.telefono, 42, yInfo);
        yInfo += 6;
    }

    let y = yInfo + 10;
    const marginX = 20;
    const boxWidth = pageWidth - marginX * 2;

    const nuevaPaginaSiHaceFalta = (altoNecesario: number) => {
        if (y + altoNecesario > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };

  // =========================
  // FUNCION DIBUJAR BLOQUE
  // =========================
  const dibujarGrupo = (grupo: GrupoProduccion) => {
    if (!grupo.items.length) return;

    const tituloAltura = 10;
    const padding = 4;
    const lineHeight = 5.5;
    const partidaWidth = 30;
    const descripcionWidth = boxWidth - partidaWidth - padding * 2 - 6;

    // Calcular altura total
    let contenidoAltura = 0;

    grupo.items.forEach((item) => {
      const lineasDescripcion = doc.splitTextToSize(
        item.descripcion,
        descripcionWidth
      );
      const altoItem = Math.max(
        lineHeight,
        lineasDescripcion.length * lineHeight
      );
      contenidoAltura += altoItem + 3;
    });

    const altoTotal = tituloAltura + padding + contenidoAltura + padding;

    nuevaPaginaSiHaceFalta(altoTotal);

    // Marco exterior
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(marginX, y, boxWidth, altoTotal);

    // Franja del titulo
    doc.setFillColor(240, 240, 240);
    doc.rect(marginX, y, boxWidth, tituloAltura, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(grupo.titulo.toUpperCase(), marginX + 3, y + 6.5);

    let itemY = y + tituloAltura + padding;

    grupo.items.forEach((item, index) => {
      const lineasDescripcion = doc.splitTextToSize(
        item.descripcion,
        descripcionWidth
      );
      const altoItem = Math.max(
        lineHeight,
        lineasDescripcion.length * lineHeight
      );

      // partida
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(item.partida, marginX + 3, itemY + 4);

      // descripcion
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(lineasDescripcion, marginX + partidaWidth, itemY + 6);

      itemY += altoItem + 3;

      // línea divisoria interna
      if (index < grupo.items.length - 1) {
        doc.setDrawColor(180);
        doc.setLineWidth(0.2);
        doc.line(marginX + 2, itemY - 1, marginX + boxWidth - 2, itemY - 1);
      }
    });

    y += altoTotal + 8;
  };

  // =========================
  // DIBUJAR GRUPOS
  // =========================
  data.grupos.forEach((grupo) => {
    dibujarGrupo(grupo);
  });

  // =========================
  // GUARDAR
  // =========================
  doc.save(`${data.otLabel}_PRODUCCION.pdf`);
};
