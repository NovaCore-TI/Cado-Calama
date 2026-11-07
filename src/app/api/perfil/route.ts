import { NextResponse } from "next/server";

const PERFIL_INSTITUCIONAL = {
  clinica: "CADO · Centro Avanzado de Dolor Orofacial",
  doctor: {
    nombre: "Dr. Javier Beiza Ayala",
    especialidad:
      "Cirujano Dentista · Enfoque en Trastornos Temporomandibulares (TTM), Rehabilitación y Pacientes con Ansiedad Dental",
    experienciaAnios: 13,
    ciudad: "Calama, Región de Antofagasta, Chile",
  },
  ubicacion: {
    direccion: "Vivar #1580, Oficina 203, Edificio Espacio Parque",
    comuna: "Calama",
    referencia: "Sector céntrico, frente a Parque El Loa",
    googleMaps: "https://share.google/Af4IcUf6FfpfVmbTX",
  },
  canalesContacto: {
    telefono: "+56944657815",
    whatsappUrl: "https://wa.me/56944657815",
    email: "contacto@cado.cl",
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
