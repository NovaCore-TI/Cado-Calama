import type { Metadata } from 'next';
import { ClinicalPage } from '@/components/ClinicalPage';

export const metadata: Metadata = { title: 'Centro de Dolor Orofacial en Calama', description: 'Conoce el enfoque de CADO para evaluar el dolor dental, muscular, articular y neurálgico en Calama, con atención coordinada y humana.', alternates: { canonical: '/dolor-orofacial' } };
export default function Page() {
  return <ClinicalPage title="Comprender tu dolor es el primer paso para aliviarlo" eyebrow="Centro Avanzado de Dolor Orofacial · Calama" intro="En CADO entendemos el impacto que el dolor genera en tu calidad de vida. Nuestro equipo evalúa el dolor dental, muscular, articular y neurálgico con una atención cuidadosa y sin juicios." sections={[
    { title: 'Dolor de origen dental', text: 'Evaluamos las molestias relacionadas con dientes y tejidos de soporte. Las áreas de urgencias y endodoncia permiten orientar la atención según el diagnóstico presencial.' },
    { title: 'Músculos y articulación', text: 'Estudiamos las molestias de la mandíbula, la función articular y las tensiones musculares. Cada caso requiere una evaluación individual antes de definir un plan.' },
    { title: 'Una mirada integral', text: 'Escuchar tu historia y conocer cómo aparece la molestia es parte de la consulta. El equipo coordina la atención y las derivaciones que correspondan a tus necesidades.' },
    { title: 'Atención humana y a tu ritmo', text: 'Si has postergado tu consulta por temor, puedes comenzar con la Encuesta TES y una Sesión de Acercamiento Virtual de 15 minutos para conocer cómo trabajamos.' },
  ]} />;
}
