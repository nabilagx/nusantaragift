
"use client";

import ProductCard from "./ProductCard";
import type { ShopCategory } from "./CategoryTabs";
import { produk } from "@/data/produk";

type FeaturedProductsProps = {
  category: ShopCategory;
  searchQuery: string;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
};

export default function FeaturedProducts({
  category,
  searchQuery,
  favorites,
  onToggleFavorite,
}: FeaturedProductsProps) {
  const query = searchQuery.trim().toLocaleLowerCase("id");

const filteredProducts = produk.filter((product) => {
  const matchesCategory = product.category === category;

  const matchesSearch =
    `${product.title} ${product.description}`
      .toLocaleLowerCase("id")
      .includes(query);

  return matchesCategory && matchesSearch;
});


  const sectionTitle =
    category === "Cerita" ? "Semua Kado" : `Kado ${category}`;

  return (
    <section className="mt-7 pb-28 sm:mt-9 sm:pb-32">
      {/* Section heading */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A18B6D]">
            Pilihan Nusantara
          </p>

          <h1 className="mt-1 font-quicksand text-xl font-bold text-[#34291F] sm:text-2xl">
            {sectionTitle}
          </h1>
        </div>

        <span className="pb-1 text-xs text-[#927F68]">
          {filteredProducts.length} produk
        </span>
      </div>

      {/* Product list */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D9C9AF] bg-white/45 px-5 py-10 text-center">
          <p className="font-quicksand text-base font-bold text-[#6F5A43]">
            {query
              ? "Produk tidak ditemukan"
              : "Belum ada produk di kategori ini"}
          </p>

          <p className="mt-1 text-sm text-[#9A8874]">
            {query
              ? "Coba kata kunci pencarian yang lain."
              : "Nantikan pilihan kado menarik dari NusantaraGift."}
          </p>
        </div>
      )}
    </section>
  );
}
