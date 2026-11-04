
"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/products" },
  { label: "Kategori", href: "/categories" },
  { label: "Cerita Nusantara", href: "/stories" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#93372A]/10 bg-[#F7F1E3]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" aria-label="NusantaraGift Beranda">
          <Logo size={52} priority />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#222222] transition-colors hover:text-[#93372A]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-[#93372A] transition-colors hover:bg-[#93372A]/10"
          >
            Masuk
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-[#93372A] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#93372A]/20 transition-all hover:-translate-y-0.5 hover:bg-[#762B22] active:scale-95"
          >
            Daftar
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#93372A]/20 text-2xl text-[#93372A] transition-colors hover:bg-[#93372A]/10 md:hidden"
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* Mobile navigation */}
      {menuOpen && (
        <nav className="border-t border-[#93372A]/10 bg-[#F7F1E3] px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-medium text-[#222222] transition-colors hover:bg-[#93372A]/10 hover:text-[#93372A]"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#93372A]/10 pt-4">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-[#93372A] py-3 text-center text-sm font-semibold text-[#93372A]"
              >
                Masuk
              </Link>

              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-[#93372A] py-3 text-center text-sm font-semibold text-white"
              >
                Daftar
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
