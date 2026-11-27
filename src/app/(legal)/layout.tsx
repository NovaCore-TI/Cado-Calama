import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white px-6 py-12 text-[#513D49] sm:py-16">
      <article className="mx-auto max-w-3xl space-y-8 text-sm leading-7 sm:text-base [&_a]:font-semibold [&_a]:text-[#8A3D7D] [&_a]:underline [&_a]:underline-offset-4 [&_section]:space-y-3">
        {children}
      </article>
    </div>
  );
}
