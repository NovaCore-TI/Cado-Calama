'use client';

import { useEffect, useState } from 'react';
import { SAV_PRICE_CLP } from "@/lib/sav-payment";
import { CreditCard } from 'lucide-react';
import { whatsappUrl } from '@/lib/clinic';

export function SavPayment({ bookingCode }: { bookingCode?: string }) {
  const [config, setConfig] = useState<{ priceClp: number | null; paymentUrl: string | null } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/sav', { signal: controller.signal }).then(async response => {
      if (response.ok) setConfig(await response.json());
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return <div className="rounded-2xl border border-[#E2E7E7] bg-white p-5 text-left text-sm leading-7">
    <h3 className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-[#A14B92]" aria-hidden="true" />Valor y pago de la SAV</h3>
    <p className="mt-2">Valor de la sesión: <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(config?.priceClp ?? SAV_PRICE_CLP)} CLP</strong>. {!config?.paymentUrl && 'Puedes coordinar el pago con el equipo por WhatsApp.'}</p>
    {bookingCode && config?.paymentUrl ? <><p className="mt-2">Conserva tu código de reserva <strong>{bookingCode}</strong> para identificar tu pago. El equipo confirmará su recepción.</p><a href={config.paymentUrl} target="_blank" rel="noopener noreferrer" className="btn-cado-primary mt-4 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">Ir al pago de mi SAV<span className="sr-only"> (sitio externo, abre otra pestaña)</span></a></> : <a href={whatsappUrl(`Hola CADO, quisiera consultar el valor y el medio de pago de la SAV${bookingCode ? ` para mi reserva ${bookingCode}` : ''}.`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-[#8A3D7D] underline">Coordinar el pago por WhatsApp</a>}
  </div>;
}
