"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle, ArrowRight, ArrowUpRight, BadgeCheck, Check, Clock3, FileText,
  Package, RefreshCw, ShieldCheck, ShoppingBag, Store, Truck, Users, Wallet,
  X, Activity, Settings, ClipboardCheck, type LucideIcon,
} from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Product = {
  id: string; name: string; description: string | null; price: number; stock: number;
  seller_name: string; category_name: string; created_at: string; status: string; metadata?: Record<string, unknown>;
};
type AdminNotice = { id: string; title: string; message: string; type: string; created_at: string };
type Order = {
  id: string; order_number: string; recipient_name: string; recipient_phone: string;
  shipping_address: Record<string, unknown>; subtotal: number; gift_card_fee: number;
  shipping_cost: number; total_amount: number; order_status: string; payment_status: string;
  shipping_quote_status: string; created_at: string; payment_method?: string | null;
  order_items: { product_name: string; quantity: number; line_total: number }[];
};
type Trend = { date: string; label: string; orders: number; revenue: number };
type Seller = { user_id: string; name: string; status: string; created_at: string; description?: string | null; slug?: string };
type Metrics = {
  totalOrders: number; paidOrders: number; pendingShipping: number; revenue: number;
  totalProducts: number; activeProducts: number; pendingProducts: number; lowStock: number;
  totalSellers: number; activeSellers: number;
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
function statusClass(status: string) {
  if (["active", "approved", "paid", "completed", "delivered", "shipped", "success"].includes(status)) return "bg-[#F3EBDD] text-[#93372A]";
  if (["rejected", "cancelled", "failed"].includes(status)) return "bg-[#F8E9E5] text-[#93372A]";
  return "bg-[#F6EFDF] text-[#9A713A]";
}
function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: React.ReactNode; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">{eyebrow}</p><h2 className="mt-2 font-display text-[32px] leading-[1.1] text-[#431714] sm:text-[36px]">{title}</h2><p className="mt-2 max-w-[700px] text-[11px] leading-5 text-[#7A6C5E]">{description}</p></div>{action}
  </div>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: React.ReactNode; note: string; icon: LucideIcon }) {
  return <article className="min-h-[112px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-4 sm:p-[17px]">
    <div className="flex items-center justify-between gap-2"><p className="text-[8px] font-bold tracking-[.12em] text-[#7A6C5E]">{label}</p><Icon size={15} strokeWidth={1.7} className="text-[#C79854]"/></div>
    <p className="mt-3 font-display text-[27px] leading-none text-[#431714]">{value}</p><p className="mt-2 text-[9px] font-semibold text-[#93372A]">{note}</p>
  </article>;
}
function EditorialFooter() {
  return <div className="mt-7 rounded-[13px] bg-[#431714] px-6 py-6 text-[#FFFDF8] sm:px-7 sm:py-7">
    <p className="text-[8px] font-bold tracking-[.14em] text-[#C79854]">NUSANTARA GIFT　/　CURATED WITH CARE</p>
    <p className="mt-5 max-w-[950px] font-display text-[22px] leading-[1.25] sm:text-[25px]">Menjaga kualitas, kepercayaan, dan cerita di balik setiap hadiah Nusantara.</p>
    <p className="mt-6 text-[9px] text-[#DBC7AB]">The standard behind every meaningful gift</p>
  </div>;
}

