import { CLINIC } from '@/lib/clinic';
import { publicMetadata } from '@/lib/seo';

export const metadata = publicMetadata({
  path: '/privacidad',
  title: 'Política de privacidad',
  description: 'Cómo CADO usa los datos del portal, las reservas y la vinculación profesional con Google Calendar y Meet.',
});

export default function PrivacidadPage() {
  return (
    <>
      <header className="space-y-3 border-b border-[#E2E7E7] pb-6">
        <h1 className="font-title text-4xl font-semibold sm:text-5xl">Política de privacidad</h1>
        <p className="text-sm">Actualizada el 26 de noviembre de 2026</p>
        <p>Este aviso describe cómo {CLINIC.fullName} usa los datos en su portal de Calama. Para consultas de privacidad, escribe a <a href={`mailto:${CLINIC.email}`}>{CLINIC.email}</a>.</p>
      </header>

      <section>
        <h2 className="font-title text-2xl font-semibold">Datos y finalidades de la reserva</h2>
        <p>Al reservar una Sesión de Acercamiento Virtual (SAV), CADO recibe tu nombre, correo, teléfono y horario elegido. Si completas la encuesta TES o el relato opcional, también recibe tus respuestas y preferencias de atención. CADO usa estos datos para gestionar la reserva, confirmar o modificar el horario, comunicarse contigo y ayudar al profesional asignado a preparar la sesión.</p>
        <p>El equipo autorizado puede consultar los registros que necesita para coordinar la atención. El sitio guarda una referencia temporal en el navegador para recuperar una confirmación ante un corte de red y usa cookies técnicas para la sesión profesional y la vinculación con Google.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Google Calendar y Google Meet</h2>
        <p>Cada profesional autoriza su propia cuenta de Google desde la intranet. CADO recibe la dirección de correo de esa cuenta y guarda una credencial de renovación en sus sistemas para mantener la conexión. El permiso de eventos se usa para crear, consultar, actualizar y cancelar las citas de CADO en el calendario principal del profesional, generar el enlace de Meet y enviar invitaciones o cambios a los asistentes.</p>
        <p>Una invitación puede incluir nombre y datos de contacto, horario, código de reserva, preferencias de atención cuando se hayan indicado, enlace de Meet y enlace privado de autogestión. Google procesa esos datos para prestar Calendar y Meet y los pone a disposición del organizador y los invitados según la configuración del evento.</p>
        <p>CADO limita el uso de los datos que recibe de Google a la vinculación de la cuenta profesional y la gestión de sus citas de CADO, de acuerdo con la <a href="https://developers.google.com/terms/api-services-user-data-policy">Política de datos de usuarios de los servicios de API de Google</a>, incluidos los requisitos de Uso Limitado que correspondan.</p>
        <p>El profesional puede desvincular la cuenta desde la intranet para borrar la credencial guardada por CADO y revocar el acceso desde <a href="https://myaccount.google.com/connections">las conexiones de su cuenta de Google</a>. Los eventos ya creados se gestionan en Google Calendar.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Proveedores y canales externos</h2>
        <p>CADO usa Vercel para alojar el portal y Supabase para almacenar los registros y gestionar el acceso profesional. Google proporciona el calendario, las videollamadas y el mapa integrado. Al abrir WhatsApp, una agenda externa o un portal de pago, el servicio que elijas procesa la información que le envíes conforme a sus propias condiciones.</p>
      </section>

      <section>
        <h2 className="font-title text-2xl font-semibold">Conservación y solicitudes</h2>
        <p>Las reservas y los registros de gestión se conservan en los sistemas de CADO para prestar la atención y atender obligaciones aplicables. Puedes consultar el plazo de conservación o solicitar acceso, corrección o eliminación de tus datos según corresponda en <a href={`mailto:${CLINIC.email}`}>{CLINIC.email}</a>. Indica cómo contactarte y, si lo tienes, tu código de reserva. Trata el enlace privado de autogestión como una credencial y conserva su acceso para ti.</p>
        <p>{CLINIC.fullName} · {CLINIC.address}.</p>
      </section>
    </>
  );
}
