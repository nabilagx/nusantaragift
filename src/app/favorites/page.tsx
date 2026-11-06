"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import type { ShopProduct } from "@/data/produk";
import { getCatalogProducts } from "@/lib/catalog";
import ShopLayout from "@/components/shop/ShopLayout";

export default function FavoritePage() {
  const { favorites, toggleFavorite, isLoaded, error } = useWishlist();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getCatalogProducts()
      .then((items) => { if (active) setProducts(items); })
      .catch((loadError) => console.error("Gagal memuat katalog favorit:", loadError))
      .finally(() => { if (active) setProductsLoaded(true); });
    return () => { active = false; };
  }, []);

  const favoriteProducts = useMemo(
    () => products.filter((item) => favorites.includes(item.id)),
    [products, favorites]
  );
  const loading = !isLoaded || !productsLoaded;

  if (loading) {
    return (
      <ShopLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <Heart className="mx-auto h-8 w-8 animate-pulse text-[#93372A]" />
            <p className="mt-3 text-sm text-[#777]">Memuat kado favorit...</p>
          </div>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <header className="flex items-center gap-4 pb-6 pt-7">
        <Link href="/shop" aria-label="Kembali ke Shop" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-[#F0E5D5]">
          <ArrowLeft size={19} />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">NusantaraGift</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Favorit</h1>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-white px-4 py-2">
          <Heart size={16} className="text-[#93372A]" />
          <span className="text-sm font-semibold">{favoriteProducts.length}</span>
        </div>
      </header>

      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {favoriteProducts.length === 0 ? (
        <section className="flex min-h-[65vh] flex-col items-center justify-center py-8 text-center">
          <div className="relative mb-5 aspect-square w-full max-w-[340px] sm:max-w-[400px]">
            <img src="/images/empty-state/detective.png" alt="Ilustrasi detektif sedang mencari kado favorit" className="h-full w-full object-contain" />
          </div>
          <div className="mx-auto max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#93372A]">Misi pencarian dimulai!</p>
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">Belum Ada Kado Favorit</h2>
            <p className="px-3 text-sm leading-relaxed text-[#77716A] sm:text-base">Sepertinya detektif kita belum menemukan kado favoritmu. Yuk, jelajahi berbagai kado unik dan temukan yang paling menarik perhatianmu!</p>
            <Link href="/shop" className="mt-7 inline-flex items-center justify-center gap-3 rounded-full bg-[#93372A] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#76291F]">
              <ShoppingBag size={18} /> Jelajahi Kado <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      ) : (
        <section className="pt-3">
          <div className="mb-6">
            <h2 className="text-xl font-bold sm:text-2xl">Kado Pilihanmu ❤️</h2>
            <p className="mt-1 text-sm text-[#77716A]">Semua kado yang kamu simpan ada di sini.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.map((item) => (
              <article key={item.id} className="relative overflow-hidden rounded-2xl border border-[#E9DFCE] bg-white shadow-sm transition hover:shadow-md">
                <Link href={`/shop/${item.id}`} className="block">
                  <div className="relative flex aspect-[4/3] items-center justify-center p-5" style={{ backgroundColor: item.cardColor || "#E6DBBC" }}>
                    {item.image ? (
                      <div className="relative h-full w-full">
                        <img src={item.image} alt={item.imageAlt || item.title} loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
                      </div>
                    ) : <ShoppingBag size={56} className="text-[#93372A]/50" />}
                  </div>
                  <div className="p-4 pr-14">
                    <p className="mb-1 text-xs font-semibold text-[#93372A]">{item.category}</p>
                    <h3 className="text-base font-bold leading-snug">{item.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs text-[#77716A]">{item.description}</p>
                    <p className="mt-4 font-bold text-[#93372A]">{item.price}</p>
                    <p className={`mt-2 text-xs font-semibold ${item.stock > 0 ? "text-[#47704C]" : "text-[#A13D32]"}`}>
                      {item.stock > 0 ? `Stok tersedia: ${item.stock}` : "Stok habis"}
                    </p>
                  </div>
                </Link>
                <button type="button" onClick={() => void toggleFavorite(item.id)} aria-label={`Hapus ${item.title} dari favorit`} title="Hapus dari favorit" className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F1E3] text-[#93372A] transition hover:bg-[#F0CDD5]">
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </ShopLayout>
  );
}
