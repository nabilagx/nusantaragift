"use client";

import { useEffect, useState } from "react";
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
