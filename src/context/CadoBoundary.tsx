"use client";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const Provider = lazy(() => import("./CadoContext").then(module => ({ default: module.CadoProvider })));
export function CadoBoundary({ children }: { children: ReactNode }) {
  const path = usePathname();
  const required = path === "/admin" || path.startsWith("/admin/") ||
    ["/agendar", "/cuestionario", "/test-confort", "/blog"].includes(path);
  const [activated, setActivated] = useState(required);
  // Once a care journey starts, retain its in-memory draft across navigation.
  useEffect(() => { if (required) setActivated(true); }, [required]);
  if (!required && !activated) return children;
  return <Suspense fallback={<div role="status" className="min-h-[60vh] bg-[#F6F8F8] p-8 text-sm text-[#513D49]">Cargando tu espacio CADO…</div>}><Provider>{children}</Provider></Suspense>;
}
