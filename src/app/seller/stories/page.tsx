"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileAudio, FileImage, Plus, Trash2, UploadCloud } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type PageDraft = { title: string; body: string; image: File | null; audio: File | null; imagePreview: string; duration: number | null };
type Story = { id: string; slug: string; name: string; description: string | null; status: string; moderation_note: string | null; pages: { page_number: number }[] };
const nav: DashboardNavItem[] = [
 {label:"Ringkasan",href:"/seller/dashboard",icon:"overview"},
 {label:"Katalog Produk",href:"/seller/products",icon:"products"},
 {label:"Cerita Audio",href:"/seller/stories",icon:"moderation"},
 {label:"Tambah Produk",href:"/seller/products/new",icon:"add"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Profil Toko",href:"/seller/profile",icon:"profile"},
];
const mobileNav: DashboardNavItem[] = [
 {label:"Beranda",href:"/seller/dashboard",icon:"overview"},
 {label:"Produk",href:"/seller/products",icon:"products"},
 {label:"Cerita",href:"/seller/stories",icon:"moderation"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Toko",href:"/seller/profile",icon:"profile"},
];
const statusLabel: Record<string,string> = {draft:"Draft",pending_review:"Menunggu kurasi",active:"Tayang",rejected:"Perlu revisi",archived:"Diarsipkan"};
const statusStyle: Record<string,string> = {draft:"bg-stone-100 text-stone-700",pending_review:"bg-amber-100 text-amber-800",active:"bg-emerald-100 text-emerald-800",rejected:"bg-rose-100 text-rose-800",archived:"bg-stone-100 text-stone-500"};
const emptyPage = (): PageDraft => ({title:"",body:"",image:null,audio:null,imagePreview:"",duration:null});

export default function SellerStoriesPage(){
 const router=useRouter();
 const [stories,setStories]=useState<Story[]>([]);
 const [pages,setPages]=useState<PageDraft[]>([emptyPage()]);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [category,setCategory]=useState("budaya");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 async function load(){
  setLoading(true); setError("");
  try{
   const r=await fetch("/api/seller/stories",{cache:"no-store"});
   const d=await r.json();
   if(r.status===401||r.status===403){router.replace("/login");return;}
   if(!r.ok) throw new Error(d.error||"Gagal memuat cerita.");
   setStories(d.stories??[]);
  }catch(e){setError(e instanceof Error?e.message:"Gagal memuat cerita.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);

 function setPage(index:number,patch:Partial<PageDraft>){
  setPages(current=>current.map((page,i)=>i===index?{...page,...patch}:page));
 }
 function addPage(){if(pages.length<20)setPages(v=>[...v,emptyPage()]);}
 function removePage(index:number){
  if(pages.length===1)return;
  setPages(v=>v.filter((_,i)=>i!==index));
 }
 function chooseImage(index:number,file:File|null){
  if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>15*1024*1024){setError("Ilustrasi harus JPG, PNG, atau WebP maksimal 15 MB.");return;}
  const preview=URL.createObjectURL(file);setPage(index,{image:file,imagePreview:preview});setError("");
 }
 function chooseAudio(index:number,file:File|null){
  if(!file)return;
  if(!["audio/mpeg","audio/mp4","audio/wav","audio/x-m4a","audio/aac"].includes(file.type)||file.size>15*1024*1024){setError("Audio harus MP3, M4A, AAC, atau WAV maksimal 15 MB.");return;}
  const url=URL.createObjectURL(file);const audio=new Audio(url);
  audio.onloadedmetadata=()=>setPage(index,{audio:file,duration:Number.isFinite(audio.duration)?Math.round(audio.duration):null});
  audio.onerror=()=>setPage(index,{audio:file});setError("");
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setMessage("");
  try{
   if(pages.some(p=>!p.body.trim()||!p.image||!p.audio))throw new Error("Setiap halaman wajib memiliki teks, ilustrasi, dan rekaman audio.");
   const createResponse=await fetch("/api/seller/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,category})});
   const created=await createResponse.json();if(!createResponse.ok)throw new Error(created.error||"Draft cerita gagal dibuat.");
   const productId=String(created.productId);
   const supabase=createClient();
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sesi login berakhir. Silakan login kembali.");
   const uploaded:string[]=[];
   try{
    const pagePayload=[];
    for(let i=0;i<pages.length;i++){
     const p=pages[i];if(!p.image||!p.audio)throw new Error("Halaman "+(i+1)+" belum lengkap.");
     const imageExt=p.image.type==="image/png"?"png":p.image.type==="image/webp"?"webp":"jpg";
     const audioExt=p.audio.type==="audio/mpeg"?"mp3":p.audio.type==="audio/wav"?"wav":p.audio.type==="audio/aac"?"aac":"m4a";
     const imagePath=user.id+"/"+productId+"/"+(i+1)+"-illustration-"+crypto.randomUUID()+"."+imageExt;
     const audioPath=user.id+"/"+productId+"/"+(i+1)+"-narration-"+crypto.randomUUID()+"."+audioExt;
     const [imageResult,audioResult]=await Promise.all([
      supabase.storage.from("story-media").upload(imagePath,p.image,{contentType:p.image.type,upsert:false}),
      supabase.storage.from("story-media").upload(audioPath,p.audio,{contentType:p.audio.type,upsert:false})
     ]);
     if(imageResult.error)throw new Error("Upload ilustrasi halaman "+(i+1)+" gagal: "+imageResult.error.message);
     uploaded.push(imagePath);
     if(audioResult.error)throw new Error("Upload audio halaman "+(i+1)+" gagal: "+audioResult.error.message);
     uploaded.push(audioPath);
     pagePayload.push({title:p.title,body:p.body,duration:p.duration,illustration_url:imagePath,audio_url:audioPath});
    }
    const saveResponse=await fetch("/api/seller/stories",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,category,pages:pagePayload})});
    const saved=await saveResponse.json();if(!saveResponse.ok)throw new Error(saved.error||"Halaman cerita gagal disimpan.");
   }catch(uploadError){
    await supabase.storage.from("story-media").remove(uploaded);
    await fetch("/api/seller/stories",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});
    throw uploadError;
   }
   setMessage("Cerita berhasil dikirim ke admin untuk ditinjau.");
   setTitle("");setDescription("");setCategory("budaya");setPages([emptyPage()]);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Cerita gagal dikirim.");}
  finally{setSaving(false);}
 }
 const origin=typeof window!=="undefined"?window.location.origin:"";
 return <DashboardShell role="UMKM" title="Cerita Audio" subtitle="Terbitkan kisah dan pengalaman dari tokomu." navItems={nav} mobileNavItems={mobileNav}>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">ARTISAN STORY STUDIO</p><h1 className="mt-2 font-display text-3xl text-[#431714]">Cerita dari tokomu</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-[#7A6C5E]">Buat buku cerita bergambar dengan narasi suara asli. Cerita gratis untuk pengunjung dan akan diperiksa admin sebelum dipublikasikan.</p></div>
   <Link href="/cerita" className="inline-flex items-center gap-2 rounded-full border border-[#DCD2C1] px-4 py-2.5 text-xs font-semibold text-[#6E3028]">Lihat katalog <ArrowRight size={14}/></Link>
  </div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
  {message&&<p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={16}/>{message}</p>}
  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
   <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-4 sm:p-6">
    <div><p className="text-[9px] font-bold tracking-[.14em] text-[#C79854]">INFORMASI CERITA</p><h2 className="mt-1 font-display text-xl text-[#431714]">Identitas cerita</h2></div>
    <label className="block text-xs font-semibold text-[#574638]">Judul cerita<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Kisah di Balik Motif Batik" className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/></label>
    <label className="block text-xs font-semibold text-[#574638]">Deskripsi<textarea required minLength={20} maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ceritakan secara singkat isi dan keunikan cerita ini..." className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/></label>
    <label className="block text-xs font-semibold text-[#574638]">Kategori<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm"><option value="budaya">Budaya dan tradisi</option><option value="dongeng">Dongeng dan legenda</option><option value="inspirasi">Inspirasi dan cita-cita</option><option value="sejarah">Sejarah daerah</option><option value="edukasi">Edukasi</option></select></label>
    <div className="border-t border-[#E7DDCC] pt-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold tracking-[.14em] text-[#C79854]">ISI BUKU</p><h2 className="mt-1 font-display text-xl text-[#431714]">Halaman cerita</h2></div><span className="rounded-full bg-[#F3EBDD] px-3 py-1.5 text-[10px] font-bold text-[#79552F]">{pages.length}/20 halaman</span></div>
     <div className="mt-4 space-y-4">{pages.map((page,index)=><section key={index} className="rounded-xl border border-[#DED3C1] bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-[#431714]">Halaman {index+1}</h3>{pages.length>1&&<button type="button" onClick={()=>removePage(index)} aria-label="Hapus halaman" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button>}</div>
      <input value={page.title} onChange={e=>setPage(index,{title:e.target.value})} placeholder="Judul halaman (opsional)" className="mb-3 w-full rounded-lg border border-[#E5DDCF] px-3 py-2.5 text-xs outline-none focus:border-[#93372A]"/>
      <textarea required minLength={10} maxLength={5000} rows={4} value={page.body} onChange={e=>setPage(index,{body:e.target.value})} placeholder="Tulis isi cerita untuk halaman ini..." className="w-full rounded-lg border border-[#E5DDCF] px-3 py-3 text-xs leading-6 outline-none focus:border-[#93372A]"/>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
       <label className="cursor-pointer rounded-xl border border-dashed border-[#CDBB9F] bg-[#FBF7EE] p-3"><span className="flex items-center gap-2 text-xs font-bold text-[#79552F]"><FileImage size={16}/> Ilustrasi halaman</span><span className="mt-1 block text-[10px] text-[#8A7965]">JPG, PNG, WebP · Maks. 15 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>chooseImage(index,e.target.files?.[0]??null)} className="mt-2 block w-full text-[10px] file:mr-2 file:rounded-full file:border-0 file:bg-[#EDE0C7] file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#79552F]"/>{page.imagePreview&&<img src={page.imagePreview} alt="Preview ilustrasi" className="mt-3 h-28 w-full rounded-lg object-cover"/>}</label>
       <label className="cursor-pointer rounded-xl border border-dashed border-[#CDBB9F] bg-[#FBF7EE] p-3"><span className="flex items-center gap-2 text-xs font-bold text-[#79552F]"><FileAudio size={16}/> Rekaman narasi</span><span className="mt-1 block text-[10px] text-[#8A7965]">MP3, M4A, AAC, WAV · Maks. 15 MB</span><input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac" onChange={e=>chooseAudio(index,e.target.files?.[0]??null)} className="mt-2 block w-full text-[10px] file:mr-2 file:rounded-full file:border-0 file:bg-[#EDE0C7] file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#79552F]"/>{page.audio&&<p className="mt-3 truncate text-[10px] text-emerald-800">✓ {page.audio.name}{page.duration? " · "+page.duration+" detik":""}</p>}</label>
      </div>
     </section>)}</div>
     <button type="button" onClick={addPage} disabled={pages.length>=20} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#BDA98C] px-4 py-2.5 text-xs font-bold text-[#79552F] disabled:opacity-40"><Plus size={15}/> Tambah halaman</button>
    </div>
    <div className="rounded-xl bg-[#F3EBDD] p-4 text-[11px] leading-5 text-[#765E48]">Pastikan rekaman merupakan suara yang kamu miliki atau telah mendapat izin dari narator. Cerita tidak dikenakan biaya kepada pembaca.</div>
    <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#431714] px-5 py-3.5 text-xs font-bold text-white hover:bg-[#61251E] disabled:cursor-wait disabled:opacity-60">{saving?<><UploadCloud size={16}/> Mengunggah cerita...</>:<>Kirim untuk kurasi admin <ArrowRight size={15}/></>}</button>
   </form>
   <aside className="space-y-5">
    <section className="rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-5"><h2 className="font-display text-xl text-[#431714]">Alur publikasi</h2><div className="mt-4 space-y-4 text-xs text-[#756654]"><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">1</span>Isi halaman, ilustrasi, dan rekaman suara.</p><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">2</span>Kirim cerita untuk diperiksa admin.</p><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">3</span>Setelah disetujui, cerita tampil di katalog dan QR Code dapat dibagikan.</p></div></section>
    <section className="rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl text-[#431714]">Cerita saya</h2><button onClick={()=>void load()} className="text-[10px] font-bold text-[#93372A]">Muat ulang</button></div>
     {loading?<p className="py-6 text-center text-xs text-[#8A7965]">Memuat cerita...</p>:stories.length===0?<p className="py-6 text-center text-xs text-[#8A7965]">Belum ada cerita yang dibuat.</p>:<div className="mt-3 space-y-3">{stories.map(story=><article key={story.id} className="rounded-xl border border-[#E7DDCC] bg-white p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-xs font-bold text-[#431714]">{story.name}</h3><p className="mt-1 text-[10px] text-[#8A7965]">{story.pages?.length??0} halaman</p></div><span className={"shrink-0 rounded-full px-2 py-1 text-[9px] font-bold "+(statusStyle[story.status]??statusStyle.draft)}>{statusLabel[story.status]??story.status}</span></div>{story.moderation_note&&<p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] text-rose-700">Catatan admin: {story.moderation_note}</p>}{story.status==="active"&&<div className="mt-3 flex items-center gap-3 border-t border-[#EEE5D9] pt-3"><QRCodeSVG value={origin+"/cerita/"+story.slug} size={76} level="M" includeMargin/><div className="min-w-0"><p className="text-[10px] font-bold text-[#431714]">QR Cerita aktif</p><Link href={"/cerita/"+story.slug} target="_blank" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#93372A]">Buka cerita <ArrowRight size={12}/></Link><p className="mt-1 text-[9px] text-[#8A7965]">Simpan atau cetak QR ini.</p></div></div>}</article>)}</div>}
    </section>
   </aside>
  </div>
 </DashboardShell>;
}
