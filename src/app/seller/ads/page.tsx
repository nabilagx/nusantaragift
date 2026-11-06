"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Megaphone, ImagePlus, PauseCircle, Package, Pencil, Send, XCircle, CheckCircle2 } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Product = { id: string; name: string; price: number; stock: number; metadata: Record<string, unknown> | null };
type Promotion = {
  id: string; title: string; description: string; image_url: string; product_ids: string[];
  status: "pending_review" | "active" | "paused" | "rejected";
  moderation_note: string | null; created_at: string; updated_at: string;
};
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
const limits = { title: 42, description: 90 };

function statusLabel(status: Promotion["status"]) {
  return status === "pending_review" ? "Menunggu kurasi" : status === "active" ? "Tayang" : status === "paused" ? "Diturunkan" : "Perlu revisi";
}
function statusStyle(status: Promotion["status"]) {
  return status === "active" ? "bg-[#EAF0E8] text-[#4F6E59]" : status === "rejected" ? "bg-[#F8E9E5] text-[#93372A]" : "bg-[#F6EFDF] text-[#9A713A]";
}

export default function SellerAdsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editing, setEditing] = useState<Promotion | null>(null);
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

  function resetForm() {
    setEditing(null); setTitle(""); setDescription(""); setImageUrl(""); setSelected([]);
  }
  function startEdit(item: Promotion) {
    setEditing(item); setTitle(item.title); setDescription(item.description); setImageUrl(item.image_url); setSelected(item.product_ids);
    setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/seller/promotions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing
          ? { id: editing.id, action: "edit", title, description, imageUrl, productIds: selected }
          : { title, description, imageUrl, productIds: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pengajuan iklan gagal disimpan.");
      setMessage(editing ? "Perubahan tersimpan. Banner dikirim kembali ke antrean kurasi Admin." : "Pengajuan iklan berhasil dikirim. Banner akan tayang setelah disetujui Admin.");
      resetForm();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Pengajuan iklan gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function pausePromotion(item: Promotion) {
    if (!window.confirm("Turunkan banner ini dari halaman Customer? Riwayat iklan tetap tersimpan.")) return;
    setBusy(item.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/seller/promotions", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "pause" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Banner gagal diturunkan.");
      setMessage("Banner berhasil diturunkan. Rekam jejak iklan tetap tersimpan.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Banner gagal diturunkan."); }
    finally { setBusy(""); }
  }

  return <DashboardShell role="UMKM" title="Iklan & Promosi" subtitle="Ajukan materi promosi untuk ditinjau dan ditayangkan." navItems={nav} mobileNavItems={mobileNav}>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">GROW YOUR STORE</p><h1 className="mt-2 font-display text-[34px] text-[#431714] sm:text-[40px]">Iklan & Promosi</h1><p className="mt-2 max-w-xl text-xs leading-5 text-[#7A6C5E]">Satu banner untuk memperkenalkan beberapa produk pilihan tokomu kepada pelanggan.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-[#E5D6BD] bg-[#FDFAF3] px-4 py-2 text-[10px] font-bold text-[#7B2925]"><Megaphone size={15}/> MARKETPLACE ADS</div>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#D9C49E] bg-[#FFF9EC] p-4"><p className="text-[9px] font-bold tracking-[.13em] text-[#9A713A]">PROGRAM MVP</p><p className="mt-1 font-display text-[25px] text-[#431714]">Rp0 <span className="font-sans text-[11px] font-semibold">biaya pemasangan</span></p><p className="mt-1 text-[10px] leading-4 text-[#7A6C5E]">Selama tahap MVP, UMKM dapat mengajukan iklan tanpa biaya. Fitur anggaran dan penagihan belum diberlakukan.</p></div>
      <div className="rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] p-4"><p className="text-[9px] font-bold tracking-[.13em] text-[#9A713A]">ALUR PENAYANGAN</p><p className="mt-1 font-display text-[19px] text-[#431714]">Ajukan → Kurasi → Tayang</p><p className="mt-1 text-[10px] leading-4 text-[#7A6C5E]">Banner tidak langsung tampil. Admin akan memeriksa gambar, teks, dan produk sebelum iklan dipublikasikan.</p></div>
    </div>

    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800">{message}</p>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
      <form onSubmit={submit} className="rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-[#F3EBDD] p-3 text-[#93372A]"><ImagePlus size={20}/></div><div><h2 className="font-display text-xl text-[#431714]">{editing ? "Edit banner iklan" : "Ajukan banner iklan"}</h2><p className="text-[10px] text-[#7A6C5E]">{editing ? "Setiap perubahan perlu ditinjau ulang." : "Pilih 2–12 produk aktif dari tokomu."}</p></div></div>
          {editing && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-full border border-[#DCD2C1] px-3 py-2 text-[9px] font-bold text-[#7A6C5E]"><XCircle size={13}/> Batal edit</button>}
        </div>

        <div className="mb-4 rounded-xl border border-[#E5D6BD] bg-white p-4">
          <p className="text-[9px] font-bold tracking-[.12em] text-[#93372A]">PANDUAN MATERI BANNER</p>
          <div className="mt-2 grid gap-2 text-[10px] leading-4 text-[#6F6255] sm:grid-cols-2">
            <p><strong className="text-[#431714]">Ukuran disarankan:</strong> 1600 × 500 px</p>
            <p><strong className="text-[#431714]">Rasio wajib:</strong> 16:5 (3,2:1)</p>
            <p><strong className="text-[#431714]">Format:</strong> JPG, PNG, atau WebP</p>
            <p><strong className="text-[#431714]">Area aman:</strong> letakkan objek utama di tengah</p>
            <p><strong className="text-[#431714]">Judul:</strong> maks. 42 karakter</p>
            <p><strong className="text-[#431714]">Deskripsi:</strong> maks. 90 karakter</p>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-[#8A7968]">Hindari teks kecil, logo terlalu dekat tepi, dan elemen penting di sudut. Banner akan dipotong menyesuaikan layar, tetapi rasio tampilannya tetap konsisten.</p>
        </div>

        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">Judul iklan <span className="font-normal text-[#9A8B7B]">({title.length}/{limits.title})</span></label>
        <input value={title} onChange={e=>setTitle(e.target.value)} required minLength={4} maxLength={limits.title} placeholder="Contoh: Hadiah Spesial dari Jawa" className="mb-4 w-full rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>

        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">Deskripsi singkat <span className="font-normal text-[#9A8B7B]">({description.length}/{limits.description})</span></label>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} required minLength={8} maxLength={limits.description} rows={2} placeholder="Ceritakan koleksi unggulanmu dalam satu kalimat..." className="mb-4 w-full resize-y rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>

        <label className="mb-1 block text-[10px] font-bold text-[#5F4D3D]">URL gambar banner</label>
        <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} required type="url" placeholder="https://..." className="mb-2 w-full rounded-xl border border-[#DCD2C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/>
        {imageUrl && <div className="mb-4 overflow-hidden rounded-xl border border-[#E5D6BD] bg-white"><div className="aspect-[16/5] w-full bg-[#F3EBDD]"><img src={imageUrl} alt="Pratinjau banner iklan" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display="none"}}/></div><p className="px-3 py-2 text-[9px] text-[#7A6C5E]">Pratinjau rasio banner 16:5</p></div>}

        <div className="mb-2 flex items-center justify-between gap-2"><label className="text-[10px] font-bold text-[#5F4D3D]">Produk yang diiklankan</label><span className="text-[10px] font-semibold text-[#93372A]">{selected.length}/12 dipilih</span></div>
        <div className="max-h-[330px] space-y-2 overflow-y-auto rounded-xl border border-[#E5D6BD] bg-white p-3">
          {products.filter(item=>item.stock>0).map(item=>{
            const image=typeof item.metadata?.image==="string"?item.metadata.image:"";
            return <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-[#F7F1E3]">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id)&&selected.length>=12} onChange={e=>setSelected(current=>e.target.checked?[...current,item.id]:current.filter(id=>id!==item.id))} className="h-4 w-4 accent-[#93372A]"/>
              {image?<img src={image} alt="" className="h-12 w-12 rounded-lg bg-[#F3EBDD] object-cover"/>:<span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3EBDD]"><Package size={17} className="text-[#93372A]"/></span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[#34291F]">{item.name}</span><span className="mt-1 block text-[10px] text-[#7A6C5E]">{money(item.price)} · Stok {item.stock}</span></span>
            </label>;
          })}
          {products.filter(item=>item.stock>0).length===0 && <p className="p-4 text-center text-xs text-[#7A6C5E]">Belum ada produk aktif dengan stok tersedia.</p>}
        </div>
        <button disabled={saving || selected.length<2 || selected.length>12} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#76291F] disabled:cursor-not-allowed disabled:opacity-50">{saving?"Menyimpan...":<><Send size={15}/> {editing?"Simpan & ajukan ulang":"Kirim ke kurasi Admin"}</>}</button>
        <p className="mt-3 text-[10px] leading-5 text-[#8A7968]">Dengan mengirim pengajuan, kamu menyetujui proses pemeriksaan materi iklan. Banner baru atau hasil edit hanya akan tayang setelah disetujui Admin.</p>
      </form>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl text-[#431714]">Riwayat iklan tokomu</h2><span className="text-[10px] text-[#7A6C5E]">{promotions.length} pengajuan</span></div>
        {loading ? <p className="rounded-xl bg-[#FDFAF3] p-5 text-xs text-[#7A6C5E]">Memuat iklan...</p> : promotions.length===0 ? <div className="rounded-2xl border border-dashed border-[#DCD2C1] bg-[#FDFAF3] p-8 text-center"><Megaphone size={28} className="mx-auto text-[#C79854]"/><p className="mt-3 text-sm font-bold text-[#431714]">Belum ada pengajuan iklan</p><p className="mt-1 text-xs text-[#7A6C5E]">Semua pengajuan dan statusnya akan tersimpan di sini.</p></div> : <div className="space-y-3">{promotions.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-[#E5D6BD] bg-[#FDFAF3] shadow-sm">
          <div className="aspect-[16/5] w-full bg-[#F3EBDD]"><img src={item.image_url} alt={item.title} className="h-full w-full object-cover"/></div>
          <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-sm font-bold text-[#431714]">{item.title}</h3><p className="mt-1 text-[10px] text-[#7A6C5E]">{item.product_ids.length} produk · Diajukan {new Date(item.created_at).toLocaleDateString("id-ID")}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span></div>
            {item.status==="pending_review" && <p className="mt-3 rounded-lg bg-[#F6EFDF] p-3 text-[10px] leading-4 text-[#805D2D]">Pengajuan sedang diperiksa Admin. Banner belum ditampilkan kepada Customer.</p>}
            {item.status==="rejected" && <div className="mt-3 rounded-lg border border-[#E6C7BD] bg-[#F8E9E5] p-3"><p className="text-[9px] font-bold text-[#93372A]">ALASAN PENOLAKAN ADMIN</p><p className="mt-1 text-[10px] leading-4 text-[#7B2925]">{item.moderation_note || "Admin meminta perbaikan materi iklan."}</p><p className="mt-2 text-[9px] text-[#7A6C5E]">Perbaiki poin di atas, lalu edit dan ajukan ulang agar ditinjau kembali.</p></div>}
            {item.status==="paused" && <p className="mt-3 rounded-lg bg-[#F6EFDF] p-3 text-[10px] text-[#805D2D]">Banner sudah diturunkan dari halaman Customer. Riwayat pengajuan tetap disimpan.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E8DFD2] pt-3">
              <button onClick={()=>startEdit(item)} className="inline-flex items-center gap-1.5 rounded-full border border-[#DCD2C1] px-3 py-2 text-[10px] font-bold text-[#7B2925]"><Pencil size={13}/> Edit {item.status==="rejected"?"& ajukan ulang":""}</button>
              {item.status==="active" && <button onClick={()=>void pausePromotion(item)} disabled={busy===item.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#E6C7BD] px-3 py-2 text-[10px] font-bold text-[#93372A] disabled:opacity-50">{busy===item.id?"Memproses...":<><PauseCircle size={13}/> Turunkan banner</>}</button>}
              {item.status==="active" && <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold text-[#4F6E59]"><CheckCircle2 size={12}/> Tayang di Customer</span>}
            </div>
          </div>
        </article>)}</div>}
      </section>
    </div>
  </DashboardShell>;
}
