import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getDatabase, ref, get } from "firebase/database";
import { app } from "../firebase/config";

// Convierte "2025-02-13" -> "13/02/2025"
const convertirFecha = (f: string): string => {
    const partes = f.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// Convierte SVG a PNG base64 usando canvas
const convertirSVGaPNGBase64 = async (
    svgPath: string,
    width = 600,
    height = 300,
): Promise<string> => {
    const response = await fetch(svgPath);

    if (!response.ok) {
        throw new Error(`No se pudo cargar el SVG: ${svgPath}`);
    }

    const svgText = await response.text();
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("No se pudo convertir el SVG a imagen"));
            img.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("No se pudo crear el canvas");
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/png");
        return dataUrl.split(",")[1];
    } finally {
        URL.revokeObjectURL(url);
    }
};

export const generarExcelGastos = async (desde: string, hasta: string) => {
    if (!desde || !hasta) {
        alert("Debes seleccionar ambas fechas");
        return;
    }

    const desdeForm = convertirFecha(desde);
    const hastaForm = convertirFecha(hasta);

    const logoBase64 = await convertirSVGaPNGBase64("/svg/logo_negro.svg", 700, 220);

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
        const dd = String(g.fechaNum || "");
        if (dd.length !== 8) return false;

        const dia = Number(dd.substring(0, 2));
        const mes = Number(dd.substring(2, 4)) - 1;
        const anio = Number(dd.substring(4, 8));

        const fechaReal = new Date(anio, mes, dia).getTime();
        return fechaReal >= desdeDate && fechaReal <= hastaDate;
    });

    if (filtrados.length === 0) {
        alert("No hay gastos en ese rango");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Gastos");

    // Anchos de columnas
    sheet.getColumn("A").width = 15;
    sheet.getColumn("B").width = 40;
    sheet.getColumn("C").width = 15;
    sheet.getColumn("D").width = 18;

    // Logo
    const img = workbook.addImage({
        base64: logoBase64,
        extension: "png",
    });

    sheet.addImage(img, {
        tl: { col: 0, row: 0 },
        ext: { width: 180, height: 100 },
    });
    sheet.getRow(3).height = 50;
    // Título
    sheet.mergeCells("A4:D4");
    const titulo = sheet.getCell("A4");
    titulo.value = `Gastos del ${desdeForm} al ${hastaForm}`;
    titulo.font = { bold: true, size: 16 };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(4).height = 24;

    // Fecha de generación
    sheet.mergeCells("A5:D5");
    const generado = sheet.getCell("A5");
    generado.value = `Generado: ${new Date().toLocaleDateString("es-MX")} ${new Date().toLocaleTimeString("es-MX")}`;
    generado.font = { size: 10 };
    generado.alignment = { horizontal: "center", vertical: "middle" };

    // Encabezado solo de A a D
    const filaHeader = 7;

    sheet.getCell(`A${filaHeader}`).value = "Fecha";
    sheet.getCell(`B${filaHeader}`).value = "Descripcion";
    sheet.getCell(`C${filaHeader}`).value = "Tipo";
    sheet.getCell(`D${filaHeader}`).value = "Cantidad";

    sheet.getRow(filaHeader).height = 22;

    ["A", "B", "C", "D"].forEach((col) => {
        const cell = sheet.getCell(`${col}${filaHeader}`);

        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF000000" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    // Filas de datos
    let filaActual = filaHeader + 1;

    filtrados.forEach((g) => {
        const dd = String(g.fechaNum || "");
        const fecha = `${dd.substring(0, 2)}/${dd.substring(2, 4)}/${dd.substring(4, 8)}`;

        sheet.getCell(`A${filaActual}`).value = fecha;
        sheet.getCell(`B${filaActual}`).value = g.descripcion || "";
        sheet.getCell(`C${filaActual}`).value = g.tipo || "";
        sheet.getCell(`D${filaActual}`).value = Number(g.cantidad || 0);
        sheet.getCell(`D${filaActual}`).numFmt = '#,##0.00';

        ["A", "B", "C", "D"].forEach((col) => {
            const cell = sheet.getCell(`${col}${filaActual}`);
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            cell.alignment = {
                vertical: "middle",
                horizontal: col === "D" ? "right" : "left",
            };
        });

        filaActual++;
    });

    // Renglón en blanco
    filaActual++;

    const totalGeneral = filtrados.reduce(
        (acc, g) => acc + Number(g.cantidad || 0),
        0
    );

    // Total solo de A a D
    sheet.getCell(`A${filaActual}`).value = "TOTAL GENERAL";
    sheet.getCell(`D${filaActual}`).value = totalGeneral;
    sheet.getCell(`D${filaActual}`).numFmt = '#,##0.00';

    sheet.getCell(`A${filaActual}`).font = { bold: true };
    sheet.getCell(`D${filaActual}`).font = { bold: true };

    ["A", "B", "C", "D"].forEach((col) => {
        const cell = sheet.getCell(`${col}${filaActual}`);
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    // Congelar filas hasta el header
    sheet.views = [
        {
            state: "frozen",
            ySplit: filaHeader,
        },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Gastos_${desdeForm}_a_${hastaForm}.xlsx`
    );
};