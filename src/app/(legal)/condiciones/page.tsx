import Link from 'next/link';
import { CLINIC } from '@/lib/clinic';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata({
  path: '/condiciones',
  title: 'Condiciones de servicio',
  description: 'Condiciones de uso del portal de CADO y de reserva, reprogramación y cancelación de una SAV.',
});

export default function CondicionesPage() {
  return (
    <>
      <header className="space-y-3 border-b border-[#E2E7E7] pb-6">
        <h1 className="font-title text-4xl font-semibold sm:text-5xl">Condiciones de servicio</h1>
        <p className="text-sm">Actualizadas el 26 de noviembre de 2026</p>
        <p>Estas condiciones describen el uso del portal de {CLINIC.fullName} y la gestión de sus Sesiones de Acercamiento Virtual.</p>
      </header>

      <section>
        <h2 className="font-title text-2xl font-semibold">Alcance de la SAV</h2>
        <p>La SAV es una videollamada de orientación inicial de 15 minutos. Sirve para conocer tu situación, escuchar tus dudas y preparar los siguientes pasos de atención. El diagnóstico, las indicaciones y los tratamientos requieren la evaluación clínica que corresponda. Si necesitas atención urgente, consulta los <Link href="/urgencias">canales de urgencias</Link>.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Reserva y acceso a la videollamada</h2>
        <p>Elige un horario disponible e ingresa datos de contacto correctos. Conserva el código que aparece al confirmar y guarda el enlace privado de autogestión para usarlo personalmente. La invitación de Google Calendar y el enlace de Meet pueden quedar pendientes mientras se prepara la videollamada. Si se acerca la sesión y todavía falta el enlace, comunícate con CADO.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Valor, cambios y cancelaciones</h2>
        <p>El valor de la SAV y el canal de pago disponible se muestran durante el proceso de reserva. Puedes reprogramar o cancelar desde tu enlace privado según la disponibilidad que muestre el portal. Si ya pagaste y necesitas gestionar un cambio, una cancelación o un cobro, contacta al equipo de CADO con el código de reserva.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Uso del portal y contacto</h2>
        <p>Usa el portal para consultar información y gestionar tus propias reservas. La <Link href="/privacidad">política de privacidad</Link> explica el tratamiento de los datos de pacientes y profesionales. Para consultas sobre el servicio, escribe a <a href={`mailto:${CLINIC.email}`}>{CLINIC.email}</a> o usa los <Link href="/contacto">canales de contacto de CADO</Link>.</p>
        <p>Estas condiciones se aplican junto con los derechos que te reconoce la normativa aplicable.</p>
      </section>
    </>
  );
}
