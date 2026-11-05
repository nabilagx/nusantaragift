"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, Truck, X } from "lucide-react";

type PendingProduct={id:string;name:string;description:string|null;price:number;stock:number;categories:{name:string}|null;seller_profiles:{business_name:string}|null};
type PendingOrder={id:string;order_number:string;recipient_name:string;recipient_phone:string;shipping_address:Record<string,unknown>;subtotal:number;gift_card_fee:number;shipping_cost:number;total_amount:number;shipping_quote_status:string;created_at:string;order_items:{product_name:string;quantity:number;line_total:number}[]};
const money=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n));

export default function AdminDashboardPage(){
 const router=useRouter();
 const [products,setProducts]=useState<PendingProduct[]>([]);
 const [orders,setOrders]=useState<PendingOrder[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 const [shipping,setShipping]=useState<Record<string,string>>({});

 const load=useCallback(async()=>{
  setLoading(true);
  try{const r=await fetch("/api/admin/overview",{cache:"no-store"});const d=await r.json();if(r.status===401||r.status===403){router.replace("/login");return;}if(!r.ok)throw new Error(d.error||"Gagal memuat dashboard.");setProducts(d.products??[]);setOrders(d.orders??[]);}
  catch(e){setMessage(e instanceof Error?e.message:"Terjadi kesalahan.");}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);

 async function review(id:string,status:"active"|"rejected"){
  setBusy(id);setMessage("");
  try{const r=await fetch(`/api/admin/products/${id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,note:status==="rejected"?"Mohon perbaiki informasi produk dan ajukan kembali.":null})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Moderasi gagal.");setMessage(status==="active"?"Produk disetujui dan diterbitkan.":"Produk ditolak.");await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Moderasi gagal.");}
  finally{setBusy("");}
 }
 async function quote(orderNumber:string){
  const amount=Number(shipping[orderNumber]);
  if(!Number.isSafeInteger(amount)||amount<0){setMessage("Masukkan ongkir dalam rupiah berupa bilangan bulat.");return;}
  setBusy(orderNumber);setMessage("");
  try{const r=await fetch("/api/admin/shipping-quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderNumber,shippingCost:amount})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Gagal menetapkan ongkir.");setMessage(`Ongkir ${money(amount)} berhasil ditetapkan untuk ${orderNumber}.`);await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Gagal menetapkan ongkir.");}
  finally{setBusy("");}
 }

 return <main className="min-h-dvh bg-[#F7F1E3] px-4 py-8 text-[#34291F] sm:px-8"><div className="mx-auto max-w-6xl">
  <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#93372A]">NusantaraGift · Control Center</p><h1 className="mt-1 font-quicksand text-3xl font-bold">Admin Dashboard</h1><p className="mt-2 text-sm text-[#806A4E]">Moderasi katalog dan kelola ongkos kirim pesanan.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-full border border-[#D9C9AF] bg-white px-4 py-2 text-sm font-semibold"><RefreshCw size={15}/> Segarkan</button></header>
  {message&&<p role="status" className="mt-5 rounded-xl bg-white p-4 text-sm">{message}</p>}
  {loading?<p className="py-16 text-center text-sm text-[#806A4E]">Memuat data admin...</p>:<>
   <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Produk menunggu persetujuan</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{products.length}</span></div>
    {products.length===0?<div className="rounded-2xl border border-dashed border-[#D9C9AF] bg-white/60 p-7 text-center text-sm text-[#806A4E]">Tidak ada produk yang menunggu moderasi.</div>:<div className="space-y-3">{products.map(p=><article key={p.id} className="rounded-2xl border border-[#E9DFCE] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[#93372A]">{p.categories?.name??"Produk"} · {p.seller_profiles?.business_name??"UMKM"}</p><h3 className="mt-1 font-bold">{p.name}</h3><p className="mt-1 text-sm text-[#806A4E]">{p.description}</p><p className="mt-2 text-sm font-semibold">{money(Number(p.price))} · Stok {p.stock}</p></div><div className="flex gap-2"><button disabled={busy===p.id} onClick={()=>void review(p.id,"active")} className="inline-flex items-center gap-1 rounded-full bg-[#93372A] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={14}/> Setujui</button><button disabled={busy===p.id} onClick={()=>void review(p.id,"rejected")} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"><X size={14}/> Tolak</button></div></div></article>)}</div>}
   </section>
   <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Pesanan menunggu ongkir</h2><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{orders.length}</span></div>
    {orders.length===0?<div className="rounded-2xl border border-dashed border-[#D9C9AF] bg-white/60 p-7 text-center text-sm text-[#806A4E]">Tidak ada pesanan yang menunggu ongkir.</div>:<div className="space-y-4">{orders.map(o=><article key={o.id} className="rounded-2xl border border-[#E9DFCE] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-[#806A4E]">Nomor pesanan</p><h3 className="font-bold">{o.order_number}</h3><p className="mt-1 text-sm">{o.recipient_name} · {o.recipient_phone}</p><p className="mt-1 text-xs text-[#806A4E]">{String(o.shipping_address?.address??"Alamat tidak tersedia")}</p></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Menunggu ongkir</span></div>
      <div className="my-4 border-t border-dashed border-[#E9DFCE]"/><div className="space-y-1 text-sm">{o.order_items?.map((item,i)=><div key={i} className="flex justify-between gap-3"><span>{item.product_name} × {item.quantity}</span><span>{money(Number(item.line_total))}</span></div>)}</div><div className="mt-3 flex justify-between text-sm"><span>Subtotal + Gift Card</span><strong>{money(Number(o.subtotal)+Number(o.gift_card_fee))}</strong></div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="flex-1 text-xs font-semibold text-[#806A4E]">Ongkos kirim (Rp)<input type="number" min="0" step="1" value={shipping[o.order_number]??""} onChange={e=>setShipping(v=>({...v,[o.order_number]:e.target.value}))} placeholder="Contoh: 18000" className="mt-1 w-full rounded-xl border border-[#E9DFCE] px-4 py-3 text-sm font-normal text-[#34291F]"/></label><button disabled={busy===o.order_number} onClick={()=>void quote(o.order_number)} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#93372A] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Truck size={16}/> Tetapkan Ongkir</button></div>
    </article>)}</div>}
   </section>
  </>}
 </div></main>;
}
