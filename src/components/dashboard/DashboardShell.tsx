"use client";

import type { ReactNode } from "react";
import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, BarChart3, Bell, Boxes, ClipboardList, FileText, Gift,
  LayoutDashboard, LogOut, Package, PackagePlus, Settings, ShieldCheck,
  Store, Users, UserRound, CircleHelp, BadgeCheck, Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DashboardIcon =
  | "overview" | "products" | "add" | "orders" | "analytics" | "profile" | "help"
  | "verification" | "curation" | "reports" | "settings" | "sellers" | "moderation";

export type DashboardNavItem = { label: string; href: string; icon: DashboardIcon };

const icons: Record<DashboardIcon, ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  overview: LayoutDashboard,
  products: Package,
  add: PackagePlus,
  orders: ClipboardList,
  analytics: BarChart3,
  profile: Store,
  help: CircleHelp,
  verification: BadgeCheck,
  curation: ShieldCheck,
  reports: FileText,
  settings: Settings,
  sellers: Users,
  moderation: Boxes,
};

export default function DashboardShell({
  role, title, subtitle, navItems, mobileNavItems, children,
}: {
  role: "UMKM" | "ADMIN";
  title: string;
  subtitle: string;
  navItems: DashboardNavItem[];
  mobileNavItems: DashboardNavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const sync = () => setCurrentHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const active = (href: string) => {
    const [path, hash] = href.split("#");
    return path === pathname && (hash ? currentHash === `#${hash}` : !currentHash);
  };
  const home = role === "ADMIN" ? "/admin/dashboard" : "/seller/dashboard";
  const roleLabel = role === "ADMIN" ? "CURATOR DESK" : "ARTISAN ATELIER";
  const mobileRole = role === "ADMIN" ? "NUSANTARA GIFT · ADMIN" : "RUANG BERKARYA";

  return (
    <div className="min-h-dvh bg-[#F7F1E3] text-[#251E1A]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#E7DDCC] bg-[#FDFAF3] xl:flex">
        <Link href={home} className="block px-7 pt-7">
          <span className="block font-display text-[21px] leading-none tracking-[-.04em] text-[#93372A]">NUSANTARA GIFT</span>
          <span className="mt-1 block text-[8px] font-bold tracking-[.08em] text-[#7A6C5E]">HADIAH DENGAN CERITA</span>
        </Link>
        <div className="px-7 pt-9">
          <p className="text-[9px] font-bold tracking-[.15em] text-[#C79854]">{roleLabel}</p>
          <div className="mt-7 h-px bg-[#DCD2C1]" />
          <nav aria-label="Navigasi utama" className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = icons[item.icon];
              const selected = active(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                  className={`flex min-h-[42px] items-center gap-3 rounded-[9px] px-3 text-[11px] transition-colors ${selected ? "bg-[#431714] font-bold text-[#FFFDF8]" : "font-medium text-[#7A6C5E] hover:bg-[#F3EBDD] hover:text-[#431714]"}`}>
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto px-7 pb-7">
          <div className="mb-5 h-px bg-[#DCD2C1]" />
          <p className="text-[11px] font-bold text-[#251E1A]">{role === "ADMIN" ? "Administrator" : "Akun artisan"}</p>
          <p className="mt-1 text-[9px] text-[#4F6E59]">{role === "ADMIN" ? "Akses penuh" : "Terverifikasi · Aktif"}</p>
          <button onClick={() => void logout()} disabled={loggingOut}
            className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-[#93372A] hover:underline disabled:opacity-50">
            <LogOut size={13} /> {loggingOut ? "Keluar..." : "Keluar akun"}
          </button>
        </div>
      </aside>

      <div className="xl:pl-[248px]">
        <header className="sticky top-0 z-30 border-b border-[#E7DDCC] bg-[#FDFAF3]/95 backdrop-blur-xl xl:hidden">
          <div className="flex h-[76px] items-center justify-between px-5">
            <Link href={home} className="min-w-0">
              <span className="block font-display text-[19px] leading-none tracking-[-.04em] text-[#93372A]">NUSANTARA GIFT</span>
              <span className="mt-1 block text-[8px] font-bold tracking-[.08em] text-[#7A6C5E]">HADIAH DENGAN CERITA</span>
              <span className="mt-1 block text-[8px] font-bold tracking-[.12em] text-[#C79854]">{mobileRole}</span>
            </Link>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="relative text-[#431714]"><Bell size={19} strokeWidth={1.7}/><span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#93372A]"/></span>
              <button onClick={() => void logout()} disabled={loggingOut} aria-label="Keluar akun"
                className="rounded-full p-2 text-[#7A6C5E] hover:bg-[#F3EBDD] disabled:opacity-50"><LogOut size={16}/></button>
            </div>
          </div>
        </header>

        <main className="mr-auto ml-0 w-full max-w-[1160px] px-5 pb-28 pt-5 sm:px-7 xl:px-[38px] xl:pb-10 xl:pt-[28px]">
          <span className="sr-only">{title}. {subtitle}</span>
          {children}
        </main>
      </div>

      <nav aria-label="Navigasi mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCD2C1] bg-[#FDFAF3]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-8px_24px_rgba(67,23,20,.06)] backdrop-blur-xl xl:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = icons[item.icon];
            const selected = active(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[9px] font-bold transition-colors ${selected ? "text-[#93372A]" : "text-[#8C7C6B] hover:bg-[#F3EBDD]"}`}>
                {selected && <span className="absolute -top-2 h-[2px] w-7 rounded-full bg-[#93372A]"/>}
                <Icon size={19} strokeWidth={1.7}/>
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
