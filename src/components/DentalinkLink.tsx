import { ArrowUpRight, MessageCircle } from "lucide-react";

function configuredUrl() {
  try {
    const value = new URL(process.env.NEXT_PUBLIC_DENTALINK_URL || "");
    if (value.protocol === "https:" && !value.username && !value.password) return value.href;
  } catch {}
  return null;
}
export function DentalinkLink() {
  const url = configuredUrl();
  return <div className="max-w-md space-y-2 text-sm">
    <p className="text-xs leading-6 text-[#665D66]">{url
      ? "La reserva presencial se realiza en Dentalink. El enlace abre su agenda externa en otra pestaña."
      : "La agenda presencial en línea aún no está habilitada. Coordina tu consulta con CADO por WhatsApp."}</p>
    <a href={url || "https://wa.me/56944657815?text=Hola%2C%20quisiera%20coordinar%20una%20consulta%20presencial%20en%20CADO."} target="_blank" rel="noopener noreferrer"
      className="btn-cado-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold">
      {url ? <><span>Continuar a Dentalink</span><ArrowUpRight size={16} /></> : <><MessageCircle size={16} /><span>Coordinar por WhatsApp</span></>}
      <span className="sr-only"> (sitio externo, abre otra pestaña)</span>
    </a>
  </div>;
}
