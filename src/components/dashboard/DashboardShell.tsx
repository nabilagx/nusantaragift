"use client";

import type { ReactNode } from "react";
import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Boxes, ClipboardList, FileText, LayoutDashboard, LogOut,
  Megaphone, Menu, Package, PackagePlus, Settings, ShieldCheck, Store,
  Users, CircleHelp, BadgeCheck, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DashboardIcon =
  | "overview" | "products" | "add" | "orders" | "analytics" | "profile" | "help"
  | "verification" | "curation" | "reports" | "settings" | "sellers" | "moderation" | "ads";

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
  ads: Megaphone,
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;

      try {
        localStorage.removeItem("nusantragift-cart");
        localStorage.removeItem("nusantaragift-wishlist");
      } catch {
        // Storage may be unavailable; the Supabase session is still cleared.
      }

      window.location.replace("/login?loggedOut=1");
    } catch (error) {
      console.error("Gagal mengakhiri sesi:", error);
      setLogoutError("Sesi belum berhasil diakhiri. Coba sekali lagi.");
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const active = (href: string) => href.split("#")[0] === pathname;
  const home = role === "ADMIN" ? "/admin/dashboard" : "/seller/dashboard";
  const roleLabel = role === "ADMIN" ? "CURATOR DESK" : "ARTISAN ATELIER";
  const mobileRole = role === "ADMIN" ? "NUSANTARA GIFT · ADMIN" : "RUANG BERKARYA";
  const primaryMobileItems = mobileNavItems.slice(0, 4);
  const allNavItems = [...navItems, ...mobileNavItems].filter((item, index, items) =>
    items.findIndex((candidate) => candidate.href === item.href) === index
  );
  const moreItems = allNavItems.filter((item) =>
    !primaryMobileItems.some((primary) => primary.href === item.href)
  );

  return (
    <div className={`dashboard-shell min-h-dvh text-[#251E1A] ${role === "ADMIN" ? "bg-[#F7F1E3]" : "bg-[#F7F1E3]"}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r lg:flex ${role === "ADMIN" ? "border-[#5A2A24] bg-[#431714] text-[#F5F1E7]" : "border-[#E7DDCC] bg-[#FDFAF3]"}`}>
        <Link href={home} className="block px-7 pt-7">
          <img src="/images/brand/LOGO.svg" alt="Nusantara Gift" className="h-12 w-[174px] object-contain object-left" />
          <span className={`mt-2 block text-[8px] font-bold tracking-[.18em] ${role === "ADMIN" ? "text-[#C79854]" : "text-[#7A6C5E]"}`}>
            {role === "ADMIN" ? "MODERATION & OPERATIONS · ADMIN" : "ARTISAN ATELIER · UMKM"}
          </span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-9">
          <p className={`text-[9px] font-bold tracking-[.15em] ${role === "ADMIN" ? "text-[#D8B77C]" : "text-[#C79854]"}`}>{roleLabel}</p>
          <div className="mt-7 h-px bg-[#DCD2C1]" />
          <nav aria-label="Navigasi utama" className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = icons[item.icon];
              const selected = active(item.href);
              return (
                <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                  className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[11px] transition-colors ${selected ? (role === "ADMIN" ? "bg-[#F3EBDD] font-bold text-[#5A202A]" : "bg-[#431714] font-bold text-[#FFFDF8]") : (role === "ADMIN" ? "font-medium text-[#E9DCCB] hover:bg-[#5A202A] hover:text-white" : "font-medium text-[#7A6C5E] hover:bg-[#F3EBDD] hover:text-[#431714]")}`}>
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto px-7 pb-7 pt-4">
          <div className={`mb-5 h-px ${role === "ADMIN" ? "bg-[#6F333A]" : "bg-[#DCD2C1]"}`} />
          <p className={`text-[11px] font-bold ${role === "ADMIN" ? "text-white" : "text-[#251E1A]"}`}>{role === "ADMIN" ? "Administrator" : "Akun artisan"}</p>
          <p className={`mt-1 text-[9px] ${role === "ADMIN" ? "text-[#C79854]" : "text-[#93372A]"}`}>{role === "ADMIN" ? "Moderator katalog · Operasional" : "Terverifikasi · Aktif"}</p>
          <button onClick={() => void logout()} disabled={loggingOut}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5C58D] bg-[#F3EBDD] px-4 text-[11px] font-bold text-[#7B2925] shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-60">
            <LogOut size={15} strokeWidth={2.4} /> {loggingOut ? "Mengakhiri sesi..." : "Keluar akun"}
          </button>
          {logoutError && <p role="alert" className="mt-2 max-w-[190px] text-[10px] font-medium text-[#F0B6A8]">{logoutError}</p>}
        </div>
      </aside>

      <div className="relative z-10 lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#E7DDCC] bg-[#FDFAF3]/95 backdrop-blur-xl">
          <div className="flex min-h-[76px] items-center justify-between gap-3 px-3 sm:px-7">
            <Link href={home} className="min-w-0 lg:hidden">
              <img src="/images/brand/LOGO.svg" alt="Nusantara Gift" className="h-9 w-[132px] object-contain object-left sm:h-10 sm:w-[146px]" />
              <span className="mt-1 block text-[8px] font-bold tracking-[.12em] text-[#93372A]">{mobileRole}</span>
            </Link>
            <div className="hidden min-w-0 lg:block">
              <p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">{roleLabel}</p>
              <p className="mt-1 text-xs text-[#7A6C5E]">{title}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden text-[10px] font-semibold text-[#7A6C5E] sm:inline">{role === "ADMIN" ? "Administrator" : "Akun artisan"}</span>
              <button onClick={() => void logout()} disabled={loggingOut} aria-label="Keluar akun" title="Keluar akun"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#E5C58D] bg-[#93372A] px-3 sm:px-4 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#76291F] disabled:cursor-wait disabled:opacity-60">
                <LogOut size={16} strokeWidth={2.4} /><span>{loggingOut ? "Mengakhiri sesi..." : "Keluar"}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mr-auto ml-0 w-full max-w-[1160px] px-3 pb-28 pt-5 sm:px-7 lg:px-[38px] lg:pb-10 lg:pt-[28px]">
          <span className="sr-only">{title}. {subtitle}</span>
          {children}
        </main>
      </div>

      <nav aria-label="Navigasi mobile" className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 backdrop-blur-xl lg:hidden ${role === "ADMIN" ? "border-[#5A2A24] bg-[#431714]/97 shadow-[0_-8px_24px_rgba(20,42,36,.2)]" : "border-[#5A2A24] bg-[#431714]/97 shadow-[0_-8px_24px_rgba(67,23,20,.2)]"}`}>
        {moreOpen && (
          <div id="dashboard-mobile-more" role="dialog" aria-label="Menu lainnya"
            className="absolute inset-x-3 bottom-full mb-3 max-h-[58dvh] overflow-y-auto rounded-2xl border border-[#D8C7A9] bg-[#FDFAF3] p-4 text-[#431714] shadow-[0_12px_40px_rgba(30,15,10,.25)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold tracking-[.16em] text-[#A17A43]">{role === "ADMIN" ? "CURATOR DESK" : "ARTISAN ATELIER"}</p>
                <h2 className="mt-1 text-sm font-bold">Menu lainnya</h2>
              </div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Tutup menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8DFD2] text-[#79552F] hover:bg-[#F3EBDD]">
                <X size={18} />
              </button>
            </div>
            {moreItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {moreItems.map((item) => {
                  const Icon = icons[item.icon];
                  const selected = active(item.href);
                  return (
                    <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined} role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-semibold ${selected ? "border-[#93372A] bg-[#F3EBDD] text-[#93372A]" : "border-[#E8DFD2] bg-white text-[#6F5A43] hover:bg-[#F7F1E3]"}`}>
                      <Icon size={16} className="shrink-0" />
                      <span className="min-w-0 break-words">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : <p className="text-xs text-[#7A6C5E]">Tidak ada menu tambahan.</p>}
          </div>
        )}
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {primaryMobileItems.map((item) => {
            const Icon = icons[item.icon];
            const selected = active(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={selected ? "page" : undefined}
                className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C58D] ${selected ? "text-[#E5C58D]" : "text-[#E9DCCB]/85 hover:bg-white/5"}`}>
                {selected && <span className="absolute -top-1 h-[2px] w-7 rounded-full bg-[#E5C58D]" />}
                <Icon size={19} strokeWidth={1.8} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-controls="dashboard-mobile-more"
            className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C58D] ${moreOpen ? "bg-white/10 text-[#E5C58D]" : "text-[#E9DCCB]/85 hover:bg-white/5"}`}>
            {moreOpen ? <X size={19} strokeWidth={1.8} /> : <Menu size={19} strokeWidth={1.8} />}
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
