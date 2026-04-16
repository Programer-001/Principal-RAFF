// src/plantillas/pdf_contador_dinero.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatearMoneda } from "../funciones/formato_moneda";
import "svg2pdf.js";

interface Fila {
    denom: number;
    cantidad: number;
    subtotal: number;
}

// Cargar SVG desde /public/svg y devolver el elemento <svg>
const cargarSVGElemento = async (path: string): Promise<SVGSVGElement | null> => {
    const response = await fetch(path);
    const svgText = await response.text();

    const contenedor = document.createElement("div");
    contenedor.innerHTML = svgText;

    return contenedor.querySelector("svg");
};

export const generarPDF = async (
    billetes: Fila[],
    monedas: Fila[],
    total: number
) => {
    const doc = new jsPDF();

    // LOGO SVG
    const svgElement = await cargarSVGElemento("/svg/logo_negro.svg");

    if (svgElement) {
        await doc.svg(svgElement, {
            x: 4,
            y: 2,
            width: 60,
            height: 30,
        });
    }

    // Título y fecha
    const fecha = new Date();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Cuenta de dinero", 55, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        `Fecha: ${fecha.toLocaleDateString("es-MX")}  Hora: ${fecha.toLocaleTimeString("es-MX")}`,
        55,
        22
    );

    let posY = 35;

    // Título sección Billetes
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resultados - Billetes", 14, posY);
    posY += 5;

    // Tabla de billetes
    autoTable(doc, {
        startY: posY,
        head: [["Denominacion", "Cantidad", "Subtotal"]],
        body: billetes.map((f) => [
            f.denom,
            f.cantidad,
            `$${formatearMoneda(f.subtotal)}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, textColor: 0, font: "helvetica" },
    });

    posY = (doc as any).lastAutoTable.finalY + 12;

    // Título sección Monedas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resultados - Monedas", 14, posY);
    posY += 5;

    // Tabla de monedas
    autoTable(doc, {
        startY: posY,
        head: [["Denominacion", "Cantidad", "Subtotal"]],
        body: monedas.map((f) => [
            f.denom,
            f.cantidad,
            `$${formatearMoneda(f.subtotal)}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [39, 174, 96], textColor: 255 },
        styles: { fontSize: 10, textColor: 0, font: "helvetica" },
    });

    posY = (doc as any).lastAutoTable.finalY + 15;

    // Total general
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
        `Total General: $${formatearMoneda(total)}`,
        14,
        posY
    );

    // Guardar PDF
    doc.save(`Cuenta_de_dinero_${fecha.getTime()}.pdf`);
};