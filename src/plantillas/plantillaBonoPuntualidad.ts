// src/plantillas/plantillaBonoPuntualidad.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

export interface DiaBonoPDF {
    fecha: string;
    titulo: string;
}

export interface CeldaBonoPDF {
    entrada: string;
    estado: string;
    salida: string;
    color: string;
}

export interface EmpleadoBonoPDF {
    empleado: string;
    dias: CeldaBonoPDF[];
}

export interface BonoPuntualidadPDFData {
    fechaInicio: string;
    fechaFin: string;
    dias: DiaBonoPDF[];
    empleados: EmpleadoBonoPDF[];
}

export const generarPDFBonoPuntualidad = async (
    data: BonoPuntualidadPDFData
) => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // LOGO
    const response = await fetch("/svg/logo_negro.svg");
    const svgText = await response.text();

    const parser = new DOMParser();
    const svgElement = parser.parseFromString(
        svgText,
        "image/svg+xml"
    ).documentElement;

const logoWidth = 75;
const logoX = (pageWidth - logoWidth) / 2;

await doc.svg(svgElement, {
    x: logoX,
    y: 8,
    width: logoWidth,
});

    // TÍTULO
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("REPORTE DE ASISTENCIA", pageWidth / 2, 56, {
        align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Del ${data.fechaInicio} al ${data.fechaFin}`, pageWidth / 2, 62, {
        align: "center",
    });

    const columnas = [
        "Empleado",
        ...data.dias.map((dia) => dia.titulo),
    ];

    const filas = data.empleados.map((emp) => [
        emp.empleado,
        ...emp.dias.map(
            (d) => `${d.entrada}\n${d.estado.toUpperCase()}\n${d.salida}`
        ),
    ]);

    autoTable(doc, {
        startY: 66,
        head: [columnas],
        body: filas,
        styles: {
            fontSize: 7,
            cellPadding: 2,
            halign: "center",
            valign: "middle",
        },
        headStyles: {
            fillColor: [31, 59, 138],
            textColor: 255,
            fontStyle: "bold",
        },
        columnStyles: {
            0: {
                halign: "left",
                cellWidth: 45,
                fontStyle: "bold",
            },
        },
        didParseCell: (cellData) => {
            if (cellData.section !== "body") return;
            if (cellData.column.index === 0) return;

            const empleado = data.empleados[cellData.row.index];
            const celda = empleado.dias[cellData.column.index - 1];

            const hex = celda.color.replace("#", "");

            cellData.cell.styles.fillColor = [
                parseInt(hex.slice(0, 2), 16),
                parseInt(hex.slice(2, 4), 16),
                parseInt(hex.slice(4, 6), 16),
            ];

            cellData.cell.styles.textColor = [255, 255, 255];
            cellData.cell.styles.fontStyle = "bold";
        },
    });

    doc.save(`BONO_PUNTUALIDAD_${data.fechaInicio}_${data.fechaFin}.pdf`);
};