// src/plantillas/excel_gastos.ts
// Plantilla para generar un Excel con los gastos de un rango de fechas

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getDatabase, ref, get } from "firebase/database";
import { app } from "../firebase/config";

// Convierte "2026-07-24" -> "24/07/2026"
const convertirFecha = (fecha: string): string => {
    if (!fecha) return "-";

    const partes = fecha.split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// Convierte SVG a PNG base64 usando canvas
const convertirSVGaPNGBase64 = async (
    svgPath: string,
    width = 600,
    height = 300
): Promise<string> => {
    const response = await fetch(svgPath);

    if (!response.ok) {
        throw new Error(
            `No se pudo cargar el SVG: ${svgPath}`
        );
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
                reject(
                    new Error(
                        "No se pudo convertir el SVG a imagen"
                    )
                );

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

export const generarExcelGastos = async (
    desde: string,
    hasta: string
) => {
    if (!desde || !hasta) {
        alert("Debes seleccionar ambas fechas");
        return;
    }

    const desdeForm = convertirFecha(desde);
    const hastaForm = convertirFecha(hasta);

    const logoBase64 = await convertirSVGaPNGBase64(
        "/svg/logo_negro.svg",
        700,
        220
    );

    const db = getDatabase(app);
    const refGastos = ref(db, "gastos");
    const snapshot = await get(refGastos);

    if (!snapshot.exists()) {
        alert("No hay gastos registrados");
        return;
    }

    const data = snapshot.val();
    const gastos: any[] = [];

    /*
     * Recorremos todas las carpetas de registro.
     *
     * Ejemplo:
     * gastos/30072026
     */
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

    const desdeDate = new Date(
        `${desde}T00:00:00`
    ).getTime();

    const hastaDate = new Date(
        `${hasta}T23:59:59`
    ).getTime();

    /*
     * Filtramos por fechaMovimiento y excluimos entradas.
     */
    const filtrados = gastos.filter((g) => {
        if (g.tipo !== "gasto") {
            return false;
        }

        const fechaMovimiento = String(
            g.fechaMovimiento || ""
        );

        if (!fechaMovimiento) {
            return false;
        }

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Gastos");

    // Anchos de columnas
    sheet.getColumn("A").width = 20;
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
    titulo.font = {
        bold: true,
        size: 16,
    };
    titulo.alignment = {
        horizontal: "center",
        vertical: "middle",
    };

    sheet.getRow(4).height = 24;

    // Fecha de generación
    sheet.mergeCells("A5:D5");

    const generado = sheet.getCell("A5");

    generado.value =
        `Generado: ${new Date().toLocaleDateString(
            "es-MX"
        )} ${new Date().toLocaleTimeString("es-MX")}`;

    generado.font = {
        size: 10,
    };

    generado.alignment = {
        horizontal: "center",
        vertical: "middle",
    };

    const filaHeader = 7;

    sheet.getCell(`A${filaHeader}`).value =
        "Fecha movimiento";

    sheet.getCell(`B${filaHeader}`).value =
        "Descripción";

    sheet.getCell(`C${filaHeader}`).value = "Tipo";

    sheet.getCell(`D${filaHeader}`).value =
        "Cantidad";

    sheet.getRow(filaHeader).height = 22;

    ["A", "B", "C", "D"].forEach((col) => {
        const cell = sheet.getCell(
            `${col}${filaHeader}`
        );

        cell.font = {
            bold: true,
            color: {
                argb: "FFFFFFFF",
            },
        };

        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FF000000",
            },
        };

        cell.alignment = {
            horizontal: "center",
            vertical: "middle",
        };

        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    let filaActual = filaHeader + 1;

    filtrados.forEach((g) => {
        const fecha = convertirFecha(
            g.fechaMovimiento
        );

        sheet.getCell(`A${filaActual}`).value = fecha;

        sheet.getCell(`B${filaActual}`).value =
            g.descripcion || "";

        sheet.getCell(`C${filaActual}`).value =
            "Gasto";

        sheet.getCell(`D${filaActual}`).value =
            Number(g.cantidad || 0);

        sheet.getCell(`D${filaActual}`).numFmt =
            '$#,##0.00';

        ["A", "B", "C", "D"].forEach((col) => {
            const cell = sheet.getCell(
                `${col}${filaActual}`
            );

            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };

            cell.alignment = {
                vertical: "middle",
                horizontal:
                    col === "D" ? "right" : "left",
            };
        });

        filaActual++;
    });

    filaActual++;

    const totalGastos = filtrados.reduce(
        (acc, g) =>
            acc + Math.abs(Number(g.cantidad || 0)),
        0
    );

    sheet.getCell(`A${filaActual}`).value =
        "GASTOS TOTALES";

    sheet.getCell(`D${filaActual}`).value =
        totalGastos;

    sheet.getCell(`D${filaActual}`).numFmt =
        '$#,##0.00';

    sheet.getCell(`A${filaActual}`).font = {
        bold: true,
    };

    sheet.getCell(`D${filaActual}`).font = {
        bold: true,
    };

    ["A", "B", "C", "D"].forEach((col) => {
        const cell = sheet.getCell(
            `${col}${filaActual}`
        );

        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });

    sheet.views = [
        {
            state: "frozen",
            ySplit: filaHeader,
        },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const nombreDesde = desdeForm.replace(/\//g, "_");
    const nombreHasta = hastaForm.replace(/\//g, "_");

    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `Gastos_${nombreDesde}_a_${nombreHasta}.xlsx`
    );
};