import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "svg2pdf.js";

/** Estructura compatible con las órdenes agregadas por proovedor_banda.tsx. */
export interface OrdenBandaProveedor {
  id?: string;
  ot?: string;
  descripcion?: string;
  total: number;
  datos?: {
    diametro?: number;
    ancho?: number;
    cantidad?: number;
    precioUnitario?: number;
    productosExtras?: Array<{
      id?: string;
      descripcion: string;
      cantidad: number;
      precio: number;
    }>;
    [campo: string]: unknown;
  };
}

export interface DatosPagoBandaProveedor {
  ordenes: OrdenBandaProveedor[];
  fecha?: string;
  /** Nombre del archivo PDF, sin extensión. */
  nombreArchivo?: string;
}

const moneda = (valor: number): string =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(valor);

const numeroValido = (valor: unknown): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

const textoTipo = (orden: OrdenBandaProveedor): string => {
  const datos = orden.datos;
  const diametro = numeroValido(datos?.diametro);
  const ancho = numeroValido(datos?.ancho);
  if (diametro > 0 && ancho > 0) {
    return `BANDA Ø ${diametro}\" × ANCHO ${ancho}\"`;
  }
  const productos = (datos?.productosExtras ?? []).filter(
    (producto) => producto.descripcion?.trim(),
  );
  if (productos.length) {
    return productos.map((producto) => producto.descripcion.trim()).join(" / ");
  }
  return orden.descripcion?.trim() || "PRODUCTO";
};

const obtenerCantidad = (orden: OrdenBandaProveedor): number => {
  const cantidadBanda = numeroValido(orden.datos?.cantidad);
  if (numeroValido(orden.datos?.diametro) > 0 && numeroValido(orden.datos?.ancho) > 0) {
    return cantidadBanda > 0 ? cantidadBanda : 1;
  }
  const productos = orden.datos?.productosExtras ?? [];
  if (productos.length === 1) return numeroValido(productos[0].cantidad) || 1;
  if (productos.length > 1) return 1; // Una OT con varios productos se presenta como conjunto.
  return cantidadBanda > 0 ? cantidadBanda : 1;
};

const obtenerPrecioUnitario = (orden: OrdenBandaProveedor, cantidad: number): number => {
  const total = numeroValido(orden.total);
  // En productos extras, precioUnitario puede corresponder a la cotización,
  // no a una pieza individual. Derivarlo del total evita inconsistencias.
  return cantidad > 0 ? total / cantidad : total;
};

/**
 * Genera y descarga el PDF de relación de pago de Banda Proveedor.
 * No consulta ni modifica Firebase; recibe las órdenes del resumen.
 * Ejemplo: await generarPDFPagoBandaProveedor({ ordenes: partidas });
 */
export const generarPDFPagoBandaProveedor = async (
  data: DatosPagoBandaProveedor,
): Promise<void> => {
  if (!data.ordenes?.length) {
    throw new Error("No hay órdenes para generar la relación de pago.");
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 16;
  const fecha = data.fecha || new Date().toLocaleDateString("es-MX");

  // Mismo logo utilizado en la plantilla de OT de RAFF.
  const respuesta = await fetch("/svg/logo_negro.svg");
  if (!respuesta.ok) throw new Error("No se pudo cargar el logo de RAFF.");
  const svgTexto = await respuesta.text();
  const svg = new DOMParser().parseFromString(svgTexto, "image/svg+xml").documentElement;
  if (svg.nodeName.toLowerCase() === "parsererror") {
    throw new Error("El archivo del logo SVG no es válido.");
  }
  await doc.svg(svg, { x: margen, y: 17, width: 43 });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RAFF Especialistas térmicos", 66, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("RFC: RET231130AN2", 66, 29);
  doc.text("Reforma 1462, Santa Tere, 44600", 66, 34);
  doc.text("Guadalajara, Jalisco, México", 66, 39);
  doc.text("Tel (33)40409058", 66, 44);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELACIÓN DE PAGO - BANDA PROVEEDOR", margen, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fecha: ${fecha}`, anchoPagina - margen, 60, { align: "right" });

  const filas = data.ordenes.map((orden) => {
    const cantidad = obtenerCantidad(orden);
    const total = numeroValido(orden.total);
    const folio = orden.ot?.trim() || "SIN OT";
    return [
      folio,
      String(cantidad),
      textoTipo(orden),
      moneda(obtenerPrecioUnitario(orden, cantidad)),
      moneda(total),
    ];
  });

  const totalGeneral = data.ordenes.reduce(
    (suma, orden) => suma + numeroValido(orden.total),
    0,
  );

  autoTable(doc, {
    startY: 68,
    head: [["Folio", "Cantidad", "Tipo", "Precio unitario", "Total"]],
    body: filas,
    foot: [["", "", "", "TOTAL GENERAL", moneda(totalGeneral)]],
    showFoot: "lastPage",
    showHead: "everyPage",
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.5, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [235, 235, 235], textColor: [0, 0, 0], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 70 },
      3: { cellWidth: 37, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margen, right: margen, top: 18, bottom: 18 },
  });

  const nombre = (data.nombreArchivo || "Pago_Banda_Proveedor")
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]/g, "_");
  doc.save(`${nombre}.pdf`);
};

export default generarPDFPagoBandaProveedor;
