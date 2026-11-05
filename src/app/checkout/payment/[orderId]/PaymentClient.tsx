"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Copy, CreditCard, QrCode, ShieldCheck, XCircle } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";
import { QRCodeSVG } from "qrcode.react";

type PaymentMethod = "qris" | "va" | "bank";
type DummyOrder = {
  orderId: string;
  name: string;
  paymentMethod: PaymentMethod;
  total: number;
  shippingCost: number;
  shippingQuoteStatus: "pending" | "quoted";
  paymentStatus: "PENDING" | "PAID" | "CANCELLED";
  orderStatus: string;
  createdAt: string;
  items: { productId: string; title: string; price: number | string; quantity: number; subtotal: number }[];
};


function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function DummyPaymentPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<DummyOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refreshOrder() {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Pesanan tidak ditemukan.");
    setOrder(result.order as DummyOrder);
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Pesanan tidak ditemukan.");
        if (active) setOrder(result.order as DummyOrder);
      })
      .catch((error) => {
        console.error("Gagal mengambil pesanan:", error);
        if (active) setOrder(null);
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [orderId]);

  async function updateOrderStatus(status: "PAID" | "CANCELLED") {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/demo-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Status simulasi gagal diperbarui.");
      await refreshOrder();
    } catch (error) {
      console.error("Gagal memperbarui status simulasi:", error);
      alert(error instanceof Error ? error.message : "Status simulasi gagal diperbarui.");
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      alert(`Salin nomor ini: ${value}`);
    }
  }

  if (!loaded) return <ShopLayout><div className="flex min-h-[65vh] items-center justify-center text-sm text-[#77716A]">Memuat detail pembayaran...</div></ShopLayout>;
  if (!order) return <ShopLayout><section className="flex min-h-[65vh] flex-col items-center justify-center text-center"><XCircle size={42} className="text-[#93372A]"/><h1 className="mt-4 text-2xl font-bold">Pesanan tidak ditemukan</h1><p className="mt-2 text-sm text-[#77716A]">Data pesanan ini tidak tersedia di perangkat ini.</p><Link href="/shop" className="mt-6 rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Kembali ke Toko</Link></section></ShopLayout>;

  const isPaid = order.paymentStatus === "PAID";
  const isCancelled = order.paymentStatus === "CANCELLED";
  const waitingShipping = order.shippingQuoteStatus !== "quoted";
  const vaNumber = `8808${order.orderId.replace(/\D/g, "").padStart(10, "0").slice(-10)}`;

  return (
    <ShopLayout>
      <header className="flex items-center gap-4 pb-7 pt-7">
        <Link href="/shop" aria-label="Kembali ke toko" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><ArrowLeft size={19}/></Link>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">NusantaraGift</p><h1 className="text-2xl font-bold sm:text-3xl">Pembayaran</h1></div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 pb-12">
        <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-[#77716A]">Nomor pesanan</p><p className="mt-1 text-lg font-bold tracking-wide">{order.orderId}</p></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${isPaid ? "bg-green-100 text-green-800" : isCancelled ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{isPaid ? "PAID · SIMULASI" : isCancelled ? "CANCELLED · SIMULASI" : "MENUNGGU PEMBAYARAN"}</span>
          </div>
          <div className="my-5 border-t border-dashed border-[#D9C9AF]"/>
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-[#77716A]">Ongkos kirim</span><strong className="text-sm">{waitingShipping ? "Menunggu admin" : formatRupiah(order.shippingCost)}</strong></div>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-[#77716A]">Total pembayaran</span><strong className="text-xl text-[#93372A]">{formatRupiah(order.total)}</strong></div>
          <p className="mt-2 text-xs text-[#A99B89]">Dibuat {new Date(order.createdAt).toLocaleString("id-ID")}</p>
        </div>

        {isPaid ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-700"/>
            <h2 className="mt-3 text-xl font-bold text-green-900">Pembayaran berhasil disimulasikan!</h2>
            <p className="mt-2 text-sm leading-relaxed text-green-800">Status pesanan dummy kamu sekarang <strong>PAID</strong>. Tidak ada uang sungguhan yang dipindahkan.</p>
            <Link href="/shop" className="mt-5 inline-flex rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Kembali ke Toko</Link>
          </div>
        ) : isCancelled ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><XCircle className="mx-auto h-12 w-12 text-red-700"/><h2 className="mt-3 text-xl font-bold text-red-900">Pesanan dibatalkan</h2><p className="mt-2 text-sm text-red-800">Ini hanya perubahan status simulasi.</p><Link href="/shop" className="mt-5 inline-flex rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Kembali ke Toko</Link></div>
        ) : waitingShipping ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <Clock3 className="mx-auto h-12 w-12 text-amber-700" />
            <h2 className="mt-3 text-xl font-bold text-amber-950">Menunggu penetapan ongkir</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">Pesananmu sudah tersimpan. Admin akan memeriksa alamat dan menetapkan ongkos kirim. Tombol pembayaran simulasi akan aktif setelah total akhir tersedia.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" onClick={() => void refreshOrder().catch((error) => alert(error instanceof Error ? error.message : "Gagal memuat status pesanan."))} className="rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Periksa pembaruan</button>
              <button type="button" onClick={() => void updateOrderStatus("CANCELLED")} className="rounded-full border border-[#D9C9AF] px-6 py-3 text-sm font-semibold text-[#806A4E]">Batalkan pesanan</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50 text-[#93372A]">{order.paymentMethod === "qris" ? <QrCode size={21}/> : <CreditCard size={21}/>}</div><div><h2 className="font-bold">{order.paymentMethod === "qris" ? "QRIS" : order.paymentMethod === "va" ? "Virtual Account" : "Transfer Bank"}</h2><p className="text-xs text-[#77716A]">Instruksi pembayaran simulasi</p></div></div>
              {order.paymentMethod === "qris" ? (
                <div className="mx-auto flex max-w-xs flex-col items-center rounded-2xl border-2 border-dashed border-[#D9C9AF] bg-[#FFFCF7] p-6 text-center"><div className="flex h-52 w-52 items-center justify-center rounded-xl bg-white p-2"><QRCodeSVG value={`NUSANTARAGIFT-DEMO|${order.orderId}|${order.total}`} size={184} level="H" includeMargin /></div><p className="mt-4 text-sm font-bold tracking-widest">QR PESANAN DEMO</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-[#77716A]">QR ini benar-benar dapat dipindai untuk membaca ID dan total pesanan demo, tetapi bukan QRIS dan tidak dapat digunakan untuk membayar.</p></div>
              ) : (
                <div className="rounded-xl bg-[#FAF6EF] p-4"><p className="text-xs text-[#77716A]">{order.paymentMethod === "va" ? "Nomor Virtual Account dummy" : "Nomor rekening dummy"}</p><div className="mt-2 flex items-center justify-between gap-2"><p className="break-all text-lg font-bold tracking-wider">{vaNumber}</p><button type="button" onClick={() => copyValue(vaNumber)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#E9DFCE] bg-white px-3 py-2 text-xs font-semibold"><Copy size={14}/>{copied ? "Tersalin" : "Salin"}</button></div><p className="mt-2 text-xs text-[#77716A]">Nomor ini hanya contoh untuk pengujian antarmuka.</p></div>
              )}
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF9EE] p-3 text-xs leading-relaxed text-[#776650]"><ShieldCheck size={16} className="mt-0.5 shrink-0"/>Mode demo aktif. QR hanya memuat informasi pesanan, bukan instruksi pembayaran. Tidak ada transaksi nyata atau koneksi payment gateway.</div>
            </div>

            <div className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-2 text-sm font-semibold"><Clock3 size={17} className="text-[#93372A]"/>Simulasi status pembayaran</div>
              <p className="mt-2 text-sm leading-relaxed text-[#77716A]">Gunakan tombol di bawah untuk menguji alur setelah pelanggan menyelesaikan pembayaran. Tombol ini hanya mengubah data demo di browser.</p>
              <button type="button" onClick={() => void updateOrderStatus("PAID")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#76291F]"><CheckCircle2 size={17}/> Simulasikan Pembayaran Berhasil</button>
              <button type="button" onClick={() => void updateOrderStatus("CANCELLED")} className="mt-3 w-full rounded-full border border-[#E9DFCE] px-5 py-3 text-sm font-semibold text-[#77716A] transition hover:bg-[#FFFCF7]">Simulasikan Pembatalan</button>
            </div>
          </>
        )}

        <div className="rounded-xl bg-[#F5F0E7] p-4 text-xs leading-relaxed text-[#776650]">Pesanan dan status pembayaran simulasi tersimpan di Supabase. Pembayaran hanya dapat disimulasikan setelah admin menetapkan ongkos kirim. QR/VA pada halaman ini tetap contoh dan tidak memindahkan uang sungguhan.</div>
      </div>
    </ShopLayout>
  );
}
