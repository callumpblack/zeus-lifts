"use client";

import type { NutritionProfile } from "@/lib/nutrition/types";
import ModuleToggle from "./ModuleToggle";
import ProfileSwitcher from "./ProfileSwitcher";

interface Props {
  title: string;
  subtitle?: string;
  profiles: NutritionProfile[];
  activeId: string | null;
  onProfileChange: (id: string) => void;
  /** Optional element pinned to the top-right (e.g. a date stepper or link). */
  right?: React.ReactNode;
}

/** Standard nutrition page header: module toggle, profile switcher, title. */
export default function NutritionHeader({
  title,
  subtitle,
  profiles,
  activeId,
  onProfileChange,
  right,
}: Props) {
  return (
    <header className="px-4 pb-1 pt-5">
      <div className="flex items-center justify-between gap-2">
        <ModuleToggle />
        {right}
      </div>

      {profiles.length > 1 && (
        <div className="mt-3">
          <ProfileSwitcher
            profiles={profiles}
            activeId={activeId}
            onChange={onProfileChange}
          />
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          {title}
        </h1>
        {subtitle && (
          <span className="text-sm font-medium text-muted">{subtitle}</span>
        )}
      </div>
    </header>
  );
}
