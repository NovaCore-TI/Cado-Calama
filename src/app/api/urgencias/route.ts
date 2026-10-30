import { NextRequest, NextResponse } from 'next/server';
import { getServerDatabase } from '@/lib/server-db';
import { accessFailure, AccessError, checkSameOrigin } from '@/lib/doctor-auth';

// Backend de Urgencias Dentales, canales prioritarios y registro de derivación urgente
export async function GET() {
  return NextResponse.json({
    ok: true,
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
    checkSameOrigin(request);
    const body = await request.json();
    if (!["whatsapp", "telefono"].includes(body.canal)) throw new AccessError(400, "Canal inválido.");
    const { error } = await getServerDatabase().from("logs_auditoria").insert({
      accion: "CONTACTO_URGENCIA_" + body.canal.toUpperCase(), entidad: "urgencias",
      detalle: "Solicitud de apertura del canal; no acredita contacto ni atención.",
    });
    if (error) throw new AccessError(503, "No se pudo registrar la solicitud.");
    return NextResponse.json({ ok: true, event: "canal_solicitado" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return accessFailure(error); }
}
