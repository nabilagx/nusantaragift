"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, Eye, FileAudio, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type Page = { id:string; page_number:number; page_title:string|null; body:string; illustration_url:string; audio_url:string; audio_duration_seconds:number|null };
type Story = { id:string; slug:string; name:string; description:string|null; status:string; moderation_note:string|null; created_at:string; seller_id:string; pages:Page[] };
const nav:DashboardNavItem[]=[
 {label:"Ringkasan",href:"/admin/dashboard",icon:"overview"},
 {label:"Verifikasi UMKM",href:"/admin/umkm",icon:"verification"},
 {label:"Kurasi Produk",href:"/admin/products",icon:"curation"},
 {label:"Kurasi Cerita",href:"/admin/stories",icon:"moderation"},
 {label:"Kurasi Iklan",href:"/admin/ads",icon:"ads"},
 {label:"Pesanan",href:"/admin/orders",icon:"orders"},
 {label:"Pengaturan",href:"/admin/settings",icon:"settings"},
];
const mobileNav:DashboardNavItem[]=[
 {label:"Beranda",href:"/admin/dashboard",icon:"overview"},
 {label:"UMKM",href:"/admin/umkm",icon:"verification"},
 {label:"Produk",href:"/admin/products",icon:"curation"},
 {label:"Cerita",href:"/admin/stories",icon:"moderation"},
 {label:"Iklan",href:"/admin/ads",icon:"ads"},
];
export default function AdminStoriesPage(){
 const router=useRouter();
 const [stories,setStories]=useState<Story[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [note,setNote]=useState<Record<string,string>>({});
 const [filter,setFilter]=useState("pending_review");
 const [preview,setPreview]=useState<Story|null>(null);
 async function load(){
  setLoading(true);setError("");
  try{const r=await fetch("/api/admin/stories",{cache:"no-store"});const d=await r.json();if(r.status===401||r.status===403){router.replace("/login");return;}if(!r.ok)throw new Error(d.error||"Gagal memuat cerita.");setStories(d.stories??[]);}
  catch(e){setError(e instanceof Error?e.message:"Gagal memuat cerita.");}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function moderate(story:Story,status:"active"|"rejected"){
  setBusy(story.id);setError("");
  try{const r=await fetch("/api/admin/stories",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:story.id,status,note:note[story.id]??""})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Moderasi gagal.");await load();setPreview(null);}
  catch(e){setError(e instanceof Error?e.message:"Moderasi gagal.");}finally{setBusy("");}
 }
 const filtered=stories.filter(s=>filter==="all"||s.status===filter);
 const counts={pending:stories.filter(s=>s.status==="pending_review").length,active:stories.filter(s=>s.status==="active").length,rejected:stories.filter(s=>s.status==="rejected").length};
 const origin=typeof window!=="undefined"?window.location.origin:"";
 return <DashboardShell role="ADMIN" title="Kurasi Cerita" subtitle="Pemeriksaan cerita digital NusantaraGift." navItems={nav} mobileNavItems={mobileNav}>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">CURATOR DESK · STORY REVIEW</p><h1 className="mt-2 font-display text-3xl text-[#431714]">Kurasi cerita digital</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-[#7A6C5E]">Tinjau teks, ilustrasi, dan rekaman audio sebelum cerita dipublikasikan untuk umum.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-full border border-[#DCD2C1] px-4 py-2.5 text-xs font-semibold text-[#6E3028]"><RefreshCw size={14}/> Muat ulang</button></div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
  <div className="mb-5 grid grid-cols-3 gap-3">{[{label:"Menunggu",value:counts.pending},{label:"Tayang",value:counts.active},{label:"Ditolak",value:counts.rejected}].map(x=><div key={x.label} className="rounded-xl border border-[#DED3C1] bg-[#FDFAF3] p-4"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8A7965]">{x.label}</p><p className="mt-2 font-display text-2xl text-[#431714]">{x.value}</p></div>)}</div>
  <div className="mb-4 flex flex-wrap gap-2">{[{id:"pending_review",label:"Menunggu kurasi"},{id:"active",label:"Tayang"},{id:"rejected",label:"Ditolak"},{id:"all",label:"Semua"}].map(x=><button key={x.id} onClick={()=>setFilter(x.id)} className={"rounded-full px-4 py-2 text-[10px] font-bold "+(filter===x.id?"bg-[#431714] text-white":"border border-[#DCD2C1] bg-[#FDFAF3] text-[#79552F]")}>{x.label}</button>)}</div>
  {loading?<p className="py-12 text-center text-xs text-[#806A4E]">Memuat antrean cerita...</p>:filtered.length===0?<div className="rounded-2xl border border-dashed border-[#D4C7B5] bg-[#FDFAF3] p-12 text-center"><Clock3 size={28} className="mx-auto text-[#C79854]"/><p className="mt-3 text-sm font-semibold text-[#431714]">Tidak ada cerita pada filter ini.</p></div>:<div className="grid gap-4 lg:grid-cols-2">{filtered.map(story=><article key={story.id} className="rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-bold tracking-wider text-[#C79854]">NUSANTARA STORY</p><h2 className="mt-1 font-display text-xl text-[#431714]">{story.name}</h2><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#7A6C5E]">{story.description}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-3 py-1.5 text-[9px] font-bold text-amber-800">{story.status==="pending_review"?"Menunggu":story.status==="active"?"Tayang":"Ditolak"}</span></div><div className="mt-4 flex items-center justify-between border-t border-[#E7DDCC] pt-3"><p className="text-[10px] text-[#806A4E]">{story.pages?.length??0} halaman · {new Date(story.created_at).toLocaleDateString("id-ID")}</p><button onClick={()=>setPreview(story)} className="inline-flex items-center gap-2 rounded-full bg-[#431714] px-4 py-2 text-[10px] font-bold text-white"><Eye size={13}/> Tinjau cerita</button></div></article>)}</div>}
  {preview&&<div className="fixed inset-0 z-[80] overflow-y-auto bg-black/55 p-3 sm:p-6" onClick={()=>setPreview(null)}><section role="dialog" aria-modal="true" aria-labelledby="story-review-title" onClick={e=>e.stopPropagation()} className="mx-auto my-4 max-w-3xl rounded-2xl bg-[#FDFAF3] p-4 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold tracking-wider text-[#C79854]">STORY REVIEW</p><h2 id="story-review-title" className="mt-1 font-display text-2xl text-[#431714]">{preview.name}</h2><p className="mt-1 text-xs text-[#7A6C5E]">{preview.description}</p></div><button onClick={()=>setPreview(null)} aria-label="Tutup preview" className="rounded-full p-2 hover:bg-[#F3EBDD]"><X size={19}/></button></div>
   <div className="mt-5 space-y-5">{preview.pages.map(page=><article key={page.id} className="rounded-xl border border-[#E2D7C6] bg-white p-3 sm:p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-bold text-[#431714]">Halaman {page.page_number}{page.page_title?" · "+page.page_title:""}</h3><span className="text-[9px] text-[#8A7965]">{page.audio_duration_seconds?Math.floor(page.audio_duration_seconds/60)+"m "+page.audio_duration_seconds%60+"d":"Audio"}</span></div><img src={page.illustration_url} alt={"Ilustrasi halaman "+page.page_number} className="mt-3 max-h-72 w-full rounded-lg bg-[#F7F1E3] object-contain"/><p className="mt-3 whitespace-pre-line text-xs leading-6 text-[#574638]">{page.body}</p><div className="mt-3 flex items-center gap-2 rounded-lg bg-[#F7F1E3] p-3"><FileAudio size={16} className="text-[#93372A]"/><audio controls preload="none" src={page.audio_url} className="h-9 min-w-0 flex-1"/></div></article>)}</div>
   {preview.status==="active"&&<div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl bg-white p-4"><QRCodeSVG value={origin+"/cerita/"+preview.slug} size={96}/><div><p className="text-xs font-bold text-[#431714]">QR Code cerita aktif</p><Link href={"/cerita/"+preview.slug} target="_blank" className="mt-1 block text-xs text-[#93372A]">Buka halaman publik</Link></div></div>}
   {preview.status==="pending_review"&&<div className="mt-5 border-t border-[#E2D7C6] pt-5"><label className="block text-xs font-semibold text-[#574638]">Alasan penolakan (wajib jika menolak)<textarea value={note[preview.id]??""} onChange={e=>setNote(v=>({...v,[preview.id]:e.target.value}))} rows={2} maxLength={1000} placeholder="Jelaskan bagian yang perlu diperbaiki..." className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-3 py-2.5 text-xs"/></label><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button disabled={busy===preview.id} onClick={()=>void moderate(preview,"rejected")} className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 px-5 py-3 text-xs font-bold text-rose-700 disabled:opacity-50"><X size={15}/> Tolak cerita</button><button disabled={busy===preview.id} onClick={()=>void moderate(preview,"active")} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#431714] px-5 py-3 text-xs font-bold text-white disabled:opacity-50"><Check size={15}/> Setujui & publikasikan</button></div></div>}
  </section></div>}
 </DashboardShell>;
}