export default function AdminDashboardPage({ module = "overview" }: { module?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editValues, setEditValues] = useState({ name: "", description: "", price: "", stock: "" });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createValues, setCreateValues] = useState({ sellerId: "", name: "", description: "", category: "cerita", price: "", stock: "1", imageUrl: "" });
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0, paidOrders: 0, pendingShipping: 0, revenue: 0, totalProducts: 0,
    activeProducts: 0, pendingProducts: 0, lowStock: 0, totalSellers: 0, activeSellers: 0,
  });
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shipping, setShipping] = useState<Record<string, string>>({});
  const [orderFilter, setOrderFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/admin/overview", { cache: "no-store" });
      const d = await r.json();
      if (r.status === 401 || r.status === 403) { router.replace("/login"); return; }
      if (!r.ok) throw new Error(d.error || "Dashboard admin gagal dimuat.");
      setProducts(d.products ?? []); setCatalog(d.catalog ?? []); setNotices(d.notifications ?? []); setOrders(d.orders ?? []); setMetrics(d.metrics ?? { totalOrders: 0, paidOrders: 0, pendingShipping: 0, revenue: 0, totalProducts: 0, activeProducts: 0, pendingProducts: 0, lowStock: 0, totalSellers: 0, activeSellers: 0 });
      setSellers(d.sellers ?? []); setTrend(d.trend ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Terjadi kesalahan saat memuat dashboard."); }
    finally { setLoading(false); }
  }, [router]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      channel = supabase.channel("admin-activity-notifications")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const notice = payload.new as AdminNotice;
            setNotices(current => [notice, ...current.filter(item => item.id !== notice.id)].slice(0, 10));
          })
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);


  async function review(id: string, status: "active" | "rejected") {
    setBusy(id); setError(""); setMessage("");
    try {
      const r = await fetch(`/api/admin/products/${id}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: status === "rejected" ? "Mohon perbaiki informasi produk dan ajukan kembali." : null }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Moderasi gagal.");
      setMessage(status === "active" ? "Produk disetujui dan dipublikasikan." : "Produk dikembalikan untuk perbaikan.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Moderasi gagal."); }
    finally { setBusy(""); }
  }

  async function manageProduct(id: string, action: "archive" | "restore" | "stock", delta?: number) {
    setBusy(id); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, delta }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Produk gagal diperbarui.");
      setMessage(action === "stock" ? "Stok produk diperbarui." : action === "archive" ? "Produk diarsipkan. Riwayat tetap tersedia." : "Produk dikembalikan ke antrean kurasi.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Produk gagal diperbarui."); }
    finally { setBusy(""); }
  }

  async function createAdminProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy("create"); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/overview", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createValues, price: Number(createValues.price), stock: Number(createValues.stock) }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Produk gagal dibuat.");
      setCreatingProduct(false); setCreateValues({ sellerId: "", name: "", description: "", category: "cerita", price: "", stock: "1", imageUrl: "" });
      setMessage("Produk berhasil dibuat dan masuk antrean kurasi."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Produk gagal dibuat."); }
    finally { setBusy(""); }
  }

  async function markNoticeRead(notificationId: string) {
    try {
      const r = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_notification_read", notificationId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Notifikasi gagal diperbarui.");
      setNotices(current => current.filter(item => item.id !== notificationId));
    } catch (e) { setError(e instanceof Error ? e.message : "Notifikasi gagal diperbarui."); }
  }

  async function saveAdminProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editingProduct) return;
    setBusy(editingProduct.id); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/overview", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingProduct.id, ...editValues, price: Number(editValues.price), stock: Number(editValues.stock) }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Perubahan produk gagal disimpan.");
      setEditingProduct(null); setMessage("Detail produk berhasil diperbarui."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Perubahan produk gagal disimpan."); }
    finally { setBusy(""); }
  }

  async function quote(orderNumber: string) {
    const amount = Number(shipping[orderNumber]);
    if (!Number.isSafeInteger(amount) || amount < 0) { setError("Masukkan ongkir berupa bilangan bulat rupiah."); return; }
    setBusy(orderNumber); setError(""); setMessage("");
    try {
      const r = await fetch("/api/admin/shipping-quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, shippingCost: amount }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Gagal menetapkan ongkir.");
      setMessage(`Ongkir ${money(amount)} ditetapkan untuk ${orderNumber}.`);
      setShipping(v => ({ ...v, [orderNumber]: "" })); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menetapkan ongkir."); }
    finally { setBusy(""); }
  }

  const awaiting = orders.filter(o => o.payment_status === "pending" && o.shipping_quote_status === "pending");
  const paid = orders.filter(o => o.payment_status === "paid");
  const maxTrendRevenue = Math.max(1, ...trend.map(day => day.revenue));
  const pendingSellers = sellers.filter(s => s.status !== "approved");
  const filteredOrders = useMemo(() => orders.filter(o =>
    orderFilter === "all" || (orderFilter === "shipping" && o.shipping_quote_status === "pending" && o.payment_status === "pending") ||
    (orderFilter === "paid" && o.payment_status === "paid") || (orderFilter === "cancelled" && o.order_status === "cancelled")
  ), [orders, orderFilter]);
  const priorityRows = [
    ...pendingSellers.slice(0, 2).map(s => ({ kind: "Verifikasi", name: s.name, when: date(s.created_at), status: "Review", href: "#verification" })),
    ...products.slice(0, 2).map(p => ({ kind: "Kurasi produk", name: p.name, when: date(p.created_at), status: "Review", href: "#curation" })),
    ...awaiting.slice(0, 1).map(o => ({ kind: "Pesanan", name: o.order_number, when: date(o.created_at), status: "Perlu ongkir", href: "#orders" })),
  ].slice(0, 5);

  return <DashboardShell role="ADMIN" title="Curator desk" subtitle="Jaga kualitas cerita dan pengalaman pelanggan." navItems={nav} mobileNavItems={mobileNav}>
    {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-[#E6C7BD] bg-[#F8E9E5] p-3 text-[11px] text-[#93372A]"><AlertCircle size={16} className="shrink-0"/>{error}</div>}
    {message && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#E6C7BD] bg-[#F3EBDD] p-3 text-[11px] text-[#93372A]"><Check size={15}/>{message}</div>}

    {module === "overview" && (
<section id="overview" className="scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · ADMINISTRATION" title={<><span className="hidden sm:inline">Menjaga kualitas setiap cerita</span><span className="sm:hidden">Curator desk</span></>} description={<><span className="hidden sm:inline">Pantau ekosistem, kepercayaan, dan kualitas pengalaman Nusantara Gift.</span><span className="sm:hidden">Jaga kualitas cerita dan pengalaman pelanggan.</span></>}
        action={<div className="flex flex-wrap gap-2"><button onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#DCD2C1] bg-[#FDFAF3] px-4 text-[9px] font-bold text-[#7A6C5E] disabled:opacity-50"><RefreshCw size={13} className={loading?"animate-spin":""}/> Perbarui</button><a href="/admin/umkm" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#431714] px-5 text-[9px] font-bold text-white">Buka pusat tinjauan <ArrowRight size={13}/></a></div>}/>
      {notices.length > 0 && <section className="mb-4 rounded-[13px] border border-[#D9B77C]/50 bg-[#FFF9EC] p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#9A713A]">ACTIVITY ALERTS</p><h3 className="mt-1 font-display text-[19px] text-[#431714]">Aktivitas mitra yang perlu diketahui</h3></div><span className="rounded-full bg-[#F6EFDF] px-3 py-1.5 text-[9px] font-bold text-[#9A713A]">{notices.length} baru</span></div>
        <div className="mt-3 space-y-2">{notices.map(n=><div key={n.id} className="rounded-lg border border-[#E9DCC4] bg-white/80 p-3"><p className="text-[10px] font-bold text-[#431714]">{n.title}</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">{n.message}</p><div className="mt-2 flex items-center justify-between gap-2"><p className="text-[8px] text-[#9A713A]">{date(n.created_at)}</p><button onClick={()=>void markNoticeRead(n.id)} className="text-[8px] font-bold text-[#93372A] hover:underline">Tandai dibaca</button></div></div>)}</div>
      </section>}
      <div className="mb-5 overflow-hidden rounded-[16px] bg-[#5A202A] px-5 py-5 text-white sm:px-7 sm:py-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[8px] font-bold tracking-[.2em] text-[#D8B77C]">NUSANTARA GIFT · PLATFORM CONTROL</p><h3 className="mt-2 font-display text-[24px] sm:text-[30px]">Good morning, Curator.</h3><p className="mt-2 max-w-xl text-[10px] leading-5 text-[#E9DCCB]">Satu ruang kendali untuk menjaga kualitas mitra, katalog, dan transaksi Nusantara.</p></div><div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3"><p className="text-[8px] tracking-[.14em] text-[#D8B77C]">PLATFORM STATUS</p><p className="mt-1 text-[11px] font-bold">All systems operational</p></div></div></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="UMKM AKTIF" value={loading ? "—" : metrics.activeSellers} note={`${pendingSellers.length} perlu ditinjau`} icon={Store}/>
        <Stat label="PRODUK TAYANG" value={loading ? "—" : metrics.activeProducts.toLocaleString("id-ID")} note={`${metrics.totalProducts} produk tercatat`} icon={Package}/>
        <Stat label="PESANAN BERJALAN" value={loading ? "—" : orders.filter(o=>!["completed","cancelled"].includes(o.order_status)).length} note={`${metrics.paidOrders} pembayaran berhasil`} icon={ShoppingBag}/>
        <Stat label="PERLU DITINJAU" value={loading ? "—" : pendingSellers.length + metrics.pendingProducts + awaiting.length} note="Prioritas hari ini" icon={Clock3}/>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat label="OMZET TEREKAM" value={loading ? "—" : money(metrics.revenue)} note="Pembayaran berhasil" icon={Wallet}/><Stat label="MENUNGGU ONGKIR" value={loading ? "—" : awaiting.length} note="Perlu penetapan admin" icon={Truck}/><Stat label="PRODUK DIKURASI" value={loading ? "—" : metrics.pendingProducts} note="Dalam antrean review" icon={ShieldCheck}/><Stat label="PESANAN SELESAI" value={loading ? "—" : orders.filter(o=>o.order_status==="completed").length} note="Berhasil diselesaikan" icon={BadgeCheck}/></div><article className="mt-4 rounded-[13px] border border-[#E9DCCB] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#93372A]">FINANCIAL OVERVIEW</p><h3 className="mt-1 font-display text-[20px] text-[#5A202A]">Rekapitulasi transaksi 7 hari</h3></div><p className="text-[9px] text-[#7A6C5E]">Omzet dari pembayaran berhasil</p></div><div className="mt-5 grid grid-cols-7 gap-2 sm:gap-4">{trend.map(day=><div key={day.date} className="flex min-w-0 flex-col items-center"><div className="flex h-24 w-full items-end rounded-t-md bg-[#F7F1E3] sm:h-28"><div title={money(day.revenue)} className="w-full rounded-t-md bg-[#93372A]" style={{height:`${day.revenue ? Math.max(5,day.revenue/maxTrendRevenue*100) : 2}%`}}/></div><p className="mt-2 text-[8px] font-semibold text-[#7A6C5E]">{day.label}</p><p className="mt-1 text-[8px] text-[#5A202A]">{day.orders} trx</p></div>)}</div><div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-[#E8DFD2] pt-3 text-[9px] text-[#7A6C5E]"><span>Total omzet tercatat</span><strong className="text-[12px] text-[#5A202A]">{money(metrics.revenue)}</strong></div></article><div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <article className="min-h-[385px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-display text-[20px] text-[#431714]">Antrean prioritas</h3><a href="/admin/umkm" className="text-[9px] font-bold text-[#93372A]">Lihat semua <ArrowUpRight size={12} className="inline"/></a></div>
          <div className="mt-4 hidden grid-cols-[.8fr_1.4fr_.7fr_.8fr] border-y border-[#DCD2C1] py-3 text-[8px] font-bold tracking-[.12em] text-[#7A6C5E] sm:grid"><span>JENIS</span><span>NAMA</span><span>MASUK</span><span>STATUS</span></div>
          {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat antrean...</p> : priorityRows.length === 0 ? <div className="py-12 text-center"><BadgeCheck size={25} className="mx-auto text-[#C7B69F]"/><p className="mt-3 text-[11px] text-[#7A6C5E]">Tidak ada pekerjaan prioritas saat ini.</p></div> :
            priorityRows.map((row, i)=><a key={`${row.kind}-${i}`} href={row.href} className="grid gap-1 border-b border-[#E8DFD2] py-4 text-[10px] transition hover:bg-[#F8F3E9] sm:grid-cols-[.8fr_1.4fr_.7fr_.8fr] sm:items-center sm:gap-3"><span className="font-semibold text-[#251E1A]">{row.kind}</span><span className="text-[#7A6C5E]">{row.name}</span><span className="text-[#7A6C5E]">{row.when}</span><span className="w-fit rounded-full bg-[#F6EFDF] px-2.5 py-1 text-[8px] font-bold text-[#9A713A]">{row.status}</span></a>)}
        </article>
        <aside className="min-h-[385px] rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Kesehatan ekosistem</h3>
          <div className="mt-5 space-y-0">
            {[{title:"Kepercayaan",detail:`${metrics.activeSellers} mitra aktif dari ${metrics.totalSellers} profil`,action:"Mitra",href:"#verification"},
              {title:"Kurasi",detail:`${metrics.pendingProducts} produk menunggu tinjauan`,action:"Tinjau",href:"#curation"},
              {title:"Transaksi",detail:`${awaiting.length} pesanan menunggu ongkir`,action:"Buka",href:"#orders"}].map(item=><div key={item.title} className="flex items-start justify-between gap-3 border-b border-[#DCD2C1] py-4 last:border-0"><div><p className="text-[10px] font-semibold">{item.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{item.detail}</p></div><a href={item.href} className="shrink-0 rounded-full bg-[#F7F1E3] px-3 py-1.5 text-[9px] font-bold text-[#93372A]">{item.action}</a></div>)}
          </div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "verification" && (
<section id="verification" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · PARTNER REVIEW" title="Para artisan di balik karya" description="Tinjau identitas, legalitas, dan cerita pelaku UMKM."/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="MENUNGGU REVIEW" value={loading ? "—" : pendingSellers.length} note="Perlu ditinjau" icon={Clock3}/>
        <Stat label="TERVERIFIKASI" value={loading ? "—" : metrics.activeSellers} note="Pelaku aktif" icon={BadgeCheck}/>
        <Stat label="TOTAL MITRA" value={loading ? "—" : metrics.totalSellers} note="Profil terdaftar" icon={Users}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Antrean verifikasi</h3>
          <div className="mt-4 hidden grid-cols-[1.2fr_.8fr_.7fr_.7fr] border-y border-[#DCD2C1] py-3 text-[8px] font-bold tracking-[.12em] text-[#7A6C5E] sm:grid"><span>NAMA USAHA</span><span>WILAYAH</span><span>BERGABUNG</span><span>STATUS</span></div>
          {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat mitra...</p> : sellers.length === 0 ? <p className="py-10 text-center text-[11px] text-[#7A6C5E]">Belum ada profil mitra.</p> :
            sellers.map((s,i)=><div key={`${s.slug ?? s.name}-${i}`} className="grid gap-1 border-b border-[#E8DFD2] py-4 text-[10px] sm:grid-cols-[1.2fr_.8fr_.7fr_.7fr] sm:items-center sm:gap-3"><div><p className="font-semibold">{s.name}</p><p className="mt-1 line-clamp-1 text-[9px] text-[#7A6C5E]">{s.description || "Deskripsi usaha belum tersedia."}</p></div><span className="text-[#7A6C5E]">Belum dicantumkan</span><span className="text-[#7A6C5E]">{date(s.created_at)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[8px] font-bold ${statusClass(s.status)}`}>{s.status === "approved" ? "Terverifikasi" : s.status}</span></div>)}
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Detail peninjauan</h3>
          <div className="mt-5 space-y-4">
            <div><p className="text-[10px] font-semibold">Identitas usaha</p><p className="mt-1 text-[9px] text-[#7A6C5E]">Periksa data profil dan dokumen pendukung pada proses verifikasi.</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Profil artisan</p><p className="mt-1 text-[9px] text-[#7A6C5E]">Pastikan cerita usaha dan informasi produk dapat dipertanggungjawabkan.</p></div>
            <div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Keputusan</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">MVP saat ini menampilkan status verifikasi. Aksi persetujuan dokumen belum dihubungkan ke alur data.</p></div>
          </div>
        </aside>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "curation" && (
<section id="curation" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · CATALOG QUALITY" title="Kurasi dengan penuh perhatian" description="Pastikan produk memenuhi standar kualitas dan cerita autentik." action={<span className="rounded-full bg-[#F6EFDF] px-4 py-2 text-[9px] font-bold text-[#9A713A]">{products.length} antrean aktif</span>}/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="MENUNGGU KURASI" value={loading ? "—" : metrics.pendingProducts} note="Antrean aktif" icon={Clock3}/>
        <Stat label="DISETUJUI" value={loading ? "—" : metrics.activeProducts} note="Produk tayang" icon={BadgeCheck}/>
        <Stat label="PERLU PERBAIKAN" value="—" note="Tercatat melalui status produk" icon={ClipboardCheck}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Produk dalam antrean</h3>
          {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat antrean kurasi...</p> : products.length === 0 ? <div className="py-12 text-center"><ShieldCheck size={25} className="mx-auto text-[#C7B69F]"/><p className="mt-3 text-[11px] text-[#7A6C5E]">Tidak ada produk yang menunggu kurasi.</p></div> :
            <div className="mt-4 space-y-3">{products.map(p=><div key={p.id} className="flex flex-col gap-3 rounded-lg border border-[#E7DDCC] bg-white p-4 sm:flex-row sm:items-center">
              {typeof p.metadata?.image === "string" && p.metadata.image ? <img src={p.metadata.image} alt="" className="h-16 w-16 rounded-md bg-[#F7F1E3] object-cover"/> : <span className="flex h-16 w-16 items-center justify-center rounded-md bg-[#F3EBDD] text-[#C79854]"><Package size={22}/></span>}
              <div className="min-w-0 flex-1"><p className="text-[8px] font-bold tracking-[.1em] text-[#C79854]">{p.category_name} · {p.seller_name}</p><h4 className="mt-1 text-[11px] font-bold text-[#251E1A]">{p.name}</h4><p className="mt-1 line-clamp-2 text-[9px] leading-4 text-[#7A6C5E]">{p.description || "Deskripsi produk belum tersedia."}</p><p className="mt-1 text-[9px] font-semibold text-[#431714]">{money(p.price)} · Stok {p.stock}</p></div>
              <div className="flex shrink-0 gap-2 sm:flex-col"><button disabled={busy===p.id} onClick={()=>void review(p.id,"active")} className="inline-flex items-center justify-center gap-1 rounded-full bg-[#93372A] px-3 py-2 text-[8px] font-bold text-white disabled:opacity-50"><Check size={12}/> Setujui</button><button disabled={busy===p.id} onClick={()=>void review(p.id,"rejected")} className="inline-flex items-center justify-center gap-1 rounded-full border border-[#E6C7BD] px-3 py-2 text-[8px] font-bold text-[#93372A] disabled:opacity-50"><X size={12}/> Minta revisi</button></div>
            </div>)}</div>}
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Panduan kurasi</h3>
          <div className="mt-5 space-y-4">{[{title:"Kualitas visual",detail:"Foto tajam, terang, dan konsisten."},{title:"Keaslian cerita",detail:"Asal, bahan, dan proses pembuatan jelas."},{title:"Kelayakan produk",detail:"Harga, stok, dan deskripsi sesuai."}].map(x=><div key={x.title} className="border-b border-[#DCD2C1] pb-4 last:border-0"><p className="text-[10px] font-semibold">{x.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{x.detail}</p></div>)}</div>
        </aside>
      </div>
      <article className="mt-5 rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#C79854]">PLATFORM CATALOG CONTROL</p><h3 className="mt-1 font-display text-[21px] text-[#431714]">Manajemen seluruh produk</h3><p className="mt-1 text-[9px] text-[#7A6C5E]">Admin dapat mengubah detail, stok, dan status arsip seluruh katalog.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-[#F3EBDD] px-3 py-2 text-[9px] font-bold text-[#93372A]">{catalog.length} produk</span><button onClick={()=>setCreatingProduct(true)} className="rounded-full bg-[#5A202A] px-4 py-2.5 text-[9px] font-bold text-white">+ Tambah produk</button></div></div>
        <div className="mt-4 space-y-3">{catalog.map(p=><div key={p.id} className="rounded-lg border border-[#E7DDCC] bg-white p-3">
          <div className="flex items-start gap-3"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F3EBDD]">{typeof p.metadata?.image==="string"&&p.metadata.image?<img src={p.metadata.image} alt={p.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-[#C79854]"><Package size={22}/></div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-bold tracking-[.1em] text-[#9A713A]">{p.seller_name} · {p.category_name}</p><p className="mt-1 text-[11px] font-bold text-[#251E1A]">{p.name}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{money(p.price)} · Stok {p.stock}</p></div><span className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${statusClass(p.status)}`}>{p.status==="archived"?"Diarsipkan":p.status==="active"?"Tayang":p.status==="pending_review"?"Menunggu kurasi":p.status}</span></div></div></div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#E8DFD2] pt-3"><button onClick={()=>{setEditingProduct(p);setEditValues({name:p.name,description:p.description??"",price:String(p.price),stock:String(p.stock)});}} className="rounded-full border border-[#DCD2C1] px-3 py-1.5 text-[8px] font-bold text-[#431714]">Edit detail</button><button disabled={busy===p.id||p.stock===0} onClick={()=>void manageProduct(p.id,"stock",-1)} className="h-7 w-7 rounded-full border border-[#DCD2C1] text-[12px] disabled:opacity-30">−</button><button disabled={busy===p.id} onClick={()=>void manageProduct(p.id,"stock",1)} className="h-7 w-7 rounded-full border border-[#DCD2C1] text-[12px] disabled:opacity-30">+</button><span className="text-[8px] text-[#7A6C5E]">Atur stok</span>{p.status==="archived"?<button onClick={()=>void manageProduct(p.id,"restore")} className="ml-auto rounded-full bg-[#93372A] px-3 py-1.5 text-[8px] font-bold text-white">Pulihkan</button>:<button onClick={()=>void manageProduct(p.id,"archive")} className="ml-auto rounded-full border border-[#E6C7BD] px-3 py-1.5 text-[8px] font-bold text-[#93372A]">Arsipkan</button>}</div>
        </div>)}</div>
      </article>
      {creatingProduct && <div className="fixed inset-0 z-[81] flex items-center justify-center overflow-y-auto bg-[#431714]/60 p-4"><form onSubmit={createAdminProduct} className="my-auto w-full max-w-xl rounded-2xl bg-[#FDFAF3] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#C79854]">ADMIN CATALOG CONTROL</p><h3 className="mt-1 font-display text-[23px] text-[#431714]">Buat produk untuk mitra</h3><p className="mt-1 text-[9px] text-[#7A6C5E]">Produk baru tetap melewati antrean kurasi sebelum tayang.</p></div><button type="button" onClick={()=>setCreatingProduct(false)} className="rounded-full border border-[#DCD2C1] px-3 py-1.5 text-[9px]">Tutup</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-[9px] font-bold text-[#7A6C5E] sm:col-span-2">MITRA UMKM<select required value={createValues.sellerId} onChange={e=>setCreateValues({...createValues,sellerId:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"><option value="">Pilih mitra terverifikasi</option>{sellers.filter(x=>x.status==="approved").map(x=><option key={x.user_id} value={x.user_id}>{x.name}</option>)}</select></label><label className="text-[9px] font-bold text-[#7A6C5E]">NAMA PRODUK<input required minLength={3} value={createValues.name} onChange={e=>setCreateValues({...createValues,name:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E]">KATEGORI<select value={createValues.category} onChange={e=>setCreateValues({...createValues,category:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"><option value="cerita">Cerita</option><option value="rasa">Rasa</option><option value="budaya">Budaya</option></select></label><label className="text-[9px] font-bold text-[#7A6C5E]">HARGA<input required type="number" min="1" value={createValues.price} onChange={e=>setCreateValues({...createValues,price:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E]">STOK<input required type="number" min="0" value={createValues.stock} onChange={e=>setCreateValues({...createValues,stock:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E] sm:col-span-2">DESKRIPSI<textarea required minLength={10} rows={3} value={createValues.description} onChange={e=>setCreateValues({...createValues,description:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E] sm:col-span-2">URL FOTO<input type="url" value={createValues.imageUrl} onChange={e=>setCreateValues({...createValues,imageUrl:e.target.value})} placeholder="Link gambar publik (opsional)" className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setCreatingProduct(false)} className="rounded-full border border-[#DCD2C1] px-4 py-2 text-[9px]">Batal</button><button disabled={busy==="create"} className="rounded-full bg-[#5A202A] px-5 py-2 text-[9px] font-bold text-white">{busy==="create"?"Membuat...":"Buat & kirim kurasi"}</button></div></form></div>}
      {editingProduct && <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#431714]/60 p-4"><form onSubmit={saveAdminProduct} className="my-auto w-full max-w-xl rounded-2xl bg-[#FDFAF3] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-bold tracking-[.16em] text-[#C79854]">ADMIN CATALOG CONTROL</p><h3 className="mt-1 font-display text-[23px] text-[#431714]">Edit produk</h3></div><button type="button" onClick={()=>setEditingProduct(null)} className="rounded-full border border-[#DCD2C1] px-3 py-1.5 text-[9px]">Tutup</button></div><div className="mt-5 grid gap-3"><label className="text-[9px] font-bold text-[#7A6C5E]">NAMA<input required minLength={3} value={editValues.name} onChange={e=>setEditValues({...editValues,name:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E]">DESKRIPSI<textarea required minLength={10} rows={3} value={editValues.description} onChange={e=>setEditValues({...editValues,description:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><div className="grid grid-cols-2 gap-3"><label className="text-[9px] font-bold text-[#7A6C5E]">HARGA<input required type="number" min="1" value={editValues.price} onChange={e=>setEditValues({...editValues,price:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label><label className="text-[9px] font-bold text-[#7A6C5E]">STOK<input required type="number" min="0" value={editValues.stock} onChange={e=>setEditValues({...editValues,stock:e.target.value})} className="mt-1.5 w-full rounded-lg border border-[#DCD2C1] bg-white p-3 text-[11px]"/></label></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setEditingProduct(null)} className="rounded-full border border-[#DCD2C1] px-4 py-2 text-[9px]">Batal</button><button disabled={busy===editingProduct.id} className="rounded-full bg-[#5A202A] px-5 py-2 text-[9px] font-bold text-white">Simpan perubahan</button></div></form></div>}
      <EditorialFooter/>
    </section>
)}

    {module === "orders" && (
<section id="orders" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · TRANSACTION OPERATIONS" title="Transparansi setiap transaksi" description="Awasi alur pembayaran, pesanan, dan penyelesaian transaksi."/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="NILAI TRANSAKSI" value={loading ? "—" : money(metrics.revenue)} note={`${metrics.paidOrders} pembayaran berhasil`} icon={Wallet}/>
        <Stat label="PEMBAYARAN PENDING" value={loading ? "—" : orders.filter(o=>o.payment_status==="pending").length} note="Perlu rekonsiliasi" icon={Clock3}/>
        <Stat label="PESANAN DIBAYAR" value={loading ? "—" : metrics.paidOrders} note="Pembayaran terkonfirmasi" icon={BadgeCheck}/>
      </div>
      <div className="mt-4 rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-[20px] text-[#431714]">Transaksi terbaru</h3><div className="flex flex-wrap gap-2">{[{id:"all",label:"Semua"},{id:"shipping",label:"Menunggu ongkir"},{id:"paid",label:"Lunas"},{id:"cancelled",label:"Dibatalkan"}].map(f=><button key={f.id} onClick={()=>setOrderFilter(f.id)} className={`rounded-full px-3 py-2 text-[9px] font-bold ${orderFilter===f.id ? "bg-[#431714] text-white" : "border border-[#DCD2C1] text-[#7A6C5E]"}`}>{f.label}</button>)}</div></div>
        {loading ? <p className="py-8 text-center text-[11px] text-[#7A6C5E]">Memuat transaksi...</p> : filteredOrders.length === 0 ? <p className="py-10 text-center text-[11px] text-[#7A6C5E]">Tidak ada transaksi pada filter ini.</p> :
          <div className="mt-4 space-y-3">{filteredOrders.map(o=><article key={o.id} className="rounded-lg border border-[#E7DDCC] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-[9px] font-bold text-[#93372A]">{o.order_number} · {date(o.created_at)}</p>{o.payment_method === "demo_seed" && <span className="rounded-full bg-[#F7F1E3] px-2 py-1 text-[7px] font-bold tracking-[.1em] text-[#93372A]">DEMO DATA</span>}</div><p className="mt-1 text-[11px] font-semibold">{o.recipient_name}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{o.recipient_phone} · {String(o.shipping_address?.address ?? "Alamat tidak tersedia")}</p></div><span className={`rounded-full px-3 py-1.5 text-[8px] font-bold ${statusClass(o.payment_status)}`}>{o.payment_status === "paid" ? "Berhasil" : o.order_status === "cancelled" ? "Dibatalkan" : o.shipping_quote_status === "quoted" ? "Menunggu pembayaran" : "Menunggu ongkir"}</span></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8DFD2] pt-3"><div className="text-[9px] text-[#7A6C5E]">{o.order_items.map(i=>`${i.product_name} × ${i.quantity}`).join(" · ")}<p className="mt-1 font-bold text-[#431714]">{money(o.total_amount)}</p></div>
              {o.payment_status==="pending" && o.shipping_quote_status==="pending" && o.order_status!=="cancelled" && <div className="flex w-full gap-2 sm:w-auto"><input type="number" min="0" step="1" value={shipping[o.order_number]??""} onChange={e=>setShipping(v=>({...v,[o.order_number]:e.target.value}))} placeholder="Ongkir (Rp)" className="min-w-0 flex-1 rounded-full border border-[#DCD2C1] px-3 py-2 text-[9px] sm:w-32"/><button disabled={busy===o.order_number} onClick={()=>void quote(o.order_number)} className="rounded-full bg-[#431714] px-4 py-2 text-[9px] font-bold text-white disabled:opacity-50">{busy===o.order_number ? "..." : "Tetapkan ongkir"}</button></div>}
            </div>
          </article>)}</div>}
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "reports" && (
<section id="reports" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · COMMUNITY CARE" title="Merawat ruang yang tepercaya" description="Tindak lanjuti masukan agar komunitas tetap aman dan saling menghargai."/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="LAPORAN TERBUKA" value="—" note="Sumber laporan belum terhubung" icon={FileText}/>
        <Stat label="DISELESAIKAN" value="—" note="Belum ada data penyelesaian" icon={BadgeCheck}/>
        <Stat label="RESPONS RATA-RATA" value="—" note="Menunggu integrasi modul laporan" icon={Clock3}/>
      </div>
      <div className="mt-4 rounded-[13px] border border-dashed border-[#D4C7B5] bg-[#FDFAF3] px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F3EBDD] text-[#C79854]"><FileText size={22}/></div>
        <h3 className="mt-4 font-display text-[22px] text-[#431714]">Modul laporan komunitas belum terhubung</h3>
        <p className="mx-auto mt-2 max-w-[460px] text-[10px] leading-5 text-[#7A6C5E]">Halaman ini disiapkan mengikuti rancangan Prestige. Data laporan, investigasi, dan tindak lanjut belum tersedia pada skema MVP saat ini.</p>
      </div>
      <EditorialFooter/>
    </section>
)}

    {module === "settings" && (
<section id="settings" className="mt-12 scroll-mt-24">
      <PageIntro eyebrow="NUSANTARA GIFT · PLATFORM GOVERNANCE" title="Standar operasional platform" description="Atur preferensi kurasi, keamanan, dan informasi operasional."/>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label="PERAN ADMIN" value="Admin" note="Akses terautentikasi" icon={ShieldCheck}/>
        <Stat label="PANDUAN KURASI" value="MVP" note="Standar operasional" icon={ClipboardCheck}/>
        <Stat label="AUDIT LOG" value="—" note="Belum diintegrasikan" icon={Activity}/>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <article className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5">
          <h3 className="font-display text-[20px] text-[#431714]">Pengaturan utama</h3>
          <div className="mt-4">{[{title:"Standar produk",detail:"Foto, deskripsi, kategori, dan stok produk.",tag:"Kurasi"},{title:"Verifikasi artisan",detail:"Status profil mitra dan pemeriksaan identitas.",tag:"Mitra"},{title:"Pembayaran",detail:"Penetapan ongkir dan status transaksi demo.",tag:"Transaksi"},{title:"Hak akses & keamanan",detail:"Pembatasan halaman berdasarkan role dan sesi.",tag:"Keamanan"}].map(x=><div key={x.title} className="flex items-center justify-between gap-3 border-b border-[#E8DFD2] py-4 last:border-0"><div><p className="text-[10px] font-semibold">{x.title}</p><p className="mt-1 text-[9px] text-[#7A6C5E]">{x.detail}</p></div><span className="rounded-full bg-[#F7F1E3] px-3 py-1.5 text-[8px] font-bold text-[#93372A]">{x.tag}</span></div>)}</div>
        </article>
        <aside className="rounded-[13px] border border-[#DCD2C1] bg-[#FDFAF3] p-5"><h3 className="font-display text-[20px] text-[#431714]">Akses & keamanan</h3><div className="mt-5 space-y-4"><div><p className="text-[10px] font-semibold">Role administrator</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Halaman admin dibatasi untuk akun dengan role admin yang valid.</p></div><div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Data transaksi</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Pembayaran pada MVP bersifat simulasi. Tidak ada pemrosesan uang sungguhan.</p></div><div className="border-t border-[#DCD2C1] pt-4"><p className="text-[10px] font-semibold">Audit aktivitas</p><p className="mt-1 text-[9px] leading-4 text-[#7A6C5E]">Pencatatan audit terpusat belum tersedia pada MVP.</p></div></div></aside>
      </div>
      <EditorialFooter/>
    </section>
)}
  </DashboardShell>;
}
