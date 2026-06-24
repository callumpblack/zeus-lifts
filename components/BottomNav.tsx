"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, HistoryIcon, UserIcon } from "./icons";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/history",
    label: "History",
    icon: HistoryIcon,
    match: (p: string) => p.startsWith("/history"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserIcon,
    match: (p: string) => p.startsWith("/profile"),
  },
];

/** Fixed three-tab bottom navigation. Active tab uses the accent blue. */
export default function BottomNav() {
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
