"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, HistoryIcon } from "@/components/icons";
import { SettingsIcon } from "./icons";

const TABS = [
  {
    href: "/nutrition",
    label: "Today",
    icon: HomeIcon,
    match: (p: string) => p === "/nutrition" || p.startsWith("/nutrition/log"),
  },
  {
    href: "/nutrition/search",
    label: "Search",
    icon: SearchIcon,
    match: (p: string) => p.startsWith("/nutrition/search"),
  },
  {
    href: "/nutrition/history",
    label: "History",
    icon: HistoryIcon,
    match: (p: string) => p.startsWith("/nutrition/history"),
  },
  {
    href: "/nutrition/settings",
    label: "Settings",
    icon: SettingsIcon,
    match: (p: string) => p.startsWith("/nutrition/settings"),
  },
];

/** Fixed bottom navigation for the nutrition module (mirrors BottomNav). */
export default function NutritionNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-app border-t border-hairline bg-ink/95 backdrop-blur">
      <ul className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={24} aria-hidden />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
