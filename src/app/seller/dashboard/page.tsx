"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, RefreshCw, Store } from "lucide-react";

type SellerProduct = { id: string; name: string; slug: string; price: number; stock: number; status: string; moderation_note: string | null; created_at: string };

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const statusLabel: Record<string,string> = { pending_review:"Menunggu persetujuan", active:"Aktif", rejected:"Perlu revisi", draft:"Draft", archived:"Diarsipkan" };

export default function SellerDashboardPage() {
  const router = useRouter();
  const [products,setProducts] = useState<SellerProduct[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [form,setForm] = useState({name:"",description:"",category:"cerita",price:"",stock:"1"});

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/seller/products",{cache:"no-store"});
      const data = await response.json();
      if (response.status === 401 || response.status === 403) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Gagal memuat produk.");
      setProducts(data.products ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal memuat produk."); }
    finally { setLoading(false); }
  },[router]);

  useEffect(()=>{ void loadProducts(); },[loadProducts]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response=await fetch("/api/seller/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,price:Number(form.price),stock:Number(form.stock)})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || "Produk gagal diajukan.");
      setMessage("Produk berhasil diajukan dan menunggu persetujuan admin.");
      setForm({name:"",description:"",category:"cerita",price:"",stock:"1"});
      await loadProducts();
    } catch(error) { setMessage(error instanceof Error ? error.message : "Terjadi kesalahan."); }
    finally { setSaving(false); }
  }

  return (
    <main className="min-h-dvh bg-[#F7F1E3] px-4 py-8 text-[#34291F] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#93372A]">NusantaraGift · Mitra</p><h1 className="mt-1 font-quicksand text-3xl font-bold">Dashboard UMKM</h1><p className="mt-2 text-sm text-[#806A4E]">Kelola produk dan pantau status moderasi.</p></div>
          <button onClick={()=>void loadProducts()} className="inline-flex items-center gap-2 rounded-full border border-[#D9C9AF] bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={15}/> Segarkan</button>
        </header>

        <section className="mt-8 rounded-2xl border border-[#E9DFCE] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0CDD5]/50 text-[#93372A]"><PackagePlus/></div><div><h2 className="text-lg font-bold">Ajukan Produk Baru</h2><p className="text-xs text-[#77716A]">Produk akan tampil di toko setelah disetujui admin.</p></div></div>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">Nama produk<input required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E9DFCE] px-4 py-3 font-normal outline-none focus:border-[#93372A]"/></label>
            <label className="text-sm font-semibold sm:col-span-2">Deskripsi<textarea required minLength={10} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E9DFCE] px-4 py-3 font-normal outline-none focus:border-[#93372A]"/></label>
            <label className="text-sm font-semibold">Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E9DFCE] bg-white px-4 py-3 font-normal"><option value="cerita">Cerita</option><option value="rasa">Rasa</option><option value="budaya">Budaya</option></select></label>
            <label className="text-sm font-semibold">Harga (Rp)<input required type="number" min="1" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E9DFCE] px-4 py-3 font-normal"/></label>
            <label className="text-sm font-semibold">Stok<input required type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E9DFCE] px-4 py-3 font-normal"/></label>
            <div className="flex items-end"><button disabled={saving} className="w-full rounded-xl bg-[#93372A] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving?"Mengirim...":"Ajukan untuk Ditinjau"}</button></div>
          </form>
          {message && <p role="status" className="mt-4 rounded-xl bg-[#F7F1E3] p-3 text-sm">{message}</p>}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Store className="text-[#93372A]"/><h2 className="text-xl font-bold">Produk Saya</h2><span className="rounded-full bg-white px-3 py-1 text-xs">{products.length}</span></div>
          {loading ? <p className="py-8 text-center text-sm text-[#806A4E]">Memuat produk...</p> : products.length===0 ? <div className="rounded-2xl border border-dashed border-[#D9C9AF] bg-white/60 p-8 text-center text-sm text-[#806A4E]">Belum ada produk yang diajukan.</div> : <div className="space-y-3">{products.map(product=><article key={product.id} className="rounded-2xl border border-[#E9DFCE] bg-white p-4 sm:flex sm:items-center sm:justify-between"><div><h3 className="font-bold">{product.name}</h3><p className="mt-1 text-sm text-[#806A4E]">{money(Number(product.price))} · Stok {product.stock}</p>{product.moderation_note&&<p className="mt-2 text-xs text-red-700">Catatan admin: {product.moderation_note}</p>}</div><span className="mt-3 inline-flex rounded-full bg-[#F7F1E3] px-3 py-1.5 text-xs font-bold text-[#93372A] sm:mt-0">{statusLabel[product.status]??product.status}</span></article>)}</div>}
        </section>
      </div>
    </main>
  );
}
