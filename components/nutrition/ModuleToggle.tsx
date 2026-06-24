"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DumbbellIcon } from "@/components/icons";
import { UtensilsIcon } from "./icons";

/**
 * Top-level pill switcher between the two first-class modules: the lifting
 * tracker (/) and the nutrition tracker (/nutrition). Always rendered in the
 * header of each module's home screen so switching is one tap away.
 */
export default function ModuleToggle() {
  const pathname = usePathname();
  const onNutrition = pathname.startsWith("/nutrition");

  return (
    <div className="inline-flex items-center rounded-full bg-card p-1 text-sm font-semibold">
      <Link
        href="/"
        aria-current={!onNutrition ? "page" : undefined}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
          !onNutrition ? "bg-accent text-ink" : "text-muted hover:text-white"
        }`}
      >
        <DumbbellIcon size={16} />
        Lifting
      </Link>
      <Link
        href="/nutrition"
        aria-current={onNutrition ? "page" : undefined}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
          onNutrition ? "bg-accent text-ink" : "text-muted hover:text-white"
        }`}
      >
        <UtensilsIcon size={16} />
        Nutrition
      </Link>
    </div>
  );
}
