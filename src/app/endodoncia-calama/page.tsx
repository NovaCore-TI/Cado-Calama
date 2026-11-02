import type { Metadata } from 'next';
import { ClinicalPage } from '@/components/ClinicalPage';

export const metadata: Metadata = { title: 'Endodoncia y tratamientos de conducto en Calama', description: 'Evaluación y tratamiento del dolor dental y tejido pulpar en CADO Calama. Endodoncia orientada a preservar tus dientes naturales.', alternates: { canonical: '/endodoncia-calama' } };
export default function Page() {
  return <ClinicalPage title="Endodoncia y dolor dental complejo en Calama" eyebrow="Preservación dental" intro="Tratamiento especializado del tejido pulpar infectado o inflamado para abordar las infecciones internas del diente y conservar tus piezas naturales." image="/brand/tecnologia-digital-cado-calama.webp" sections={[
    { title: 'Comprender el origen de la molestia', text: 'La evaluación clínica y los exámenes que indique el profesional permiten estudiar el estado del diente y definir si corresponde un tratamiento de conducto.' },
    { title: 'Preservar tus dientes naturales', text: 'La endodoncia trata el interior del diente cuando su tejido pulpar está afectado. El profesional te explicará el procedimiento, sus alternativas y la restauración posterior que corresponda a tu caso.' },
    { title: 'Precisión y explicación en cada paso', text: 'Combinamos diagnóstico y planificación con una conversación clara sobre tu atención. Puedes plantear dudas y acordar pausas durante el procedimiento.' },
    { title: 'Cuando necesitas atención prioritaria', text: 'Si tienes dolor dental intenso o una molestia que empeora, contacta a CADO para coordinar una evaluación. En nuestra página de urgencias encontrarás los canales de contacto y las señales de alarma.' },
  ]} />;
}
