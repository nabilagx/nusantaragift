"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpRight, BadgeCheck, Box, CheckCircle2, Clock3, Package, PackageCheck, PackagePlus, RefreshCw, ShoppingBag, Truck } from "lucide-react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type SellerProduct = { id:string; name:string; slug:string; price:number; stock:number; status:string; moderation_note:string|null; created_at:string; metadata?:Record<string,unknown> };
type SellerOrder = { id:string; order_number:string; recipient_name:string; recipient_phone:string; shipping_address:Record<string,unknown>; subtotal:number; shipping_cost:number; total_amount:number; order_status:string; payment_status:string; created_at:string; tracking_number:string|null; shipping_courier:string|null; items:{product_name:string;quantity:number;unit_price:number;line_total:number}[] };
const nav:DashboardNavItem[]=[{label:"Ringkasan",href:"/seller/dashboard#overview",icon:"overview"},{label:"Pesanan Masuk",href:"/seller/dashboard#orders",icon:"orders"},{label:"Produk Saya",href:"/seller/dashboard#products",icon:"products"},{label:"Tambah Produk",href:"/seller/dashboard#add-product",icon:"add"}];
const money=(v:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v));
const date=(v:string)=>new Date(v).toLocaleString("id-ID",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
function previewImageUrl(value:string) {
 try {
  const url=new URL(value);
  if(url.hostname.includes("drive.google.com")) {
   const id=url.searchParams.get("id")||url.pathname.match(/\\/file\\/d\\/([^/]+)/)?.[1];
   return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w600` : value;
  }
  if(url.hostname==="imgur.com"||url.hostname==="www.imgur.com") {
   const id=url.pathname.split("/").filter(Boolean).pop()?.replace(/\\.[^.]+$/,"");
   return id ? `https://i.imgur.com/${id}.jpg` : value;
  }
  return value;
 } catch { return ""; }
}
const labels:Record<string,string>={pending_review:"Menunggu moderasi",active:"Tayang di toko",rejected:"Perlu revisi",draft:"Draft",paid:"Pesanan baru",processing:"Sedang disiapkan",shipped:"Dalam pengiriman",delivered:"Terkirim",completed:"Selesai",cancelled:"Dibatalkan"};

export default function SellerDashboardPage(){
 const router=useRouter();
 const [products,setProducts]=useState<SellerProduct[]>([]);
 const [orders,setOrders]=useState<SellerOrder[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [form,setForm]=useState({name:"",description:"",category:"cerita",price:"",stock:"1",imageUrl:""});
 const [orderFilter,setOrderFilter]=useState("all");const [productFilter,setProductFilter]=useState("all");
 const [shipping,setShipping]=useState<Record<string,{courier:string;tracking:string}>>({});
 const [showForm,setShowForm]=useState(false);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [pr,or]=await Promise.all([fetch("/api/seller/products",{cache:"no-store"}),fetch("/api/seller/orders",{cache:"no-store"})]);
   const [pd,od]=await Promise.all([pr.json(),or.json()]);
   if([pr.status,or.status].some(s=>s===401||s===403)){router.replace("/login");return;}
   if(!pr.ok)throw new Error(pd.error||"Gagal memuat produk.");
   if(!or.ok)throw new Error(od.error||"Gagal memuat pesanan.");
   setProducts(pd.products??[]);setOrders(od.orders??[]);
  }catch(e){setError(e instanceof Error?e.message:"Dashboard gagal dimuat.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);

 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setMessage("");setError("");
  try{const r=await fetch("/api/seller/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,price:Number(form.price),stock:Number(form.stock)})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Produk gagal diajukan.");setMessage("Produk berhasil dikirim ke antrean moderasi admin.");setForm({name:"",description:"",category:"cerita",price:"",stock:"1",imageUrl:""});setShowForm(false);await load();}
  catch(e){setError(e instanceof Error?e.message:"Produk gagal diajukan.");}finally{setSaving(false);}
 }

 async function updateOrder(orderNumber:string,status:"processing"|"shipped"){
  const details=shipping[orderNumber]??{courier:"",tracking:""};
  if(status==="shipped"&&(!details.courier.trim()||!details.tracking.trim())){setError("Isi nama kurir dan nomor resi sebelum menandai pesanan dikirim.");return;}
  setBusy(orderNumber);setError("");setMessage("");
  try{const r=await fetch("/api/seller/orders/status",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber,status,courier:details.courier,trackingNumber:details.tracking})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Status pesanan gagal diperbarui.");setMessage(status==="processing"?"Pesanan diterima. Segera siapkan produk.":"Pesanan ditandai telah dikirim.");await load();}
  catch(e){setError(e instanceof Error?e.message:"Gagal memperbarui pesanan.");}finally{setBusy("");}
 }

 const paid=orders.filter(o=>o.payment_status==="paid");
 const newOrders=paid.filter(o=>o.order_status==="paid");
 const processing=paid.filter(o=>o.order_status==="processing");
 const shipped=paid.filter(o=>o.order_status==="shipped"||o.order_status==="delivered"||o.order_status==="completed");
 const activeProducts=products.filter(p=>p.status==="active");
 const pendingProducts=products.filter(p=>p.status==="pending_review");
 const revenue=paid.reduce((sum,o)=>sum+o.items.reduce((s,i)=>s+i.line_total,0),0);
 const filteredOrders=orders.filter(o=>orderFilter==="all"||(orderFilter==="new"&&o.payment_status==="paid"&&o.order_status==="paid")||(orderFilter==="processing"&&o.order_status==="processing")||(orderFilter==="shipped"&&["shipped","delivered","completed"].includes(o.order_status)));
 const filteredProducts=products.filter(p=>productFilter==="all"||(productFilter==="active"&&p.status==="active")||(productFilter==="pending"&&p.status==="pending_review")||(productFilter==="rejected"&&p.status==="rejected"));

 return <DashboardShell role="UMKM" title="Mitra Workspace" subtitle="Pantau penjualan, tangani pesanan pelanggan, dan kembangkan katalog tokomu." navItems={nav}>
  {error&&<div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div>}
  {message&&<div role="status" className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18}/>{message}</div>}
  <section id="overview" className="scroll-mt-28">
   <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#A47B43]">OVERVIEW</p><h2 className="mt-1 font-quicksand text-2xl font-bold sm:text-3xl">Selamat datang, Mitra 👋</h2><p className="mt-1 text-sm text-[#827668]">Berikut aktivitas tokomu hari ini.</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#E5DCCD] bg-white px-4 py-2.5 text-xs font-bold text-[#675B4E] hover:border-[#9B443A] disabled:opacity-50"><RefreshCw size={15} className={loading?"animate-spin":""}/> Perbarui data</button></div>
   <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
    {[{label:"Pesanan baru",value:newOrders.length,detail:"Menunggu konfirmasi",icon:ShoppingBag},{label:"Sedang diproses",value:processing.length,detail:"Dalam persiapan",icon:Box},{label:"Sudah dikirim",value:shipped.length,detail:"Dalam perjalanan / selesai",icon:Truck},{label:"Produk aktif",value:activeProducts.length,detail:`${pendingProducts.length} menunggu moderasi`,icon:Package}].map((m,i)=>{const Icon=m.icon;return <article key={m.label} className="rounded-2xl border border-[#E9E1D4] bg-white p-4 shadow-[0_3px_18px_rgba(55,42,25,.035)] sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#827668]">{m.label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6ECE5] text-[#92392F]"><Icon size={18}/></span></div><p className="mt-4 font-quicksand text-3xl font-bold">{loading?"—":m.value}</p><p className="mt-1 text-[11px] text-[#9A8C7B]">{m.detail}</p></article>})}
   </div>
   <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
    <article className="rounded-2xl bg-[#80342C] p-5 text-white sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-white/65">NILAI PRODUK TERJUAL</p><p className="mt-2 font-quicksand text-3xl font-bold">{loading?"—":money(revenue)}</p><p className="mt-2 text-xs text-white/70">Akumulasi nilai item dari pesanan yang sudah dibayar</p></div><span className="rounded-xl bg-white/10 p-3"><BadgeCheck size={22}/></span></div></article>
    <article className="flex flex-col justify-between rounded-2xl border border-[#E9E1D4] bg-white p-5"><div><p className="text-xs font-bold uppercase tracking-wider text-[#A47B43]">BUTUH TINDAKAN</p><p className="mt-2 font-quicksand text-2xl font-bold">{newOrders.length+pendingProducts.length}</p><p className="mt-1 text-xs text-[#827668]">Pesanan baru dan produk menunggu tinjauan</p></div><a href="#orders" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#8E3028]">Lihat antrean <ArrowUpRight size={15}/></a></article>
   </div>
  </section>

  <section id="orders" className="mt-10 scroll-mt-28">
   <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#A47B43]">ORDER MANAGEMENT</p><h2 className="mt-1 font-quicksand text-2xl font-bold">Pesanan Masuk</h2><p className="mt-1 text-sm text-[#827668]">Terima pesanan yang sudah dibayar, siapkan produk, lalu kirim dengan nomor resi.</p></div><span className="rounded-full bg-[#F3E4DE] px-3 py-1.5 text-xs font-bold text-[#8E3028]">{paid.length} pesanan aktif</span></div>
   {loading?<div className="rounded-2xl bg-white p-10 text-center text-sm text-[#827668]">Memuat pesanan...</div>:orders.length===0?<div className="rounded-2xl border border-dashed border-[#D8CBBB] bg-white p-10 text-center"><ShoppingBag className="mx-auto text-[#B49B80]" size={30}/><h3 className="mt-3 font-bold">Belum ada pesanan masuk</h3><p className="mt-1 text-sm text-[#827668]">Pesanan pelanggan akan muncul di sini setelah ongkir ditetapkan dan pembayaran dikonfirmasi.</p></div>:<div className="space-y-4"><div className="mb-4 flex flex-wrap gap-2">{[{id:"all",label:"Semua"},{id:"new",label:"Pesanan baru"},{id:"processing",label:"Diproses"},{id:"shipped",label:"Dikirim / selesai"}].map(f=><button key={f.id} onClick={()=>setOrderFilter(f.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${orderFilter===f.id?"bg-[#8E3028] text-white":"border border-[#E5DCCD] bg-white text-[#74695D]"}`}>{f.label}</button>)}</div>{filteredOrders.length===0?<div className="rounded-2xl border border-dashed border-[#D8CBBB] bg-white p-8 text-center text-sm text-[#827668]">Tidak ada pesanan pada filter ini.</div>:<div className="space-y-4">{filteredOrders.map(order=><article key={order.id} className="overflow-hidden rounded-2xl border border-[#E9E1D4] bg-white shadow-[0_3px_18px_rgba(55,42,25,.035)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] px-5 py-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#A18F7A]">ORDER ID</p><h3 className="mt-0.5 font-bold">{order.order_number}</h3><p className="mt-1 text-xs text-[#827668]">{date(order.created_at)}</p></div><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${order.payment_status==="paid"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}>{order.payment_status==="paid"?(labels[order.order_status]??order.order_status):"Menunggu pembayaran"}</span></div>
    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]"><div><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5EEE5] text-[#8E3028]"><PackageCheck size={19}/></div><div><p className="text-sm font-bold">{order.recipient_name}</p><p className="text-xs text-[#827668]">{order.recipient_phone}</p><p className="mt-1 text-xs leading-5 text-[#827668]">{String(order.shipping_address?.address??"Alamat penerima tersedia di detail pesanan")}</p></div></div>
     <div className="mt-4 divide-y divide-[#F0EAE1] rounded-xl bg-[#FCFAF6] px-4">{order.items.map((item,i)=><div key={i} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">{item.product_name}</p><p className="text-xs text-[#8E8274]">{item.quantity} × {money(item.unit_price)}</p></div><strong className="shrink-0">{money(item.line_total)}</strong></div>)}</div>
     {order.tracking_number&&<p className="mt-3 text-xs text-[#5B7664]">Resi: <strong>{order.shipping_courier} · {order.tracking_number}</strong></p>}
    </div>
    <aside className="rounded-xl bg-[#F8F5EF] p-4"><div className="flex justify-between text-xs text-[#827668]"><span>Status pembayaran</span><strong className="text-[#29251F]">{order.payment_status==="paid"?"LUNAS":"BELUM LUNAS"}</strong></div><div className="mt-2 flex justify-between text-xs text-[#827668]"><span>Ongkir</span><strong className="text-[#29251F]">{money(order.shipping_cost)}</strong></div><div className="mt-3 flex justify-between border-t border-[#E6DED2] pt-3 text-sm"><span className="font-bold">Nilai item</span><strong>{money(order.items.reduce((s,i)=>s+i.line_total,0))}</strong></div>
     {order.payment_status==="paid"&&order.order_status==="paid"&&<button disabled={busy===order.order_number} onClick={()=>void updateOrder(order.order_number,"processing")} className="mt-4 w-full rounded-xl bg-[#8E3028] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{busy===order.order_number?"Memproses...":"Terima Pesanan & Mulai Siapkan"}</button>}
     {order.payment_status==="paid"&&order.order_status==="processing"&&<div className="mt-4 space-y-2"><input value={shipping[order.order_number]?.courier??""} onChange={e=>setShipping(v=>({...v,[order.order_number]:{courier:e.target.value,tracking:v[order.order_number]?.tracking??""}}))} placeholder="Nama kurir (JNE, J&T, dll.)" className="w-full rounded-lg border border-[#E4DCCE] bg-white px-3 py-2.5 text-xs"/><input value={shipping[order.order_number]?.tracking??""} onChange={e=>setShipping(v=>({...v,[order.order_number]:{courier:v[order.order_number]?.courier??"",tracking:e.target.value}}))} placeholder="Nomor resi pengiriman" className="w-full rounded-lg border border-[#E4DCCE] bg-white px-3 py-2.5 text-xs"/><button disabled={busy===order.order_number} onClick={()=>void updateOrder(order.order_number,"shipped")} className="w-full rounded-xl bg-[#526A56] px-4 py-3 text-xs font-bold text-white disabled:opacity-50">Tandai Pesanan Dikirim</button></div>}
    </aside></div>
   </article>)}</div>}</div>}
  </section>

  <section id="products" className="mt-10 scroll-mt-28">
   <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#A47B43]">CATALOG MANAGEMENT</p><h2 className="mt-1 font-quicksand text-2xl font-bold">Produk Saya</h2><p className="mt-1 text-sm text-[#827668]">Pantau status publikasi, stok, dan catatan moderasi.</p></div><button onClick={()=>setShowForm(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-[#8E3028] px-4 py-3 text-xs font-bold text-white"><PackagePlus size={16}/>{showForm?"Tutup Form":"Tambah Produk"}</button></div>
   {showForm&&<form onSubmit={submit} className="mb-5 grid gap-4 rounded-2xl border border-[#E9E1D4] bg-white p-5 sm:grid-cols-2"><div className="sm:col-span-2"><h3 className="font-bold">Ajukan produk baru</h3><p className="mt-1 text-xs text-[#827668]">Produk akan ditinjau admin sebelum ditayangkan di katalog.</p></div><label className="text-xs font-bold">Nama produk<input required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E5DCCD] px-4 py-3 text-sm font-normal"/></label><label className="text-xs font-bold">Kategori<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E5DCCD] bg-white px-4 py-3 text-sm font-normal"><option value="cerita">Cerita</option><option value="rasa">Rasa</option><option value="budaya">Budaya</option></select></label><label className="text-xs font-bold">Harga (Rp)<input required type="number" min="1" step="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E5DCCD] px-4 py-3 text-sm font-normal"/></label><label className="text-xs font-bold">Stok<input required type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E5DCCD] px-4 py-3 text-sm font-normal"/></label><label className="text-xs font-bold sm:col-span-2">Link gambar produk (Imgur / Google Drive)<input type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://drive.google.com/file/d/... atau https://i.imgur.com/..." className="mt-2 w-full rounded-xl border border-[#E5DCCD] px-4 py-3 text-sm font-normal"/><span className="mt-1 block text-[11px] font-normal text-[#827668]">Gunakan link berbagi Google Drive atau direct image URL. Pastikan akses file dapat dilihat siapa saja yang memiliki link.</span>{form.imageUrl&&<div className="mt-3 flex items-center gap-3 rounded-xl bg-[#F8F5EF] p-3"><img src={previewImageUrl(form.imageUrl)} alt="Pratinjau produk" className="h-20 w-20 rounded-lg object-cover" onError={e=>{e.currentTarget.style.display="none";}}/><span className="text-xs text-[#827668]">Pratinjau gambar produk</span></div>}</label><label className="text-xs font-bold sm:col-span-2">Deskripsi<textarea required minLength={10} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full rounded-xl border border-[#E5DCCD] px-4 py-3 text-sm font-normal"/></label><div className="sm:col-span-2"><button disabled={saving} className="rounded-xl bg-[#8E3028] px-6 py-3 text-xs font-bold text-white disabled:opacity-50">{saving?"Mengirim...":"Kirim untuk Moderasi"}</button></div></form>}
   {loading?<div className="rounded-xl bg-white p-8 text-center text-sm text-[#827668]">Memuat katalog...</div>:<><div className="mb-4 flex flex-wrap gap-2">{[{id:"all",label:"Semua produk"},{id:"active",label:"Tayang"},{id:"pending",label:"Menunggu review"},{id:"rejected",label:"Perlu revisi"}].map(f=><button key={f.id} onClick={()=>setProductFilter(f.id)} className={`rounded-full px-4 py-2 text-xs font-bold ${productFilter===f.id?"bg-[#8E3028] text-white":"border border-[#E5DCCD] bg-white text-[#74695D]"}`}>{f.label}</button>)}</div><div className="overflow-hidden rounded-2xl border border-[#E9E1D4] bg-white"><div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[#EEE7DC] bg-[#FAF7F1] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#958673]"><span>Produk</span><span>Stok</span><span>Status</span></div>{filteredProducts.map(p=><div key={p.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#F1ECE4] px-5 py-4 last:border-0"><div className="flex min-w-0 items-center gap-3">{typeof p.metadata?.image==="string"&&p.metadata.image?<img src={p.metadata.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover"/>:<div className="h-12 w-12 shrink-0 rounded-xl bg-[#F5EEE5]"/>}<div className="min-w-0"><p className="truncate text-sm font-bold">{p.name}</p><p className="mt-1 text-xs text-[#827668]">{money(p.price)}</p>{p.moderation_note&&<p className="mt-1 text-[11px] text-red-700">Catatan: {p.moderation_note}</p>}</div><span className="text-sm font-semibold">{p.stock}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.status==="active"?"bg-emerald-50 text-emerald-700":p.status==="rejected"?"bg-red-50 text-red-700":"bg-amber-50 text-amber-800"}`}>{labels[p.status]??p.status}</span></div>)}</div></>}
  </section>
 </DashboardShell>;
}
