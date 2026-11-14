"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, ExternalLink, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";
import DigitalGiftCardDownload from "@/components/shop/DigitalGiftCardDownload";

type Order = {
  orderId: string; total: number; shippingCost: number;
  shippingQuoteStatus: "pending" | "quoted";
  paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  createdAt: string; name?: string; email?: string; fulfillmentType?: "physical" | "digital" | "mixed";
  giftCardDesign?: Record<string, unknown> | null;
  digitalGiftAccess?: { token: string; expiresAt: string } | null;
};
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}
export default function PaymentClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const refreshOrder = useCallback(async () => {
    setChecking(true);
    try {
      await fetch("/api/orders/" + encodeURIComponent(orderId) + "/refresh-payment", { method: "POST", cache: "no-store" }).catch(() => null);
      const response = await fetch("/api/orders/" + encodeURIComponent(orderId), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pesanan tidak ditemukan.");
      setOrder(result.order as Order);
      setError("");
      return result.order as Order;
    } finally { setChecking(false); }
  }, [orderId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await fetch("/api/orders/" + encodeURIComponent(orderId) + "/refresh-payment", { method: "POST", cache: "no-store" }).catch(() => null);
        const response = await fetch("/api/orders/" + encodeURIComponent(orderId), { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Pesanan tidak ditemukan.");
        if (active) setOrder(result.order as Order);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Pesanan tidak ditemukan.");
      } finally { if (active) setLoaded(true); }
    };
    void load();
    const poll = window.setInterval(() => { if (active) void load(); }, 3000);
    return () => { active = false; window.clearInterval(poll); };
  }, [orderId]);

  function downloadOrderPdf() {
    const printWindow = window.open("", "_blank", "width=760,height=850");
    if (!printWindow) { setError("Izinkan pop-up browser untuk menyimpan PDF."); return; }
    const safe = (value: string) => value.replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
    printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Bukti Pesanan ${safe(order?.orderId ?? "")}</title><style>body{font:14px Arial,sans-serif;color:#34291f;padding:36px;max-width:680px;margin:auto}h1{font-size:24px;color:#431714}small{color:#806a4e}.panel{border:1px solid #ddd;border-radius:12px;padding:18px;margin:18px 0}.row{display:flex;justify-content:space-between;gap:20px;padding:8px 0;border-bottom:1px solid #eee}.total{font-size:20px;font-weight:bold;color:#93372a;text-align:right;margin-top:20px}.note{background:#f7f1e3;padding:14px;border-radius:10px;font-size:12px;line-height:1.7}@media print{button{display:none}}</style></head><body><h1>NUSANTARAGIFT</h1><small>BUKTI PESANAN DIGITAL · KADO CERITA</small><div class="panel"><div class="row"><span>Nomor pesanan</span><b>${safe(order?.orderId ?? "")}</b></div><div class="row"><span>Status pembayaran</span><b>LUNAS</b></div><div class="row"><span>Status pesanan</span><b>SELESAI OTOMATIS</b></div><div class="row"><span>Email penerima</span><b>${safe(order?.email ?? "-")}</b></div><div class="row"><span>Tanggal transaksi</span><b>${safe(new Date(order?.createdAt ?? Date.now()).toLocaleString("id-ID"))}</b></div></div><div class="total">Total: ${formatRupiah(order?.total ?? 0)}</div><div class="note">Pesanan ini merupakan produk digital Kado Cerita. Tidak memerlukan alamat, ongkos kirim, atau resi. Gift Card PNG memuat QR privat yang hanya dapat diakses oleh akun email penerima dan berlaku selama tujuh hari sejak pembayaran terverifikasi.</div><p style="margin-top:28px;color:#806a4e;font-size:11px">Simpan dokumen ini sebagai PDF melalui pilihan printer browser.</p><script>window.onload=()=>window.print()<\\/script></body></html>`);
    printWindow.document.close();
  }

  async function startPayment() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/checkout/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal memulai pembayaran.");
      const paymentUrl = result.payment?.paymentUrl;
      if (typeof paymentUrl !== "string" || !paymentUrl.startsWith("https://app.")) throw new Error("Tautan pembayaran Midtrans tidak valid.");
      window.location.assign(paymentUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memulai pembayaran.");
      setBusy(false);
    }
  }

  if (!loaded) return <ShopLayout><div className="flex min-h-[65vh] items-center justify-center gap-3 text-sm text-[#77716A]"><LoaderCircle className="animate-spin" size={20}/>Memuat detail pesanan...</div></ShopLayout>;
  if (!order) return <ShopLayout><section className="flex min-h-[65vh] flex-col items-center justify-center text-center"><XCircle size={42} className="text-[#93372A]"/><h1 className="mt-4 text-2xl font-bold">Pesanan tidak ditemukan</h1><p className="mt-2 text-sm text-[#77716A]">{error || "Data pesanan tidak tersedia."}</p><Link href="/shop" className="mt-6 rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Kembali ke Toko</Link></section></ShopLayout>;

  const isPaid = order.paymentStatus === "PAID";
  const isCancelled = order.paymentStatus === "CANCELLED" || order.paymentStatus === "EXPIRED";
  const waitingShipping = order.shippingQuoteStatus !== "quoted";
  const orderUrl = "https://nusantaragift.vercel.app/track-order?order=" + encodeURIComponent(order.orderId);
  return (
    <ShopLayout>
      <header className="flex items-center gap-4 pb-7 pt-7">
        <Link href="/shop" aria-label="Kembali ke toko" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><ArrowLeft size={19}/></Link>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">NusantaraGift</p><h1 className="text-2xl font-bold sm:text-3xl">Pembayaran</h1></div>
      </header>
      <div className="mx-auto max-w-2xl space-y-5 pb-12">
        <section className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#77716A]">Nomor pesanan</p><p className="mt-1 text-lg font-bold tracking-wide">{order.orderId}</p></div>
          <span className={"rounded-full px-3 py-1.5 text-xs font-bold " + (isPaid ? "bg-green-100 text-green-800" : isCancelled ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800")}>{isPaid ? "LUNAS" : order.paymentStatus === "EXPIRED" ? "KEDALUWARSA" : isCancelled ? "GAGAL / DIBATALKAN" : "MENUNGGU PEMBAYARAN"}</span></div>
          <div className="my-5 border-t border-dashed border-[#D9C9AF]"/>
          {order.fulfillmentType !== "digital" && <div className="flex items-center justify-between gap-3"><span className="text-sm text-[#77716A]">Ongkos kirim</span><strong className="text-sm">{waitingShipping ? "Menunggu admin" : formatRupiah(order.shippingCost)}</strong></div>}
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-[#77716A]">Total pembayaran</span><strong className="text-xl text-[#93372A]">{formatRupiah(order.total)}</strong></div>
          <p className="mt-2 text-xs text-[#A99B89]">Dibuat {new Date(order.createdAt).toLocaleString("id-ID")}</p>
        </section>
        {isPaid ? <section className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-700"/><h2 className="mt-3 text-xl font-bold text-green-900">Pembayaran berhasil!</h2>
          <p className="mt-2 text-sm text-green-800">Midtrans telah mengonfirmasi pembayaran. Pesananmu sekarang tercatat lunas.</p>
          {order.fulfillmentType !== "digital" && <div className="mx-auto mt-5 inline-flex rounded-2xl border border-green-200 bg-white p-4"><QRCodeSVG value={orderUrl} size={190} level="H" includeMargin/></div>}
          <p className="mt-3 text-xs font-semibold text-green-900">QR Code pesanan · {order.orderId}</p>
          {order.fulfillmentType === "digital" ? <><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-green-800">Pembayaran Kado Cerita berhasil. Pesanan digital otomatis selesai tanpa ongkir atau resi.</p>{order.digitalGiftAccess ? <DigitalGiftCardDownload token={order.digitalGiftAccess.token} orderNumber={order.orderId} expiresAt={order.digitalGiftAccess.expiresAt} design={order.giftCardDesign ?? null}/> : <p className="mt-4 text-xs text-amber-800">QR Gift Card sedang disiapkan. Muat ulang halaman beberapa saat lagi.</p>}<button type="button" onClick={downloadOrderPdf} className="mt-3 w-full rounded-full border border-[#D8C7AB] px-5 py-3 text-xs font-bold text-[#79552F]">Unduh bukti pesanan PDF</button></> : <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-green-800">Tunjukkan QR ini kepada mitra UMKM jika diperlukan. QR hanya membuka detail pesanan; status lunas tetap berasal dari konfirmasi Midtrans.</p>}
          {order.fulfillmentType !== "digital" && <Link href={"/track-order?order=" + encodeURIComponent(order.orderId)} className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">Lihat pesanan Anda</Link>}
        </section>
        : isCancelled ? <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><XCircle className="mx-auto h-12 w-12 text-red-700"/><h2 className="mt-3 text-xl font-bold text-red-900">Pembayaran tidak berhasil</h2><p className="mt-2 text-sm text-red-800">Pesanan dibatalkan atau sesi pembayaran kedaluwarsa. Silakan buat pesanan baru.</p></section>
        : waitingShipping && order.fulfillmentType !== "digital" ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><Clock3 className="mx-auto h-12 w-12 text-amber-700"/><h2 className="mt-3 text-xl font-bold text-amber-950">Menunggu penetapan ongkir</h2><p className="mt-2 text-sm text-amber-900">Admin akan memeriksa alamat dan menetapkan ongkos kirim. Setelah itu, pembayaran Midtrans tersedia.</p><button type="button" onClick={() => void refreshOrder().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat pesanan."))} className="mt-5 rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white">{checking ? "Memeriksa..." : "Periksa pembaruan"}</button></section>
        : <section className="rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50 text-[#93372A]"><CreditCard size={21}/></div><div><h2 className="font-bold">Pembayaran melalui Midtrans</h2><p className="text-xs text-[#77716A]">Pilih QRIS, Virtual Account, dan metode lain di halaman Midtrans.</p></div></div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#F5F0E7] p-3 text-xs leading-relaxed text-[#776650]"><ShieldCheck size={16} className="mt-0.5 shrink-0"/>Status pesanan hanya berubah setelah notifikasi pembayaran diverifikasi server. Halaman ini memeriksa status secara otomatis.</div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="button" disabled={busy} onClick={() => void startPayment()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60">{busy ? <><LoaderCircle className="animate-spin" size={17}/>Menyiapkan pembayaran...</> : <>Bayar {formatRupiah(order.total)} <ExternalLink size={16}/></>}</button>
          <button type="button" disabled={checking} onClick={() => void refreshOrder().catch((cause) => setError(cause instanceof Error ? cause.message : "Gagal memuat pesanan."))} className="mt-3 w-full rounded-full border border-[#E9DFCE] px-5 py-3 text-sm font-semibold text-[#77716A]">{checking ? "Memeriksa status..." : "Periksa status pembayaran"}</button>
        </section>}
        <section className="rounded-xl bg-[#F5F0E7] p-4 text-xs leading-relaxed text-[#776650]">Pengujian berjalan di lingkungan Midtrans Sandbox dan tidak memindahkan uang sungguhan.</section>
      </div>
    </ShopLayout>
  );
}
