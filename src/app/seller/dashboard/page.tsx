"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowRight, ArrowUpRight, BarChart3, Boxes, CheckCircle2, Clock3, ImagePlus,
  Package, PackageCheck, PackagePlus, RefreshCw, ShoppingBag, Sparkles, Store, Truck, Wallet,
  type LucideIcon,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type SellerProduct = {
  id: string; name: string; slug: string; price: number; stock: number; status: string;
  moderation_note: string | null; created_at: string; description?: string | null;
  metadata?: Record<string, unknown>;
};
type SellerOrder = {
  id: string; order_number: string; recipient_name: string; recipient_phone: string;
  shipping_address: Record<string, unknown>; subtotal: number; shipping_cost: number;
  total_amount: number; order_status: string; payment_status: string; created_at: string;
  tracking_number: string | null; shipping_courier: string | null;
  items: { product_name: string; quantity: number; unit_price: number; line_total: number }[];
};
type SellerProfile = { business_name: string; slug: string; description: string | null; status: string; created_at: string };
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
const money = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v || 0));
const date = (v: string) => new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const labels: Record<string, string> = {
  pending_review: "Menunggu kurasi", active: "Tayang di toko", rejected: "Perlu revisi", draft: "Draft",
  paid: "Pesanan baru", processing: "Diproses", shipped: "Dalam pengiriman",
  delivered: "Terkirim", completed: "Selesai", cancelled: "Dibatalkan",
};
function imageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("drive.google.com")) {
      const id = url.searchParams.get("id") || url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w800` : value;
    }
    if (url.hostname === "imgur.com" || url.hostname === "www.imgur.com") {
      const id = url.pathname.split("/").filter(Boolean).pop()?.replace(/\.[^.]+$/, "");
      return id ? `https://i.imgur.com/${id}.jpg` : value;
    }
    return value;
  } catch { return ""; }
}
function statusClass(status: string) {
  if (["active", "approved", "completed", "delivered", "shipped"].includes(status)) return "bg-[#EAF0E8] text-[#4F6E59]";
  if (["rejected", "cancelled"].includes(status)) return "bg-[#F8E9E5] text-[#93372A]";
  return "bg-[#F6EFDF] text-[#9A713A]";
}
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">{eyebrow}</p><h2 className="mt-2 font-display text-[32px] leading-[1.1] text-[#431714] sm:text-[36px]">{title}</h2><p className="mt-2 max-w-[700px] text-[11px] leading-5 text-[#7A6C5E]">{description}</p></div>
    {action}
  </div>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: React.ReactNode; note: string; icon: LucideIcon }) {
  return <article className="min-h-[112px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-4 sm:p-[17px]">
    <div className="flex items-center justify-between gap-2"><p className="text-[8px] font-bold tracking-[.12em] text-[#7A6C5E]">{label}</p><Icon size={15} strokeWidth={1.7} className="text-[#C79854]"/></div>
    <p className="mt-3 font-display text-[27px] leading-none text-[#431714]">{value}</p><p className="mt-2 text-[9px] font-semibold text-[#4F6E59]">{note}</p>
  </article>;
}
function EditorialFooter() {
  return <div className="mt-7 rounded-[13px] bg-[#431714] px-6 py-6 text-[#FFFDF8] sm:px-7 sm:py-7">
    <p className="text-[8px] font-bold tracking-[.14em] text-[#C79854]">NUSANTARA GIFT　/　ARTISAN STORIES</p>
    <p className="mt-5 max-w-[950px] font-display text-[22px] leading-[1.25] sm:text-[25px]">Setiap karya membawa cerita. Kami membantu cerita itu menemukan pemilik berikutnya.</p>
    <p className="mt-6 text-[9px] text-[#DBC7AB]">Ruang tumbuh bagi para perajin Indonesia</p>
  </div>;
}

