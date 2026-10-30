import "server-only";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";

const fontCache = new Map<string, Buffer>();
function loadFont(name: string): Buffer {
  let buf = fontCache.get(name);
  if (!buf) {
    buf = fs.readFileSync(path.join(process.cwd(), "public", "fonts", name));
    fontCache.set(name, buf);
  }
  return buf;
}

export interface GuideSection { heading: string; points: string[] }
export interface GuideDocument {
  id: string; slug: string; titulo: string; categoria: string; descripcion: string;
  contenido: GuideSection[]; activo: boolean; revisado_en: string | null;
}
export async function generateGuidePdf(guide: GuideDocument): Promise<{ bytes: Buffer; pages: number }> {
  const regularFont = loadFont("Poppins-Regular.ttf");
  const boldFont = loadFont("Poppins-SemiBold.ttf");
  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true,
    font: regularFont as unknown as string, tagged: true, lang: "es-CL", displayTitle: true,
    info: { Title: guide.titulo, Author: "CADO Odontología", Subject: guide.categoria,
      CreationDate: new Date(guide.revisado_en || "2026-10-24T00:00:00Z"),
      ModDate: new Date(guide.revisado_en || "2026-10-24T00:00:00Z") },
  });
  doc.registerFont("Body", regularFont);
  doc.registerFont("Heading", boldFont);
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const root = doc.struct("Document");
  doc.addStructure(root);
  const text = (tag: string, value: string, size: number, bold = false) => {
    doc.font(bold ? "Heading" : "Body").fontSize(size).fillColor(bold ? "#513D49" : "#493F47");
    const height = doc.heightOfString(value + " ", { width: 499, lineGap: 4 });
    if (doc.y + height > 745) doc.addPage();
    const marked = doc.markStructureContent(tag);
    doc.text(value + " ", { width: 499, lineGap: 4 });
    doc.endMarkedContent();
    root.add(doc.struct(tag, {}, [marked]));
    doc.moveDown(0.5);
  };
  text("P", "CADO ODONTOLOGÍA · CALAMA", 11, true);
  text("H1", guide.titulo, 21, true);
  text("P", guide.descripcion, 10);
  if (!guide.revisado_en) text("P", "Borrador para revisión profesional. No publicado para pacientes.", 10, true);
  for (const section of guide.contenido) {
    // Keep the heading and its first paragraph on the same page.
    if (doc.y > 670) doc.addPage();
    text("H2", section.heading, 12, true);
    for (const point of section.points) text("P", point, 10);
  }
  text("P", "Contacto CADO: +56 9 4465 7815. Vivar #1580, oficina 203, Calama.", 10, true);
  text("P", "Material educativo. No sustituye la evaluación presencial ni las indicaciones individuales de tu profesional.", 9);
  root.end();
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.markContent("Artifact", { type: "Pagination", attached: ["Bottom"] });
    doc.font("Body").fontSize(8).fillColor("#665D66");
    doc.text(`CADO · Página ${i + 1} de ${range.count}`, 48, 780, { lineBreak: false });
    doc.endMarkedContent();
  }
  doc.end();
  return { bytes: await finished, pages: range.count };
}
