import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// SCRUM-48 (RF-05): Backend de Urgencias Dentales, canales prioritarios y registro de derivación urgente
export async function GET() {
  return NextResponse.json({
    ok: true,
    rf: 'RF-05',
    jiraKey: 'SCRUM-48',
    canalesPrioritarios: {
      telefonoDirecto: '+56944657815',
      telHref: 'tel:+56944657815',
      whatsappPrioritario:
        'https://wa.me/56944657815?text=Hola%20Dr.%20Beiza,%20tengo%20una%20urgencia%20dental%20en%20Calama%20y%20necesito%20consultar%20disponibilidad.',
      direccionClinica: 'Vivar #1580, Oficina 203, Edificio Espacio Parque, Calama',
    },
    protocoloTriaje: [
      {
        nivel: 'Urgencia Odontológica Ambulatoria',
        sintomas: ['Dolor dental agudo que no cede con analgésicos', 'Fractura dental por golpe o caída', 'Infección o absceso localizado', 'Sangrado moderado post-exodoncia'],
        accion: 'Contactar por llamada directa o WhatsApp prioritario a CADO para evaluación en el día.',
      },
      {
        nivel: 'Emergencia Hospitalaria Inmediata',
        sintomas: ['Inflamación facial severa que dificulta respirar o tragar', 'Hemorragia abundante incontrolable', 'Traumatismo facial grave con pérdida de consciencia'],
        accion: 'Acudir inmediatamente al Servicio de Urgencia Hospitalaria más cercano en Calama.',
      },
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canal = 'whatsapp', motivo = 'Urgencia dental general' } = body;

    const { error } = await supabase.from('logs_auditoria').insert({
      accion: `CONTACTO_URGENCIA_${String(canal).toUpperCase()}`,
      entidad: 'urgencias',
      detalle: motivo,
    });

    return NextResponse.json({
      ok: true,
      rf: 'RF-05',
      jiraKey: 'SCRUM-48',
      loggedInSupabase: !error,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida' }, { status: 400 });
  }
}