export default function SellerDashboardPage({ module = "overview" }: { module?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", category: "cerita", price: "", stock: "1", imageUrl: "" });
  const [editing, setEditing] = useState<SellerProduct | null>(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [shipping, setShipping] = useState<Record<string, { courier: string; tracking: string }>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [pr, or, sr] = await Promise.all([
        fetch("/api/seller/products", { cache: "no-store" }),
        fetch("/api/seller/orders", { cache: "no-store" }),
        fetch("/api/seller/profile", { cache: "no-store" }),
      ]);
      const [pd, od, sd] = await Promise.all([pr.json(), or.json(), sr.json()]);
      if ([pr.status, or.status, sr.status].some(s => s === 401 || s === 403)) { router.replace("/login"); return; }
      if (!pr.ok) throw new Error(pd.error || "Gagal memuat katalog.");
      if (!or.ok) throw new Error(od.error || "Gagal memuat pesanan.");
      setProducts(pd.products ?? []); setOrders(od.orders ?? []); setProfile(sd.profile ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Dashboard gagal dimuat."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const r = await fetch("/api/seller/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Produk gagal diajukan.");
      setMessage("Produk berhasil dikirim ke antrean kurasi admin.");
      setForm({ name: "", description: "", category: "cerita", price: "", stock: "1", imageUrl: "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Produk gagal diajukan."); }
    finally { setSaving(false); }
  }

  async function changeProduct(id: string, action: "archive" | "restore" | "stock", delta?: number) {
    setBusy(id); setError(""); setMessage("");
    try {
      const r = await fetch("/api/seller/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, delta }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Produk gagal diperbarui.");
      setMessage(action === "stock" ? "Stok berhasil diperbarui." : action === "archive" ? "Produk dipindahkan ke arsip. Admin telah menerima notifikasi." : "Produk dipulihkan ke antrean kurasi.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Produk gagal diperbarui."); }
    finally { setBusy(""); }
  }

  async function saveProductEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editing) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const r = await fetch("/api/seller/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...form, price: Number(form.price), stock: Number(form.stock) }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Perubahan produk gagal disimpan.");
      setEditing(null); setMessage("Perubahan produk berhasil disimpan."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Perubahan produk gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function archiveProduct(id: string) {
    if (!window.confirm("Arsipkan produk ini? Produk tidak lagi tampil di katalog, tetapi riwayatnya tetap tersimpan dan admin akan diberi notifikasi.")) return;
    setBusy(id); setError(""); setMessage("");
    try {
      const r = await fetch("/api/seller/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Produk gagal diarsipkan.");
      setMessage("Produk berhasil diarsipkan. Admin menerima notifikasi aktivitas ini."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Produk gagal diarsipkan."); }
    finally { setBusy(""); }
  }

  function openEdit(product: SellerProduct) {
    const summary = product.metadata?.summary as { type?: string } | undefined;
    setEditing(product);
    setForm({ name: product.name, description: product.description ?? "", category: summary?.type ?? "cerita", price: String(product.price), stock: String(product.stock), imageUrl: typeof product.metadata?.image === "string" ? product.metadata.image : "" });
  }

  async function updateOrder(orderNumber: string, status: "processing" | "shipped") {
    const detail = shipping[orderNumber] ?? { courier: "", tracking: "" };
    if (status === "shipped" && (!detail.courier.trim() || !detail.tracking.trim())) {
      setError("Isi nama kurir dan nomor resi sebelum menandai pesanan dikirim."); return;
    }
    setBusy(orderNumber); setError(""); setMessage("");
    try {
      const r = await fetch("/api/seller/orders/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, status, courier: detail.courier, trackingNumber: detail.tracking }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Status pesanan gagal diperbarui.");
      setMessage(status === "processing" ? "Pesanan diterima. Segera siapkan produk." : "Pesanan ditandai telah dikirim.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memperbarui pesanan."); }
    finally { setBusy(""); }
  }

  const paid = orders.filter(o => o.payment_status === "paid");
  const newOrders = paid.filter(o => o.order_status === "paid");
  const processing = paid.filter(o => o.order_status === "processing");
  const shipped = paid.filter(o => ["shipped", "delivered", "completed"].includes(o.order_status));
  const activeProducts = products.filter(p => p.status === "active");
  const pendingProducts = products.filter(p => p.status === "pending_review");
  const revenue = paid.reduce((sum, o) => sum + o.items.reduce((s, i) => s + Number(i.line_total), 0), 0);
  const filteredOrders = useMemo(() => orders.filter(o =>
    orderFilter === "all" || (orderFilter === "new" && o.payment_status === "paid" && o.order_status === "paid") ||
    (orderFilter === "processing" && o.order_status === "processing") ||
    (orderFilter === "shipped" && ["shipped", "delivered", "completed"].includes(o.order_status))
  ), [orders, orderFilter]);
  const filteredProducts = useMemo(() => products.filter(p =>
    productFilter === "all" || (productFilter === "active" && p.status === "active") ||
    (productFilter === "pending" && p.status === "pending_review") || (productFilter === "rejected" && p.status === "rejected") || (productFilter === "archived" && p.status === "archived")
  ), [products, productFilter]);
  const latestOrders = [...orders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 4);
  const lowStock = activeProducts.filter(p => p.stock <= 5);
  const bestSeller = Object.values(orders.flatMap(o => o.items).reduce<Record<string, { name: string; quantity: number }>>((acc, item) => {
    const key = item.product_name; acc[key] ??= { name: key, quantity: 0 }; acc[key].quantity += item.quantity; return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity)[0];
  const latestPaidTimestamp = paid.reduce((latest, order) => Math.max(latest, new Date(order.created_at).getTime()), 0);
  const weekly = Array.from({ length: 4 }, (_, index) => {
    const end = new Date(latestPaidTimestamp); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - (3 - index) * 7);
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    const amount = paid.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; })
      .reduce((sum, o) => sum + o.items.reduce((s, item) => s + item.line_total, 0), 0);
    return { label: `Minggu ${index + 1}`, amount, orders: paid.filter(o => { const d = new Date(o.created_at); return d >= start && d <= end; }).length };
  });
  const maxWeekly = Math.max(1, ...weekly.map(w => w.amount));

  return <DashboardShell role="UMKM" title="Ruang berkarya" subtitle="Perkembangan tokomu dalam satu genggaman." navItems={nav} mobileNavItems={mobileNav}>
    {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-[#E6C7BD] bg-[#F8E9E5] p-3 text-[11px] text-[#93372A]"><AlertCircle size={16} className="shrink-0"/>{error}</div>}
    {message && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#C8D7C7] bg-[#EAF0E8] p-3 text-[11px] text-[#4F6E59]"><CheckCircle2 size={16}/>{message}</div>}

    {module === "overview" && (
<section id="overview" className="scroll-mt-24">
      <div className="mb-5 overflow-hidden rounded-[16px] border border-[#E7D5B8] bg-[#EAD9BE]"><div className="grid gap-4 p-5 sm:grid-cols-[1.2fr_.8fr] sm:items-center sm:px-7 sm:py-6"><div><p className="text-[8px] font-bold tracking-[.18em] text-[#95683B]">ARTISAN CAMPAIGN · NOVEMBER</p><h3 className="mt-2 font-display text-[25px] leading-tight text-[#431714] sm:text-[30px]">Kisah baik layak dirayakan.</h3><p className="mt-2 max-w-lg text-[10px] leading-5 text-[#765E48]">Siapkan koleksi terbaik untuk musim hadiah. Tampilkan cerita, foto, dan paket spesial tokomu.</p><a href="/seller/products/new" className="mt-4 inline-flex rounded-full bg-[#431714] px-4 py-2.5 text-[9px] font-bold text-white">Buat koleksi baru <ArrowRight size={13} className="ml-2"/></a></div><div className="relative hidden min-h-[132px] items-center justify-center overflow-hidden rounded-xl bg-[#D4B68F] sm:flex"><div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-[#A77C50]/40"/><div className="absolute -left-8 -bottom-16 h-36 w-36 rounded-full border border-[#A77C50]/40"/><div className="relative text-center"><Sparkles size={26} className="mx-auto text-[#8D5C32]"/><p className="mt-3 font-display text-[19px] text-[#5A2B22]">The Artisan Edit</p><p className="mt-1 text-[8px] tracking-[.14em] text-[#8D5C32]">CURATED BY YOU</p></div></div></div></div>
      <PageIntro eyebrow="RUANG BERKARYA · NUSANTARA GIFT" title={<><span className="hidden sm:inline">Selamat datang, Artisan.</span><span className="sm:hidden">Ruang berkarya</span></>} description={<><span className="hidden sm:inline">Kendalikan karya, pesanan, dan perkembangan tokomu dari satu ruang.</span><span className="sm:hidden">Perkembangan tokomu dalam satu genggaman.</span></> }
        action={<a href="/seller/products/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#431714] px-5 text-[10px] font-bold text-[#FFFDF8] transition hover:bg-[#61251E]"><PackagePlus size={14}/> Tambah produk</a>}/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="PENJUALAN BULAN INI" value={loading ? "—" : money(revenue)} note={`${paid.length} transaksi lunas`} icon={Wallet}/>
        <Stat label="PESANAN AKTIF" value={loading ? "—" : orders.filter(o => !["completed", "cancelled"].includes(o.order_status)).length} note={`${newOrders.length} perlu diproses`} icon={ShoppingBag}/>
        <Stat label="PRODUK TAYANG" value={loading ? "—" : activeProducts.length} note={`${pendingProducts.length} menunggu kurasi`} icon={Package}/>
        <Stat label="STOK MENIPIS" value={loading ? "—" : lowStock.length} note="Perbarui ketersediaan" icon={Boxes}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <article className="min-h-[385px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-display text-[20px] text-[#431714]">Aktivitas terbaru</h3><a href="/seller/orders" className="text-[9px] font-bold text-[#93372A]">Lihat semua <ArrowUpRight size={12} className="inline"/></a></div>
          <div className="mt-4 hidden grid-cols-[1fr_1.2fr_.8fr_.8fr] border-y border-[#DCD2C1] py-3 text-[8px] font-bold tracking-[.12em] text-[#7A6C5E] sm:grid"><span>PESANAN</span><span>PRODUK</span><span>NILAI</span><span>STATUS</span></div>
          {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat aktivitas...</p> : latestOrders.length === 0 ? <div className="py-12 text-center"><ShoppingBag size={25} className="mx-auto text-[#C7B69F]"/><p className="mt-3 text-[11px] text-[#7A6C5E]">Belum ada aktivitas pesanan.</p></div> :
            latestOrders.map(order => <div key={order.id} className="grid gap-1 border-b border-[#E8DFD2] py-3 text-[10px] sm:grid-cols-[1fr_1.2fr_.8fr_.8fr] sm:items-center sm:gap-3">
              <span className="font-bold text-[#251E1A]">{order.order_number}</span><span className="text-[#7A6C5E]">{order.items[0]?.product_name ?? "Pesanan produk"}</span><span className="text-[#7A6C5E]">{money(order.items.reduce((s, i) => s + i.line_total, 0))}</span><span><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${statusClass(order.order_status)}`}>{labels[order.order_status] ?? order.order_status}</span></span>
            </div>)}
        </article>
        <aside className="min-h-[385px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Perlu perhatian</h3>
          <div className="mt-5 space-y-0">
            {[{ title: "Stok menipis", detail: `${lowStock.length} produk perlu diperbarui`, count: lowStock.length, href: "#products", action: "Cek stok" },
              { title: "Kurasi produk", detail: `${pendingProducts.length} produk sedang ditinjau`, count: pendingProducts.length, href: "#products", action: "Proses" },
              { title: "Pesanan baru", detail: `${newOrders.length} pesanan menunggu konfirmasi`, count: newOrders.length, href: "#orders", action: "Buka" }].map(item =>
              <div key={item.title} className="flex items-start justify-between gap-3 border-b border-[#DCD2C1] py-4 last:border-0">
                <div><p className="text-[10px] font-semibold text-[#251E1A]">{item.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{item.detail}</p></div>
                <a href={item.href} className="shrink-0 rounded-full bg-[#F7F1E3] px-3 py-1.5 text-[9px] font-bold text-[#93372A]">{item.action} · {item.count}</a>
              </div>)}
          </div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "products" && (
<section id="products" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="RUANG BERKARYA · KATALOG" title="Koleksi karya Anda" description="Atur produk, cerita, harga, stok, dan tampilan toko."
        action={<a href="/seller/products/new" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#431714] px-5 text-[10px] font-bold text-[#FFFDF8]"><PackagePlus size={14}/> Tambah produk</a>}/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="TOTAL PRODUK" value={loading ? "—" : products.length} note={`${activeProducts.length} aktif`} icon={Package}/>
        <Stat label="MENUNGGU KURASI" value={loading ? "—" : pendingProducts.length} note="Dalam antrean admin" icon={Clock3}/>
        <Stat label="STOK MENIPIS" value={loading ? "—" : lowStock.length} note="Maksimal 5 unit" icon={Boxes}/>
      </div>
      {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#171D19]/60 p-4">
        <form onSubmit={saveProductEdit} className="my-auto w-full max-w-2xl rounded-2xl border border-[#DCD2C1] bg-[#FDFAF3] p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-3 border-b border-[#DCD2C1] pb-4"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#C79854]">PRODUCT MANAGEMENT</p><h3 className="mt-1 font-display text-[24px] text-[#431714]">Edit detail produk</h3><p className="mt-1 text-[9px] text-[#7A6C5E]">Perbarui informasi, harga, foto, dan stok produk.</p></div><button type="button" onClick={()=>setEditing(null)} className="rounded-full border border-[#DCD2C1] px-3 py-1.5 text-[10px]">Tutup</button></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-[9px] font-bold text-[#7A6C5E]">NAMA PRODUK<input required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold text-[#7A6C5E]">KATEGORI<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"><option value="cerita">Cerita</option><option value="rasa">Rasa</option><option value="budaya">Budaya</option></select></label>
            <label className="text-[9px] font-bold text-[#7A6C5E]">HARGA (RP)<input required type="number" min="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold text-[#7A6C5E]">STOK<input required type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold text-[#7A6C5E] sm:col-span-2">CERITA PRODUK<textarea required minLength={10} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold text-[#7A6C5E] sm:col-span-2">URL FOTO<input type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="URL publik Google Drive / Imgur / gambar langsung" className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] text-[#251E1A]"/></label>
          </div>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditing(null)} className="rounded-full border border-[#DCD2C1] px-4 py-2.5 text-[9px] font-bold text-[#7A6C5E]">Batal</button><button disabled={saving} className="rounded-full bg-[#431714] px-5 py-2.5 text-[9px] font-bold text-white disabled:opacity-50">{saving?"Menyimpan...":"Simpan perubahan"}</button></div>
        </form>
      </div>}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Semua produk</h3>
          <div className="my-4 flex flex-wrap gap-2">{[{id:"all",label:"Semua"},{id:"active",label:"Tayang"},{id:"pending",label:"Review"},{id:"rejected",label:"Perlu revisi"},{id:"archived",label:"Arsip"}].map(f=><button key={f.id} onClick={()=>setProductFilter(f.id)} className={`rounded-full px-3 py-2 text-[9px] font-bold ${productFilter===f.id ? "bg-[#431714] text-white" : "border border-[#DCD2C1] text-[#7A6C5E]"}`}>{f.label}</button>)}</div>
          <div className="hidden grid-cols-[1.4fr_.55fr_.8fr_.8fr] border-y border-[#DCD2C1] py-3 text-[8px] font-bold tracking-[.12em] text-[#7A6C5E] sm:grid"><span>NAMA PRODUK</span><span>STOK</span><span>HARGA</span><span>STATUS</span></div>
          {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat katalog...</p> : filteredProducts.length === 0 ? <p className="py-10 text-center text-[11px] text-[#7A6C5E]">Belum ada produk pada kategori ini.</p> :
            filteredProducts.map(p => <div key={p.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#E8DFD2] py-3 sm:grid-cols-[1.4fr_.55fr_.8fr_.8fr] sm:items-center">
              <div className="flex min-w-0 items-center gap-3">{typeof p.metadata?.image === "string" && p.metadata.image ? <img src={imageUrl(p.metadata.image)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover"/> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3EBDD] text-[#9A713A]"><Package size={17}/></span>}<div className="min-w-0"><p className="truncate text-[10px] font-semibold text-[#251E1A]">{p.name}</p><p className="text-[9px] text-[#7A6C5E] sm:hidden">{money(p.price)} · {p.stock} stok</p>{p.moderation_note && <p className="mt-1 line-clamp-1 text-[8px] text-[#93372A]">{p.moderation_note}</p>}</div></div>
              <span className="text-[10px] text-[#7A6C5E]">{p.stock}</span><span className="hidden text-[10px] text-[#7A6C5E] sm:block">{money(p.price)}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-bold ${statusClass(p.status)}`}>{p.status === "archived" ? "Diarsipkan" : (labels[p.status] ?? p.status)}</span>
              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-4">
                <button disabled={busy===p.id} onClick={()=>openEdit(p)} className="rounded-full border border-[#DCD2C1] px-3 py-1.5 text-[8px] font-bold text-[#431714] hover:bg-[#F3EBDD]">Edit detail</button>
                <button disabled={busy===p.id || p.stock===0 || p.status==="archived"} onClick={()=>void changeProduct(p.id,"stock",-1)} className="h-7 w-7 rounded-full border border-[#DCD2C1] text-[12px] font-bold disabled:opacity-30" aria-label="Kurangi stok">−</button>
                <button disabled={busy===p.id || p.status==="archived"} onClick={()=>void changeProduct(p.id,"stock",1)} className="h-7 w-7 rounded-full border border-[#DCD2C1] text-[12px] font-bold disabled:opacity-30" aria-label="Tambah stok">+</button>
                <span className="text-[8px] text-[#7A6C5E]">Atur stok cepat</span>
                {p.status==="archived" ? <button disabled={busy===p.id} onClick={()=>void changeProduct(p.id,"restore")} className="ml-auto rounded-full bg-[#4F6E59] px-3 py-1.5 text-[8px] font-bold text-white">Pulihkan</button> : <button disabled={busy===p.id} onClick={()=>void archiveProduct(p.id)} className="ml-auto rounded-full border border-[#E6C7BD] px-3 py-1.5 text-[8px] font-bold text-[#93372A]">Arsipkan</button>}
              </div>
            </div>)}
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Sorotan katalog</h3>
          <div className="mt-5 space-y-5">
            <div><p className="text-[10px] font-semibold">Produk unggulan</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{bestSeller?.name ?? "Belum ada data produk terjual"}</p><p className="mt-1 text-[9px] text-[#4F6E59]">{bestSeller ? `${bestSeller.quantity} unit terjual` : "Akan tampil setelah ada transaksi"}</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Kualitas stok</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{lowStock.length ? `${lowStock.length} produk perlu ditambah stok` : "Tidak ada stok kritis"}</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Status kurasi</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{pendingProducts.length} produk menunggu tinjauan admin</p></div>
          </div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "add-product" && (
<section id="add-product" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="RUANG BERKARYA · PUBLIKASI" title="Ciptakan cerita baru" description="Lengkapi detail produk agar pembeli memahami nilai di balik karya."/>
      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <form onSubmit={submit} className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-[#DCD2C1] pb-4"><div><p className="text-[8px] font-bold tracking-[.14em] text-[#C79854]">LANGKAH</p><p className="mt-1 font-display text-[20px] text-[#431714]">01 / 03 · Informasi produk</p></div><span className="rounded-full bg-[#F3EBDD] px-3 py-2 text-[9px] font-bold text-[#4F6E59]">Bisa disimpan draft</span></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E]">NAMA PRODUK<input required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Hampers Pesisir" className="mt-2 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium tracking-normal text-[#251E1A] outline-none focus:border-[#93372A]"/></label>
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E]">KATEGORI<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium tracking-normal text-[#251E1A]"><option value="cerita">Cerita</option><option value="rasa">Rasa</option><option value="budaya">Budaya</option></select></label>
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E]">HARGA JUAL (RP)<input required type="number" min="1" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="485000" className="mt-2 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium tracking-normal text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E]">JUMLAH STOK<input required type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} placeholder="24" className="mt-2 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium tracking-normal text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E] sm:col-span-2">CERITA PRODUK<textarea required minLength={10} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Ceritakan asal, bahan, proses pembuatan, dan nilai di balik karya..." className="mt-2 w-full resize-y rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium leading-5 tracking-normal text-[#251E1A]"/></label>
            <label className="text-[9px] font-bold tracking-[.08em] text-[#7A6C5E] sm:col-span-2">FOTO UTAMA · URL GAMBAR PUBLIK<input type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="Tempel link Google Drive, Imgur, atau URL gambar langsung" className="mt-2 w-full rounded-lg border border-[#DCD2C1] bg-white px-3 py-3 text-[11px] font-medium tracking-normal text-[#251E1A]"/><span className="mt-2 block text-[9px] font-normal tracking-normal text-[#8D7E6D]">Gunakan link yang dapat diakses publik. Untuk Google Drive, ubah akses menjadi “Anyone with the link”.</span></label>
            {form.imageUrl && <div className="sm:col-span-2"><div className="flex items-center gap-4 rounded-lg border border-[#E7DDCC] bg-white p-3"><img src={imageUrl(form.imageUrl)} alt="Pratinjau foto produk" className="h-20 w-20 rounded-md bg-[#F7F1E3] object-cover" onError={e=>{e.currentTarget.style.visibility="hidden";}}/><div><p className="text-[10px] font-bold text-[#431714]">Pratinjau foto utama</p><p className="mt-1 text-[9px] text-[#7A6C5E]">Pastikan foto tajam, terang, dan menampilkan produk secara jelas.</p></div></div></div>}
          </div>
          <button disabled={saving} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[#431714] px-6 text-[10px] font-bold text-white disabled:opacity-50">{saving ? "Mengirim..." : "Kirim untuk kurasi"} <ArrowRight size={14}/></button>
        </form>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <p className="text-[8px] font-bold tracking-[.14em] text-[#C79854]">KELENGKAPAN</p><h3 className="mt-2 font-display text-[20px] text-[#431714]">Panduan publikasi</h3>
          <div className="mt-5 space-y-4">
            {[{title:"Informasi produk",detail:"Nama, kategori, harga, dan stok wajib diisi.",icon:PackageCheck},{title:"Foto utama",detail:"Gunakan URL gambar yang dapat dibuka tanpa login.",icon:ImagePlus},{title:"Cerita produk",detail:"Jelaskan asal, bahan, dan proses pembuatan.",icon:Sparkles}].map(x=><div key={x.title} className="flex gap-3 border-b border-[#E8DFD2] pb-4 last:border-0"><span className="rounded-lg bg-[#F3EBDD] p-2 text-[#93372A]"><x.icon size={16}/></span><div><p className="text-[10px] font-semibold">{x.title}</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">{x.detail}</p></div></div>)}
          </div>
          <div className="mt-2 rounded-lg bg-[#F7F1E3] p-4"><p className="text-[9px] font-bold text-[#93372A]">STATUS PUBLIKASI</p><p className="mt-1 text-[10px] text-[#7A6C5E]">Produk baru akan masuk status menunggu kurasi setelah dikirim.</p></div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "orders" && (
<section id="orders" className="mt-12 scroll-mt-24">
      <div className="mb-5 rounded-[16px] bg-[#431714] px-5 py-5 text-white sm:px-7"><p className="text-[8px] font-bold tracking-[.16em] text-[#D8B77C]">ARTISAN ATELIER · ORDER DESK</p><h3 className="mt-2 font-display text-[23px]">Pesanan adalah cerita yang harus sampai.</h3><p className="mt-2 max-w-xl text-[10px] leading-5 text-[#E7D7C4]">Kelola pesanan baru, siapkan paket, dan perbarui nomor resi dari satu tempat.</p></div><PageIntro eyebrow="RUANG BERKARYA · PEMENUHAN" title="Pesanan & pemenuhan" description="Pastikan hadiah tiba dengan cerita terbaik." action={<span className="rounded-full bg-[#F3EBDD] px-4 py-2 text-[9px] font-bold text-[#93372A]">{newOrders.length} pesanan baru</span>}/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="PESANAN BARU" value={loading ? "—" : newOrders.length} note="Perlu konfirmasi" icon={ShoppingBag}/>
        <Stat label="DIPROSES" value={loading ? "—" : processing.length} note="Sedang disiapkan" icon={PackageCheck}/>
        <Stat label="DALAM PENGIRIMAN" value={loading ? "—" : shipped.length} note="Lacak pengiriman" icon={Truck}/>
      </div>
      <div className="mt-4 rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-[20px] text-[#431714]">Daftar pesanan</h3><div className="flex flex-wrap gap-2">{[{id:"all",label:"Semua"},{id:"new",label:"Baru"},{id:"processing",label:"Diproses"},{id:"shipped",label:"Dikirim"}].map(f=><button key={f.id} onClick={()=>setOrderFilter(f.id)} className={`rounded-full px-3 py-2 text-[9px] font-bold ${orderFilter===f.id ? "bg-[#431714] text-white" : "border border-[#DCD2C1] text-[#7A6C5E]"}`}>{f.label}</button>)}</div></div>
        {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat pesanan...</p> : filteredOrders.length === 0 ? <div className="py-12 text-center"><ShoppingBag size={25} className="mx-auto text-[#C7B69F]"/><p className="mt-3 text-[11px] text-[#7A6C5E]">Tidak ada pesanan pada kategori ini.</p></div> :
          <div className="mt-4 space-y-3">{filteredOrders.map(order=><article key={order.id} className="rounded-lg border border-[#E7DDCC] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-bold text-[#93372A]">{order.order_number} · {date(order.created_at)}</p><p className="mt-1 text-[11px] font-semibold">{order.recipient_name}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{order.recipient_phone} · {String(order.shipping_address?.address ?? "Alamat tersedia di detail pesanan")}</p></div><span className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${statusClass(order.order_status)}`}>{labels[order.order_status] ?? order.order_status}</span></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DFD2] pt-3"><div className="text-[9px] text-[#7A6C5E]">{order.items.map(i=>`${i.product_name} × ${i.quantity}`).join(" · ")}<p className="mt-1 font-bold text-[#431714]">{money(order.items.reduce((s,i)=>s+i.line_total,0))}</p></div>
              {order.payment_status === "paid" && order.order_status === "paid" && <button disabled={busy===order.order_number} onClick={()=>void updateOrder(order.order_number,"processing")} className="rounded-full bg-[#431714] px-4 py-2.5 text-[9px] font-bold text-white disabled:opacity-50">{busy===order.order_number ? "Memproses..." : "Terima pesanan"}</button>}
              {order.payment_status === "paid" && order.order_status === "processing" && <div className="grid w-full gap-2 sm:max-w-[420px] sm:grid-cols-2"><input value={shipping[order.order_number]?.courier ?? ""} onChange={e=>setShipping(v=>({...v,[order.order_number]:{courier:e.target.value,tracking:v[order.order_number]?.tracking ?? ""}}))} placeholder="Kurir (JNE, J&T...)" className="rounded-lg border border-[#DCD2C1] px-3 py-2 text-[9px]"/><input value={shipping[order.order_number]?.tracking ?? ""} onChange={e=>setShipping(v=>({...v,[order.order_number]:{courier:v[order.order_number]?.courier ?? "",tracking:e.target.value}}))} placeholder="Nomor resi" className="rounded-lg border border-[#DCD2C1] px-3 py-2 text-[9px]"/><button disabled={busy===order.order_number} onClick={()=>void updateOrder(order.order_number,"shipped")} className="rounded-full bg-[#4F6E59] px-4 py-2.5 text-[9px] font-bold text-white disabled:opacity-50 sm:col-span-2">Tandai pesanan dikirim</button></div>}
              {order.tracking_number && <p className="text-[9px] text-[#4F6E59]">Resi {order.shipping_courier}: {order.tracking_number}</p>}
            </div>
          </article>)}</div>}
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "analytics" && (
<section id="analytics" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="RUANG BERKARYA · ANALITIK" title="Cerita di balik angka" description="Pahami performa toko dan temukan peluang pertumbuhan."/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="PENDAPATAN TERCATAT" value={loading ? "—" : money(revenue)} note={`${paid.length} pesanan dibayar`} icon={Wallet}/>
        <Stat label="PRODUK TERLARIS" value={bestSeller?.name ?? "—"} note={bestSeller ? `${bestSeller.quantity} unit terjual` : "Belum ada penjualan"} icon={Package}/>
        <Stat label="PESANAN DIBAYAR" value={loading ? "—" : paid.length} note="Berdasarkan transaksi lunas" icon={ShoppingBag}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <div className="flex items-center justify-between"><h3 className="font-display text-[20px] text-[#431714]">Performa penjualan</h3><BarChart3 size={18} className="text-[#C79854]"/></div>
          <div className="mt-6 grid grid-cols-4 gap-3">{weekly.map(w=><div key={w.label} className="flex flex-col items-center"><div className="flex h-36 w-full items-end rounded-t-md bg-[#F4EDE0]"><div className="w-full rounded-t-md bg-[#93372A]" style={{height:`${w.amount ? Math.max(5, w.amount/maxWeekly*100) : 3}%`}}/></div><p className="mt-2 text-[8px] font-bold text-[#7A6C5E]">{w.label}</p><p className="mt-1 text-[8px] text-[#4F6E59]">{w.orders} pesanan</p></div>)}</div>
          <div className="mt-4 border-t border-[#DCD2C1] pt-3 text-[9px] text-[#7A6C5E]">Ringkasan berdasarkan pesanan berstatus pembayaran berhasil pada 28 hari terakhir.</div>
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Insight toko</h3>
          <div className="mt-5 space-y-4">
            <div><p className="text-[10px] font-semibold">Kategori katalog</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{products.length} produk tercatat di toko.</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Ketersediaan stok</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{lowStock.length ? `${lowStock.length} produk perlu restock.` : "Stok aktif tidak berada di ambang rendah."}</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Peluang</p><p className="mt-1 text-[9px] text-[#7A6C5E]">Lengkapi cerita dan foto produk agar calon pembeli mengenal karya lebih dekat.</p></div>
          </div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "profile" && (
<section id="profile" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="RUANG BERKARYA · IDENTITAS" title="Identitas sang perajin" description="Tampilkan kisah, proses, dan nilai yang membuat toko berbeda."/>
      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-[20px] text-[#431714]">Informasi toko</h3><span className={`rounded-full px-3 py-1.5 text-[9px] font-bold ${statusClass(profile?.status ?? "pending")}`}>{profile?.status === "approved" ? "Terverifikasi" : (profile?.status ?? "Status belum tersedia")}</span></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[{label:"NAMA TOKO",value:profile?.business_name ?? "Belum diatur"},{label:"SLUG TOKO",value:profile?.slug ?? "—"},{label:"TANGGAL BERGABUNG",value:profile?.created_at ? date(profile.created_at) : "—"},{label:"STATUS VERIFIKASI",value:profile?.status === "approved" ? "Terverifikasi · Aktif" : (profile?.status ?? "Belum tersedia")}].map(x=><div key={x.label} className="border-b border-[#E8DFD2] pb-3"><p className="text-[8px] font-bold tracking-[.12em] text-[#7A6C5E]">{x.label}</p><p className="mt-2 text-[11px] font-semibold text-[#251E1A]">{x.value}</p></div>)}
          </div>
          <div className="mt-5"><p className="text-[8px] font-bold tracking-[.12em] text-[#7A6C5E]">TENTANG ARTISAN</p><p className="mt-2 text-[11px] leading-6 text-[#7A6C5E]">{profile?.description || "Cerita dan proses pembuatan karya belum ditambahkan pada profil toko."}</p></div>
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <p className="text-[8px] font-bold tracking-[.14em] text-[#C79854]">ETALASE TOKO</p><h3 className="mt-2 font-display text-[20px] text-[#431714]">Kualitas cerita</h3>
          <div className="mt-5 space-y-4 text-[10px]"><div><p className="font-semibold">Foto produk</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Gunakan foto yang tajam dan konsisten untuk seluruh katalog.</p></div><div className="border-t border-[#DCD2C1] pt-4"><p className="font-semibold">Cerita artisan</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Ceritakan asal, proses, dan nilai yang diwariskan melalui karya.</p></div><div className="border-t border-[#DCD2C1] pt-4"><p className="font-semibold">Kebijakan toko</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Pastikan informasi pengiriman dan ketersediaan produk selalu akurat.</p></div></div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "help" && (
<section id="help" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="RUANG BERKARYA · DUKUNGAN" title="Pusat bantuan" description="Panduan singkat untuk mengelola katalog, pesanan, dan kehadiran toko."/>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{title:"Mengelola katalog",detail:"Pelajari cara menambah produk, foto, harga, dan stok.",icon:Package},{title:"Memproses pesanan",detail:"Terima pesanan yang sudah dibayar dan tambahkan nomor resi.",icon:Truck},{title:"Menjaga profil toko",detail:"Pastikan cerita artisan dan informasi toko selalu akurat.",icon:Store}].map(x=><article key={x.title} className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5"><x.icon size={19} className="text-[#C79854]"/><h3 className="mt-4 font-display text-[18px] text-[#431714]">{x.title}</h3><p className="mt-2 text-[10px] leading-5 text-[#7A6C5E]">{x.detail}</p></article>)}
      </div>
      <EditorialFooter/>
    </section>
)}
  </DashboardShell>;
}
