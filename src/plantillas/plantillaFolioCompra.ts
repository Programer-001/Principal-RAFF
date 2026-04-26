import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatearMoneda } from "../funciones/formato_moneda";
import "svg2pdf.js";

interface ServicioPDF {
    partida: string;
    descripcion: string;
    total: number;
}

interface ArticuloPDF {
    partida: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    materialEntregado?: boolean;
}

interface FolioCompraPDFData {
    folio: string;
    fecha: string;
    asesor?: string;
    clienteNombre?: string;
    razonSocial?: string;
    telefono?: string;
    envio: boolean;
    otGenerada?: string;

    servicios: ServicioPDF[];
    articulos: ArticuloPDF[];

    subtotal: number;
    iva: number;
    descuento: number;
    total: number;

    materialEntregado?: boolean;
    facturas?: string[];
}

export const generarPDFFolioCompra = async (data: FolioCompraPDFData) => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginTop = 20;
    const marginBottom = 20;
    const marginLeft = 20;
    const marginRight = 20;

    const agregarEncabezado = async () => {
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
        // CAJA FOLIO
        // =========================
        const boxWidth = 35;
        const boxHeight = 18;
        const boxX = pageWidth - boxWidth - 20;
        const boxY = 20;

        doc.setDrawColor(0, 0, 0);
        doc.rect(boxX, boxY, boxWidth, boxHeight);

        doc.setFillColor(0, 0, 0);
        doc.rect(boxX, boxY, boxWidth, 6, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("FOLIO", boxX + boxWidth / 2, boxY + 4.5, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(data.folio || "--", boxX + boxWidth / 2, boxY + 13.5, {
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

        doc.setDrawColor(120, 120, 120);
        doc.line(20, 52, pageWidth - 20, 52);
    };

    await agregarEncabezado();

    // =========================
    // TITULO + FECHA
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FOLIO DE COMPRA", 20, 70);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Fecha:", 150, 70);
    doc.setFont("helvetica", "normal");
    doc.text(data.fecha || "--", 165, 70);

    // =========================
    // DATOS
    // =========================
    doc.setFontSize(11);

    doc.setFont("helvetica", "bold");
    doc.text("Asesor:", 20, 82);
    doc.setFont("helvetica", "normal");
    doc.text(data.asesor || "--", 40, 82);

    doc.setFont("helvetica", "bold");
    doc.text("OT generada:", 110, 82);
    doc.setFont("helvetica", "normal");
    doc.text(data.otGenerada || "--", 140, 82);

    let y = 90;

    if (data.razonSocial && data.razonSocial.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Razón social:", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(data.razonSocial, 52, y);
        y += 7;
    }

    if (data.clienteNombre && data.clienteNombre.trim() !== "") {
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 110, 90);
        doc.setFont("helvetica", "normal");

        const clienteLineas = doc.splitTextToSize(data.clienteNombre, 65);
        doc.text(clienteLineas, 128, 90);
    }

    // TELÉFONO
    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.telefono || "--", 45, y);

    y += 6;

    // FACTURAS
    if (data.facturas && data.facturas.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text(
            data.facturas.length === 1 ? "Factura:" : "Facturas:",
            20,
            y
        );

        doc.setFont("helvetica", "normal");

        const facturasTexto = data.facturas.join("\n");
        const lineas = doc.splitTextToSize(facturasTexto, 80);

        doc.text(lineas, 45, y);

        y += lineas.length * 5 + 2;
    }

    // ENVÍO 
    doc.setFont("helvetica", "bold");
    doc.text("Envío:", 110, 103);
    doc.setFont("helvetica", "normal");
    doc.text(data.envio ? "Sí" : "No", 128, 103);

    y += 5;
    // =========================
    // SERVICIOS
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Servicios", 20, y);

    y += 5;

    if (data.servicios.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [["Partida", "Descripción", "Total"]],
            body: data.servicios.map((item) => [
                item.partida,
                item.descripcion,
                formatearMoneda(item.total),
            ]),
            styles: {
                fontSize: 9,
                overflow: "linebreak",
                cellPadding: 2,
                valign: "middle",
            },
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: 255,
                fontStyle: "bold",
            },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 122 },
                2: { cellWidth: 32, halign: "right" },
            },
            theme: "grid",
            showHead: "everyPage",
            margin: {
                top: marginTop,
                right: marginRight,
                bottom: marginBottom,
                left: marginLeft,
            },

        });

        y = (doc as any).lastAutoTable.finalY + 12;
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("No hay servicios en este folio.", 20, y);
        y += 12;
    }

    // =========================
    // ARTICULOS
    // =========================
    if (y > pageHeight - 70) {
        doc.addPage();
        await agregarEncabezado();
        y = 65;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Artículos", 20, y);

    y += 5;

    if (data.articulos.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [["Partida", "Descripción", "Cantidad", "Precio", "Total"]],
            body: data.articulos.map((item) => [
                item.partida,
                `${item.materialEntregado ? "ENTREGADO - " : ""}${item.descripcion}`,
                item.cantidad,
                formatearMoneda(item.precioUnitario),
                formatearMoneda(item.total),
            ]),

            styles: {
                fontSize: 9,
                overflow: "linebreak",
                cellPadding: 2,
                valign: "middle",
            },
            headStyles: {
                fillColor: [30, 58, 138],
                textColor: 255,
                fontStyle: "bold",
            },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 88 },
                2: { cellWidth: 22, halign: "center" },
                3: { cellWidth: 22, halign: "right" },
                4: { cellWidth: 22, halign: "right" },
            },
            theme: "grid",
            showHead: "everyPage",
            margin: {
                top: marginTop,
                right: marginRight,
                bottom: marginBottom,
                left: marginLeft,
            },

        });

        y = (doc as any).lastAutoTable.finalY + 12;
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("No hay artículos en este folio.", 20, y);
        y += 12;
    }

    // =========================
    // SELLO MATERIAL ENTREGADO
    // =========================
   /* if (data.materialEntregado) {
        try {
            const responseSello = await fetch("svg/sello_material_entregado.svg");
            const svgSelloText = await responseSello.text();

            const parser = new DOMParser();
            const svgSelloElement = parser.parseFromString(
                svgSelloText,
                "image/svg+xml"
            ).documentElement;

            await doc.svg(svgSelloElement, {
                x: 70,
                y: 120,
                width: 60,
            });
        } catch (error) {
            console.warn("No se pudo cargar sello de material entregado:", error);
        }
    }*/

    // =========================
    // TOTALES
    // =========================
    const altoBloqueTotales = 5;

    if (y + altoBloqueTotales > pageHeight - marginBottom) {
        doc.addPage();
        //await agregarEncabezado();
        //y = 65;
        y = marginTop;
    }

    const totalesX = pageWidth - 80;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Subtotal:", totalesX, y + 6);
    doc.text("IVA:", totalesX, y + 13);
    doc.text("Descuento:", totalesX, y + 20);
    doc.text("Total:", totalesX, y + 29);

    doc.setFont("helvetica", "normal");
    doc.text(formatearMoneda(data.subtotal), pageWidth - 20, y + 6, {
        align: "right",
    });
    doc.text(formatearMoneda(data.iva), pageWidth - 20, y + 13, {
        align: "right",
    });
    doc.text(formatearMoneda(data.descuento), pageWidth - 20, y + 20, {
        align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(formatearMoneda(data.total), pageWidth - 20, y + 29, {
        align: "right",
    });

    doc.save(`${data.folio}.pdf`);
};