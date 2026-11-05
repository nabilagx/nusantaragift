
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ShopProduct } from "@/data/produk";
import { getCatalogProduct } from "@/lib/catalog";

type CartItem = {
  productId: string;
  quantity: number;
};

function addToCart(productId: string): boolean {
  try {
    const stored = localStorage.getItem("nusantragift-cart");

    const parsed: unknown = stored ? JSON.parse(stored) : [];

    const cart: CartItem[] = Array.isArray(parsed)
      ? parsed.filter(
          (item): item is CartItem =>
            typeof item?.productId === "string" &&
            typeof item?.quantity === "number"
        )
      : [];

    const existing = cart.find(
      (item) => item.productId === productId
    );

    const updatedCart = existing
      ? cart.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...cart, { productId, quantity: 1 }];

    localStorage.setItem(
      "nusantragift-cart",
      JSON.stringify(updatedCart)
    );

    return true;
  } catch (error) {
    console.error("Gagal menambahkan produk ke keranjang:", error);
    return false;
  }
}

export default function ProductDetailPage({ id }: { id: string }) {
  const router = useRouter();

  const [product, setProduct] = useState<ShopProduct | undefined>();
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    let active = true;
    getCatalogProduct(id)
      .then((item) => { if (active) setProduct(item); })
      .catch((error) => console.error("Gagal memuat detail produk:", error))
      .finally(() => { if (active) setLoadingProduct(false); });
    return () => { active = false; };
  }, [id]);

  const [showPreview, setShowPreview] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState("");

  if (loadingProduct) {
    return <main className="flex min-h-screen items-center justify-center bg-[#FFFAFA] text-sm text-[#806A4E]">Memuat detail produk...</main>;
  }

  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFAFA] px-5">
        <div className="text-center">
          <h1 className="font-quicksand text-2xl font-bold text-[#34291F]">
            Produk tidak ditemukan
          </h1>

          <p className="mt-2 text-sm text-[#806A4E]">
            Maaf, produk yang kamu cari tidak tersedia.
          </p>

          <Link
            href="/shop"
            className="mt-5 inline-flex rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7D2E24]"
          >
            Kembali ke Shop
          </Link>
        </div>
      </main>
    );
  }

  function handleAddToCart() {
  if (!product) return;

  const success = addToCart(product.id);

  if (success) {
    setAdded(true);
    setCartError("");

    window.setTimeout(() => {
      setAdded(false);
    }, 2200);
  } else {
    setCartError(
      "Produk gagal ditambahkan. Silakan coba lagi."
    );
  }
}

  return (
    <main className="min-h-screen bg-[#FFFAFA] pb-32 text-[#34291F]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#EDE3DC] bg-[#FFFAFA]/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Kembali"
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#F0CDD5]/40"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="m15 18-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <Link
            href="/shop"
            className="font-quicksand text-lg font-bold text-[#93372A]"
          >
            NusantaraGift
          </Link>

          <Link
            href="/cart"
            aria-label="Keranjang"
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#F0CDD5]/40"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path
                d="M3 3h2l2.2 12.1a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L22 8H6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="20" r="1" />
              <circle cx="18" cy="20" r="1" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main product */}
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-7 sm:px-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-12 lg:py-12">
        {/* Product image */}
        <section className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[28px] bg-[#F0CDD5] p-6 sm:min-h-[440px] lg:min-h-[580px]">
          {product.image ? (
            <div className="relative h-[280px] w-full sm:h-[400px] lg:h-[510px]">
              <Image
                src={product.image}
                alt={product.imageAlt || product.title}
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 50vw"
                className="object-contain"
              />
            </div>
          ) : (
            <span className="text-8xl text-[#93372A]/40">
              ✺
            </span>
          )}

          <span className="absolute bottom-5 left-5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#93372A]">
            Kado {product.category}
          </span>
        </section>

        {/* Product information */}
        <section className="flex flex-col">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A18B6D]">
              Kado {product.category}
            </p>

            <h1 className="mt-3 font-['Poppins'] text-3xl font-semibold leading-tight text-[#222] sm:text-4xl lg:text-[42px]">
              {product.title.replace("Kado ", "")}
            </h1>

            <p className="mt-3 font-['Poppins'] text-sm italic leading-6 text-[#806A4E] sm:text-base">
              {product.category === "Cerita"
                ? "Cerita & budaya dari NTT, Maluku, Papua"
                : `${product.category} khas dari ${product.region}`}
            </p>
          </div>

          {/* Price and size */}
          <div className="mt-7 flex items-end justify-between border-b border-[#E8DCD0] pb-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#A18B6D]">
                HARGA
              </p>

              <p className="mt-1 font-quicksand text-2xl font-bold text-[#93372A]">
                {product.price}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold tracking-wider text-[#A18B6D]">
                UKURAN
              </p>

              <p className="mt-1 text-sm font-semibold text-[#34291F]">
                {product.size}
              </p>
            </div>
          </div>

          {/* Summary */}
          <section className="mt-7">
            <h2 className="font-quicksand text-lg font-bold">
              Ringkasan
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <SummaryItem
                icon="type"
                label="Jenis"
                value={product.summary.type}
              />

              <SummaryItem
                icon="format"
                label="Format"
                value={product.summary.format}
              />

              <SummaryItem
                icon="unlock"
                label="Unlock"
                value={product.summary.unlock}
              />
            </div>
          </section>

          {/* Description */}
          <section className="mt-8">
            <h2 className="font-quicksand text-lg font-bold">
              Deskripsi
            </h2>

            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#665744] sm:text-base">
              {product.detailDescription}
            </p>
          </section>
        </section>
      </div>

      {/* Cart error */}
      {cartError && (
        <p
          role="alert"
          className="mx-auto max-w-[1200px] px-5 text-sm text-red-700 sm:px-8 lg:px-12"
        >
          {cartError}
        </p>
      )}

      {/* Separate action buttons */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCD0] bg-[#FFFAFA]/95 px-4 py-4 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex w-full max-w-[700px] gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex min-h-[54px] flex-1 items-center justify-center rounded-full border-2 border-[#93372A] bg-transparent px-4 font-quicksand text-sm font-bold text-[#93372A] transition hover:bg-[#F0CDD5]/30 sm:text-base"
          >
            Preview Clue
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            className="flex min-h-[54px] flex-[1.3] items-center justify-center gap-2 rounded-full bg-[#93372A] px-4 font-quicksand text-sm font-bold text-white shadow-md transition hover:bg-[#7D2E24] sm:text-base"
          >
            {added ? (
              <>
                <span aria-hidden="true">✓</span>
                Ditambahkan
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M3 3h2l2.2 12.1a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 2-1.6L22 8H6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="10" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                </svg>

                Tambah ke Keranjang
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-5"
          onClick={() => setShowPreview(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            className="w-full max-w-[440px] rounded-[26px] bg-[#FFFAFA] p-6 text-[#34291F] shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A18B6D]">
                  NusantaraGift
                </p>

                <h2
                  id="preview-title"
                  className="mt-2 font-quicksand text-2xl font-bold"
                >
                  Preview Clue
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                aria-label="Tutup preview"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0CDD5]/50 text-xl text-[#93372A]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F7F1E3] p-5">
              <p className="text-sm font-semibold text-[#93372A]">
                {product.title}
              </p>

              <p className="mt-3 text-sm leading-7 text-[#665744]">
                Preview clue untuk produk ini belum tersedia.
                Nantinya bagian ini dapat menampilkan petunjuk
                singkat sebelum pembeli membuka paket cerita.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-6 min-h-[50px] w-full rounded-full bg-[#93372A] px-5 font-quicksand text-sm font-bold text-white transition hover:bg-[#7D2E24]"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: "type" | "format" | "unlock";
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-2xl bg-[#F7F1E3]/70 px-2 py-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center text-[#93372A]">
        {icon === "type" && (
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path
              d="M12 2v20M8 6v12M4 9v6M16 6v12M20 9v6"
              strokeLinecap="round"
            />
          </svg>
        )}

        {icon === "format" && (
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.7 1.7 0 0 1 1.2-2.9H18a3 3 0 0 0 3-3c0-5-4-8.7-9-8.7Z" />
            <circle cx="7.5" cy="10" r="1" />
            <circle cx="11" cy="7" r="1" />
            <circle cx="16" cy="9" r="1" />
          </svg>
        )}

        {icon === "unlock" && (
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path
              d="M8 10V7a4 4 0 0 1 7.5-2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#A18B6D]">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold text-[#93372A] sm:text-sm">
        {value}
      </p>
    </div>
  );
}
