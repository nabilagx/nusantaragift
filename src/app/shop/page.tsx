"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import type { ShopProduct } from "@/data/produk";
import { getCatalogProducts } from "@/lib/catalog";
import ShopLayout from "@/components/shop/ShopLayout";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopBannerCarousel from "@/components/shop/ShopBannerCarousel";
import QRScanBanner from "@/components/shop/QRScanBanner";
import SearchBar from "@/components/shop/SearchBar";
import CategoryTabs, { type ShopCategory } from "@/components/shop/CategoryTabs";
import FeaturedProducts from "@/components/shop/FeaturedProducts";

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>("Cerita");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { favorites, toggleFavorite } = useWishlist();

  useEffect(() => {
    let active = true;
    getCatalogProducts()
      .then((items) => { if (active) setProducts(items); })
      .catch((error) => {
        console.error("Gagal memuat katalog Supabase:", error);
        if (active) setLoadError("Katalog belum dapat dimuat. Coba muat ulang halaman.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <ShopLayout>
      <ShopHeader />
      <div className="mx-auto w-full max-w-[1080px]">
        <ShopBannerCarousel />
        <QRScanBanner />
        <Link href="/cerita" className="mt-3 flex items-center gap-3 rounded-2xl border border-[#D8C6A8] bg-[#431714] p-4 text-[#FFFDF8] transition hover:bg-[#5A211B]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E5C58D] text-[#431714]"><BookOpen size={24}/></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">Cerita Nusantara</span><span className="mt-0.5 block text-xs text-[#EADBC4]">Baca dan dengarkan kisah dari para pelaku UMKM.</span></span>
          <ArrowRight size={18} className="shrink-0 text-[#E5C58D]"/>
        </Link>
        <div className="mt-6"><SearchBar value={searchQuery} onChange={setSearchQuery} /></div>
        <div className="sticky top-0 z-20 mt-6 bg-[#F7F1E3] py-2">
          <CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#806A4E]">Memuat katalog produk...</div>
        ) : loadError ? (
          <div role="alert" className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{loadError}</div>
        ) : (
          <FeaturedProducts products={products} category={activeCategory} searchQuery={searchQuery} favorites={favorites} onToggleFavorite={toggleFavorite} />
        )}
      </div>
    </ShopLayout>
  );
}
