import React, { useMemo, useState } from "react";
import jsPDF from "jspdf";

const HOJA_ANCHO = 216; // Carta en mm
const HOJA_ALTO = 279; // Carta en mm
const MARGEN_HOJA = 10;
const SEPARACION = 4;

const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
];

const Lefor: React.FC = () => {
    const [mes, setMes] = useState("Enero");
    const [anio, setAnio] = useState(new Date().getFullYear().toString());

    const [anchoEtiqueta, setAnchoEtiqueta] = useState("70");
    const [altoEtiqueta, setAltoEtiqueta] = useState("200");

    const [copias, setCopias] = useState("1");
    const [dosDiferentes, setDosDiferentes] = useState(false);

    const [mes2, setMes2] = useState("Febrero");
    const [anio2, setAnio2] = useState(new Date().getFullYear().toString());

    const ancho = Number(anchoEtiqueta) || 0;
    const alto = Number(altoEtiqueta) || 0;
    const cantidadCopias = Number(copias) || 1;

    const etiquetasPorFila =
        ancho > 0
            ? Math.floor((HOJA_ANCHO - MARGEN_HOJA * 2 + SEPARACION) / (ancho + SEPARACION))
            : 0;

    const filasPorHoja =
        alto > 0
            ? Math.floor((HOJA_ALTO - MARGEN_HOJA * 2 + SEPARACION) / (alto + SEPARACION))
            : 0;

    const etiquetasPorHoja = etiquetasPorFila * filasPorHoja;

    const cabenDosDiferentes = useMemo(() => {
        if (ancho <= 0 || alto <= 0) return false;
        return etiquetasPorHoja >= 2;
    }, [ancho, alto, etiquetasPorHoja]);

    const escalaPreview = useMemo(() => {
        if (ancho <= 0 || alto <= 0) return 1;
        const maxW = 260;
        const maxH = 420;
        return Math.min(maxW / HOJA_ANCHO, maxH / HOJA_ALTO);
    }, [ancho, alto]);

    const hojaPreviewWidth = HOJA_ANCHO * escalaPreview;
    const hojaPreviewHeight = HOJA_ALTO * escalaPreview;

    // Convierte el SVG a PNG real para que jsPDF no falle
    const svgToPngDataUrl = async (url: string): Promise<string> => {
        const response = await fetch(url);
        const svgText = await response.text();

        const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const blobUrl = URL.createObjectURL(svgBlob);

        try {
            const img = new Image();

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("No se pudo cargar el SVG"));
                img.src = blobUrl;
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width || 1200;
            canvas.height = img.height || 800;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("No se pudo crear el canvas");
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            return canvas.toDataURL("image/png");
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
    };

    const dibujarEtiqueta = (
        doc: jsPDF,
        x: number,
        y: number,
        width: number,
        height: number,
        logoPng: string,
        mesTexto: string,
        anioTexto: string
    ) => {
        const centroX = x + width / 2;

        doc.setDrawColor(0, 0, 0);
        doc.rect(x, y, width, height);

        const margenInterno = Math.max(4, width * 0.07);

        const logoWidth = width - margenInterno * 2;
        const logoHeight = Math.min(height * 0.16, 34);

        doc.addImage(
            logoPng,
            "PNG",
            x + (width - logoWidth) / 2,
            y + 6,
            logoWidth,
            logoHeight
        );

        const tituloY = y + 6 + logoHeight + 12;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(12, Math.min(20, width * 0.25)));
        doc.text("Papelería", centroX, tituloY, { align: "center" });
        doc.text("comprobatorio", centroX, tituloY + 8, { align: "center" });

        const mesY = y + height * 0.50;
        const anioY = y + height * 0.62;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(18, Math.min(30, width * 0.35)));
        doc.text(mesTexto, centroX, mesY, { align: "center" });

        doc.setFontSize(Math.max(18, Math.min(32, width * 0.38)));
        doc.text(anioTexto || "----", centroX, anioY, { align: "center" });
    };

    const generarPDF = async () => {
        try {
            if (ancho <= 0 || alto <= 0) {
                alert("Pon un ancho y alto válidos.");
                return;
            }

            if (etiquetasPorHoja < 1) {
                alert("La etiqueta no cabe en la hoja carta con ese tamaño.");
                return;
            }

            if (dosDiferentes && !cabenDosDiferentes) {
                alert("Con ese tamaño no caben 2 etiquetas diferentes en la misma hoja.");
                return;
            }

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "letter",
            });

            const logoPng = await svgToPngDataUrl("/svg/logo_negro.svg");

            const posiciones: Array<{ x: number; y: number }> = [];

            for (let fila = 0; fila < filasPorHoja; fila++) {
                for (let col = 0; col < etiquetasPorFila; col++) {
                    const x = MARGEN_HOJA + col * (ancho + SEPARACION);
                    const y = MARGEN_HOJA + fila * (alto + SEPARACION);
                    posiciones.push({ x, y });
                }
            }

            if (dosDiferentes && cantidadCopias === 1) {
                dibujarEtiqueta(doc, posiciones[0].x, posiciones[0].y, ancho, alto, logoPng, mes, anio);
                dibujarEtiqueta(doc, posiciones[1].x, posiciones[1].y, ancho, alto, logoPng, mes2, anio2);
            } else {
                for (let i = 0; i < cantidadCopias; i++) {
                    if (i > 0 && i % posiciones.length === 0) {
                        doc.addPage("letter", "portrait");
                    }

                    const indice = i % posiciones.length;
                    const pos = posiciones[indice];

                    dibujarEtiqueta(doc, pos.x, pos.y, ancho, alto, logoPng, mes, anio);
                }
            }

            doc.save(`etiquetas_${mes}_${anio}.pdf`);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("No se pudo generar el PDF. Revisa la consola.");
        }
    };

    const renderEtiquetasPreview = () => {
        const items: React.ReactNode[] = [];

        const totalMostrar =
            dosDiferentes && cantidadCopias === 1 ? 2 : Math.min(cantidadCopias, etiquetasPorHoja);

        for (let i = 0; i < totalMostrar; i++) {
            const fila = Math.floor(i / etiquetasPorFila);
            const col = i % etiquetasPorFila;

            const left = (MARGEN_HOJA + col * (ancho + SEPARACION)) * escalaPreview;
            const top = (MARGEN_HOJA + fila * (alto + SEPARACION)) * escalaPreview;

            const textoMes = dosDiferentes && cantidadCopias === 1 && i === 1 ? mes2 : mes;
            const textoAnio = dosDiferentes && cantidadCopias === 1 && i === 1 ? anio2 : anio;

            items.push(
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        left,
                        top,
                        width: ancho * escalaPreview,
                        height: alto * escalaPreview,
                        border: "1px solid #111",
                        background: "#fff",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <div
                        style={{
                            width: "82%",
                            height: `${Math.max(28, alto * escalaPreview * 0.12)}px`,
                            marginTop: 8,
                            borderBottom: "1px solid #bbb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: Math.max(10, ancho * escalaPreview * 0.08),
                        }}
                    >
                        LOGO
                    </div>

                    <div
                        style={{
                            marginTop: 10,
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: Math.max(10, ancho * escalaPreview * 0.08),
                            lineHeight: 1.15,
                        }}
                    >
                        <div>Papelería</div>
                        <div>comprobatorio</div>
                    </div>

                    <div
                        style={{
                            marginTop: "22%",
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: Math.max(12, ancho * escalaPreview * 0.11),
                        }}
                    >
                        {textoMes}
                    </div>

                    <div
                        style={{
                            marginTop: 12,
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: Math.max(12, ancho * escalaPreview * 0.12),
                        }}
                    >
                        {textoAnio}
                    </div>
                </div>
            );
        }

        return items;
    };

    return (
        <div
            style={{
                maxWidth: 1100,
                margin: "20px auto",
                padding: 20,
                display: "grid",
                gridTemplateColumns: "420px 1fr",
                gap: 24,
                alignItems: "start",
            }}
        >
            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    background: "#fff",
                    padding: 20,
                }}
            >
                <h2 style={{ marginTop: 0, marginBottom: 20 }}>Etiquetas Lefor</h2>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                        Mes
                    </label>
                    <select
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ccc",
                        }}
                    >
                        {meses.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                        Año
                    </label>
                    <input
                        type="number"
                        value={anio}
                        onChange={(e) => setAnio(e.target.value)}
                        style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ccc",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginBottom: 15,
                    }}
                >
                    <div>
                        <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                            Ancho etiqueta (mm)
                        </label>
                        <input
                            type="number"
                            value={anchoEtiqueta}
                            onChange={(e) => setAnchoEtiqueta(e.target.value)}
                            style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 8,
                                border: "1px solid #ccc",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                            Alto etiqueta (mm)
                        </label>
                        <input
                            type="number"
                            value={altoEtiqueta}
                            onChange={(e) => setAltoEtiqueta(e.target.value)}
                            style={{
                                width: "100%",
                                padding: 10,
                                borderRadius: 8,
                                border: "1px solid #ccc",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                        Número de copias
                    </label>
                    <select
                        value={copias}
                        onChange={(e) => {
                            setCopias(e.target.value);
                            if (e.target.value !== "1") {
                                setDosDiferentes(false);
                            }
                        }}
                        style={{
                            width: "100%",
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #ccc",
                        }}
                    >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                </div>

                {cantidadCopias === 1 && (
                    <div
                        style={{
                            marginBottom: 15,
                            padding: 12,
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            background: "#fafafa",
                        }}
                    >
                        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: "bold" }}>
                            <input
                                type="checkbox"
                                checked={dosDiferentes}
                                onChange={(e) => setDosDiferentes(e.target.checked)}
                                disabled={!cabenDosDiferentes}
                            />
                            Poner 2 diferentes en la misma hoja
                        </label>

                        {!cabenDosDiferentes && (
                            <div style={{ marginTop: 8, color: "#b91c1c", fontSize: 14 }}>
                                Con este tamaño no caben 2 etiquetas diferentes en la misma hoja.
                            </div>
                        )}
                    </div>
                )}

                {cantidadCopias === 1 && dosDiferentes && cabenDosDiferentes && (
                    <div
                        style={{
                            marginBottom: 20,
                            padding: 14,
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            background: "#fcfcfc",
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Segunda etiqueta</h3>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                                Mes 2
                            </label>
                            <select
                                value={mes2}
                                onChange={(e) => setMes2(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 10,
                                    borderRadius: 8,
                                    border: "1px solid #ccc",
                                }}
                            >
                                {meses.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: 8 }}>
                                Año 2
                            </label>
                            <input
                                type="number"
                                value={anio2}
                                onChange={(e) => setAnio2(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 10,
                                    borderRadius: 8,
                                    border: "1px solid #ccc",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>
                )}

                <div
                    style={{
                        marginBottom: 18,
                        padding: 12,
                        borderRadius: 10,
                        background: "#f5f5f5",
                        fontSize: 14,
                        lineHeight: 1.6,
                    }}
                >
                    <div><b>Hoja:</b> Carta ({HOJA_ANCHO} x {HOJA_ALTO} mm)</div>
                    <div><b>Etiquetas por fila:</b> {etiquetasPorFila}</div>
                    <div><b>Filas por hoja:</b> {filasPorHoja}</div>
                    <div><b>Total por hoja:</b> {etiquetasPorHoja}</div>
                </div>

                <button
                    onClick={generarPDF}
                    style={{
                        width: "100%",
                        padding: 12,
                        border: "none",
                        borderRadius: 8,
                        background: "#111",
                        color: "#fff",
                        fontWeight: "bold",
                        cursor: "pointer",
                    }}
                >
                    Generar PDF
                </button>
            </div>

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    background: "#fff",
                    padding: 20,
                    minHeight: 580,
                }}
            >
                <h3 style={{ marginTop: 0 }}>Vista previa</h3>

                <div style={{ marginBottom: 10, color: "#555", fontSize: 14 }}>
                    La hoja de la derecha se dibuja con base en las medidas capturadas.
                </div>

                <div
                    style={{
                        width: hojaPreviewWidth,
                        height: hojaPreviewHeight,
                        border: "1px solid #999",
                        background: "#fdfdfd",
                        position: "relative",
                        margin: "0 auto",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    }}
                >
                    {renderEtiquetasPreview()}
                </div>
            </div>
        </div>
    );
};

export default Lefor;