"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, FileAudio, FileImage, Mic, Plus, Square, Trash2, UploadCloud } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import DashboardShell, { type DashboardNavItem } from "@/components/dashboard/DashboardShell";

type PageDraft = { title: string; body: string; imageUrl: string; audio: File | null; audioPreview: string; imagePreview: string; duration: number | null; audioPath?: string };
type Story = { id: string; slug: string; name: string; description: string | null; price: number; stock: number; status: string; moderation_note: string | null; moderation_history?: { id: string; actor_id: string | null; action: string; reason: string; previous_status: string | null; new_status: string | null; created_at: string }[]; metadata?: Record<string, unknown>; pages: { page_number: number; page_title: string | null; body: string; illustration_url: string; audio_url: string; illustration_path: string; audio_path: string; audio_duration_seconds: number | null }[] };
const nav: DashboardNavItem[] = [
 {label:"Ringkasan",href:"/seller/dashboard",icon:"overview"},
 {label:"Katalog Produk",href:"/seller/products",icon:"products"},
 {label:"Tambah Produk",href:"/seller/products/new",icon:"add"},
 {label:"Iklan & Promosi",href:"/seller/ads",icon:"ads"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Analitik Penjualan",href:"/seller/analytics",icon:"analytics"},
 {label:"Profil Toko",href:"/seller/profile",icon:"profile"},
 {label:"Pusat Bantuan",href:"/seller/help",icon:"help"},
];
const mobileNav: DashboardNavItem[] = [
 {label:"Beranda",href:"/seller/dashboard",icon:"overview"},
 {label:"Produk",href:"/seller/products",icon:"products"},
 {label:"Pesanan",href:"/seller/orders",icon:"orders"},
 {label:"Toko",href:"/seller/profile",icon:"profile"},
];
const statusLabel: Record<string,string> = {draft:"Draft",pending_review:"Menunggu kurasi",active:"Tayang",rejected:"Perlu revisi",suspended:"Ditangguhkan admin",banned:"Diblokir admin",archived:"Diarsipkan"};
const statusStyle: Record<string,string> = {draft:"bg-stone-100 text-stone-700",pending_review:"bg-amber-100 text-amber-800",active:"bg-emerald-100 text-emerald-800",rejected:"bg-rose-100 text-rose-800",suspended:"bg-rose-100 text-rose-800",banned:"bg-rose-100 text-rose-800",archived:"bg-stone-100 text-stone-500"};
const emptyPage = (): PageDraft => ({title:"",body:"",imageUrl:"",audio:null,audioPreview:"",imagePreview:"",duration:null});

export default function SellerStoriesPage(){
 const router=useRouter();
 const [editId,setEditId]=useState<string|null>(null);
 const [stories,setStories]=useState<Story[]>([]);
 const [pages,setPages]=useState<PageDraft[]>([emptyPage()]);
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [price,setPrice]=useState("15000");
 const [stock,setStock]=useState("25");
 const [coverUrl,setCoverUrl]=useState("");
 const [coverPreview,setCoverPreview]=useState("");
 const [category,setCategory]=useState("budaya");
 const [editingStoryId,setEditingStoryId]=useState<string|null>(null);
 const [editLoaded,setEditLoaded]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [recordingIndex,setRecordingIndex]=useState<number|null>(null);
 const [previewOpen,setPreviewOpen]=useState(false);
 const [previewPage,setPreviewPage]=useState(0);
 const recorderRef=useRef<MediaRecorder|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const chunksRef=useRef<Blob[]>([]);
 const recordingStartedAt=useRef(0);

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
 useEffect(()=>{void load();const id=new URLSearchParams(window.location.search).get("edit");if(id)setEditId(id);},[]);
 useEffect(()=>{
  if(!editId||editLoaded===editId||stories.length===0)return;
  const story=stories.find(item=>item.id===editId);
  if(!story)return;
  setEditingStoryId(story.id);setTitle(story.name);setDescription(story.description??"");setPrice(String(story.price??15000));setStock(String(story.stock??1));const savedCover=typeof story.metadata?.image==="string"?story.metadata.image:"";setCoverUrl(savedCover);setCoverPreview(savedCover);
  setCategory(String(story.metadata?.story_category??"budaya"));
  setPages(story.pages.map(page=>({title:page.page_title??"",body:page.body,imageUrl:page.illustration_url,imagePreview:page.illustration_url,audio:null,audioPreview:page.audio_url,duration:page.audio_duration_seconds,audioPath:page.audio_path})));
  setEditLoaded(editId);
 },[editId,editLoaded,stories]);
 useEffect(()=>()=>{if(recorderRef.current?.state==="recording")recorderRef.current.stop();streamRef.current?.getTracks().forEach(track=>track.stop());},[]);

 function setPage(index:number,patch:Partial<PageDraft>){
  setPages(current=>current.map((page,i)=>i===index?{...page,...patch}:page));
 }
 function addPage(){if(pages.length<20)setPages(v=>[...v,emptyPage()]);}
 function removePage(index:number){
  if(pages.length===1)return;
  setPages(v=>v.filter((_,i)=>i!==index));
 }
 function normalizeImageUrl(value:string){
  const trimmed=value.trim();
  try{
   const url=new URL(trimmed);
   if(url.protocol!=="https:")return "";
   if(url.hostname==="drive.google.com"){
    const pathParts=url.pathname.split("/").filter(Boolean);
    const id=url.searchParams.get("id")||(pathParts[0]==="file"&&pathParts[1]==="d"?pathParts[2]:"");
    return id?"https://drive.google.com/thumbnail?id="+encodeURIComponent(id)+"&sz=w1200":trimmed;
   }
   if(url.hostname==="imgur.com"||url.hostname==="www.imgur.com"){
    const id=url.pathname.split("/").filter(Boolean).pop()?.split(".")[0];
    return id?"https://i.imgur.com/"+id+".jpg":trimmed;
   }
   return trimmed;
  }catch{return "";}
 }
 function updateImageUrl(index:number,value:string){
  const normalized=normalizeImageUrl(value);
  setPage(index,{imageUrl:value,imagePreview:normalized});
  setError("");
 }
 function chooseAudio(index:number,file:File|null){
  if(!file)return;
  if(!["audio/mpeg","audio/mp4","audio/wav","audio/x-m4a","audio/aac","audio/webm"].includes(file.type)||file.size>15*1024*1024){setError("Audio harus MP3, M4A, AAC, WAV, atau WebM maksimal 15 MB.");return;}
  const url=URL.createObjectURL(file);const audio=new Audio(url);
  audio.onloadedmetadata=()=>setPage(index,{audio:file,audioPreview:url,duration:Number.isFinite(audio.duration)?Math.round(audio.duration):null});
  audio.onerror=()=>setPage(index,{audio:file,audioPreview:url});setError("");
 }
 async function toggleRecording(index:number){
  if(recordingIndex===index){recorderRef.current?.stop();return;}
  if(recordingIndex!==null){setError("Selesaikan rekaman halaman sebelumnya terlebih dahulu.");return;}
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")throw new Error("Browser ini belum mendukung rekaman langsung. Silakan upload file audio.");
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});streamRef.current=stream;
   const mimeType=["audio/webm;codecs=opus","audio/mp4","audio/webm"].find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
   recorderRef.current=recorder;chunksRef.current=[];recordingStartedAt.current=Date.now();setPage(index,{audio:null,audioPreview:"",duration:null});setRecordingIndex(index);setError("");
   recorder.ondataavailable=event=>{if(event.data.size>0)chunksRef.current.push(event.data);};
   recorder.onerror=()=>{setError("Rekaman gagal. Periksa izin mikrofon lalu coba lagi.");setRecordingIndex(null);stream.getTracks().forEach(track=>track.stop());};
   recorder.onstop=()=>{
    const recordedMime=recorder.mimeType||"audio/webm";const mime=recordedMime.includes("mp4")?"audio/mp4":"audio/webm";const blob=new Blob(chunksRef.current,{type:mime});
    const ext=mime==="audio/mp4"?"m4a":"webm";
    if(blob.size>15*1024*1024){setError("Ukuran rekaman melebihi 15 MB. Rekam ulang dengan durasi lebih singkat.");}
    else if(blob.size>0){const file=new File([blob],"narasi-halaman-"+(index+1)+"."+ext,{type:mime});const audioPreview=URL.createObjectURL(blob);setPage(index,{audio:file,audioPreview,duration:Math.max(1,Math.round((Date.now()-recordingStartedAt.current)/1000))});}
    setRecordingIndex(null);stream.getTracks().forEach(track=>track.stop());streamRef.current=null;recorderRef.current=null;
   };
   recorder.start();
  }catch(e){streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;setRecordingIndex(null);setError(e instanceof Error?e.message:"Tidak dapat mengakses mikrofon.");}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setError("");setMessage("");
  try{
   if(pages.some(p=>!p.body.trim()||!normalizeImageUrl(p.imageUrl)||(!p.audio&&!p.audioPath)))throw new Error("Setiap halaman wajib memiliki teks, URL ilustrasi HTTPS, dan rekaman audio. Lengkapi media yang belum tersedia.");
   let productId=editingStoryId??"";
   if(!productId){
    const createResponse=await fetch("/api/seller/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,category,price:Number(price),stock:Number(stock),coverUrl:normalizeImageUrl(coverUrl)})});
    const created=await createResponse.json();if(!createResponse.ok)throw new Error(created.error||"Draft cerita gagal dibuat.");
    productId=String(created.productId);
   }
   const supabase=createClient();
   const {data:{user}}=await supabase.auth.getUser();if(!user){await fetch("/api/seller/stories",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});throw new Error("Sesi login berakhir. Silakan login kembali.");}
   const uploaded:string[]=[];
   try{
    const pagePayload=[];
    for(let i=0;i<pages.length;i++){
     const p=pages[i];const imageUrl=normalizeImageUrl(p.imageUrl);let audioPath=p.audioPath??"";
     if(p.audio){const ext=p.audio.type==="audio/mpeg"?"mp3":p.audio.type==="audio/wav"?"wav":p.audio.type==="audio/aac"?"aac":p.audio.type==="audio/webm"?"webm":"m4a";audioPath=user.id+"/"+productId+"/"+(i+1)+"-narration-"+crypto.randomUUID()+"."+ext;const result=await supabase.storage.from("story-media").upload(audioPath,p.audio,{contentType:p.audio.type,upsert:false});if(result.error)throw new Error("Upload audio halaman "+(i+1)+" gagal: "+result.error.message);uploaded.push(audioPath);}
     pagePayload.push({title:p.title,body:p.body,duration:p.duration,illustration_url:imageUrl,audio_url:audioPath});
    }
    const saveResponse=await fetch("/api/seller/stories",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId,category,description,price:Number(price),stock:Number(stock),coverUrl:normalizeImageUrl(coverUrl),pages:pagePayload})});
    const saved=await saveResponse.json();if(!saveResponse.ok)throw new Error(saved.error||"Halaman cerita gagal disimpan.");savedMessage=typeof saved.message==="string"?saved.message:"";
   }catch(uploadError){
    await supabase.storage.from("story-media").remove(uploaded);
    if(!editingStoryId)await fetch("/api/seller/stories",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId})});
    throw uploadError;
   }
   setMessage(editingStoryId?"Perubahan cerita berhasil dikirim ulang untuk ditinjau admin.":"Cerita berhasil dikirim ke admin untuk ditinjau.");
   setTitle("");setDescription("");setCategory("budaya");setPrice("15000");setStock("25");setCoverUrl("");setCoverPreview("");setPages([emptyPage()]);setEditingStoryId(null);setEditLoaded(null);router.replace("/seller/stories");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Cerita gagal dikirim.");}
  finally{setSaving(false);}
 }
 const origin=typeof window!=="undefined"?window.location.origin:"";
 return <DashboardShell role="UMKM" title="Cerita Audio" subtitle="Terbitkan kisah dan pengalaman dari tokomu." navItems={nav} mobileNavItems={mobileNav}>
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
   <div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">ARTISAN STORY STUDIO</p><h1 className="mt-2 font-display text-3xl text-[#431714]">{editingStoryId?"Edit cerita":"Cerita dari tokomu"}</h1><p className="mt-2 max-w-2xl text-xs leading-6 text-[#7A6C5E]">Buat dan perbarui buku cerita bergambar dengan narasi suara asli. Setiap cerita berisi 1–20 halaman dan akan diperiksa admin sebelum dipublikasikan.</p></div>
   <Link href="/stories" className="inline-flex items-center gap-2 rounded-full border border-[#DCD2C1] px-4 py-2.5 text-xs font-semibold text-[#6E3028]">Lihat katalog <ArrowRight size={14}/></Link>
  </div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
  {message&&<p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><CheckCircle2 size={16}/>{message}</p>}
  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
   <form onSubmit={submit} className="space-y-5 rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-4 sm:p-6">
    <div><p className="text-[9px] font-bold tracking-[.14em] text-[#C79854]">INFORMASI CERITA</p><h2 className="mt-1 font-display text-xl text-[#431714]">{editingStoryId?"Perbarui identitas cerita":"Identitas cerita"}</h2></div>
    <label className="block text-xs font-semibold text-[#574638]">Judul cerita<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Kisah di Balik Motif Batik" className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/></label>
    <label className="block text-xs font-semibold text-[#574638]">Deskripsi<textarea required minLength={20} maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ceritakan secara singkat isi dan keunikan cerita ini..." className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm outline-none focus:border-[#93372A]"/></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-[#574638]">Harga jual (Rp)<input required type="number" min="1000" max="100000000" step="1000" value={price} onChange={e=>setPrice(e.target.value)} className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm"/></label><label className="block text-xs font-semibold text-[#574638]">Stok tersedia<input required type="number" min="1" max="10000" step="1" value={stock} onChange={e=>setStock(e.target.value)} className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm"/></label></div><div className="rounded-xl border border-dashed border-[#CDBB9F] bg-[#FBF7EE] p-4"><label className="block text-xs font-bold text-[#79552F]">Cover utama Kado Cerita</label><p className="mt-1 text-[10px] text-[#8A7965]">Masukkan URL gambar HTTPS dari Imgur atau Google Drive. Cover ini tampil di katalog dan halaman produk.</p><input required type="url" value={coverUrl} onChange={e=>{setCoverUrl(e.target.value);setCoverPreview(normalizeImageUrl(e.target.value));}} placeholder="https://i.imgur.com/cover.jpg" className="mt-3 w-full rounded-lg border border-[#DED3C1] bg-white px-3 py-2.5 text-xs"/>{coverPreview&&<img src={coverPreview} alt="Preview cover Kado Cerita" className="mt-3 h-44 w-full rounded-lg bg-white object-contain" onError={()=>setCoverPreview("")}/>}</div><label className="block text-xs font-semibold text-[#574638]">Kategori<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-[#DED3C1] bg-white px-4 py-3 text-sm"><option value="budaya">Budaya dan tradisi</option><option value="dongeng">Dongeng dan legenda</option><option value="inspirasi">Inspirasi dan cita-cita</option><option value="sejarah">Sejarah daerah</option><option value="edukasi">Edukasi</option></select></label>
    <div className="border-t border-[#E7DDCC] pt-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-bold tracking-[.14em] text-[#C79854]">ISI BUKU</p><h2 className="mt-1 font-display text-xl text-[#431714]">Halaman cerita</h2></div><span className="rounded-full bg-[#F3EBDD] px-3 py-1.5 text-[10px] font-bold text-[#79552F]">{pages.length}/20 halaman</span></div>
     <div className="mt-4 space-y-4">{pages.map((page,index)=><section key={index} className="rounded-xl border border-[#DED3C1] bg-white p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-[#431714]">Halaman {index+1}</h3>{pages.length>1&&<button type="button" onClick={()=>removePage(index)} aria-label="Hapus halaman" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button>}</div>
      <input value={page.title} onChange={e=>setPage(index,{title:e.target.value})} placeholder="Judul halaman (opsional)" className="mb-3 w-full rounded-lg border border-[#E5DDCF] px-3 py-2.5 text-xs outline-none focus:border-[#93372A]"/>
      <textarea required minLength={10} maxLength={5000} rows={4} value={page.body} onChange={e=>setPage(index,{body:e.target.value})} placeholder="Tulis isi cerita untuk halaman ini..." className="w-full rounded-lg border border-[#E5DDCF] px-3 py-3 text-xs leading-6 outline-none focus:border-[#93372A]"/>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
       <div className="rounded-xl border border-dashed border-[#CDBB9F] bg-[#FBF7EE] p-3"><label className="flex items-center gap-2 text-xs font-bold text-[#79552F]"><FileImage size={16}/> URL ilustrasi halaman</label><p className="mt-1 text-[10px] text-[#8A7965]">Tempel tautan gambar HTTPS dari Imgur atau Google Drive.</p><input type="url" value={page.imageUrl} onChange={e=>updateImageUrl(index,e.target.value)} placeholder="https://i.imgur.com/contoh.jpg" className="mt-3 w-full rounded-lg border border-[#DED3C1] bg-white px-3 py-2.5 text-[10px] outline-none focus:border-[#93372A]"/>{page.imagePreview?<img src={page.imagePreview} alt="Preview ilustrasi" className="mt-3 h-32 w-full rounded-lg bg-white object-contain" onError={()=>setPage(index,{imagePreview:""})}/>:page.imageUrl&&<p className="mt-2 text-[10px] text-rose-700">Tautan belum dapat ditampilkan. Periksa akses dan format gambar.</p>}</div>
       <div className="rounded-xl border border-dashed border-[#CDBB9F] bg-[#FBF7EE] p-3"><span className="flex items-center gap-2 text-xs font-bold text-[#79552F]"><FileAudio size={16}/> Rekaman narasi</span><span className="mt-1 block text-[10px] text-[#8A7965]">Rekam langsung atau upload MP3, M4A, AAC, WAV, WebM · Maks. 15 MB</span><button type="button" onClick={()=>void toggleRecording(index)} disabled={recordingIndex!==null&&recordingIndex!==index} className={"mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold disabled:opacity-50 "+(recordingIndex===index?"bg-rose-600 text-white":"bg-[#431714] text-white")}>{recordingIndex===index?<><Square size={14}/> Hentikan rekaman</>:<><Mic size={14}/> Rekam suara langsung</>}</button><input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac,audio/webm" onChange={e=>chooseAudio(index,e.target.files?.[0]??null)} className="mt-3 block w-full text-[10px] file:mr-2 file:rounded-full file:border-0 file:bg-[#EDE0C7] file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-[#79552F]"/>{page.audio&&<div className="mt-3 rounded-lg bg-white p-3"><p className="truncate text-[10px] font-semibold text-emerald-800">✓ Audio siap: {page.audio.name}{page.duration? " · "+page.duration+" detik":""}</p>{page.audioPreview&&<audio controls preload="metadata" src={page.audioPreview} className="mt-2 w-full"/>}<p className="mt-1 text-[10px] text-[#8A7965]">Dengarkan preview untuk memastikan suara dan isi narasi sudah benar.</p></div>}</div>
      </div>
     </section>)}</div>
     <button type="button" onClick={addPage} disabled={pages.length>=20} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#BDA98C] px-4 py-2.5 text-xs font-bold text-[#79552F] disabled:opacity-40"><Plus size={15}/> Tambah halaman</button>
    </div>
    <div className="rounded-xl bg-[#F3EBDD] p-4 text-[11px] leading-5 text-[#765E48]">Jumlah halaman fleksibel: minimal 1 dan maksimal 20 halaman per cerita. Setiap halaman wajib memiliki teks, ilustrasi, dan audio. Dengarkan preview audio sebelum mengirim. Pastikan rekaman merupakan suara yang kamu miliki atau telah mendapat izin dari narator.</div>
    <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>{setPreviewPage(0);setPreviewOpen(true);}} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#BDA98C] px-5 py-3.5 text-xs font-bold text-[#79552F]"><Eye size={15}/> Preview cerita</button><button disabled={saving} className="flex items-center justify-center gap-2 rounded-full bg-[#431714] px-5 py-3.5 text-xs font-bold text-white hover:bg-[#61251E] disabled:cursor-wait disabled:opacity-60">{saving?<><UploadCloud size={16}/> Mengunggah cerita...</>:<>{editingStoryId?"Simpan perubahan & kirim kurasi":"Kirim untuk kurasi admin"} <ArrowRight size={15}/></>}</button></div>
   </form>
   {previewOpen&&<div className="fixed inset-0 z-[90] overflow-y-auto bg-black/60 p-3 sm:p-6" onClick={()=>setPreviewOpen(false)}><section role="dialog" aria-modal="true" aria-label="Preview cerita" onClick={e=>e.stopPropagation()} className="mx-auto my-4 max-w-3xl rounded-2xl bg-[#FDFAF3] p-4 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold tracking-[.16em] text-[#C79854]">PREVIEW CERITA</p><h2 className="mt-1 font-display text-2xl text-[#431714]">{title||"Judul cerita"}</h2><p className="mt-1 text-xs leading-5 text-[#7A6C5E]">{description||"Deskripsi cerita akan tampil di sini."}</p></div><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-full border border-[#DED3C1] px-3 py-2 text-xs font-bold text-[#79552F]">Tutup</button></div>{pages[previewPage]&&<article className="mt-5 overflow-hidden rounded-xl border border-[#DED3C1] bg-white"><div className="flex items-center justify-between p-3"><h3 className="text-xs font-bold text-[#431714]">Halaman {previewPage+1}{pages[previewPage].title?" · "+pages[previewPage].title:""}</h3><span className="text-[9px] text-[#8A7965]">{previewPage+1}/{pages.length}</span></div>{pages[previewPage].imagePreview?<img src={pages[previewPage].imagePreview} alt={pages[previewPage].title||"Ilustrasi cerita"} className="max-h-[420px] w-full bg-[#F7F1E3] object-contain"/>:<div className="p-10 text-center text-xs text-[#8A7965]">Preview ilustrasi akan muncul setelah URL gambar diisi.</div>}<div className="p-5 sm:p-7"><p className="whitespace-pre-line text-sm leading-8 text-[#574638]">{pages[previewPage].body||"Isi cerita akan tampil di sini."}</p>{pages[previewPage].audioPreview&&<div className="mt-5 rounded-xl bg-[#F3EBDD] p-3"><p className="mb-2 text-[10px] font-bold text-[#79552F]">Narasi audio</p><audio controls preload="metadata" src={pages[previewPage].audioPreview} className="w-full"/></div>}</div></article>}<div className="mt-4 flex items-center justify-between gap-3"><button type="button" disabled={previewPage===0} onClick={()=>setPreviewPage(v=>Math.max(0,v-1))} className="rounded-full border border-[#CDBB9F] px-4 py-2.5 text-[10px] font-bold text-[#79552F] disabled:opacity-30">Halaman sebelumnya</button><div className="flex gap-1.5">{pages.map((p,i)=><button key={i} type="button" onClick={()=>setPreviewPage(i)} aria-label={"Preview halaman "+(i+1)} className={"h-2 rounded-full "+(i===previewPage?"w-6 bg-[#93372A]":"w-2 bg-[#D6C7B2]")}/>)}</div><button type="button" disabled={previewPage>=pages.length-1} onClick={()=>setPreviewPage(v=>Math.min(pages.length-1,v+1))} className="rounded-full bg-[#431714] px-4 py-2.5 text-[10px] font-bold text-white disabled:opacity-30">Halaman berikutnya</button></div></section></div>}
   <aside className="space-y-5">
    <section className="rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-5"><h2 className="font-display text-xl text-[#431714]">Alur publikasi</h2><div className="mt-4 space-y-4 text-xs text-[#756654]"><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">1</span>Isi cerita, upload ilustrasi, lalu rekam narasi langsung atau upload audio.</p><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">2</span>Kirim cerita atau pembaruan untuk diperiksa admin.</p><p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EBDD] font-bold text-[#79552F]">3</span>Setelah disetujui, cerita tampil di katalog dan QR Code dapat dibagikan.</p></div></section>
    <section className="rounded-2xl border border-[#DED3C1] bg-[#FDFAF3] p-5"><div className="flex items-center justify-between"><h2 className="font-display text-xl text-[#431714]">Cerita saya</h2><button onClick={()=>void load()} className="text-[10px] font-bold text-[#93372A]">Muat ulang</button></div>
     {loading?<p className="py-6 text-center text-xs text-[#8A7965]">Memuat cerita...</p>:stories.length===0?<p className="py-6 text-center text-xs text-[#8A7965]">Belum ada cerita yang dibuat.</p>:<div className="mt-3 space-y-3">{stories.map(story=><article key={story.id} className="rounded-xl border border-[#E7DDCC] bg-white p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-xs font-bold text-[#431714]">{story.name}</h3><p className="mt-1 text-[10px] text-[#8A7965]">{story.pages?.length??0} halaman</p></div><span className={"shrink-0 rounded-full px-2 py-1 text-[9px] font-bold "+(statusStyle[story.status]??statusStyle.draft)}>{statusLabel[story.status]??story.status}</span></div>{story.moderation_note&&<p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] leading-5 text-rose-700">Catatan moderator: {story.moderation_note}</p>}{["suspended","banned"].includes(story.status)&&<p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] leading-5 text-rose-700">Listing tidak tampil. Kamu dapat memperbaiki isi cerita, tetapi hanya moderator yang dapat memulihkan statusnya.</p>}<button type="button" onClick={()=>router.push("/seller/stories?edit="+story.id)} className="mt-3 min-h-11 rounded-full border border-[#DCD2C1] px-3 py-2.5 text-[10px] font-bold text-[#431714]">Edit cerita</button>{story.moderation_history&&story.moderation_history.length>0&&<details className="mt-3 rounded-lg border border-[#E8DFD2] bg-[#FDFAF3] px-3 py-2"><summary className="min-h-10 cursor-pointer py-2 text-[9px] font-bold text-[#79552F]">Riwayat kurasi & moderasi ({story.moderation_history.length})</summary><ol className="space-y-3 pb-2 pt-1">{story.moderation_history.map(event=><li key={event.id} className="border-l-2 border-[#D8B77C] pl-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[9px] text-[#431714]">{({approve:"Disetujui",request_revision:"Diminta revisi",warn:"Peringatan",suspend:"Penangguhan",ban:"Listing dilarang",restore:"Dipulihkan"} as Record<string,string>)[event.action]||event.action}</strong><time className="text-[8px] text-[#8A7965]">{new Date(event.created_at).toLocaleString("id-ID")}</time></div><p className="mt-1 text-[8px] text-[#7A6C5E]">Aktor: {event.actor_id?"Moderator NusantaraGift":"Sistem"} · {event.previous_status||"—"} → {event.new_status||"—"}</p><p className="mt-1 whitespace-pre-line text-[9px] leading-4 text-[#574638]">{event.reason}</p></li>)}</ol></details>}{story.status==="active"&&<div className="mt-3 flex items-center gap-3 border-t border-[#EEE5D9] pt-3"><QRCodeSVG value={origin+"/cerita/"+story.slug} size={76} level="M" includeMargin/><div className="min-w-0"><p className="text-[10px] font-bold text-[#431714]">QR Cerita aktif</p><Link href={"/cerita/"+story.slug} target="_blank" className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#93372A]">Buka cerita <ArrowRight size={12}/></Link><p className="mt-1 text-[9px] text-[#8A7965]">Simpan atau cetak QR ini.</p></div></div>}</article>)}</div>}
    </section>
   </aside>
  </div>
 </DashboardShell>;
}
