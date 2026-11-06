"use client";

import Link from "next/link";
import type { ShopProduct } from "@/data/produk";

type ProductCardProps = {
  product: ShopProduct;
  favorite: boolean;
  onToggleFavorite: (id: string) => void | Promise<void>;
};

export default function ProductCard({ product, favorite, onToggleFavorite }: ProductCardProps) {
  return (
    <article className="group relative grid min-h-[164px] grid-cols-[42%_1fr] overflow-hidden rounded-[22px] shadow-[0_5px_18px_rgba(75,48,25,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(75,48,25,0.11)] sm:min-h-[190px] sm:grid-cols-[43%_1fr] lg:min-h-[205px]" style={{ backgroundColor: product.cardColor }}>
      <Link href={`/shop/${product.id}`} aria-label={`Lihat detail ${product.title}`} className="absolute inset-0 z-0" />
      <div className="pointer-events-none relative min-h-full overflow-hidden">
        {product.image ? <img src={product.image} alt={product.imageAlt || product.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: product.accentColor }}>
            <span className="font-quicksand text-5xl text-[#765B3C]/55">✺</span>
          </div>
        )}
      </div>
      <div className="pointer-events-none relative z-0 flex min-w-0 flex-col justify-center px-3 py-4 pr-10 sm:px-5 sm:py-5 sm:pr-12">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#806A4E]">NusantaraGift</p>
        <h2 className="font-quicksand text-[15px] font-bold leading-snug text-[#34291F] sm:text-lg">{product.title}</h2>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#665744] sm:text-sm">{product.description}</p>
        <p className="mt-3 font-quicksand text-sm font-bold text-[#93372A]">{product.price}</p>
        <p className={`mt-2 text-[10px] font-semibold sm:text-xs ${product.stock > 0 ? "text-[#47704C]" : "text-[#A13D32]"}`}>
          {product.stock > 0 ? `Stok tersedia: ${product.stock}` : "Stok habis"}
        </p>
      </div>
      <button type="button" onClick={() => void onToggleFavorite(product.id)} aria-label={favorite ? "Hapus dari favorit" : "Tambah ke favorit"} aria-pressed={favorite} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#93372A] shadow-sm transition hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
          <path d="M20.8 8.8c0 5.1-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.8A4.5 4.5 0 0 1 12 6.5a4.5 4.5 0 0 1 8.8 2.3Z" />
        </svg>
      </button>
    </article>
  );
}
