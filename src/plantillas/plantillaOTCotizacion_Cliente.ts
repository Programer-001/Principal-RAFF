import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

interface Concepto {
    cantidad: number;
    descripcion: string;
    descuento: number;
    subtotal: number;
}

interface OTClienteData {
    otLabel: string;
    fecha: string;
    clienteNombre: string;
    telefono?: string;


    conceptos: Concepto[];

    subtotal: number;
    descuento: number;
    iva: number;
    total: number;
}

// ======================================================
// UTILIDADES
// ======================================================
const formatearMoneda = (valor: number) => {
    return `$${Number(valor || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const parseFechaDDMMYYYY = (fecha: string): Date | null => {
    if (!fecha) return null;

    // dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        const [dd, mm, yyyy] = fecha.split("/").map(Number);
        return new Date(yyyy, mm - 1, dd);
    }

    // dd/mm/yy
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(fecha)) {
        const [dd, mm, yy] = fecha.split("/").map(Number);
        const yyyy = 2000 + yy;
        return new Date(yyyy, mm - 1, dd);
    }

    const d = new Date(fecha);
    if (isNaN(d.getTime())) return null;
    return d;
};

const formatearFechaCorta = (fecha: Date) => {
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const yyyy = String(fecha.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yyyy}`;
};

const sumarDiasHabiles = (fechaBase: Date, diasHabiles: number) => {
    const fecha = new Date(fechaBase);
    let agregados = 0;

    while (agregados < diasHabiles) {
        fecha.setDate(fecha.getDate() + 1);
        const dia = fecha.getDay(); // 0 domingo, 6 sábado

        if (dia !== 0 && dia !== 6) {
            agregados++;
        }
    }

    return fecha;
};

// ======================================================
// PDF
// ======================================================
export const generarPDFOTCotizacion = async (data: OTClienteData) => {
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
        x: 14,
        y: 12,
        width: 52,
    });

    // =========================
    // DATOS EMPRESA
    // =========================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("RAFF ESPECIALISTAS TÉRMICOS", 120, 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("REFORMA No. 1462, C.P. 44600, COL. SANTA TERESITA", 120, 24, {
        align: "center",
    });
    doc.text("Guadalajara, Jalisco, México", 120, 29, { align: "center" });
    doc.text("TEL. 33 4040 9058", 120, 34, { align: "center" });
    doc.text("RFC: RET231130AN2", 120, 39, { align: "center" });

    // =========================
    // TITULO NEGRO
    // =========================
    doc.setFillColor(0, 0, 0);
    doc.rect(140, 46, 55, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);

    // 🔥 TODO en una sola línea
    doc.text(`COTIZACIÓN: ${data.otLabel}`, 167.5, 52, {
        align: "center",
    });

    // 🔥 SOLO DEJAS FECHA ABAJO
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${data.fecha}`, 140, 62);

    // =========================
    // CLIENTE EN FILA
    // =========================
    let y = 50;

    doc.setFont("helvetica", "bold");
    doc.text("Cliente / Razón social:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.clienteNombre || "PUBLICO GENERAL", 55, y);

    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Teléfono:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.telefono || "--", 32, y);

    // =========================
    // TABLA DE CONCEPTOS
    // =========================
    const startY = 72;

    autoTable(doc, {
        startY,
        head: [["Cantidad", "Descripción", "Subtotal"]],
        body: data.conceptos.map((c) => [
            String(c.cantidad || 1),
            c.descripcion || "--",
            formatearMoneda(c.subtotal || 0),
        ]),
        styles: {
            fontSize: 9,
            cellPadding: 2,
            textColor: 0,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
            valign: "middle",
        },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
        },
        columnStyles: {
            0: { cellWidth: 25, halign: "center" },
            1: { cellWidth: 135 }, // más espacio para descripción 🔥
            2: { cellWidth: 20, halign: "right" },
        },
        margin: { left: 14, right: 14 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // =========================
    // VIGENCIA
    // =========================
    const fechaBase = parseFechaDDMMYYYY(data.fecha) || new Date();
    const fechaVigencia = sumarDiasHabiles(fechaBase, 3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(
        `Vigencia de 3 días: ${formatearFechaCorta(fechaVigencia)}`,
        14,
        finalY
    );

    finalY += 6;

    doc.setFont("helvetica", "normal");
    doc.text("*** Precios sujetos a cambio sin previo aviso.", 14, finalY);

    // =========================
    // TABLA DE TOTALES
    // =========================
    const boxXLabel = 145;
    const boxXValue = 170;
    let yTot = finalY + 6;

    const filasTotales = [
        ["Subtotal", formatearMoneda(data.subtotal)],
        ["Descuento", formatearMoneda(data.descuento)],
        ["IVA", formatearMoneda(data.iva)],
        ["Total", formatearMoneda(data.total)],
    ];

    filasTotales.forEach(([label, value], index) => {
        const yFila = yTot + index * 8;

        // 🔳 CUADRO NEGRO (LABEL)

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${label}:`, boxXLabel + 23, yFila + 4.8, {
            align: "right",
        });

        // ⬜ CUADRO BLANCO (VALOR)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.rect(boxXValue, yFila, 30, 7);

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(value, boxXValue + 28, yFila + 4.8, {
            align: "right",
        });
    });

    // =========================
    // GUARDAR
    // =========================
    doc.save(`Cotizacion_${data.otLabel}.pdf`);
};