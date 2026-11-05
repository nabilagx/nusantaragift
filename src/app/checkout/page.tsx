"use client";

import { useEffect, useMemo, useState, type FormEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, MapPin, ShoppingBag, User, Phone, Mail,
  MessageSquare, Gift, CreditCard, Truck, Trash2,
} from "lucide-react";
import type { ShopProduct } from "@/data/produk";
import { getCatalogProducts } from "@/lib/catalog";
import ShopLayout from "@/components/shop/ShopLayout";

type CartItem = { productId: string; quantity: number };
type RecipientType = "self" | "other";
type GiftCardType = "none" | "plain" | "special" | "luxury";
type PaymentMethod = "qris" | "va" | "bank";
type OrnamentKind = "flower" | "branch" | "bow" | "sparkle" | "butterfly" | "leaf" | "frame" | "sun" | "tulip" | "arch" | "star" | "wildflower" | "bird";
type Ornament = { id: string; kind: OrnamentKind; x: number; y: number; size: number; rotation: number };
type CheckoutData = {
  recipientType: RecipientType; name: string; phone: string; email: string;
  address: string; notes: string; giftCardType: GiftCardType;
  giftRecipient: string; giftSender: string; giftMessage: string;
  paymentMethod: PaymentMethod;
};

const CART_KEY = "nusantragift-cart";
const CHECKOUT_KEY = "nusantragift-checkout";
const ORDERS_KEY = "nusantragift-orders";
const MESSAGE_LIMIT = 200;
const giftCards = [
  { id: "plain" as const, name: "Polos", price: 0, description: "Minimalis, pilih putih atau hitam" },
  { id: "special" as const, name: "Spesial", price: 3000, description: "Ornamen pilihan yang bisa diatur" },
  { id: "luxury" as const, name: "Mewah", price: 7000, description: "Kreasi bebas dengan fitur premium" },
];
const specialOrnaments: { kind: OrnamentKind; label: string }[] = [
  { kind: "flower", label: "Bunga" },
  { kind: "branch", label: "Ranting" },
  { kind: "bow", label: "Pita" },
  { kind: "sparkle", label: "Kilau" },
  { kind: "leaf", label: "Daun" },
];
const luxuryOrnaments: { kind: OrnamentKind; label: string }[] = [
  ...specialOrnaments,
  { kind: "butterfly", label: "Kupu-kupu" },
  { kind: "frame", label: "Bingkai" },
  { kind: "sun", label: "Matahari" },
  { kind: "tulip", label: "Tulip" },
  { kind: "arch", label: "Lengkung" },
  { kind: "star", label: "Bintang" },
  { kind: "wildflower", label: "Wildflower" },
  { kind: "bird", label: "Burung Cendrawasih" },
];
const fonts = [
  { label: "Elegan", value: "Georgia, serif" },
  { label: "Modern", value: "Arial, sans-serif" },
  { label: "Klasik", value: "'Times New Roman', serif" },
  { label: "Playful", value: "'Trebuchet MS', sans-serif" },
];
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}
function parsePrice(price: string) { return Number(price.replace(/\D/g, "")) || 0; }
function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function getContrastText(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.52 ? "#FFFFFF" : "#24201C";
}
function OrnamentGraphic({ kind, className = "" }: { kind: OrnamentKind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={className} {...common}>
    {kind === "flower" && <><circle cx="32" cy="32" r="5"/><ellipse cx="32" cy="19" rx="6" ry="10"/><ellipse cx="32" cy="45" rx="6" ry="10"/><ellipse cx="19" cy="32" rx="10" ry="6"/><ellipse cx="45" cy="32" rx="10" ry="6"/><path d="M32 37v18m0-8c-7-7-12-5-13 0 6 4 10 4 13 0Z"/></>}
    {kind === "branch" && <><path d="M14 54C28 43 35 29 49 10M25 42c-9-1-13-7-12-13 8 0 13 4 14 11m8-13c-1-9 4-14 11-15 1 8-3 13-10 16m-3 13c8-4 14-2 18 4-6 5-13 4-18-2"/></>}
    {kind === "bow" && <><path d="M32 31C20 12 7 16 12 29c3 8 12 8 20 2m0 0c12-19 25-15 20-2-3 8-12 8-20 2Zm0 0-9 22 9-6 9 6-9-22Z"/><circle cx="32" cy="31" r="3"/></>}
    {kind === "sparkle" && <><path d="M32 7 36 25 54 32 36 36 32 57 27 36 10 32 27 25 32 7Z"/><path d="m51 8 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7M12 43l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5"/></>}
    {kind === "butterfly" && <><path d="M32 30C19 8 5 15 12 32c4 10 13 9 20 1m0-3C45 8 59 15 52 32c-4 10-13 9-20 1m0-1v21m-2-23-7-8m11 8 7-8"/><path d="M30 30c-4-7-10-7-13-2 2 7 7 9 13 7m4-5c4-7 10-7 13-2-2 7-7 9-13 7"/></>}
    {kind === "leaf" && <><path d="M12 51C13 24 28 10 53 11c0 25-13 40-41 40Z"/><path d="M15 49 46 18m-18 18-1-13m10 4 9 1m-19 18-1-10"/></>}
    {kind === "frame" && <><path d="M10 22V10h12m20 0h12v12M10 42v12h12m20 0h12V42"/><path d="M17 17h30v30H17z" strokeDasharray="2 4"/></>}
    {kind === "sun" && <><circle cx="32" cy="32" r="12"/><path d="M32 6v10m0 32v10M6 32h10m32 0h10M13.6 13.6l7 7m22.8 22.8 7 7m0-36.8-7 7M20.6 43.4l-7 7"/></>}
    {kind === "tulip" && <><path d="M32 32c-12-4-15-15-10-23 5 5 8 9 10 15 2-6 5-10 10-15 5 8 2 19-10 23Zm0 0v25m0-13c-8-8-15-6-18 0 7 6 13 6 18 0Zm0 5c8-8 15-6 18 0-7 6-13 6-18 0Z"/></>}
    {kind === "arch" && <><path d="M12 54V31a20 20 0 0 1 40 0v23M20 54V31a12 12 0 0 1 24 0v23"/><path d="M8 54h48"/></>}
    {kind === "star" && <><path d="m32 7 7 17 18 2-14 12 4 18-15-10-15 10 4-18L7 26l18-2 7-17Z"/></>}
    {kind === "wildflower" && <><path d="M32 55V27m0 15c-9-9-17-6-18 1 7 5 13 5 18-1Zm0-8c8-9 16-6 18 1-7 5-13 5-18-1Z"/><circle cx="32" cy="19" r="5"/><path d="M32 7v4m0 16v4M20 19h4m16 0h4m-20-8 3 3m10 10 3 3m0-16-3 3m-10 10-3 3"/></>}
    {kind === "bird" && <><path d="M9 39c9-2 15-8 19-17 5 7 11 10 19 9-5 5-10 8-17 9-5 1-10 1-15-1l-6 8 1-8Z"/><path d="M27 22c-2-8 3-13 9-14-1 7-3 11-9 14Zm-3 17c-2 6-7 10-13 12m21-12c7 2 13 0 19-5m-19 5c1 6 4 10 9 13"/><path d="M43 30c4-4 8-5 12-4-3 4-7 6-12 6"/></>}
  </svg>;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CheckoutData>({
    recipientType: "self", name: "", phone: "", email: "", address: "", notes: "",
    giftCardType: "none", giftRecipient: "", giftSender: "", giftMessage: "", paymentMethod: "qris",
  });
  const [cardColor, setCardColor] = useState("#FFFFFF");
  const [fontFamily, setFontFamily] = useState(fonts[0].value);
  const [fontColor, setFontColor] = useState("#34291F");
  const [ornaments, setOrnaments] = useState<Ornament[]>([]);
  const [selectedOrnament, setSelectedOrnament] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setCart(parsed.filter((item): item is CartItem =>
          typeof item?.productId === "string" && Number.isInteger(item?.quantity) && item.quantity > 0));
      }
    } catch (error) { console.error("Gagal membaca keranjang:", error); }
    finally { setIsLoaded(true); }
  }, []);

  useEffect(() => {
    let active = true;
    getCatalogProducts()
      .then((items) => { if (active) setProducts(items); })
      .catch((error) => console.error("Gagal memuat katalog checkout:", error))
      .finally(() => { if (active) setIsCatalogLoaded(true); });
    return () => { active = false; };
  }, []);

  const cartProducts = useMemo(() => cart.flatMap((cartItem) => {
    const product = products.find((item) => item.id === cartItem.productId);
    return product ? [{ ...product, quantity: cartItem.quantity, subtotal: parsePrice(product.price) * cartItem.quantity }] : [];
  }), [cart, products]);
  const totalItems = cartProducts.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartProducts.reduce((sum, item) => sum + item.subtotal, 0);
  const selectedGiftCard = giftCards.find((card) => card.id === form.giftCardType);
  const giftCardPrice = selectedGiftCard?.price ?? 0;
  const total = subtotal + giftCardPrice;
  const isLuxury = form.giftCardType === "luxury";
  const canUseOrnaments = form.giftCardType === "special" || isLuxury;
  const ornamentCatalog = isLuxury ? luxuryOrnaments : specialOrnaments;
  const selectedOrnamentData = ornaments.find((item) => item.id === selectedOrnament);

  function updateForm<K extends keyof CheckoutData>(field: K, value: CheckoutData[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function chooseGiftCard(type: GiftCardType) {
    updateForm("giftCardType", type);
    setOrnaments(type === "luxury" || type === "special" ? ornaments : []);
    setSelectedOrnament(null);
    if (type === "plain") { setFontFamily(fonts[0].value); setFontColor("#34291F"); }
  }
  function addOrnament(kind: OrnamentKind) {
    if (!canUseOrnaments) return;
    const limit = isLuxury ? 30 : 5;
    if (ornaments.length >= limit) return;
    const item = { id: makeId(), kind, x: 50, y: 50, size: 34, rotation: 0 };
    setOrnaments((current) => [...current, item]);
    setSelectedOrnament(item.id);
  }
  function updateOrnament(id: string, patch: Partial<Ornament>) {
    setOrnaments((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  function handleOrnamentPointerDown(event: PointerEvent<HTMLButtonElement>, item: Ornament) {
    const button = event.currentTarget;
    const board = button.parentElement;
    if (!board) return;
    button.setPointerCapture(event.pointerId);
    setSelectedOrnament(item.id);
    const move = (moveEvent: globalThis.PointerEvent) => {
      const rect = board.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(8, Math.min(92, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      updateOrnament(item.id, { x, y });
    };
    const up = () => {
      button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", up);
    };
    button.addEventListener("pointermove", move);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const giftCardDesign = form.giftCardType === "none" ? null : {
        background: cardColor,
        fontFamily: isLuxury ? fontFamily : fonts[0].value,
        fontColor: isLuxury ? fontColor : getContrastText(cardColor),
        ornaments: canUseOrnaments ? ornaments : [],
      };
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: cartProducts.map((item) => ({ productId: item.id, quantity: item.quantity })),
          giftCardDesign,
        }),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.push("/login?next=%2Fcheckout");
        return;
      }
      if (!response.ok) throw new Error(result.error || "Pesanan gagal dibuat.");

      const orderId = result.order.orderNumber as string;
      const checkoutData = {
        orderId,
        databaseOrderId: result.order.id,
        ...form,
        items: cartProducts.map(({ quantity, subtotal: itemSubtotal, ...product }) => ({
          productId: product.id, title: product.title, price: product.price, quantity, subtotal: itemSubtotal,
        })),
        subtotal: result.order.subtotal,
        giftCardPrice: result.order.giftCardFee,
        shippingCost: null,
        total: result.order.total,
        totalItems,
        paymentStatus: "PENDING",
        orderStatus: "WAITING_FOR_SHIPPING_QUOTE",
        paymentMode: "DUMMY",
        giftCardDesign,
        createdAt: new Date().toISOString(),
      };
      const existingOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      const orders = Array.isArray(existingOrders) ? existingOrders : [];
      orders.push(checkoutData);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutData));
      localStorage.removeItem(CART_KEY);
      router.push(`/checkout/payment/${orderId}`);
    } catch (error) {
      console.error("Gagal membuat pesanan:", error);
      alert(error instanceof Error ? error.message : "Pesanan belum berhasil dibuat. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoaded || !isCatalogLoaded) return <ShopLayout><div className="flex min-h-[70vh] items-center justify-center"><div className="text-center"><ShoppingBag className="mx-auto h-8 w-8 animate-pulse text-[#93372A]" /><p className="mt-3 text-sm text-[#777]">Memuat checkout...</p></div></div></ShopLayout>;
  if (cartProducts.length === 0) return <ShopLayout><section className="flex min-h-[65vh] flex-col items-center justify-center py-10 text-center"><div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#F0CDD5]/50"><ShoppingBag size={42} strokeWidth={1.4} className="text-[#93372A]" /></div><h1 className="text-2xl font-bold">Keranjangmu Kosong</h1><p className="mt-2 max-w-sm text-sm text-[#77716A]">Tambahkan kado pilihanmu terlebih dahulu sebelum melanjutkan checkout.</p><Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#76291F]">Jelajahi Kado <ArrowRight size={17} /></Link></section></ShopLayout>;

  const previewTextColor = isLuxury ? fontColor : getContrastText(cardColor);
  return (
    <ShopLayout>
      <header className="flex items-center gap-4 pb-7 pt-7">
        <Link href="/cart" aria-label="Kembali ke keranjang" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-[#F0E5D5]"><ArrowLeft size={19} /></Link>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">NusantaraGift</p><h1 className="text-2xl font-bold sm:text-3xl">Checkout</h1></div>
      </header>
      <div className="mb-8 flex items-center gap-3"><div className="flex items-center gap-2 text-[#93372A]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#93372A] text-sm font-bold text-white">1</span><span className="text-sm font-semibold">Checkout</span></div><div className="h-px flex-1 bg-[#D9C9AF]" /><div className="flex items-center gap-2 text-[#A99B89]"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D9C9AF] text-sm font-semibold">2</span><span className="text-sm">Pembayaran</span></div></div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-7 pb-10 lg:grid-cols-[1fr_350px]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50"><Gift className="text-[#93372A]" size={20} /></div><div><h2 className="text-lg font-bold">Kado ini untuk siapa?</h2><p className="text-xs text-[#77716A]">Tentukan tujuan pengiriman kadomu.</p></div></div>
            <div className="grid grid-cols-2 gap-3">
              {(["self", "other"] as const).map((type) => <button key={type} type="button" onClick={() => updateForm("recipientType", type)} className={`rounded-xl border p-4 text-left transition ${form.recipientType === type ? "border-[#93372A] bg-[#FFF5F0]" : "border-[#E9DFCE] hover:bg-[#FFFCF7]"}`}><div className="mb-3 text-[#93372A]">{type === "self" ? <User size={22} /> : <Gift size={22} />}</div><p className="text-sm font-bold">{type === "self" ? "Untuk diri sendiri" : "Untuk orang lain"}</p><p className="mt-1 text-xs text-[#77716A]">{type === "self" ? "Aku menerima kado ini." : "Aku mengirim kado untuk seseorang."}</p></button>)}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50"><MapPin className="text-[#93372A]" size={20} /></div><div><h2 className="text-lg font-bold">Informasi Penerima</h2><p className="text-xs text-[#77716A]">Lengkapi data untuk pengiriman kado.</p></div></div>
            <div className="space-y-5">
              <div><label htmlFor="name" className="mb-2 block text-sm font-semibold">Nama {form.recipientType === "self" ? "Lengkap" : "Penerima"}</label><div className="relative"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A99B89]" /><input id="name" required autoComplete="name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Masukkan nama penerima" className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#93372A]" /></div></div>
              <div><label htmlFor="phone" className="mb-2 block text-sm font-semibold">Nomor WhatsApp Penerima</label><div className="relative"><Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A99B89]" /><input id="phone" type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="Contoh: 081234567890" className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#93372A]" /></div></div>
              <div><label htmlFor="address" className="mb-2 block text-sm font-semibold">Alamat Lengkap Pengiriman</label><textarea id="address" required rows={4} autoComplete="street-address" value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Nama jalan, nomor rumah, desa/kelurahan, kecamatan, kota, dan kode pos..." className="w-full resize-none rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-4 py-3 text-sm outline-none focus:border-[#93372A]" /></div>
              <div><label htmlFor="notes" className="mb-2 block text-sm font-semibold">Catatan Tambahan <span className="ml-2 font-normal text-[#A99B89]">(Opsional)</span></label><div className="relative"><MessageSquare size={18} className="absolute left-4 top-4 text-[#A99B89]" /><textarea id="notes" rows={3} value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Catatan untuk pesananmu..." className="w-full resize-none rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#93372A]" /></div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50"><Gift className="text-[#93372A]" size={20} /></div><div><h2 className="text-lg font-bold">Gift Card</h2><p className="text-xs text-[#77716A]">Kartu ucapan fisik yang disertakan bersama kado.</p></div></div>
            <p className="mb-3 text-sm font-semibold">Pilih paket desain Gift Card</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {giftCards.map((card) => <button key={card.id} type="button" onClick={() => chooseGiftCard(card.id)} className={`rounded-xl border p-3 text-left transition ${form.giftCardType === card.id ? "border-[#93372A] bg-[#FFF5F0] ring-1 ring-[#93372A]" : "border-[#E9DFCE] hover:bg-[#FFFCF7]"}`}>
                <div className={`mb-3 flex aspect-[1.65/1] items-center justify-center rounded-lg p-3 text-center ${card.id === "plain" ? "bg-white text-[#34291F] border border-gray-200" : card.id === "special" ? "bg-[#93372A] text-white" : "bg-[#002140] text-[#E3AD3E]"}`}><div><p className="text-[9px] uppercase tracking-[0.2em]">NusantaraGift</p><p className="mt-2 font-serif text-sm">A little gift for you</p>{card.id !== "plain" && <span className="mt-2 flex justify-center"><OrnamentGraphic kind="flower" className="h-5 w-5" /></span>}</div></div>
                <p className="text-sm font-bold">{card.name}</p><p className="mt-1 text-xs text-[#77716A]">{card.description}</p><p className="mt-2 text-sm font-semibold text-[#93372A]">{card.price === 0 ? "Gratis" : formatRupiah(card.price)}</p>
              </button>)}
            </div>

            {form.giftCardType !== "none" && <div className="mt-6 space-y-5 border-t border-[#E9DFCE] pt-5">
              <div><h3 className="font-bold">Personalisasi kartu ucapan</h3><p className="mt-1 text-xs text-[#77716A]">Buat kartu ucapan yang spesial untuk penerimamu.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="giftRecipient" className="mb-2 block text-sm font-semibold">Nama penerima pada kartu</label><input id="giftRecipient" required value={form.giftRecipient} onChange={(e) => updateForm("giftRecipient", e.target.value)} placeholder="Untuk siapa kartu ini?" className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-4 py-3 text-sm outline-none focus:border-[#93372A]" /></div>
                <div><label htmlFor="giftSender" className="mb-2 block text-sm font-semibold">Nama pengirim</label><input id="giftSender" required value={form.giftSender} onChange={(e) => updateForm("giftSender", e.target.value)} placeholder="Dari siapa?" className="w-full rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-4 py-3 text-sm outline-none focus:border-[#93372A]" /></div>
              </div>
              <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="giftMessage" className="text-sm font-semibold">Pesan personal</label><span className="text-xs text-[#A99B89]">{form.giftMessage.length}/{MESSAGE_LIMIT}</span></div><textarea id="giftMessage" required rows={3} maxLength={MESSAGE_LIMIT} value={form.giftMessage} onChange={(e) => updateForm("giftMessage", e.target.value)} placeholder="Tuliskan pesan spesial untuk penerima..." className="w-full resize-none rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-4 py-3 text-sm outline-none focus:border-[#93372A]" /></div>

              <div className="rounded-2xl bg-[#FAF6EF] p-4">
                <div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-bold">Editor Gift Card</p><span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#93372A]">{selectedGiftCard?.name} · {giftCardPrice === 0 ? "Gratis" : formatRupiah(giftCardPrice)}</span></div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="w-full text-xs font-semibold text-[#776650]">Warna kartu</span>
                  {[{ color: "#FFFFFF", label: "Putih" }, { color: "#171717", label: "Hitam" }, ...(form.giftCardType === "plain" ? [] : [{ color: "#F4EBD9", label: "Krem" }, { color: "#93372A", label: "Merah" }, { color: "#002140", label: "Navy" }, ...(isLuxury ? [{ color: "#F0CDD5", label: "Pink" }, { color: "#E3AD3E", label: "Emas" }, { color: "#E8EFE3", label: "Sage" }] : [])])].map((item) => <button key={item.color} type="button" onClick={() => { setCardColor(item.color); }} aria-label={`Pilih warna ${item.label}`} className={`flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs ${cardColor === item.color ? "border-[#93372A] ring-1 ring-[#93372A]" : "border-[#E9DFCE]"}`}><span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: item.color }} />{item.label}</button>)}
                </div>
                {isLuxury && <div className="mb-4 grid gap-3 sm:grid-cols-2"><div><label htmlFor="fontFamily" className="mb-1 block text-xs font-semibold">Jenis font</label><select id="fontFamily" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full rounded-lg border border-[#E9DFCE] bg-white px-3 py-2 text-sm">{fonts.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</select></div><div><label htmlFor="fontColor" className="mb-1 block text-xs font-semibold">Warna tulisan</label><div className="flex items-center gap-2 rounded-lg border border-[#E9DFCE] bg-white px-3 py-1.5"><input id="fontColor" type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="h-7 w-9 cursor-pointer border-0 bg-transparent" /><span className="text-xs text-[#776650]">{fontColor.toUpperCase()}</span></div></div></div>}
                {canUseOrnaments && <div className="mb-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold">Pilih ornamen</p><span className="text-[11px] text-[#A99B89]">{ornaments.length}/{isLuxury ? 30 : 5} digunakan</span></div><div className="flex flex-wrap gap-2">{ornamentCatalog.map((ornament) => <button key={ornament.kind} type="button" onClick={() => addOrnament(ornament.kind)} className="group flex min-w-[76px] flex-col items-center gap-1.5 rounded-xl border border-[#E9DFCE] bg-white px-2 py-3 text-[#8A6B4B] transition hover:border-[#93372A] hover:bg-[#FFF9F2]" aria-label={`Tambah ornamen ${ornament.label}`}><OrnamentGraphic kind={ornament.kind} className="h-8 w-8 transition group-hover:scale-110"/><span className="text-[10px] text-[#776650]">{ornament.label}</span></button>)}</div><p className="mt-2 text-[11px] text-[#8A7B69]">Ketuk ornamen untuk menambahkan, lalu seret langsung di kartu untuk mengatur posisinya.</p></div>}
                <div className="relative mx-auto min-h-[230px] w-full max-w-md overflow-hidden rounded-2xl border border-black/5 p-6 shadow-md touch-none" style={{ backgroundColor: cardColor, color: previewTextColor }}>
                  <div className="pointer-events-none relative z-10 flex h-full min-h-[182px] flex-col justify-between" style={{ fontFamily: isLuxury ? fontFamily : fonts[0].value }}>
                    <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.25em]">NusantaraGift</span><Gift size={19} /></div>
                    <div className="py-5"><p className="text-xl">Untuk {form.giftRecipient || "Seseorang Spesial"}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{form.giftMessage || "Pesan spesialmu akan tampil di sini..."}</p></div>
                    <div className="text-right"><p className="text-xs opacity-75">Dengan kasih,</p><p className="mt-1 text-sm font-semibold">{form.giftSender || "Nama Pengirim"}</p></div>
                  </div>
                  {ornaments.map((item) => <button key={item.id} type="button" onPointerDown={(event) => handleOrnamentPointerDown(event, item)} onClick={() => setSelectedOrnament(item.id)} aria-label="Geser ornamen" className={`absolute z-20 cursor-grab select-none rounded-md bg-transparent p-0 leading-none active:cursor-grabbing ${selectedOrnament === item.id ? "ring-2 ring-[#E3AD3E] ring-offset-2" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.size}px`, height: `${item.size}px`, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`, touchAction: "none" }}><OrnamentGraphic kind={item.kind} className="h-full w-full" /></button>)}
                </div>
                {selectedOrnamentData && canUseOrnaments && <div className="mt-3 rounded-xl border border-[#E9DFCE] bg-white p-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold">Atur ornamen terpilih</p><button type="button" onClick={() => { setOrnaments((current) => current.filter((item) => item.id !== selectedOrnamentData.id)); setSelectedOrnament(null); }} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 size={14} /> Hapus</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Ukuran <input type="range" min="16" max="64" value={selectedOrnamentData.size} onChange={(e) => updateOrnament(selectedOrnamentData.id, { size: Number(e.target.value) })} className="mt-2 block w-full accent-[#93372A]" /></label><label className="text-xs">Rotasi <input type="range" min="-180" max="180" value={selectedOrnamentData.rotation} onChange={(e) => updateOrnament(selectedOrnamentData.id, { rotation: Number(e.target.value) })} className="mt-2 block w-full accent-[#93372A]" /></label></div></div>}
                {form.giftCardType === "plain" && <p className="mt-3 text-xs text-[#77716A]">Paket Polos hanya menyediakan warna putih atau hitam tanpa ornamen.</p>}
                {form.giftCardType === "special" && <p className="mt-3 text-xs text-[#77716A]">Paket Spesial menyediakan ornamen terbatas. Font dan warna tulisan menggunakan gaya bawaan.</p>}
                {isLuxury && <p className="mt-3 text-xs text-[#77716A]">Paket Mewah membuka seluruh ornamen, pilihan font, dan warna tulisan.</p>}
              </div>
              <p className="text-xs leading-relaxed text-[#77716A]">Preview merupakan gambaran desain kartu. Gift Card akan dicetak dan dimasukkan ke dalam paket kado.</p>
            </div>}
          </div>

          <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50"><CreditCard className="text-[#93372A]" size={20} /></div><div><h2 className="text-lg font-bold">Metode Pembayaran</h2><p className="text-xs text-[#77716A]">Pilih metode pembayaran yang kamu inginkan.</p></div></div>
            <div className="space-y-3">{[{ id: "qris", title: "QRIS", detail: "Pembayaran melalui aplikasi e-wallet atau mobile banking" }, { id: "va", title: "Virtual Account", detail: "Pembayaran melalui nomor Virtual Account" }, { id: "bank", title: "Transfer Bank", detail: "Transfer melalui rekening bank" }].map((method) => <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${form.paymentMethod === method.id ? "border-[#93372A] bg-[#FFF5F0]" : "border-[#E9DFCE]"}`}><input type="radio" name="paymentMethod" value={method.id} checked={form.paymentMethod === method.id} onChange={() => updateForm("paymentMethod", method.id as PaymentMethod)} className="mt-1 accent-[#93372A]" /><div><p className="text-sm font-bold">{method.title}</p><p className="mt-1 text-xs text-[#77716A]">{method.detail}</p></div></label>)}</div>
            <p className="mt-4 rounded-xl bg-[#FFF9EE] p-3 text-xs leading-relaxed text-[#776650]">Pembayaran ini masih simulasi untuk MVP. Tidak ada uang sungguhan yang ditransaksikan dan belum terhubung ke Midtrans.</p>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-bold">Ringkasan Pesanan</h2><p className="mt-1 text-xs text-[#77716A]">{totalItems} produk dalam keranjangmu</p>
          <div className="mt-5 space-y-4">{cartProducts.map((item) => <div key={item.id} className="flex gap-3"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl" style={{ backgroundColor: item.cardColor || "#E6DBBC" }}>{item.image && <Image src={item.image} alt={item.imageAlt || item.title} fill sizes="64px" className="object-contain p-2" />}</div><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-[#77716A]">{item.quantity} × {item.price}</p><span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#77716A]"><Truck size={12} /> Produk fisik</span></div><p className="shrink-0 text-sm font-bold text-[#93372A]">{formatRupiah(item.subtotal)}</p></div>)}</div>
          <div className="my-5 border-t border-dashed border-[#D9C9AF]" /><div className="flex justify-between text-sm text-[#77716A]"><span>Subtotal produk</span><span className="font-semibold text-[#34291F]">{formatRupiah(subtotal)}</span></div>
          <div className="mt-3 flex justify-between text-sm text-[#77716A]"><span>Gift Card</span><span className="font-semibold text-[#34291F]">{form.giftCardType === "none" ? "Tidak dipilih" : giftCardPrice === 0 ? "Gratis" : formatRupiah(giftCardPrice)}</span></div>
          {hasPhysical && <div className="mt-3 flex justify-between text-sm text-[#77716A]"><span>Ongkos kirim</span><span className="font-semibold text-[#34291F]">Dihitung berikutnya</span></div>}
          <div className="my-5 border-t border-dashed border-[#D9C9AF]" /><div className="flex items-center justify-between gap-3"><span className="font-semibold">Total sementara</span><span className="text-xl font-bold text-[#93372A]">{formatRupiah(total)}</span></div><p className="mt-2 text-[11px] leading-relaxed text-[#A99B89]">Total belum termasuk ongkos kirim.</p>
          <button type="submit" disabled={isSubmitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#76291F]">{isSubmitting ? "Membuat Pesanan..." : "Lanjut ke Pembayaran"} <ArrowRight size={17} /></button>
          <Link href="/cart" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[#93372A] transition hover:underline"><ArrowLeft size={15} /> Kembali ke Keranjang</Link>
        </aside>
      </form>
    </ShopLayout>
  );
}
