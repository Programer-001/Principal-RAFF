import React, { useState } from "react";
import jsPDF from "jspdf";
import "svg2pdf.js";

const Lefor: React.FC = () => {
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

    const [mes, setMes] = useState("Enero");
    const [anio, setAnio] = useState(new Date().getFullYear().toString());

    const generarPDF = async () => {
        try {
            const ancho = 70;
            const alto = 240;
            const centroX = ancho / 2;

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [ancho, alto],
            });

            // Fondo blanco
            doc.setFillColor(255, 255, 255);
            doc.rect(0, 0, ancho, alto, "F");

            // Borde exterior
            doc.setDrawColor(0, 0, 0);
            doc.rect(1, 1, ancho - 2, alto - 2);

            // Cargar logo SVG desde public
            const response = await fetch("/svg/logo_negro.svg");
            const svgText = await response.text();

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            const svgElement = svgDoc.documentElement;

            // Logo centrado
            await doc.svg(svgElement, {
                x: -4,
                y: 8,
                width: 80,
                height: 42,
            });

            // Título centrado
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("Papelería", centroX, 45, { align: "center" });
            doc.text("comprobatorio", centroX, 53, { align: "center" });

            // Mes centrado
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text(mes, centroX, 110, { align: "center" });

            // Año centrado
            doc.setFont("helvetica", "bold");
            doc.setFontSize(26);
            doc.text(anio || "----", centroX, 135, { align: "center" });

            doc.save(`papeleria_comprobatorio_${mes}_${anio || "sin-anio"}.pdf`);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            alert("No se pudo generar el PDF");
        }
    };

    return (
        <div
            style={{
                maxWidth: 400,
                margin: "30px auto",
                padding: 20,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "#fff",
            }}
        >
            <h2 style={{ marginBottom: 20 }}>Etiqueta Lefor</h2>

            <div style={{ marginBottom: 15 }}>
                <label
                    style={{
                        display: "block",
                        fontWeight: "bold",
                        marginBottom: 8,
                    }}
                >
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

            <div style={{ marginBottom: 20 }}>
                <label
                    style={{
                        display: "block",
                        fontWeight: "bold",
                        marginBottom: 8,
                    }}
                >
                    Año
                </label>

                <input
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    placeholder="Escribe el año"
                    style={{
                        width: "100%",
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        boxSizing: "border-box",
                    }}
                />
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
    );
};

export default Lefor;