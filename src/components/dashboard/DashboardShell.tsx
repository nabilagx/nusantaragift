"use client";

import type { ReactNode } from "react";
import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, BarChart3, Bell, Boxes, ClipboardList, FileText, Gift,
  LayoutDashboard, LogOut, Package, PackagePlus, Settings, ShieldCheck,
  Store, Users, UserRound, CircleHelp, BadgeCheck, Wallet, Menu, X as CloseIcon,
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const active = (href: string) => href.split("#")[0] === pathname;
  const home = role === "ADMIN" ? "/admin/dashboard" : "/seller/dashboard";
  const roleLabel = role === "ADMIN" ? "CURATOR DESK" : "ARTISAN ATELIER";
  const mobileRole = role === "ADMIN" ? "NUSANTARA GIFT · ADMIN" : "RUANG BERKARYA";

  return (
    <div className={`min-h-dvh text-[#251E1A] ${role === "ADMIN" ? "bg-[#EEF2EE]" : "bg-[#F7F1E3]"}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r xl:flex ${role === "ADMIN" ? "border-[#263E36] bg-[#142A24] text-[#F5F1E7]" : "border-[#E7DDCC] bg-[#FDFAF3]"}`}>
        <Link href={home} className="block px-7 pt-7"><img src="/images/brand/LOGO.svg" alt="Nusantara Gift" className="h-12 w-[174px] object-contain object-left"/><span className={`mt-2 block text-[8px] font-bold tracking-[.18em] ${role === "ADMIN" ? "text-[#C79854]" : "text-[#7A6C5E]"}`}>{role === "ADMIN" ? "PLATFORM CONTROL · ADMIN" : "ARTISAN ATELIER · UMKM"}</span></Link>
        <div className="px-7 pt-9">
          <p className={`text-[9px] font-bold tracking-[.15em] ${role === "ADMIN" ? "text-[#D8B77C]" : "text-[#C79854]"}`}>{roleLabel}</p>
          <div className="mt-7 h-px bg-[#DCD2C1]" />
          <nav aria-label="Navigasi utama" className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = icons[item.icon];
              const selected = active(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[11px] transition-colors ${selected ? (role === "ADMIN" ? "bg-[#D9E8DD] font-bold text-[#17362B]" : "bg-[#431714] font-bold text-[#FFFDF8]") : (role === "ADMIN" ? "font-medium text-[#B8C9BE] hover:bg-[#1F3C33] hover:text-white" : "font-medium text-[#7A6C5E] hover:bg-[#F3EBDD] hover:text-[#431714]")}`}>
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto px-7 pb-7">
          <div className={`mb-5 h-px ${role === "ADMIN" ? "bg-[#365046]" : "bg-[#DCD2C1]"}`} />
          <p className={`text-[11px] font-bold ${role === "ADMIN" ? "text-white" : "text-[#251E1A]"}`}>{role === "ADMIN" ? "Administrator" : "Akun artisan"}</p>
          <p className={`mt-1 text-[9px] ${role === "ADMIN" ? "text-[#C79854]" : "text-[#4F6E59]"}`}>{role === "ADMIN" ? "Akses penuh · Control room" : "Terverifikasi · Aktif"}</p>
          <button onClick={() => void logout()} disabled={loggingOut}
            className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-[#93372A] hover:underline disabled:opacity-50">
            <LogOut size={13} /> {loggingOut ? "Keluar..." : "Keluar akun"}
          </button>
        </div>
      </aside>

      <div className="relative z-10 xl:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#E7DDCC] bg-[#FDFAF3]/95 backdrop-blur-xl xl:hidden">
          <div className="flex h-[76px] items-center justify-between px-5">
            <Link href={home} className="min-w-0"><img src="/images/brand/LOGO.svg" alt="Nusantara Gift" className="h-10 w-[146px] object-contain object-left"/><span className={`mt-1 block text-[8px] font-bold tracking-[.12em] ${role === "ADMIN" ? "text-[#D8B77C]" : "text-[#C79854]"}`}>{mobileRole}</span></Link>
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className={`relative ${role === "ADMIN" ? "text-[#E5C58D]" : "text-[#431714]"}`}><Bell size={19} strokeWidth={1.7}/><span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#93372A]"/></span><button onClick={()=>setDrawerOpen(v=>!v)} aria-label="Buka menu" className={`rounded-full border p-2 ${role === "ADMIN" ? "border-[#496257] text-[#F5F1E7]" : "border-[#DCD2C1] text-[#431714]"}`}><Menu size={18}/></button>
              <button onClick={() => void logout()} disabled={loggingOut} aria-label="Keluar akun"
                className={`rounded-full p-2 disabled:opacity-50 ${role === "ADMIN" ? "text-[#B8C9BE] hover:bg-white/10" : "text-[#7A6C5E] hover:bg-[#F3EBDD]"}`}><LogOut size={16}/></button>
            </div>
          </div>
        </header>

        <main className="mr-auto ml-0 w-full max-w-[1160px] px-5 pb-28 pt-5 sm:px-7 xl:px-[38px] xl:pb-10 xl:pt-[28px]">
          <span className="sr-only">{title}. {subtitle}</span>
          {children}
        </main>
      </div>

      {drawerOpen && <div className="fixed inset-0 z-[60] xl:hidden"><button aria-label="Tutup menu" onClick={()=>setDrawerOpen(false)} className="absolute inset-0 bg-[#171D19]/55"/><aside className={`absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col p-5 shadow-2xl ${role === "ADMIN" ? "bg-[#142A24] text-[#F5F1E7]" : "bg-[#FDFAF3]"}`}><div className="flex items-center justify-between border-b border-[#DCD2C1] pb-4"><img src="/images/brand/LOGO.svg" alt="Nusantara Gift" className="h-10 w-36 object-contain object-left"/><button onClick={()=>setDrawerOpen(false)} aria-label="Tutup menu" className="rounded-full p-2 text-[#431714]"><CloseIcon size={20}/></button></div><p className="mt-5 text-[9px] font-bold tracking-[.16em] text-[#C79854]">{roleLabel}</p><nav className="mt-3 space-y-1">{navItems.map(item=>{const Icon=icons[item.icon];return <Link key={item.href} href={item.href} onClick={()=>setDrawerOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[12px] font-semibold ${active(item.href)?"bg-[#431714] text-white":"text-[#66584B] hover:bg-[#F3EBDD]"}`}><Icon size={17}/>{item.label}</Link>})}</nav><div className="mt-auto border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-bold text-[#431714]">{role==="ADMIN"?"Administrator":"Akun artisan"}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{mobileRole}</p></div></aside></div>}

      <nav aria-label="Navigasi mobile" className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl xl:hidden ${role === "ADMIN" ? "border-[#263E36] bg-[#142A24]/97 shadow-[0_-8px_24px_rgba(20,42,36,.2)]" : "border-[#5A2A24] bg-[#431714]/97 shadow-[0_-8px_24px_rgba(67,23,20,.2)]"}`}>
        <div className={`mx-auto grid max-w-xl gap-1 ${role === "UMKM" ? "grid-cols-5" : "grid-cols-4"}`}>
          {mobileNavItems.map((item) => {
            const Icon = icons[item.icon];
            const selected = active(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-bold transition-colors ${role === "ADMIN" ? (selected ? "text-[#E5C58D]" : "text-[#B8C9BE] hover:bg-white/5") : (selected ? "text-[#E5C58D]" : "text-[#E9DCCB]/75 hover:bg-white/5")}`}>
                {selected && <span className={`absolute -top-2 h-[2px] w-7 rounded-full ${role === "ADMIN" ? "bg-[#D8B77C]" : "bg-[#E5C58D]"}`}/>}
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
