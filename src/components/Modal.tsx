"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Native modal dialogs put the rest of the document in an inert top layer,
// including keyboard navigation, rather than only painting an overlay.
export function Modal({ children, labelledBy, onClose, className = "" }: {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby={labelledBy}
      className="cado-modal fixed inset-0 m-0 h-full max-h-full w-full max-w-full border-0 bg-transparent p-0 text-inherit outline-none"
      onCancel={(event) => { event.preventDefault(); close.current(); }}>
      <div className={`flex min-h-full items-center justify-center bg-black/60 p-4 backdrop-blur-xs ${className}`}
        onClick={(event) => { if (event.target === event.currentTarget) close.current(); }}>
        {children}
      </div>
    </dialog>
  );
}
