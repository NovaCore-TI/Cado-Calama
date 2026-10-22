'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ClinicalGuide {
  id: string;
  title: string;
  category: string;
  summary: string;
  fileName: string;
  pages: string;
  icon: typeof FileText;
  sections: { heading: string; points: string[] }[];
}

const CLINICAL_GUIDES: ClinicalGuide[] = [
  {
    id: 'guia-post-exodoncia',
    title: 'Cuidados Posteriores a una Extracción Dental (Exodoncia)',
    category: 'Postoperatorio',
    summary: 'Indicaciones paso a paso para las primeras 48 horas: control del sangrado, alimentación recomendada, higiene suave y señales de alerta.',
    fileName: 'CADO_Guia_Cuidados_Post_Exodoncia.pdf',
    pages: '2 páginas · PDF Oficial',
    icon: FileText,
    sections: [
      {
        heading: '1. Primeras 2 horas después de la atención',
        points: [
          'Mantener la gasa estéril mordiendo con presión suave y constante durante 30 a 45 minutos.',
          'No escupir, no enjuagar con fuerza ni succionar la herida para proteger el coágulo sanguíneo.',
          'Descansar y evitar esfuerzos físicos o exposición al calor.',
        ],
      },
      {
        heading: '2. Alimentación e hidratación (Primeras 48 horas)',
        points: [
          'Preferir alimentos blandos, fríos o tibios (yogur, helado suave, purés tibios, sopas coladas tibias).',
          'No utilizar bombillas (pajitas), ya que la succión puede desprender el coágulo.',
          'Evitar bebidas calientes, alcohol, tabaco y alimentos con semillas pequeñas.',
        ],
      },
      {
        heading: '3. Higiene oral y cuándo contactar a CADO',
        points: [
          'Cepillar los demás dientes normalmente con cepillo suave, evitando rozar directamente la zona intervenida el primer día.',
          'Si el sangrado no disminuye tras presionar con una gasa limpia por 30 minutos o aparece fiebre, contactar al +56 9 4465 7815.',
        ],
      },
    ],
  },
  {
    id: 'guia-primeros-auxilios-urgencias',
    title: 'Primeros Auxilios ante Urgencias Dentales y Dolor Agudo',
    category: 'Urgencias y Dolor',
    summary: 'Qué hacer de inmediato en casa ante fracturas dentales, golpes (traumatismos), dolor nocturno o inflamación antes de llegar a la consulta.',
    fileName: 'CADO_Guia_Primeros_Auxilios_Urgencias.pdf',
    pages: '2 páginas · PDF Oficial',
    icon: ShieldCheck,
    sections: [
      {
        heading: '1. Dolor dental agudo o inflamación',
        points: [
          'Realizar enjuagues suaves con agua tibia para limpiar restos de alimentos en la zona.',
          'Aplicar compresas frías por fuera de la mejilla (10 minutos con paño protector) si existe hinchazón.',
          'Nunca colocar ácido acetilsalicílico (aspirina) ni alcohol directamente sobre la encía o el diente.',
        ],
      },
      {
        heading: '2. Fractura o desalojo de un diente por golpe',
        points: [
          'Si un diente definitivo sale por completo, tomarlo solo por la corona (parte blanca), nunca por la raíz.',
          'Transportarlo en un recipiente con leche fría o suero fisiológico y acudir de inmediato a evaluación odontológica.',
        ],
      },
      {
        heading: '3. Canales de contacto prioritario CADO Calama',
        points: [
          'Teléfono y WhatsApp directo: +56 9 4465 7815 (Vivar #1580, oficina 203, Edificio Espacio Parque).',
          'Ante dificultad para respirar o tragar por inflamación severa, acudir de inmediato a un servicio de urgencia hospitalaria.',
        ],
      },
    ],
  },
  {
    id: 'guia-preparacion-ansiedad-bruxismo',
    title: 'Guía de Preparación sin Ansiedad y Alivio Mandibular (TTM)',
    category: 'Bienestar y Confort',
    summary: 'Ejercicios de respiración, autocuidado para el bruxismo y cómo aprovechar tu orientación virtual y preferencias de confort en CADO.',
    fileName: 'CADO_Guia_Preparacion_y_Confort_Dental.pdf',
    pages: '2 páginas · PDF Oficial',
    icon: HeartHandshake,
    sections: [
      {
        heading: '1. Antes de tu orientación virtual o consulta',
        points: [
          'Anota tus dudas principales; ninguna pregunta es pequeña ni será juzgada.',
          'Completa el Test de Confort para elegir música suave, silencio, pausas frecuentes o asistir con acompañante.',
          'Recuerda que en el sillón dental siempre tendrás una señal acordada con tu mano para detener el procedimiento.',
        ],
      },
      {
        heading: '2. Autocuidado básico para tensión mandibular (Bruxismo / TTM)',
        points: [
          'Postura de descanso mandibular: mantener labios juntos y dientes ligeramente separados durante el día.',
          'Aplicar calor húmedo tibio en las mejillas durante 10 minutos antes de dormir si sientes rigidez.',
        ],
      },
    ],
  },
];

function escapePdfText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, '\\$&');
}

