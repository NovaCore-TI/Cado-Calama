"use client";
import { useEffect, useRef, useState } from "react";

export function PdfPreview({ url, title }: { url: string; title: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    let destroy: (() => Promise<void>) | undefined;
    const target = container.current!;
    target.replaceChildren();
    setLoading(true); setError("");
    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw Error("La guía ya no está disponible o no se pudo cargar.");
      const task = pdfjs.getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
      destroy = () => task.destroy();
      const pdf = await task.promise;
      for (let n = 1; n <= pdf.numPages && !controller.signal.aborted; n++) {
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        canvas.className = "h-auto w-full rounded-lg bg-white shadow-sm";
        canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", `${title}, página ${n} de ${pdf.numPages}. Versión en texto disponible debajo.`);
        target.appendChild(canvas);
        await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      }
      if (!controller.signal.aborted) setLoading(false);
    })().catch(() => { if (!controller.signal.aborted) { setError("No se pudo mostrar el PDF. Puedes abrirlo en otra pestaña o leer la versión en texto."); setLoading(false); } });
    return () => { controller.abort(); void destroy?.(); target.replaceChildren(); };
  }, [url, title]);
  return <div className="rounded-xl border border-[#E2E7E7] bg-[#F6F8F8] p-2">
    {loading && <p role="status" className="p-4 text-sm">Cargando PDF…</p>}
    {error && <p role="alert" className="p-4 text-sm text-red-800">{error}</p>}
    <div ref={container} className="space-y-3" />
  </div>;
}
