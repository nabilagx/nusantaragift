"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Megaphone, ImagePlus, CheckCircle2, PauseCircle, PlayCircle, Package, ExternalLink } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Product = { id: string; name: string; price: number; stock: number; metadata: Record<string, unknown> | null };
type Promotion = { id: string; title: string; description: string; image_url: string; product_ids: string[]; status: "active" | "paused"; created_at: string };
const nav: DashboardNavItem[] = [
  { label: "Ringkasan", href: "/seller/dashboard", icon: "overview" },
  { label: "Katalog Produk", href: "/seller/products", icon: "products" },
  { label: "Tambah Produk", href: "/seller/products/new", icon: "add" },
  { label: "Iklan & Promosi", href: "/seller/ads", icon: "ads" },
  { label: "Pesanan", href: "/seller/orders", icon: "orders" },
  { label: "Analitik Penjualan", href: "/seller/analytics", icon: "analytics" },
  { label: "Profil Toko", href: "/seller/profile", icon: "profile" },
  { label: "Pusat Bantuan", href: "/seller/help", icon: "help" },
];
const mobileNav: DashboardNavItem[] = [
  { label: "Beranda", href: "/seller/dashboard", icon: "overview" },
  { label: "Produk", href: "/seller/products", icon: "products" },
  { label: "Iklan", href: "/seller/ads", icon: "ads" },
  { label: "Pesanan", href: "/seller/orders", icon: "orders" },
  { label: "Toko", href: "/seller/profile", icon: "profile" },
];
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export default function SellerAdsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [productResponse, promotionResponse] = await Promise.all([
        fetch("/api/seller/products", { cache: "no-store" }),
        fetch("/api/seller/promotions", { cache: "no-store" }),
      ]);
      const [productData, promotionData] = await Promise.all([productResponse.json(), promotionResponse.json()]);
      if ([productResponse.status, promotionResponse.status].some((status) => status === 401 || status === 403)) { window.location.replace("/login"); return; }
      if (!productResponse.ok) throw new Error(productData.error || "Katalog gagal dimuat.");
      if (!promotionResponse.ok) throw new Error(promotionData.error || "Iklan gagal dimuat.");
      setProducts((productData.products ?? []).filter((item: Product) => item.stock >= 0 && item.metadata));
      setPromotions(promotionData.promotions ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Data iklan gagal dimuat."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/seller/promotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, imageUrl, productIds: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Iklan gagal dibuat.");
      setMessage("Iklan berhasil dipasang dan mulai tampil di banner Customer.");
      setTitle(""); setDescription(""); setImageUrl(""); setSelected([]);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Iklan gagal dibuat."); }
    finally { setSaving(false); }
  }

  async function togglePromotion(item: Promotion) {
    setBusy(item.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/seller/promotions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status: item.status === "active" ? "paused" : "active" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Status iklan gagal diubah.");
      setMessage(item.status === "active" ? "Iklan dijeda." : "Iklan ditayangkan kembali.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Status iklan gagal diubah."); }
    finally { setBusy(""); }
  }

  return <DashboardShell role="UMKM" title="Iklan & Promosi" subtitle="Pasarkan beberapa produk dalam satu banner." navItems={nav} mobileNavItems={mobileNav}>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">GROW YOUR STORE</p><h1 className="mt-2 font-display text-[34px] text-[#431714] sm:text-[40px]">Iklan & Promosi</h1><p className="mt-2 max-w-xl text-xs leading-5 text-[#7A6C5E]">Buat banner promosi toko dan tampilkan beberapa produk sekaligus di halaman Customer.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-[#E5D6BD] bg-[#FDFAF3] px-4 py-2 text-[10px] font-bold text-[#7B2925]"><Megaphone size={15}/> MARKETPLACE ADS</div>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">{message}</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
      <form onSubmit={submit} className="rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-[#F3EBDD] p-3 text-[#93372A]"><ImagePlus size={20}/></div><div><h2 className="font-display text-xl text-[#431714]">Buat banner iklan</h2><p className="text-[10px] text-[#7A6C5E]">Pilih minimal dua produk dari tokomu.</p></div></div>
        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">Judul iklan</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} required minLength={4} maxLength={100} placeholder="Contoh: Hadiah Spesial dari Tanah Jawa" className="mb-4 w-full rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>
        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">Deskripsi singkat</label>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} required minLength={8} rows={3} placeholder="Ceritakan koleksi yang sedang kamu promosikan..." className="mb-4 w-full resize-y rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>
        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">URL gambar banner</label>
        <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} required type="url" placeholder="https://i.imgur.com/..." className="mb-2 w-full rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>
        {imageUrl && <div className="mb-4 overflow-hidden rounded-xl border border-[#E5D6BD] bg-white"><img src={imageUrl} alt="Pratinjau banner iklan" className="h-36 w-full object-cover" onError={e=>{e.currentTarget.style.display="none"}}/></div>}
        <div className="mb-2 flex items-center justify-between gap-2"><label className="text-[10px] font-bold text-[#5F4D3D]">Produk yang diiklankan</label><span className="text-[10px] font-semibold text-[#93372A]">{selected.length} dipilih</span></div>
        <div className="max-h-[330px] space-y-2 overflow-y-auto rounded-xl border border-[#E5D6BD] bg-white p-3">
          {products.filter(item=>item.stock>0).map(item=><label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-[#F7F1E3]">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} className="h-4 w-4 accent-[#93372A]"/>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#34291F]">{item.name}</span><span className="mt-1 block text-[10px] text-[#7A6C5E]">{money(item.price)} · Stok {item.stock}</span></span>
          </label>)}
          {products.length===0 && <p className="p-4 text-center text-xs text-[#7A6C5E]">Belum ada produk yang dapat diiklankan. Pastikan produk sudah aktif.</p>}
        </div>
        <button disabled={saving || selected.length<2 || selected.length>12} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#76291F] disabled:cursor-not-allowed disabled:opacity-50">{saving?"Memasang iklan...":<><Megaphone size={16}/> Pasang Iklan di Banner</>}</button>
        <p className="mt-3 text-[10px] leading-5 text-[#8A7968]">Iklan MVP langsung ditayangkan setelah dibuat. Sistem anggaran, penagihan, dan laporan performa iklan belum diaktifkan.</p>
      </form>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl text-[#431714]">Iklan tokomu</h2><span className="text-[10px] text-[#7A6C5E]">{promotions.length} kampanye</span></div>
        {loading ? <p className="rounded-xl bg-[#FDFAF3] p-5 text-xs text-[#7A6C5E]">Memuat iklan...</p> : promotions.length===0 ? <div className="rounded-2xl border border-dashed border-[#DCD2C1] bg-[#FDFAF3] p-8 text-center"><Megaphone size={28} className="mx-auto text-[#C79854]"/><p className="mt-3 text-sm font-bold text-[#431714]">Belum ada iklan</p><p className="mt-1 text-xs text-[#7A6C5E]">Iklan yang dibuat akan muncul di sini.</p></div> : <div className="space-y-3">{promotions.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] shadow-sm"><img src={item.image_url} alt={item.title} className="h-32 w-full object-cover"/><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-[#431714]">{item.title}</h3><p className="mt-1 text-[10px] text-[#7A6C5E]">{item.product_ids.length} produk · {new Date(item.created_at).toLocaleDateString("id-ID")}</p></div><span className={item.status==="active"?"rounded-full bg-[#EAF0E8] px-2 py-1 text-[9px] font-bold text-[#4F6E59]":"rounded-full bg-[#F6EFDF] px-2 py-1 text-[9px] font-bold text-[#9A713A]"}>{item.status==="active"?"Tayang":"Dijeda"}</span></div><button onClick={()=>void togglePromotion(item)} disabled={busy===item.id} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#DCD2C1] px-3 py-2 text-[10px] font-bold text-[#7B2925] disabled:opacity-50">{item.status==="active"?<><PauseCircle size={14}/> Jeda iklan</>:<><PlayCircle size={14}/> Tayangkan lagi</>}</button></div></article>)}</div>}
      </section>
    </div>
  </DashboardShell>;
}
