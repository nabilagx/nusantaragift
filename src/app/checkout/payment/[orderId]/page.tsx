"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Copy, CreditCard, QrCode, ShieldCheck, XCircle } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";
import { QRCodeSVG } from "qrcode.react";

type PaymentMethod = "qris" | "va" | "bank";
type DummyOrder = {
  orderId: string;
  name: string;
  paymentMethod: PaymentMethod;
  total: number;
  paymentStatus: "PENDING" | "PAID" | "CANCELLED";
  orderStatus: string;
  createdAt: string;
  items: { productId: string; title: string; price: string; quantity: number; subtotal: number }[];
};

const ORDERS_KEY = "nusantragift-orders";
const CHECKOUT_KEY = "nusantragift-checkout";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function DummyPaymentPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [order, setOrder] = useState<DummyOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders: DummyOrder[] = raw ? JSON.parse(raw) : [];
      const found = Array.isArray(orders) ? orders.find((item) => item.orderId === orderId) : null;
      setOrder(found || null);
    } catch (error) {
      console.error("Gagal membaca pesanan:", error);
      setOrder(null);
    } finally {
      setLoaded(true);
    }
  }, [orderId]);

  function updateOrderStatus(status: "PAID" | "CANCELLED") {
    if (!order) return;
    const updated: DummyOrder = {
      ...order,
      paymentStatus: status,
      orderStatus: status === "PAID" ? "PAID" : "CANCELLED",
    };
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      const orders: DummyOrder[] = raw ? JSON.parse(raw) : [];
      const nextOrders = (Array.isArray(orders) ? orders : []).map((item) => item.orderId === orderId ? updated : item);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(nextOrders));
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(updated));
      setOrder(updated);
    } catch (error) {
      console.error("Gagal memperbarui status simulasi:", error);
      alert("Status simulasi gagal diperbarui. Coba lagi.");
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
          <div className="flex items-center justify-between gap-3"><span className="text-sm text-[#77716A]">Total pembayaran (belum termasuk ongkir)</span><strong className="text-xl text-[#93372A]">{formatRupiah(order.total)}</strong></div>
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
              <button type="button" onClick={() => updateOrderStatus("PAID")} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#76291F]"><CheckCircle2 size={17}/> Simulasikan Pembayaran Berhasil</button>
              <button type="button" onClick={() => updateOrderStatus("CANCELLED")} className="mt-3 w-full rounded-full border border-[#E9DFCE] px-5 py-3 text-sm font-semibold text-[#77716A] transition hover:bg-[#FFFCF7]">Simulasikan Pembatalan</button>
            </div>
          </>
        )}

        <div className="rounded-xl bg-[#F5F0E7] p-4 text-xs leading-relaxed text-[#776650]">MVP saat ini menyimpan pesanan di <code>localStorage</code>. Pada tahap integrasi berikutnya, penyimpanan ini dapat dipindahkan ke Supabase dan status pembayaran dummy diganti dengan status dari backend.</div>
      </div>
    </ShopLayout>
  );
}
