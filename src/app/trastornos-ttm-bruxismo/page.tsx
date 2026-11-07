import type { Metadata } from 'next';
import { ClinicalPage } from '@/components/ClinicalPage';

export const metadata: Metadata = { title: 'TTM, bruxismo y dolor mandibular en Calama', description: 'Evaluación del dolor muscular y articular, trastornos temporomandibulares y bruxismo en CADO Calama. Atención cercana y diagnóstico individual.', alternates: { canonical: '/trastornos-ttm-bruxismo' } };
export default function Page() {
  return <ClinicalPage title="Trastornos temporomandibulares y bruxismo" eyebrow="Función articular y bienestar orofacial en Calama" intro="Evaluamos las molestias de la mandíbula y de los músculos de la masticación para comprender su origen y planificar un cuidado adaptado a cada persona." image="/brand/escucha-clinica-cado-calama.webp" sections={[
    { title: 'Dolor muscular y articular', text: 'En la consulta revisamos tus síntomas, antecedentes y función mandibular. El objetivo es distinguir las posibles causas del dolor antes de proponer un tratamiento.' },
    { title: 'Apretamiento y rechinamiento', text: 'Si notas tensión mandibular o desgaste dental, puedes comentarlo en tu evaluación. La atención del bruxismo se define según tus hallazgos clínicos y necesidades individuales.' },
    { title: 'Un abordaje coordinado', text: 'El plan de atención considera la función de la mandíbula y el bienestar orofacial. Cuando corresponde, el equipo coordina las áreas clínicas que necesita tu caso.' },
    { title: 'Tu comodidad también importa', text: 'Podemos conversar sobre pausas para descansar la mandíbula, explicaciones antes de cada paso y una señal de mano para detener la atención. La encuesta TES permite compartir estas preferencias antes de la SAV.' },
  ]} />;
}
