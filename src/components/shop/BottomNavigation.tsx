"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";

const navigationItems = [
  { label: "Beranda", href: "/shop", icon: "home" },
  { label: "Cerita", href: "/stories", icon: "book" },
  { label: "Favorit", href: "/favorites", icon: "heart" },
  { label: "Keranjang", href: "/cart", icon: "bag" },
  { label: "Profil", href: "/profile", icon: "profile" },
] as const;

function NavigationIcon({ icon, active }: { icon: string; active: boolean }) {
  const stroke = active ? "#93372A" : "#9C897F";
  const fill = active ? "#93372A" : "none";
  const common = {
    className: "h-[22px] w-[22px] shrink-0",
    viewBox: "0 0 24 24",
    stroke,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (icon === "book") return <BookOpen className={common.className} color={stroke} strokeWidth={common.strokeWidth} aria-hidden="true" />;
  if (icon === "home") return <svg {...common} fill="none" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v10a.5.5 0 0 1-.5.5h-6v-7h-5v7h-6a.5.5 0 0 1-.5-.5v-10Z" fill={fill} /></svg>;
  if (icon === "heart") return <svg {...common} fill="none" aria-hidden="true"><path d="M20.8 8.8c0 4.2-8.8 11-8.8 11s-8.8-6.8-8.8-11A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" fill={fill} /></svg>;
  if (icon === "bag") return <svg {...common} fill="none" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="14" rx="1.5" fill={fill} /><path d="M8 7.5V5a4 4 0 0 1 8 0v2.5" /></svg>;
  return <svg {...common} fill="none" aria-hidden="true"><circle cx="12" cy="7.5" r="4" fill={fill} /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" fill={fill} /></svg>;
}

export default function BottomNavigation() {
  const pathname = usePathname();
  const activeIndex = navigationItems.findIndex((item) =>
    item.href === "/shop"
      ? pathname === "/shop" || pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-0 pb-0 sm:bottom-6 sm:px-6">
      <nav aria-label="Navigasi utama" className="relative mx-auto grid h-[78px] w-full max-w-[520px] grid-cols-5 items-stretch rounded-t-[24px] border-t border-[#E9DFD2] bg-[#FFFAF8] shadow-[0_-5px_25px_rgba(80,45,30,0.12)] sm:h-[82px] sm:rounded-[28px] sm:border sm:shadow-[0_8px_35px_rgba(80,45,30,0.14)]">
        {navigationItems.map((item, index) => {
          const active = activeIndex === index;
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined}
              className="relative flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93372A] focus-visible:ring-inset">
              {active && <span className="pointer-events-none absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-full bg-[#93372A]" />}
              <NavigationIcon icon={item.icon} active={active} />
              <span className={`max-w-full truncate whitespace-nowrap text-[9px] font-semibold sm:text-[10px] ${active ? "text-[#93372A]" : "text-[#9C897F]"}`}>{item.label}</span>
              {index < navigationItems.length - 1 && <span aria-hidden="true" className="pointer-events-none absolute bottom-5 right-0 top-5 w-px bg-[#E9DFD2]" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
