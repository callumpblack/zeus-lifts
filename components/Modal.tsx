"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** "sheet" slides up from the bottom; "center" fades in centred. */
  variant?: "sheet" | "center";
  labelledBy?: string;
}

/** Lightweight modal: dimmed backdrop + Escape-to-close + scroll lock. */
export default function Modal({
  open,
  onClose,
  children,
  variant = "sheet",
  labelledBy,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in justify-center bg-black/70"
      style={{ alignItems: variant === "sheet" ? "flex-end" : "center" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={
          variant === "sheet"
            ? "w-full max-w-app animate-slide-up rounded-t-2xl border-t border-hairline bg-card"
            : "mx-4 w-full max-w-[340px] animate-fade-in rounded-2xl border border-hairline bg-card"
        }
      >
        {children}
      </div>
    </div>
  );
}
