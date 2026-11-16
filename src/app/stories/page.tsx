"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";
import ShopHeader from "@/components/shop/ShopHeader";
import SearchBar from "@/components/shop/SearchBar";
import FeaturedProducts from "@/components/shop/FeaturedProducts";
import { useWishlist } from "@/hooks/useWishlist";
import { getCatalogProducts } from "@/lib/catalog";
import type { ShopProduct } from "@/data/produk";

export default function StoriesPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { favorites, toggleFavorite } = useWishlist();

  useEffect(() => {
    let active = true;
    getCatalogProducts()
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch((error) => {
        console.error("Gagal memuat katalog cerita:", error);
        if (active) setLoadError("Koleksi cerita belum dapat dimuat. Coba muat ulang halaman.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ShopLayout>
      <ShopHeader />
      <div className="mx-auto w-full max-w-[1080px]">
        <section className="relative mt-3 overflow-hidden rounded-[22px] bg-[#431714] px-5 py-7 text-[#F7F1E3] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full border border-[#D8B77C]/25" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D8B77C]/15 text-[#E7C88D]">
              <BookOpen size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold tracking-[.2em] text-[#D8B77C]">NUSANTARAGIFT · CERITA DIGITAL</p>
              <h1 className="mt-2 font-display text-2xl leading-tight sm:text-3xl">Kado yang menyimpan cerita.</h1>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-[#EADBC4] sm:text-sm">
                Temukan kisah audio dan warisan budaya Nusantara untuk dibagikan sebagai hadiah digital.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#806A4E]">Memuat koleksi cerita...</div>
        ) : loadError ? (
          <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadError}</div>
        ) : (
          <FeaturedProducts products={products} category="Cerita" searchQuery={searchQuery} favorites={favorites} onToggleFavorite={toggleFavorite} />
        )}
      </div>
    </ShopLayout>
  );
}
