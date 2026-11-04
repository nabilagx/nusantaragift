
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { produk } from "@/data/produk";
import ShopLayout from "@/components/shop/ShopLayout";
import { useToast } from "@/components/ui/ToastProvider";

type CartItem = {
  productId: string;
  quantity: number;
};

const CART_KEY = "nusantragift-cart";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function parsePrice(price: string) {
  return Number(price.replace(/\D/g, "")) || 0;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);

      if (savedCart) {
        const parsed: unknown = JSON.parse(savedCart);

        if (Array.isArray(parsed)) {
          setCart(
            parsed.filter(
              (item): item is CartItem =>
                typeof item?.productId === "string" &&
                Number.isInteger(item?.quantity) &&
                item.quantity > 0
            )
          );
        }
      }
    } catch (error) {
      console.error("Gagal membaca keranjang:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, isLoaded]);

  const cartProducts = useMemo(() => {
    return cart
      .map((cartItem) => {
        const product = produk.find(
          (item) => item.id === cartItem.productId
        );

        if (!product) return null;

        return {
          ...product,
          quantity: cartItem.quantity,
          subtotal: parsePrice(product.price) * cartItem.quantity,
        };
      })
      .filter((item) => item !== null);
  }, [cart]);

  const totalItems = cartProducts.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const subtotal = cartProducts.reduce(
    (total, item) => total + item.subtotal,
    0
  );

  function updateQuantity(productId: string, change: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    const removedItem = cartProducts.find(
      (item) => item.id === productId
    );

    setCart((currentCart) =>
      currentCart.filter((item) => item.productId !== productId)
    );

    if (removedItem) {
      showToast(
        "success",
        `${removedItem.title} berhasil dihapus dari keranjang.`
      );
    }
  }

  if (!isLoaded) {
    return (
      <ShopLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-8 w-8 animate-pulse text-[#93372A]" />
            <p className="mt-3 text-sm text-[#777]">
              Memuat keranjang...
            </p>
          </div>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      {/* HEADER */}
      <header className="flex items-center gap-4 pb-7 pt-7">
        <Link
          href="/shop"
          aria-label="Kembali ke Shop"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-[#F0E5D5]"
        >
          <ArrowLeft size={19} />
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">
            NusantaraGift
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Keranjang
          </h1>
        </div>

        <div className="ml-auto flex items-center gap-2 rounded-full bg-white px-4 py-2">
          <ShoppingBag size={16} className="text-[#93372A]" />
          <span className="text-sm font-semibold">{totalItems}</span>
        </div>
      </header>

      {cartProducts.length === 0 ? (
        /* EMPTY STATE */
        <section className="flex min-h-[60vh] flex-col items-center justify-center py-10 text-center">
          <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-[#F0CDD5]/50">
            <ShoppingBag
              size={48}
              strokeWidth={1.4}
              className="text-[#93372A]"
            />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#93372A]">
            Keranjang masih kosong
          </p>

          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            Belum Ada Kado di Sini
          </h2>

          <p className="max-w-sm px-3 text-sm leading-relaxed text-[#77716A]">
            Yuk, temukan kado khas Nusantara yang paling cocok
            untukmu dan tambahkan ke keranjang!
          </p>

          <Link
            href="/shop"
            className="mt-7 inline-flex items-center justify-center gap-3 rounded-full bg-[#93372A] px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#76291F]"
          >
            <ShoppingBag size={18} />
            Jelajahi Kado
            <ArrowRight size={17} />
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-7 pb-8 lg:grid-cols-[1fr_350px]">
          {/* DAFTAR PRODUK */}
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold sm:text-2xl">
                Kado Pilihanmu ❤️
              </h2>
              <p className="mt-1 text-sm text-[#77716A]">
                Periksa kembali kado pilihanmu sebelum checkout.
              </p>
            </div>

            <div className="space-y-4">
              {cartProducts.map((item) => (
                <article
                  key={item.id}
                  className="relative flex gap-4 rounded-2xl border border-[#E9DFCE] bg-white p-3 shadow-sm sm:gap-5 sm:p-4"
                >
                  <Link
                    href={`/shop/${item.id}`}
                    className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:h-36 sm:w-36"
                    style={{
                      backgroundColor: item.cardColor || "#E6DBBC",
                    }}
                  >
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.imageAlt || item.title}
                        fill
                        className="object-contain p-3"
                        sizes="144px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag
                          size={36}
                          className="text-[#93372A]/50"
                        />
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1 py-1">
                    <p className="mb-1 text-xs font-semibold text-[#93372A]">
                      {item.category}
                    </p>

                    <Link href={`/shop/${item.id}`}>
                      <h3 className="pr-7 text-sm font-bold leading-snug sm:text-base">
                        {item.title}
                      </h3>
                    </Link>

                    <p className="mt-2 text-sm font-bold text-[#93372A]">
                      {item.price}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 rounded-full border border-[#E9DFCE] px-2 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          aria-label="Kurangi jumlah"
                          className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#F7F1E3]"
                        >
                          <Minus size={14} />
                        </button>

                        <span className="min-w-4 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          aria-label="Tambah jumlah"
                          className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#F7F1E3]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Hapus ${item.title}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#93372A] transition hover:bg-[#F0CDD5]/60"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <Link
              href="/shop"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#93372A] transition hover:underline"
            >
              <ArrowLeft size={16} />
              Lanjut Belanja
            </Link>
          </section>

          {/* RINGKASAN PESANAN */}
          <aside className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-bold">
              Ringkasan Pesanan
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-3 text-[#77716A]">
                <span>Total produk</span>
                <span className="font-semibold text-[#34291F]">
                  {totalItems} item
                </span>
              </div>

              <div className="flex justify-between gap-3 text-[#77716A]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#34291F]">
                  {formatRupiah(subtotal)}
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-dashed border-[#D9C9AF]" />

            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-[#93372A]">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#76291F]"
            >
              Lanjut ke Checkout
              <ArrowRight size={17} />
            </Link>

            <p className="mt-3 text-center text-xs leading-relaxed text-[#9A8874]">
              Checkout akan tersedia pada tahap berikutnya.
            </p>
          </aside>
        </div>
      )}
    </ShopLayout>
  );
}
