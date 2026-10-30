"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useCado } from "@/context/CadoContext";

export default function DoctorLogin() {
  const { loginDoctor } = useCado();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await loginDoctor(email, password);
      if (result.ok) {
        router.replace("/admin");
        router.refresh();
      } else setError(result.error || "No se pudo iniciar sesión.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8F8] px-4 py-6 text-[#513D49] sm:px-6 sm:py-14">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_24px_80px_rgba(81,61,73,.12)] lg:grid-cols-2">
        {/* LADO IZQUIERDO: MARCA */}
        <div className="relative flex flex-col justify-between overflow-hidden border-b border-[#E2E7E7] bg-[#F6F8F8] p-6 sm:p-12 lg:border-b-0 lg:border-r">
          <div
            className="absolute -right-24 -top-20 h-72 w-72 rounded-full bg-[#A14B92]/15 blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative space-y-4 sm:space-y-6">
            <Image
              src="/brand/image2.png"
              alt="CADO Odontología"
              width={180}
              height={65}
              className="h-12 w-auto object-contain"
              priority
            />
            <span className="inline-flex rounded-full border border-[#B3BFBF] bg-white px-3.5 py-1 text-xs font-semibold text-[#A14B92]">
              Portal Clínico Privado
            </span>
            <h1 className="font-title text-3xl font-semibold leading-tight sm:text-5xl text-balance">
              Gestión cercana, ética y personalizada.
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-[#665D66]">
              Espacio de trabajo del <strong>equipo clínico de CADO</strong>{" "}
              para revisar el cuestionario previo y las preferencias de confort
              de cada paciente antes de la orientación virtual.
            </p>
          </div>

          <div className="relative mt-6 rounded-2xl sm:mt-12 border border-[#E2E7E7] bg-white p-4 text-xs leading-relaxed text-[#665D66]">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]"
                aria-hidden="true"
              />
              <span>
                Acceso exclusivo para profesionales autorizados. Cierra tu
                sesión al terminar, especialmente si utilizas un equipo
                compartido.
              </span>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: FORMULARIO */}
        <div className="flex flex-col justify-center p-6 sm:p-12">
          <Link
            href="/"
            className="mb-6 inline-flex sm:mb-8 items-center gap-1.5 text-xs font-semibold text-[#8A3D7D] hover:underline"
          >
            ← Volver al sitio público
          </Link>

          <span className="section-eyebrow">Acceso del Profesional</span>
          <h2 className="mt-2 font-title text-3xl font-semibold text-[#513D49]">
            Ingresar a la Intranet
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#766C75]">
            Ingresa tus credenciales profesionales para gestionar orientaciones
            y contenidos.
          </p>

          <form
            aria-busy={pending}
            onSubmit={submit}
            className="mt-8 space-y-5"
          >
            <label className="block text-xs font-semibold text-[#513D49]">
              Usuario / Correo clínico
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 text-sm outline-none focus:border-[#A14B92]"
                placeholder="ej: doctor@cado.cl"
              />
            </label>

            <div className="text-xs font-semibold text-[#513D49]">
              <label htmlFor="doctor-password">Contraseña</label>
              <div className="relative mt-1.5">
                <input
                  id="doctor-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-[#B3BFBF] bg-white px-4 py-3 pr-11 text-sm outline-none focus:border-[#A14B92]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-controls="doctor-password"
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-[#766C75] hover:text-[#513D49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A14B92]"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn-cado-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-md active:scale-98 disabled:opacity-60"
            >
              {pending ? (
                <RefreshCw
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {pending
                  ? "Verificando credenciales…"
                  : "Entrar al panel de gestión"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
