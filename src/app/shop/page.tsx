
"use client";

import { useState } from "react";
import { useWishlist } from "@/hooks/useWishlist";

import ShopLayout from "@/components/shop/ShopLayout";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopBannerCarousel from "@/components/shop/ShopBannerCarousel";
import QRScanBanner from "@/components/shop/QRScanBanner";
import SearchBar from "@/components/shop/SearchBar";
import CategoryTabs, {
  type ShopCategory,
} from "@/components/shop/CategoryTabs";
import FeaturedProducts from "@/components/shop/FeaturedProducts";

export default function ShopPage() {
  const [activeCategory, setActiveCategory] =
    useState<ShopCategory>("Cerita");

  const [searchQuery, setSearchQuery] = useState("");

  const { favorites, toggleFavorite } = useWishlist();

  return (
    <ShopLayout>
      <ShopHeader />

      <div className="mx-auto w-full max-w-[1080px]">
        {/* Banner carousel */}
        <ShopBannerCarousel />
        <QRScanBanner />

        {/* Search */}
        <div className="mt-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {/* Category tabs */}
        <div className="sticky top-0 z-20 mt-6 bg-[#F7F1E3] py-2">
          <CategoryTabs
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </div>

        {/* Products */}
        <FeaturedProducts
          category={activeCategory}
          searchQuery={searchQuery}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </ShopLayout>
  );
}