function generateValidPdfBlob(guide: ClinicalGuide): Blob {
  const lines: string[] = [
    'CADO ODONTOLOGIA - CALAMA',
    'Dr. Javier Beiza Ayala | Vivar #1580 Of. 203, Edificio Espacio Parque',
    'Contacto y Urgencias: +56 9 4465 7815',
    '------------------------------------------------------------------------',
    '',
    `GUIA CLINICA: ${guide.title.toUpperCase()}`,
    `Categoria: ${guide.category}`,
    '',
    guide.summary,
    '',
  ];

  guide.sections.forEach((sec) => {
    lines.push(sec.heading.toUpperCase());
    sec.points.forEach((pt) => {
      // Wrap lines around 80 chars
      const words = pt.split(' ');
      let current = '  - ';
      words.forEach((w) => {
        if ((current + w).length > 82) {
          lines.push(current);
          current = '    ' + w + ' ';
        } else {
          current += w + ' ';
        }
      });
      if (current.trim()) lines.push(current);
    });
    lines.push('');
  });

  lines.push('------------------------------------------------------------------------');
  lines.push('Documento educativo oficial de CADO Odontologia. No reemplaza evaluacion presencial.');

  let streamContent = 'BT\n/F1 11 Tf\n50 760 Td\n15 TL\n';
  lines.forEach((line) => {
    streamContent += `(${escapePdfText(line)}) Tj T*\n`;
  });
  streamContent += 'ET';

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export default function RecursosPage() {
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<ClinicalGuide | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedGuide(null);
    }
    if (selectedGuide) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedGuide]);

  const handleDownloadPdf = (guide: ClinicalGuide) => {
    const blob = generateValidPdfBlob(guide);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = guide.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedId(guide.id);
    setTimeout(() => setDownloadedId(null), 3500);

    fetch('/api/recursos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guiaId: guide.id }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-[70vh] bg-[#F6F8F8] px-6 py-16 text-[#513D49] sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#513D49]">
            <Sparkles className="h-3.5 w-3.5 text-[#A14B92]" />
            <span>Biblioteca Pública de Guías Clínicas PDF</span>
          </div>
          <h1 className="font-title text-5xl font-semibold leading-tight sm:text-6xl">
            Información clara para acompañarte.
          </h1>
          <p className="leading-8 text-[#665D66]">
            Descarga gratuitamente nuestras guías clínicas en formato PDF optimizadas para lectura en celular y computador sobre cuidados postoperatorios, manejo de urgencias y preparación sin ansiedad.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CLINICAL_GUIDES.map((guide) => {
            const Icon = guide.icon;
            const isDownloaded = downloadedId === guide.id;
            return (
              <div
                key={guide.id}
                className="soft-card flex flex-col justify-between rounded-3xl border border-[#E2E7E7] bg-white p-7 shadow-xs transition hover:shadow-md"
              >
                <div>
                  <div className="mb-6 flex items-center justify-between gap-2">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6EBEB] text-[#A14B92]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="rounded-full bg-[#F8EFF6] px-3 py-1 text-xs font-semibold text-[#8A3D7D]">
                      {guide.category}
                    </span>
                  </div>
                  <h2 className="font-title text-2xl font-semibold leading-snug">{guide.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#665D66]">{guide.summary}</p>
                </div>

                <div className="mt-7 space-y-3 border-t border-[#E2E7E7] pt-5">
                  <div className="flex items-center justify-between text-xs text-[#766C75]">
                    <span>{guide.pages}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedGuide(guide)}
                      className="font-semibold text-[#8A3D7D] hover:underline"
                    >
                      Previsualizar guía
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(guide)}
                    className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition"
                  >
                    {isDownloaded ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>¡PDF Descargado!</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Descargar Guía PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {selectedGuide && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedGuide(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-9">
              <div className="flex items-start justify-between gap-4 border-b border-[#E2E7E7] pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A14B92]">
                    {selectedGuide.category} · Vista Previa
                  </span>
                  <h2 className="mt-1 font-title text-3xl font-semibold">{selectedGuide.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuide(null)}
                  className="rounded-xl border border-[#E2E7E7] px-3 py-1.5 text-xs font-semibold hover:bg-[#F6F8F8]"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {selectedGuide.sections.map((sec) => (
                  <div key={sec.heading} className="rounded-2xl bg-[#F6F8F8] p-5">
                    <h3 className="font-semibold text-[#513D49]">{sec.heading}</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#665D66]">
                      {sec.points.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#E2E7E7] pt-5">
                <button
                  type="button"
                  onClick={() => setSelectedGuide(null)}
                  className="btn-cado-secondary rounded-xl px-4 py-2.5 text-xs font-semibold"
                >
                  Cerrar vista
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedGuide)}
                  className="btn-cado-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar {selectedGuide.fileName}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl p-7 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-1 h-6 w-6 shrink-0 text-[#A14B92]" />
            <div>
              <h2 className="font-semibold">¿Buscas orientación personalizada ahora?</h2>
              <p className="mt-1 text-sm leading-6 text-[#665D66]">
                Puedes consultar nuestras preguntas frecuentes interactivas o completar el cuestionario de perfilamiento previo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/faq"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#8A3D7D] hover:underline"
            >
              Ver preguntas frecuentes <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/agendar"
              className="btn-cado-primary inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Orientación virtual guiada <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
