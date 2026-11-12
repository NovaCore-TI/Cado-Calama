"use client";

import { useEffect } from "react";

// Enhance server-rendered content only after the browser confirms it is offscreen.
// Without JavaScript, IntersectionObserver, or motion enabled, everything stays visible.
export function ScrollReveal({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!root || preference.matches || !("IntersectionObserver" in window)) return;

    const targets = root.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        // content-visibility can temporarily give offscreen descendants empty bounds.
        // Keep observing them until their section is laid out near the viewport.
        if (!entry.boundingClientRect.height) continue;
        if (entry.isIntersecting) {
          target.dataset.revealState = "visible";
          observer.unobserve(target);
        } else if (entry.boundingClientRect.bottom > 0) {
          target.dataset.revealState = "pending";
        } else {
          target.dataset.revealState = "settled";
          observer.unobserve(target);
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

    targets.forEach(target => observer.observe(target));
    const settle = () => {
      observer.disconnect();
      targets.forEach(target => { delete target.dataset.revealState; });
    };
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-reveal]");
      if (target && root.contains(target)) {
        target.dataset.revealState = "settled";
        observer.unobserve(target);
      }
    };
    root.addEventListener("focusin", revealFocused);
    preference.addEventListener("change", settle);
    return () => {
      settle();
      root.removeEventListener("focusin", revealFocused);
      preference.removeEventListener("change", settle);
    };
  }, [rootId]);

  return null;
}
