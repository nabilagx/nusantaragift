"use client";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, PackageCheck, Printer, RefreshCw, ShoppingBag, Truck } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Item = { product_name:string; quantity:number; unit_price:number; line_total:number };
type Order = {
 id:string; order_number:string; recipient_name:string; recipient_phone:string;
 shipping_address:Record<string,unknown>; subtotal:number; shipping_cost:number; total_amount:number;
 order_status:string; payment_status:string; created_at:string; tracking_number:string|null;
 shipping_courier:string|null; items:Item[];
};
const nav:DashboardNavItem[]=[
 {label:"Ringkasan",href:"/seller/dashboard",icon:"overview"},
 {label:"Katalog Produk",href:"/seller/products",icon:"products"},
 {label:"Cerita Audio",href:"/seller/stories",icon:"moderation"},
 {label:"Tambah Produk",href:"/seller/products/new",icon:"add"},
 {label:"Iklan & Promosi",href:"/seller/ads",icon:"ads"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Analitik Penjualan",href:"/seller/analytics",icon:"analytics"},
 {label:"Profil Toko",href:"/seller/profile",icon:"profile"},
 {label:"Pusat Bantuan",href:"/seller/help",icon:"help"},
];
const mobileNav:DashboardNavItem[]=[
 {label:"Beranda",href:"/seller/dashboard",icon:"overview"},
 {label:"Produk",href:"/seller/products",icon:"products"},
 {label:"Iklan",href:"/seller/ads",icon:"ads"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Toko",href:"/seller/profile",icon:"profile"},
];
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v||0));
const date=(v:string)=>new Date(v).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});
const escapeHtml=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
function printReceipt(order:Order){
 const address=Object.values(order.shipping_address??{}).filter(Boolean).join(", ");
 const items=order.items.map(i=>`<tr><td>${escapeHtml(i.product_name)} × ${i.quantity}</td><td>${money(i.line_total)}</td></tr>`).join("");
 const w=window.open("","_blank","width=760,height=850");
 if(!w){window.alert("Izinkan pop-up untuk mencetak resi.");return;}
 w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Resi ${escapeHtml(order.order_number)}</title><style>body{font:14px Arial,sans-serif;color:#261c17;padding:32px;max-width:680px;margin:auto}h1{font-size:22px;margin:0 0 5px}small{color:#766}hr{border:0;border-top:1px dashed #aaa;margin:20px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #ddd;padding:12px;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:9px 0;border-bottom:1px solid #eee}td:last-child{text-align:right}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:16px}.stamp{margin-top:22px;padding:10px;background:#f7f1e3;border-radius:8px;font-size:12px}@media print{button{display:none}}</style></head><body><h1>NUSANTARAGIFT</h1><small>RESI PENGIRIMAN · SIMULASI</small><hr><div class="grid"><div class="box"><b>Penerima</b><p>${escapeHtml(order.recipient_name)}</p><p>${escapeHtml(order.recipient_phone)}</p><p>${escapeHtml(address)}</p></div><div class="box"><b>Informasi pesanan</b><p>Nomor: ${escapeHtml(order.order_number)}</p><p>Tanggal: ${escapeHtml(date(order.created_at))}</p><p>Kurir: ${escapeHtml(order.shipping_courier||"Simulasi NusantaraGift")}</p><p>Resi: <b>${escapeHtml(order.tracking_number||"-")}</b></p></div></div><table><tbody>${items}</tbody></table><div class="total">Total produk: ${money(order.subtotal)}</div><div class="stamp">Dokumen ini merupakan resi simulasi untuk demonstrasi alur NusantaraGift. Tidak terhubung dengan perusahaan kurir atau layanan pelacakan eksternal.</div><script>window.onload=()=>window.print()<\/script></body></html>`);
 w.document.close();
}
export default function SellerOrdersPage(){
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [filter,setFilter]=useState("all");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const r=await fetch("/api/seller/orders",{cache:"no-store"});const d=await r.json();if(r.status===401||r.status===403){window.location.assign("/login");return;}if(!r.ok)throw new Error(d.error||"Gagal memuat pesanan.");setOrders(d.orders??[]);}
  catch(e){setError(e instanceof Error?e.message:"Gagal memuat pesanan.");}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function update(orderNumber:string,status:"processing"|"shipped"|"completed"){
  setBusy(orderNumber);setError("");setMessage("");
  try{
   const payload=status==="shipped"?{orderNumber,status,courier:"Simulasi NusantaraGift",trackingNumber:"NGSIM-"+orderNumber.replace(/[^a-zA-Z0-9]/g,"").slice(-12).toUpperCase()}:{orderNumber,status};
   const r=await fetch("/api/seller/orders/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Status pesanan gagal diperbarui.");
   setMessage(status==="processing"?"Pesanan diterima. Silakan siapkan produk.":status==="shipped"?"Pesanan ditandai dikirim dengan resi simulasi.":"Pesanan ditandai selesai (simulasi).");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Gagal memperbarui pesanan.");}finally{setBusy("");}
 }
 const filtered=orders.filter(o=>filter==="all"||(filter==="new"&&o.payment_status==="paid"&&o.order_status==="paid")||(filter==="processing"&&o.order_status==="processing")||(filter==="shipped"&&o.order_status==="shipped")||(filter==="completed"&&o.order_status==="completed"));
 const paid=orders.filter(o=>o.payment_status==="paid");
 const stats=[{label:"Pesanan baru",value:paid.filter(o=>o.order_status==="paid").length,icon:ShoppingBag},{label:"Diproses",value:paid.filter(o=>o.order_status==="processing").length,icon:PackageCheck},{label:"Dikirim",value:paid.filter(o=>o.order_status==="shipped").length,icon:Truck}];
 const statusLabel:Record<string,string>={paid:"Pesanan baru",processing:"Sedang disiapkan",shipped:"Dikirim · simulasi",completed:"Selesai · simulasi",cancelled:"Dibatalkan",refunded:"Dikembalikan"};
 return <DashboardShell role="UMKM" title="Pesanan & pemenuhan" subtitle="Kelola pesanan, cetak resi, dan selesaikan simulasi pengiriman." navItems={nav} mobileNavItems={mobileNav}>
  <div className="mb-5 rounded-2xl bg-[#431714] p-5 text-white"><p className="text-[9px] font-bold tracking-[.16em] text-[#D8B77C]">ARTISAN ATELIER · ORDER DESK</p><h2 className="mt-2 font-display text-2xl">Pesanan adalah cerita yang harus sampai.</h2><p className="mt-2 text-xs leading-5 text-[#E7D7C4]">Pesanan hanya masuk antrean kerja setelah pembayaran terverifikasi lunas. Pengiriman pada tahap ini masih berupa simulasi.</p></div>
  {error&&<div role="alert" className="mb-4 flex gap-2 rounded-xl border border-[#E6C7BD] bg-[#F8E9E5] p-3 text-xs text-[#93372A]"><AlertCircle size={16}/>{error}</div>}
  {message&&<div role="status" className="mb-4 flex gap-2 rounded-xl border border-[#C8D7C7] bg-[#EAF0E8] p-3 text-xs text-[#4F6E59]"><CheckCircle2 size={16}/>{message}</div>}
  <div className="grid grid-cols-3 gap-2 sm:gap-3">{stats.map(s=><article key={s.label} className="rounded-xl border border-[#DCD2C1] bg-[#FDFAF3] p-3 sm:p-4"><s.icon size={17} className="text-[#C79854]"/><p className="mt-2 text-[9px] font-bold text-[#7A6C5E]">{s.label}</p><p className="mt-1 font-display text-2xl text-[#431714]">{loading?"—":s.value}</p></article>)}</div>
  <section className="mt-4 rounded-xl border border-[#DCD2C1] bg-[#FDFAF3] p-3 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl text-[#431714]">Daftar pesanan</h3><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-[#DCD2C1] px-3 py-2 text-[10px] font-bold text-[#93372A]"><RefreshCw size={13} className={loading?"animate-spin":""}/> Perbarui</button></div>
   <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{[{id:"all",label:"Semua"},{id:"new",label:"Baru"},{id:"processing",label:"Diproses"},{id:"shipped",label:"Dikirim"},{id:"completed",label:"Selesai"}].map(f=><button key={f.id} onClick={()=>setFilter(f.id)} className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold ${filter===f.id?"bg-[#431714] text-white":"border border-[#DCD2C1] text-[#7A6C5E]"}`}>{f.label}</button>)}</div>
   {loading?<p className="py-10 text-center text-xs text-[#7A6C5E]">Memuat pesanan...</p>:filtered.length===0?<div className="py-12 text-center"><ShoppingBag size={28} className="mx-auto text-[#C7B69F]"/><p className="mt-3 text-xs text-[#7A6C5E]">Belum ada pesanan pada kategori ini.</p></div>:
    <div className="mt-2 space-y-3">{filtered.map(o=><article key={o.id} className="rounded-xl border border-[#E7DDCC] bg-white p-4">
     <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-bold text-[#93372A]">{o.order_number}</p><h4 className="mt-1 text-sm font-semibold text-[#251E1A]">{o.recipient_name}</h4><p className="mt-1 text-[10px] text-[#7A6C5E]">{o.recipient_phone} · {date(o.created_at)}</p></div><span className="rounded-full bg-[#F3EBDD] px-3 py-1.5 text-[9px] font-bold text-[#79552F]">{statusLabel[o.order_status]??o.order_status}</span></div>
     <div className="mt-3 border-t border-[#E8DFD2] pt-3"><p className="text-[10px] leading-5 text-[#7A6C5E]">{o.items.map(i=>`${i.product_name} × ${i.quantity}`).join(" · ")}</p><p className="mt-1 text-sm font-bold text-[#431714]">{money(o.total_amount)}</p><p className="mt-1 text-[10px] text-[#7A6C5E]">Pembayaran: {o.payment_status==="paid"?"Lunas terverifikasi":"Belum lunas"}</p></div>
     {o.payment_status==="paid"&&o.order_status==="paid"&&<button disabled={busy===o.order_number} onClick={()=>void update(o.order_number,"processing")} className="mt-3 w-full rounded-full bg-[#431714] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===o.order_number?"Memproses...":"Terima pesanan & siapkan produk"}</button>}
     {o.payment_status==="paid"&&o.order_status==="processing"&&<div className="mt-3 rounded-lg bg-[#F7F1E3] p-3"><p className="text-[10px] font-bold text-[#79552F]">LANGKAH PENGIRIMAN · SIMULASI</p><p className="mt-1 text-[10px] leading-5 text-[#7A6C5E]">Buat resi simulasi, lalu tandai pesanan dikirim. Tidak ada kurir eksternal yang dihubungi.</p><button disabled={busy===o.order_number} onClick={()=>void update(o.order_number,"shipped")} className="mt-3 w-full rounded-full bg-[#4F6E59] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===o.order_number?"Menyimpan...":"Buat resi & tandai dikirim"}</button></div>}
     {o.order_status==="shipped"&&<div className="mt-3 rounded-lg border border-[#DCD2C1] bg-[#FDFAF3] p-3"><p className="text-[10px] font-bold text-[#4F6E59]">RESI PENGIRIMAN SIMULASI</p><p className="mt-1 text-xs text-[#251E1A]">{o.shipping_courier} · <strong>{o.tracking_number}</strong></p><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={()=>printReceipt(o)} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#DCD2C1] px-3 py-3 text-xs font-bold text-[#431714]"><Printer size={15}/> Cetak resi</button><button disabled={busy===o.order_number} onClick={()=>void update(o.order_number,"completed")} className="rounded-full bg-[#431714] px-3 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===o.order_number?"Menyimpan...":"Tandai selesai (simulasi)"}</button></div></div>}
     {o.order_status==="completed"&&<p className="mt-3 rounded-lg bg-[#EAF0E8] p-3 text-xs font-semibold text-[#4F6E59]">Pesanan selesai. Alur pengiriman simulasi telah ditutup.</p>}
    </article>)}</div>}
  </section>
 </DashboardShell>;
}
