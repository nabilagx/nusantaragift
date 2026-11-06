"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Image as ImageIcon, Megaphone, PauseCircle, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Product = { id: string; name: string; price: number; stock: number; status: string; metadata: Record<string, unknown> | null };
type Promotion = {
  id: string; seller_id: string; seller_name: string; title: string; description: string; image_url: string;
  product_ids: string[]; products: Product[]; status: "pending_review" | "active" | "paused" | "rejected";
  moderation_note: string | null; created_at: string; reviewed_at: string | null;
};
const nav: DashboardNavItem[] = [
  { label: "Ringkasan", href: "/admin/dashboard", icon: "overview" },
  { label: "Verifikasi UMKM", href: "/admin/umkm", icon: "verification" },
  { label: "Kurasi Produk", href: "/admin/products", icon: "curation" },
  { label: "Kurasi Iklan", href: "/admin/ads", icon: "ads" },
  { label: "Pesanan & Pembayaran", href: "/admin/orders", icon: "orders" },
  { label: "Laporan Komunitas", href: "/admin/reports", icon: "reports" },
  { label: "Pengaturan", href: "/admin/settings", icon: "settings" },
];
const mobileNav: DashboardNavItem[] = [
  { label: "Beranda", href: "/admin/dashboard", icon: "overview" },
  { label: "UMKM", href: "/admin/umkm", icon: "verification" },
  { label: "Kurasi", href: "/admin/products", icon: "curation" },
  { label: "Iklan", href: "/admin/ads", icon: "ads" },
  { label: "Akun", href: "/admin/settings", icon: "settings" },
];
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));
const date = (v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export default function AdminAdsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejecting, setRejecting] = useState<Promotion | null>(null);
  const [moderationAction, setModerationAction] = useState<"reject" | "pause">("reject");
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/promotions", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Antrean iklan gagal dimuat.");
      setPromotions(data.promotions ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Antrean iklan gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const pending = useMemo(() => promotions.filter(item => item.status === "pending_review"), [promotions]);
  const reviewed = useMemo(() => promotions.filter(item => item.status !== "pending_review"), [promotions]);

  async function approve(item: Promotion) {
    setBusy(item.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/promotions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: "active" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Iklan gagal disetujui.");
      setMessage(`Banner “${item.title}” disetujui dan sekarang dapat ditayangkan.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Iklan gagal disetujui."); }
    finally { setBusy(""); }
  }

  async function submitModeration() {
    if (!rejecting) return;
    const status = moderationAction === "pause" ? "paused" : "rejected";
    setBusy(rejecting.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejecting.id, status, note: reason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Keputusan moderasi gagal disimpan.");
      setMessage(moderationAction === "pause"
        ? `Banner “${rejecting.title}” dijeda. Alasan dikirim ke dashboard UMKM.`
        : `Banner “${rejecting.title}” ditolak. Alasan dikirim ke dashboard UMKM.`);
      setRejecting(null); setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Keputusan moderasi gagal disimpan.");
    } finally {
      setBusy("");
    }
  }

  return <DashboardShell role="ADMIN" title="Kurasi Iklan" subtitle="Tinjau kualitas materi promosi sebelum ditampilkan kepada pelanggan." navItems={nav} mobileNavItems={mobileNav}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">MARKETPLACE PROMOTION REVIEW</p><h1 className="mt-2 font-display text-[34px] text-[#431714] sm:text-[40px]">Kurasi Iklan</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-[#7A6C5E]">Pastikan visual, copywriting, dan produk sesuai standar Nusantara Gift. Hanya iklan yang disetujui yang tampil di banner Customer.</p></div>
      <button onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#DCD2C1] bg-[#FDFAF3] px-4 text-[9px] font-bold text-[#7A6C5E] disabled:opacity-50"><RefreshCw size={13} className={loading?"animate-spin":""}/> Perbarui</button>
    </div>
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-[#DCD2C1] bg-[#FDFAF3] p-4"><p className="text-[8px] font-bold tracking-widest text-[#7A6C5E]">ANTREAN KURASI</p><p className="mt-2 font-display text-3xl text-[#431714]">{pending.length}</p></div>
      <div className="rounded-xl border border-[#DCD2C1] bg-[#FDFAF3] p-4"><p className="text-[8px] font-bold tracking-widest text-[#7A6C5E]">IKLAN TAYANG</p><p className="mt-2 font-display text-3xl text-[#431714]">{promotions.filter(item=>item.status==="active").length}</p></div>
      <div className="col-span-2 rounded-xl border border-[#DCD2C1] bg-[#FDFAF3] p-4 sm:col-span-1"><p className="text-[8px] font-bold tracking-widest text-[#7A6C5E]">RIWAYAT TERSIMPAN</p><p className="mt-2 font-display text-3xl text-[#431714]">{promotions.length}</p></div>
    </div>
    {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#E6C7BD] bg-[#F8E9E5] p-3 text-[11px] text-[#93372A]"><AlertCircle size={15}/>{error}</div>}
    {message && <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-[#D9C49E] bg-[#FFF9EC] p-3 text-[11px] text-[#805D2D]"><CheckCircle2 size={15}/>{message}</div>}

    <section className="rounded-2xl border border-[#DCD2C1] bg-[#FDFAF3] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.15em] text-[#C79854]">NEEDS YOUR ATTENTION</p><h2 className="mt-1 font-display text-2xl text-[#431714]">Menunggu persetujuan</h2></div><span className="rounded-full bg-[#F6EFDF] px-3 py-1.5 text-[9px] font-bold text-[#9A713A]">{pending.length} pengajuan</span></div>
      {loading ? <p className="py-12 text-center text-xs text-[#7A6C5E]">Memuat pengajuan iklan...</p> : pending.length===0 ? <div className="rounded-xl border border-dashed border-[#DCD2C1] py-12 text-center"><ShieldCheck size={30} className="mx-auto text-[#C79854]"/><p className="mt-3 text-sm font-bold text-[#431714]">Tidak ada antrean iklan</p><p className="mt-1 text-[10px] text-[#7A6C5E]">Pengajuan baru dari UMKM akan muncul di sini.</p></div> : <div className="space-y-5">{pending.map(item=><article key={item.id} className="overflow-hidden rounded-xl border border-[#E5D6BD] bg-white">
        <div className="aspect-[16/5] w-full bg-[#F3EBDD]"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/></div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[8px] font-bold tracking-widest text-[#9A713A]">{item.seller_name}</p><h3 className="mt-1 font-display text-xl text-[#431714]">{item.title}</h3><p className="mt-1 max-w-2xl text-[11px] leading-5 text-[#7A6C5E]">{item.description}</p><p className="mt-2 text-[9px] text-[#9A713A]">Diajukan {date(item.created_at)}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[#F6EFDF] px-3 py-1.5 text-[9px] font-bold text-[#9A713A]"><Clock3 size={12}/> Menunggu</span></div>
          <div className="mt-4 border-t border-[#E8DFD2] pt-4"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-bold tracking-wider text-[#7A6C5E]">PRODUK DALAM BANNER ({item.products.length})</p><p className="text-[8px] text-[#9A713A]">Periksa kesesuaian visual & harga</p></div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{item.products.map(product=>{const image=typeof product.metadata?.image==="string"?product.metadata.image:"";return <div key={product.id} className="flex items-center gap-3 rounded-lg border border-[#E8DFD2] bg-[#FDFAF3] p-2.5">{image?<img src={image} alt={product.name} className="h-14 w-14 rounded-lg bg-white object-cover"/>:<span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#F3EBDD]"><ImageIcon size={18} className="text-[#C79854]"/></span>}<div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-[#431714]">{product.name}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{money(product.price)} · Stok {product.stock}</p><p className="mt-1 text-[8px] text-[#9A713A]">Status produk: {product.status}</p></div></div>})}</div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#E8DFD2] pt-4"><button onClick={()=>{setRejecting(item);setModerationAction("reject");setReason("");}} className="inline-flex items-center gap-1.5 rounded-full border border-[#E6C7BD] px-4 py-2.5 text-[9px] font-bold text-[#93372A]"><XCircle size={13}/> Tolak & beri alasan</button><button disabled={busy===item.id} onClick={()=>void approve(item)} className="inline-flex items-center gap-1.5 rounded-full bg-[#431714] px-5 py-2.5 text-[9px] font-bold text-white disabled:opacity-50">{busy===item.id?"Memproses...":<><CheckCircle2 size={13}/> Setujui & tayangkan</>}</button></div>
        </div>
      </article>)}</div>}
    </section>

    <section className="mt-6 rounded-2xl border border-[#DCD2C1] bg-[#FDFAF3] p-4 sm:p-6">
      <div className="mb-4"><p className="text-[8px] font-bold tracking-[.15em] text-[#C79854]">AUDIT TRAIL</p><h2 className="mt-1 font-display text-2xl text-[#431714]">Riwayat moderasi</h2><p className="mt-1 text-[10px] text-[#7A6C5E]">Iklan yang ditolak atau diturunkan tetap tercatat untuk kebutuhan monitoring.</p></div>
      {reviewed.length===0 ? <p className="py-8 text-center text-xs text-[#7A6C5E]">Belum ada riwayat moderasi.</p> : <div className="space-y-2">{reviewed.map(item=><article key={item.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-[#E8DFD2] bg-white p-3"><img src={item.image_url} alt="" className="h-16 w-24 rounded-md bg-[#F3EBDD] object-cover"/><div className="min-w-0 flex-1"><p className="text-[8px] font-bold text-[#9A713A]">{item.seller_name}</p><p className="mt-1 text-[11px] font-bold text-[#431714]">{item.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{date(item.created_at)} · {item.product_ids.length} produk</p>{item.moderation_note && <p className="mt-2 rounded-md bg-[#F8E9E5] p-2 text-[9px] leading-4 text-[#7B2925]">Alasan: {item.moderation_note}</p>}</div><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${item.status==="active"?"bg-[#EAF0E8] text-[#4F6E59]":item.status==="rejected"?"bg-[#F8E9E5] text-[#93372A]":"bg-[#F6EFDF] text-[#9A713A]"}`}>{item.status==="active"?"Disetujui":item.status==="rejected"?"Ditolak":"Dijeda"}</span>{item.status==="active" && <button type="button" onClick={()=>{setRejecting(item);setModerationAction("pause");setReason("");}} className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#E6C7BD] px-3 py-2 text-[9px] font-bold text-[#93372A]"><PauseCircle size={12}/> Jeda iklan</button>}</article>)}</div>}
    </section>

    {rejecting && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#24100E]/65 p-4"><form onSubmit={e=>{e.preventDefault();void submitModeration();}} className="w-full max-w-lg rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] p-5 shadow-2xl sm:p-7"><p className="text-[8px] font-bold tracking-[.16em] text-[#C79854]">MODERATION DECISION</p><h3 className="mt-2 font-display text-2xl text-[#431714]">{moderationAction === "pause" ? "Jeda penayangan iklan" : "Alasan penolakan"}</h3><p className="mt-2 text-[10px] leading-5 text-[#7A6C5E]">{moderationAction === "pause" ? "Banner akan langsung disembunyikan dari Customer. Tuliskan alasan yang akan terlihat oleh UMKM." : "Tuliskan hal yang perlu diperbaiki secara spesifik. Alasan ini akan tampil di dashboard UMKM."}</p><div className="mt-4 rounded-lg border border-[#E5D6BD] bg-white p-3"><p className="text-[10px] font-bold text-[#431714]">{rejecting.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{rejecting.seller_name}</p></div><label className="mt-4 block text-[9px] font-bold text-[#5F4D3D]">CATATAN UNTUK UMKM ({reason.length}/500)<textarea required minLength={12} maxLength={500} rows={5} value={reason} onChange={e=>setReason(e.target.value)} placeholder={moderationAction === "pause" ? "Contoh: Materi promosi perlu ditinjau ulang karena informasi harga tidak sesuai dengan katalog produk." : "Contoh: Resolusi banner terlalu rendah sehingga gambar terlihat pecah. Mohon unggah ulang dengan ukuran 1600 × 500 px dan pastikan teks mudah dibaca."} className="mt-2 w-full rounded-xl border border-[#DCD2C1] bg-white p-3 text-[11px] leading-5 outline-none focus:border-[#93372A]"/></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setRejecting(null)} className="rounded-full border border-[#DCD2C1] px-4 py-2.5 text-[9px] font-bold text-[#7A6C5E]">Batal</button><button type="submit" disabled={busy===rejecting.id||reason.trim().length<12} className="rounded-full bg-[#93372A] px-5 py-2.5 text-[9px] font-bold text-white disabled:opacity-50">{busy===rejecting.id?"Memproses...":moderationAction === "pause" ? "Jeda iklan" : "Kirim penolakan"}</button></div></form></div>}
  </DashboardShell>;
}
