// src/plantillas/plantillaCatalogoClientes.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ===============================
// INTERFACE
// ===============================

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

// ===============================
// CAMPOS DISPONIBLES
// ===============================

export type CampoCatalogoCliente = {
    key: string;
    label: string;
};

export const CAMPOS_CATALOGO_CLIENTES: CampoCatalogoCliente[] = [
    { key: "nombre", label: "Nombre" },
    { key: "razonSocial", label: "Razón Social" },
    { key: "rfc", label: "RFC" },
    { key: "telefono", label: "Teléfono" },
    { key: "email", label: "Correo" },
    { key: "direccion", label: "Dirección" },
    { key: "colonia", label: "Colonia" },
    { key: "municipio", label: "Municipio" },
    { key: "estado", label: "Estado" },
    { key: "cp", label: "CP" },
    { key: "empresa", label: "Empresa" },
    { key: "giro", label: "Giro" },
    { key: "regimenFiscal", label: "Régimen Fiscal" },
    { key: "credito", label: "Crédito" },
];

// ===============================
// OBTENER VALOR
// ===============================

const obtenerValorCampo = (
    cliente: Cliente,
    key: string
) => {
    switch (key) {
        case "direccion":
            return `${cliente.direccion || ""} ${cliente.numeroExterior || ""
                } ${cliente.numeroInterior || ""}`;

        case "credito":
            return cliente.credito?.activo
                ? `SI | ${cliente.credito.dias || 0
                } dias | $${(
                    cliente.credito.limite || 0
                ).toLocaleString("es-MX")}`
                : "NO";

        default:
            return (cliente as any)[key] || "";
    }
};

// ===============================
// PLANTILLA PDF
// ===============================

export const plantillaCatalogoClientes = (
    clientes: Cliente[],
    camposSeleccionados: CampoCatalogoCliente[]
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

        head: [
            camposSeleccionados.map(
                (campo) => campo.label
            ),
        ],

        body: clientes.map((cliente) =>
            camposSeleccionados.map((campo) =>
                obtenerValorCampo(cliente, campo.key)
            )
        ),

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