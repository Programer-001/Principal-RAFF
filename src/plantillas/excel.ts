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
    width = 700,
    height = 220
): Promise<string> => {
    const response = await fetch(svgPath);

    if (!response.ok) {
        throw new Error(`No se pudo cargar el SVG: ${svgPath}`);
    }

    const svgText = await response.text();
    const svgBlob = new Blob([svgText], {
        type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(svgBlob);

    try {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () =>
                reject(new Error("No se pudo convertir el SVG a imagen"));
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

export const generarExcelCorteCaja = async (desde: string, hasta: string) => {
    if (!desde || !hasta) {
        alert("Debes seleccionar ambas fechas");
        return;
    }

    const desdeForm = convertirFecha(desde);
    const hastaForm = convertirFecha(hasta);

    // Logo desde SVG -> PNG base64
    const logoBase64 = await convertirSVGaPNGBase64("/svg/logo_negro.svg", 700, 220);

    // Firebase
    const db = getDatabase(app);

    const pagosRef = ref(db, "corte-caja");
    const gastosRef = ref(db, "gastos");

    const pagosSnap = await get(pagosRef);
    const gastosSnap = await get(gastosRef);

    let todos: any[] = [];
    let gastosTodos: any[] = [];

    if (pagosSnap.exists()) {
        const data = pagosSnap.val();
        Object.values(data).forEach((dia: any) => {
            Object.values(dia).forEach((p: any) => todos.push(p));
        });
    }

    if (gastosSnap.exists()) {
        const data = gastosSnap.val();
        Object.keys(data).forEach((dia: string) => {
            Object.values(data[dia]).forEach((g: any) => {
                gastosTodos.push({ ...g, fechaNum: dia });
            });
        });
    }

    // Filtrar por fechas
    const [dD, dM, dY] = desdeForm.split("/").map(Number);
    const [hD, hM, hY] = hastaForm.split("/").map(Number);

    const desdeDate = new Date(dY, dM - 1, dD).getTime();
    const hastaDate = new Date(hY, hM - 1, hD, 23, 59, 59).getTime();

    const filtrados = todos.filter((p) => {
        if (!p.fecha) return false;
        const [dia, mes, anio] = String(p.fecha).split("/").map(Number);
        const f = new Date(anio, mes - 1, dia).getTime();
        return f >= desdeDate && f <= hastaDate;
    });

    if (filtrados.length === 0) {
        alert("No hay registros en ese rango de fechas");
        return;
    }

    const gastosFiltrados = gastosTodos.filter((g) => {
        const dd = String(g.fechaNum || "");
        if (dd.length !== 8) return false;

        const dia = Number(dd.substring(0, 2));
        const mes = Number(dd.substring(2, 4)) - 1;
        const anio = Number(dd.substring(4, 8));

        const f = new Date(anio, mes, dia).getTime();
        return f >= desdeDate && f <= hastaDate;
    });

    // Crear Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Corte Caja");

    // Columnas
    sheet.getColumn("A").width = 16;
    sheet.getColumn("B").width = 16;
    sheet.getColumn("C").width = 17;
    sheet.getColumn("D").width = 16;
    sheet.getColumn("E").width = 13;
    sheet.getColumn("F").width = 30;
    sheet.getColumn("G").width = 16;

    // Altura para logo
    sheet.getRow(3).height = 100;

    // Logo
    const img = workbook.addImage({
        base64: logoBase64,
        extension: "png",
    });

    sheet.addImage(img, {
        tl: { col: 1.4, row: 2 },
        ext: { width: 300, height: 150 },
    });

    // Título
    sheet.mergeCells("A5:G5");
    const titulo = sheet.getCell("A5");
    titulo.value = `Corte de ${desdeForm} a ${hastaForm}`;
    titulo.font = { bold: true, size: 16 };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(5).height = 25;

    // Encabezado tabla
    const filaHeader = 8;

    sheet.getCell(`A${filaHeader}`).value = "Fecha";
    sheet.getCell(`B${filaHeader}`).value = "Factura";
    sheet.getCell(`C${filaHeader}`).value = "Metodo";
    sheet.getCell(`D${filaHeader}`).value = "Cantidad";
    sheet.getCell(`E${filaHeader}`).value = "Estatus";
    sheet.getCell(`F${filaHeader}`).value = "Comentarios";

    ["A", "B", "C", "D", "E", "F"].forEach((col) => {
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

    filtrados.sort((a, b) => {
        const fa = Number(a.factura) || 0;
        const fb = Number(b.factura) || 0;
        return fa - fb;
    });

    let filaActual = filaHeader + 1;

    filtrados.forEach((p) => {
        sheet.getCell(`A${filaActual}`).value = p.fecha || "-";
        sheet.getCell(`B${filaActual}`).value = p.factura || "-";
        sheet.getCell(`C${filaActual}`).value = String(p.metodo || "").replace("_", " ");
        sheet.getCell(`D${filaActual}`).value = Number(p.cantidad || 0);
        sheet.getCell(`E${filaActual}`).value = p.estatus ? "Vigente" : "Cancelada";
        sheet.getCell(`F${filaActual}`).value = p.comentarios || "-";

        sheet.getCell(`D${filaActual}`).numFmt = '"$"#,##0.00';

        ["A", "B", "C", "D", "E", "F"].forEach((col) => {
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

    // Totales
    let totalEfectivo = 0;
    let totalCheque = 0;
    let totalTransfer = 0;
    let totalTarjeta = 0;
    let totalOtro = 0;

    filtrados.forEach((p) => {
        if (!p.estatus) return;

        const m = String(p.metodo || "").toLowerCase().trim();
        const cantidad = Number(p.cantidad || 0);

        if (m.includes("efectivo")) totalEfectivo += cantidad;
        else if (m.includes("cheque")) totalCheque += cantidad;
        else if (m.includes("transfer")) totalTransfer += cantidad;
        else if (m.includes("tarjeta")) totalTarjeta += cantidad;
        else if (m.includes("otro")) totalOtro += cantidad;
    });

    const totalGeneral =
        totalEfectivo + totalCheque + totalTransfer + totalTarjeta + totalOtro;

    filaActual++;
    sheet.getCell(`A${filaActual}`).value = "TOTALES";
    sheet.mergeCells(`A${filaActual}:B${filaActual}`);
    sheet.getCell(`A${filaActual}`).font = { bold: true, size: 14 };
    sheet.getCell(`A${filaActual}`).alignment = {
        horizontal: "center",
        vertical: "middle",
    };

    ["A", "B"].forEach((col) => {
        const cell = sheet.getCell(`${col}${filaActual}`);
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    filaActual++;

    const totales = [
        ["Efectivo", totalEfectivo],
        ["Cheque", totalCheque],
        ["Transferencia", totalTransfer],
        ["Tarjeta", totalTarjeta],
        ["Otro", totalOtro],
        ["Total General", totalGeneral],
    ];

    totales.forEach(([titulo, valor]) => {
        sheet.getCell(`A${filaActual}`).value = titulo;
        sheet.getCell(`B${filaActual}`).value = Number(valor);
        sheet.getCell(`B${filaActual}`).numFmt = '"$"#,##0.00';

        sheet.getCell(`A${filaActual}`).font = { bold: true };

        ["A", "B"].forEach((col) => {
            const cell = sheet.getCell(`${col}${filaActual}`);
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        filaActual++;
    });

    // Gastos
    filaActual++;
    sheet.getCell(`A${filaActual}`).value = "GASTOS";
    sheet.getCell(`A${filaActual}`).font = { bold: true, size: 14 };

    filaActual++;
    sheet.getCell(`A${filaActual}`).value = "Descripcion";
    sheet.getCell(`B${filaActual}`).value = "Cantidad";

    ["A", "B"].forEach((col) => {
        const cell = sheet.getCell(`${col}${filaActual}`);
        cell.font = { bold: true };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    filaActual++;

    gastosFiltrados.forEach((g) => {
        sheet.getCell(`A${filaActual}`).value = g.descripcion || "-";
        sheet.getCell(`B${filaActual}`).value = Number(g.cantidad || 0);
        sheet.getCell(`B${filaActual}`).numFmt = '"$"#,##0.00';

        ["A", "B"].forEach((col) => {
            const cell = sheet.getCell(`${col}${filaActual}`);
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
        });

        filaActual++;
    });

    const totalGastos = gastosFiltrados.reduce(
        (acc, g) => acc + Number(g.cantidad || 0),
        0
    );

    filaActual++;
    sheet.getCell(`A${filaActual}`).value = "Restante de Gastos:";
    sheet.getCell(`B${filaActual}`).value = totalGastos;
    sheet.getCell(`B${filaActual}`).numFmt = '"$"#,##0.00';

    sheet.getCell(`A${filaActual}`).font = { bold: true };
    sheet.getCell(`B${filaActual}`).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Corte_de_Caja_${desdeForm}_a_${hastaForm}.xlsx`
    );
};