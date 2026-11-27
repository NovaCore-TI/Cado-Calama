import { NextResponse } from "next/server";
import { CLINIC, whatsappUrl } from "@/lib/clinic";

const PERFIL_INSTITUCIONAL = {
  clinica: CLINIC.fullName,
  doctor: {
    nombre: "Dr. Javier Beiza Ayala",
    especialidad:
      "Cirujano Dentista · Enfoque en Trastornos Temporomandibulares (TTM), Rehabilitación y Pacientes con Ansiedad Dental",
    experienciaAnios: 13,
    ciudad: "Calama, Región de Antofagasta, Chile",
  },
  ubicacion: {
    direccion: CLINIC.streetAddress,
    comuna: "Calama",
    referencia: "Sector céntrico, frente a Parque El Loa",
    googleMaps: CLINIC.mapsUrl,
  },
  canalesContacto: {
    telefono: "+" + CLINIC.phones[0].number,
    whatsappUrl: whatsappUrl(),
    email: CLINIC.email,
    horarioPresencialReferencia:
      "Consultas presenciales coordinadas y urgencias.",
  },
  serviciosAutorizados: [
    {
      id: "srv-ttm",
      nombre: "Trastornos Temporomandibulares (TTM) y Bruxismo",
      modalidad: "Presencial / Orientación previa",
    },
    {
      id: "srv-urg",
      nombre: "Urgencias Dentales y Alivio del Dolor",
      modalidad: "Prioritaria presencial",
    },
    {
      id: "srv-exo",
      nombre: "Exodoncias y Cirugía Oral Menor",
      modalidad: "Presencial con protocolo de confort",
    },
    {
      id: "srv-cad",
      nombre: "Rehabilitación Oral y Flujo Digital CAD/CAM",
      modalidad: "Presencial",
    },
    {
      id: "srv-ori",
      nombre: "Sesión de Acercamiento Virtual (SAV, 15 min)",
      modalidad: "Videollamada Google Meet",
    },
  ],
};

// Backend de Perfil Profesional, Identidad de CADO y Canales de Contacto
export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "institutional_config",
    data: {
      ...PERFIL_INSTITUCIONAL,
    },
  });
}
