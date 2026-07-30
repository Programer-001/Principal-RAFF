import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";
import { getDatabase, ref, get } from "firebase/database";
import { formatearMoneda } from "../funciones/formato_moneda";
import { app } from "../firebase/config";

const convertirFecha = (fecha: string): string => {
    if (!fecha) return "-";

    const partes = fecha.split("-");

    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const limpiarTextoPDF = (texto: string): string => {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/�/g, "n")
        .replace(/�/g, "N");
};

const cargarSVGElemento = async (
    path: string
): Promise<SVGSVGElement | null> => {
    const response = await fetch(path);
    const svgText = await response.text();

    const contenedor = document.createElement("div");
    contenedor.innerHTML = svgText;

    return contenedor.querySelector("svg");
};

export const generarPDFGastos = async (
    desde: string,
    hasta: string
) => {
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

    Object.keys(data).forEach((fechaRegistroNum) => {
        const movimientosDia = data[fechaRegistroNum];

        if (
            !movimientosDia ||
            typeof movimientosDia !== "object"
        ) {
            return;
        }

        Object.values(movimientosDia).forEach((g: any) => {
            gastos.push({
                ...g,
                fechaRegistroNum,
                fechaMovimiento: g.fechaMovimiento || "",
            });
        });
    });

    const desdeDate = new Date(`${desde}T00:00:00`).getTime();
    const hastaDate = new Date(`${hasta}T23:59:59`).getTime();

    const filtrados = gastos.filter((g) => {
        if (g.tipo !== "gasto") return false;

        const fechaMovimiento = String(
            g.fechaMovimiento || ""
        );

        if (!fechaMovimiento) return false;

        const fechaReal = new Date(
            `${fechaMovimiento}T00:00:00`
        ).getTime();

        return (
            fechaReal >= desdeDate &&
            fechaReal <= hastaDate
        );
    });

    if (filtrados.length === 0) {
        alert("No hay gastos en ese rango");
        return;
    }

    filtrados.sort((a, b) => {
        const comparacionFecha = String(
            a.fechaMovimiento
        ).localeCompare(String(b.fechaMovimiento));

        if (comparacionFecha !== 0) {
            return comparacionFecha;
        }

        return String(a.fecha || "").localeCompare(
            String(b.fecha || "")
        );
    });

    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");

    const logoX = 8;
    const logoY = 6;
    const logoW = 60;
    const logoH = 30;
    const separacionTexto = 8;

    const svgElement = await cargarSVGElemento(
        "/svg/logo_negro.svg"
    );

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
    doc.text(
        `Gastos del ${desdeForm} al ${hastaForm}`,
        textoX,
        16
    );

    const now = new Date();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
        `Generado: ${now.toLocaleDateString(
            "es-MX"
        )} ${now.toLocaleTimeString("es-MX")}`,
        textoX,
        23
    );

    const tabla = filtrados.map((g) => [
        limpiarTextoPDF(
            convertirFecha(g.fechaMovimiento)
        ),
        limpiarTextoPDF(g.descripcion || ""),
        "Gasto",
        formatearMoneda(Number(g.cantidad || 0)),
    ]);

    autoTable(doc, {
        startY: 32,
        head: [
            [
                "Fecha movimiento",
                "Descripcion",
                "Tipo",
                "Cantidad",
            ],
        ],
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
            0: { cellWidth: 38 },
            1: { cellWidth: 82 },
            2: { cellWidth: 30 },
            3: {
                cellWidth: 30,
                halign: "right",
            },
        },
    });

    const totalGastos = filtrados.reduce(
        (acc, g) =>
            acc + Math.abs(Number(g.cantidad || 0)),
        0
    );

    const finalY =
        (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(
        `Gastos totales: ${formatearMoneda(
            totalGastos
        )}`,
        14,
        finalY + 7
    );

    doc.save(
        `Gastos_${desdeForm.replace("/", "_")}_a_${hastaForm.replace("/", "_")}.pdf`
    );
};