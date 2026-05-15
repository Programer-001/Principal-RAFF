// src/plantillas/plantillaCatalogoClientes.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Cliente {
    id: string;
    nombre?: string;
    razonSocial?: string;
    rfc?: string;
    direccion?: string;
    numeroExterior?: string;
    numeroInterior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
    telefono?: string;
    email?: string;
    empresa?: string;
    giro?: string;
    regimenFiscal?: string;
    notas?: string;
    descuentoDefault?: number;

    credito?: {
        activo: boolean;
        limite?: number;
        dias?: number;
    };
}

export const plantillaCatalogoClientes = (
    clientes: Cliente[]
) => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "letter",
    });

    // ===============================
    // TITULO
    // ===============================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
        "CATALOGO DE CLIENTES",
        140,
        12,
        { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    doc.text(
        `Total de clientes: ${clientes.length}`,
        10,
        18
    );

    // ===============================
    // TABLA
    // ===============================
    autoTable(doc, {
        startY: 22,

        head: [[
            "Razón Social",
            "RFC",
            "Teléfono",
            "Dirección",
            "Colonia",
            "Municipio",
            "Estado",
            "CP",
        ]],

        body: clientes.map((c) => [
            c.razonSocial || "",
            c.rfc || "",
            c.telefono || "",

            `${c.direccion || ""} ${c.numeroExterior || ""} ${c.numeroInterior || ""}`,

            c.colonia || "",
            c.municipio || "",
            c.estado || "",
            c.cp || "",
        ]),

        styles: {
            fontSize: 6,
            cellPadding: 1.2,
            overflow: "linebreak",
            valign: "middle",
            textColor: [0, 0, 0],
            lineColor: [180, 180, 180],
            lineWidth: 0.1,
        },

        headStyles: {
            fillColor: [30, 58, 138],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
        },

        bodyStyles: {
            halign: "left",
        },

        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },

        margin: {
            top: 22,
            left: 5,
            right: 5,
        },

        tableWidth: "auto",

        didDrawPage: () => {
            const pageSize = doc.internal.pageSize;

            const pageWidth = pageSize.width;
            const pageHeight = pageSize.height;

            doc.setFontSize(7);

            doc.text(
                `Página ${doc.getCurrentPageInfo().pageNumber}`,
                pageWidth - 20,
                pageHeight - 5
            );
        },
    });

    return doc;
};