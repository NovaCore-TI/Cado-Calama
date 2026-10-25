"use client";

import { useEffect, useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { Modal } from "./Modal";
import { PdfPreview } from "./PdfPreview";

interface Guide {
  id: string; slug: string; titulo: string; categoria: string; descripcion: string;
  contenido: { heading: string; points: string[] }[];
  activo: boolean; revisado_en: string | null; pages: number; bytes: number; fileName: string;
}
export function GuideLibrary({ admin = false }: { admin?: boolean }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Guide | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/recursos" + (admin ? "?admin=1" : ""), { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw Error(result.error || "No se pudo cargar la biblioteca.");
        setGuides(result.data);
      }).catch(err => { if (!controller.signal.aborted) { setGuides([]); setError(err.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, reload]);
  const download = async (guide: Guide) => {
    if (busy) return;
    setBusy(guide.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/recursos/download?id=${guide.slug}${admin ? "&admin=1" : ""}`, {
        cache: "no-store", headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!response.ok) throw Error((await response.json()).error || "No se pudo descargar el PDF.");
      if (!response.headers.get("content-type")?.includes("application/pdf")) throw Error("El servidor no entregó un PDF.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = guide.fileName;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("PDF recibido. Revisa las descargas de tu navegador para guardarlo.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo descargar el PDF."); }
    finally { setBusy(null); }
  };
  const publish = async (guide: Guide) => {
    if (busy) return;
    const question = guide.activo ? "¿Retirar esta guía de la biblioteca pública?" : "¿Confirmas que revisaste el PDF completo y apruebas su contenido clínico para pacientes?";
    if (!window.confirm(question)) return;
    setBusy(guide.id); setError("");
    try {
      const response = await fetch("/api/recursos", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guide.id, activo: !guide.activo, confirmacionRevision: true }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "No se pudo guardar.");
      setMessage(guide.activo ? "Guía retirada de la biblioteca y de su descarga pública." : "Guía revisada y publicada.");
      setReload(value => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); }
    finally { setBusy(null); }
  };
  return <>
    <div className="min-h-8" aria-live="polite">
      {loading && <p className="text-sm text-[#665D66]">Cargando biblioteca…</p>}
      {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}
        <button onClick={() => setReload(value => value + 1)} className="ml-3 inline-flex items-center gap-1 underline"><RefreshCw size={14} /> Reintentar</button>
      </div>}
    </div>
    {!loading && !error && guides.length === 0 && <p className="rounded-3xl border border-[#E2E7E7] bg-white p-7 text-sm">Las guías estarán disponibles después de su revisión profesional.</p>}
    <div className="grid gap-6 md:grid-cols-3">
      {guides.map(guide => <article key={guide.id} className="soft-card flex min-w-0 flex-col justify-between rounded-3xl bg-white p-7">
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2"><FileText className="h-8 w-8 text-[#A14B92]" aria-hidden="true" /><span className="rounded-full bg-[#F8EFF6] px-3 py-1 text-xs font-semibold text-[#8A3D7D]">{guide.categoria}</span></div>
          <h2 className="font-title text-2xl font-semibold leading-snug">{guide.titulo}</h2>
          <p className="mt-3 text-sm leading-7 text-[#665D66]">{guide.descripcion}</p>
          {admin && <p className="mt-3 text-xs font-semibold">{guide.activo ? "Publicada" : "Retirada / pendiente de revisión"}</p>}
        </div>
        <div className="mt-7 space-y-3 border-t border-[#E2E7E7] pt-5">
          <p className="text-xs text-[#665D66]">{guide.pages} {guide.pages === 1 ? "página" : "páginas"} · {(guide.bytes / 1024).toFixed(1)} KB · PDF</p>
          <button onClick={() => setSelected(guide)} className="text-sm font-semibold text-[#8A3D7D] underline">Previsualizar guía<span className="sr-only">: {guide.titulo}</span></button>
          <button disabled={!!busy} onClick={() => void download(guide)} className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold disabled:opacity-60"><Download size={16} />{busy === guide.id ? "Procesando…" : "Descargar guía PDF"}</button>
          {admin && <button disabled={!!busy} onClick={() => void publish(guide)} className="btn-cado-secondary w-full rounded-xl px-4 py-3 text-xs font-semibold disabled:opacity-60">{guide.activo ? "Retirar publicación" : "Revisar y publicar"}</button>}
        </div>
      </article>)}
    </div>
    {selected && <Modal labelledBy="guide-preview-title" onClose={() => setSelected(null)}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-3"><h2 id="guide-preview-title" className="font-title text-2xl font-semibold">{selected.titulo}</h2><button onClick={() => setSelected(null)} className="btn-cado-secondary shrink-0 rounded-xl px-3 py-2 text-sm">Cerrar</button></div>
        <PdfPreview title={selected.titulo} url={`/api/recursos/download?id=${selected.slug}&preview=1${admin ? "&admin=1" : ""}`} />
        <a href={`/api/recursos/download?id=${selected.slug}&preview=1${admin ? "&admin=1" : ""}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-[#8A3D7D] underline">Abrir PDF en otra pestaña</a>
        <details className="mt-5 text-sm leading-7"><summary className="cursor-pointer font-semibold">Leer versión en texto</summary><p className="mt-3">{selected.descripcion}</p>{!selected.revisado_en && <p>Borrador para revisión profesional. No publicado para pacientes.</p>}{selected.contenido.map(section => <section key={section.heading} className="mt-4"><h3 className="font-semibold">{section.heading}</h3>{section.points.map(point => <p className="mt-2" key={point}>{point}</p>)}</section>)}<p className="mt-4">Contacto CADO: +56 9 4465 7815. Vivar #1580, oficina 203, Calama.</p><p>Material educativo. No sustituye la evaluación presencial ni las indicaciones individuales de tu profesional.</p></details>
      </section>
    </Modal>}
  </>;
}
