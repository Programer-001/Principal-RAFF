import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";
import { getDatabase, ref, get } from "firebase/database";
import { formatearMoneda, procesarInputMoneda } from "../funciones/formato_moneda";
import { app } from "../firebase/config";

const convertirFecha = (f: string): string => {
    const partes = f.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const limpiarTextoPDF = (texto: string): string => {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "N");
};

const cargarSVGElemento = async (path: string): Promise<SVGSVGElement | null> => {
    const response = await fetch(path);
    const svgText = await response.text();

    const contenedor = document.createElement("div");
    contenedor.innerHTML = svgText;

    return contenedor.querySelector("svg");
};

export const generarPDFGastos = async (desde: string, hasta: string) => {
    if (!desde || !hasta) {
        alert("Selecciona ambas fechas");
        return;
    }

    const desdeForm = convertirFecha(desde);
    const hastaForm = convertirFecha(hasta);

    const db = getDatabase(app);
    const refGastos = ref(db, "gastos");
    const snapshot = await get(refGastos);

    if (!snapshot.exists()) {
        alert("No hay gastos registrados");
        return;
    }

    const data = snapshot.val();
    const gastos: any[] = [];

    Object.keys(data).forEach((fechaNum) => {
        Object.values(data[fechaNum]).forEach((g: any) => {
            gastos.push({ ...g, fechaNum });
        });
    });

    const [dD, dM, dY] = desdeForm.split("/").map(Number);
    const [hD, hM, hY] = hastaForm.split("/").map(Number);

    const desdeDate = new Date(dY, dM - 1, dD).getTime();
    const hastaDate = new Date(hY, hM - 1, hD, 23, 59, 59).getTime();

    const filtrados = gastos.filter((g) => {
        const f = String(g.fechaNum || "");
        if (f.length !== 8) return false;

        const dia = Number(f.substring(0, 2));
        const mes = Number(f.substring(2, 4)) - 1;
        const anio = Number(f.substring(4, 8));

        const fechaReal = new Date(anio, mes, dia).getTime();
        return fechaReal >= desdeDate && fechaReal <= hastaDate;
    });

    if (filtrados.length === 0) {
        alert("No hay gastos en ese rango");
        return;
    }

    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");

    const logoX = 8;
    const logoY = 6;
    const logoW = 60;
    const logoH = 30;
    const separacionTexto = 8;

    const svgElement = await cargarSVGElemento("/svg/logo_negro.svg");

    if (svgElement) {
        await doc.svg(svgElement, {
            x: logoX,
            y: logoY,
            width: logoW,
            height: logoH,
        });
    }

    const textoX = logoX + logoW + separacionTexto;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Gastos del ${desdeForm} al ${hastaForm}`, textoX, 16);

    const now = new Date();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        `Generado: ${now.toLocaleDateString("es-MX")} ${now.toLocaleTimeString("es-MX")}`,
        textoX,
        23
    );

    const posY = 32;

    const tabla = filtrados.map((g) => {
        const f = String(g.fechaNum || "");
        const fecha = `${f.substring(0, 2)}/${f.substring(2, 4)}/${f.substring(4, 8)}`;

        return [
            limpiarTextoPDF(fecha),
            limpiarTextoPDF(g.descripcion || ""),
            limpiarTextoPDF(g.tipo || ""),
            formatearMoneda(Number(g.cantidad)),
        ];
    });

    autoTable(doc, {
        startY: posY,
        head: [["Fecha", "Descripcion", "Tipo", "Cantidad"]],
        body: tabla,
        theme: "grid",
        styles: {
            font: "helvetica",
            fontStyle: "normal",
            fontSize: 10,
            textColor: 20,
            cellPadding: 2,
        },
        headStyles: {
            font: "helvetica",
            fontStyle: "bold",
            fillColor: [0, 0, 0],
            textColor: 255,
            fontSize: 11,
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 90 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30, halign: "right" },
        },
    });

    const totalEntradas = filtrados
        .filter((g) => g.tipo === "entrada")
        .reduce((acc, g) => acc + Number(g.cantidad || 0), 0);

    const totalGastos = filtrados
        .filter((g) => g.tipo === "gasto")
        .reduce((acc, g) => acc + Math.abs(Number(g.cantidad || 0)), 0);

    const fondoFinal = totalEntradas - totalGastos;


    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
        `Fondo final: ${formatearMoneda(fondoFinal)}`,
        14,
        finalY
    );
    doc.text(
        `Gastos totales: ${formatearMoneda(totalGastos)}`,
        14,
        finalY + 7
    );

    doc.save(`Gastos_${desdeForm}_a_${hastaForm}.pdf`);
};