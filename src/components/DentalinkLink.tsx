import { ArrowUpRight, MessageCircle } from "lucide-react";
import { whatsappUrl } from "@/lib/clinic";

function configuredUrl() {
  try {
    const value = new URL(process.env.NEXT_PUBLIC_DENTALINK_URL || "");
    if (value.protocol === "https:" && !value.username && !value.password) return value.href;
  } catch {}
  return null;
}
export function DentalinkLink({ label, compact = false, primary = false, phone }: { label?: string; compact?: boolean; primary?: boolean; phone?: string }) {
  const url = configuredUrl();
  return <div className="max-w-md space-y-2 text-sm">
    {!compact && <p className="text-xs leading-6 text-[#665D66]">{url
      ? "La reserva presencial se realiza en Dentalink. El enlace abre su agenda externa en otra pestaña."
      : "La agenda presencial en línea aún no está habilitada. Coordina tu consulta con CADO por WhatsApp."}</p>}
    <a href={url || whatsappUrl("Hola, quisiera coordinar una consulta presencial en CADO.", phone)} target="_blank" rel="noopener noreferrer"
      className={'material-button text-sm font-semibold ' + (primary ? 'btn-cado-primary' : 'btn-cado-secondary')}>
      {url ? <><span>{label || 'Continuar a Dentalink'}</span><ArrowUpRight size={16} aria-hidden="true" /></> : <><MessageCircle size={16} aria-hidden="true" /><span>{label || 'Coordinar por WhatsApp'}</span></>}
      <span className="sr-only"> (sitio externo, abre otra pestaña)</span>
    </a>
  </div>;
}
