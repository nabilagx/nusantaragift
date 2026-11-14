"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { ArrowLeft, Camera, CheckCircle2, ImageUp, LoaderCircle, ScanQrCode, XCircle } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";

type ScanStatus = "idle" | "starting" | "scanning" | "success" | "error";
export default function ScanPage() {
 const router=useRouter();
 const scannerRef=useRef<Html5Qrcode|null>(null);
 const startingRef=useRef(false);
 const processingRef=useRef(false);
 const mountedRef=useRef(false);
 const [status,setStatus]=useState<ScanStatus>("idle");
 const [message,setMessage]=useState("Arahkan kamera ke QR Code NusantaraGift.");
 const [manualCode,setManualCode]=useState("");
 const [imageBusy,setImageBusy]=useState(false);

 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;const scanner=scannerRef.current;if(scanner?.isScanning)void scanner.stop().catch(()=>{});};},[]);

 function openDecodedText(value:string){
  if(processingRef.current)return;
  processingRef.current=true;
  try{
   const decoded=new URL(value,window.location.origin);
   if(decoded.origin!==window.location.origin)throw new Error("QR Code bukan berasal dari domain NusantaraGift.");
   const story=decoded.pathname.match(/^\/cerita\/([a-zA-Z0-9_-]+)\/?$/);
   if(story){setStatus("success");setMessage("QR Cerita berhasil dibaca. Membuka buku cerita...");router.push("/cerita/"+encodeURIComponent(story[1]));return;}
   const gift=decoded.pathname.match(/^\/experience\/([a-zA-Z0-9_-]+)\/?$/);
   if(gift){setStatus("success");setMessage("QR Gift Card berhasil dibaca. Membuka pengalaman...");router.push("/experience/"+encodeURIComponent(gift[1]));return;}
   throw new Error("QR tidak dikenali. Gunakan QR Cerita atau Gift Card NusantaraGift.");
  }catch(error){
   processingRef.current=false;
   setStatus("error");
   setMessage(error instanceof Error?error.message:"QR Code tidak valid.");
  }
 }

 async function startCamera(){
  if(startingRef.current||scannerRef.current?.isScanning)return;
  startingRef.current=true;setStatus("starting");setMessage("Meminta izin kamera...");
  try{
   const scanner=new Html5Qrcode("qr-reader",{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
   scannerRef.current=scanner;
   await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:240,height:240},aspectRatio:1},
    text=>{void scanner.stop().catch(()=>{});openDecodedText(text);},
    ()=>{});
   if(mountedRef.current){setStatus("scanning");setMessage("Arahkan kamera ke QR Code Cerita atau Gift Card.");}
  }catch(error){
   scannerRef.current=null;
   if(mountedRef.current){setStatus("error");setMessage(error instanceof Error?error.message:"Kamera tidak dapat diakses. Periksa izin kamera dan koneksi HTTPS.");}
  }finally{startingRef.current=false;}
 }

 async function stopCamera(){
  const scanner=scannerRef.current;
  if(scanner?.isScanning){try{await scanner.stop();}catch{/* kamera mungkin sudah berhenti */}}
  scannerRef.current=null;
  if(mountedRef.current){setStatus("idle");setMessage("Arahkan kamera ke QR Code NusantaraGift.");}
 }
 async function scanImage(file:File|null){
  if(!file)return;
  setImageBusy(true);setStatus("starting");setMessage("Membaca QR dari gambar...");
  try{
   const scanner=new Html5Qrcode("qr-reader",{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
   scannerRef.current=scanner;
   const decoded=await scanner.scanFile(file,true);
   try{scanner.clear();}catch{/* preview sudah dibersihkan */}
   scannerRef.current=null;
   openDecodedText(decoded);
  }catch(error){
   scannerRef.current=null;processingRef.current=false;setStatus("error");
   setMessage(error instanceof Error?error.message:"QR Code tidak ditemukan pada gambar. Coba gambar yang lebih jelas.");
  }finally{setImageBusy(false);}
 }
 function submitManual(){
  if(!manualCode.trim()){setStatus("error");setMessage("Masukkan tautan cerita atau gift card.");return;}
  openDecodedText(manualCode.trim());
 }
 function retry(){processingRef.current=false;setStatus("idle");setMessage("Arahkan kamera ke QR Code NusantaraGift.");}
 return <ShopLayout><div className="mx-auto w-full max-w-[600px] py-6">
  <button type="button" onClick={()=>router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#79552F]"><ArrowLeft size={18}/> Kembali</button>
  <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE0C7] text-[#79552F]"><ScanQrCode size={34}/></div><h1 className="mt-4 text-2xl font-bold text-[#34291F]">Scan QR Code</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#8A7965]">Pindai QR cerita digital atau gift card untuk membuka pengalaman NusantaraGift.</p></div>
  <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8DDCB] bg-white p-4 shadow-sm"><div className="relative overflow-hidden rounded-2xl bg-[#201B17]"><div id="qr-reader" className="min-h-[300px] w-full overflow-hidden"/>{status==="idle"&&<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white"><Camera size={48} className="mb-4 opacity-80"/><p className="font-semibold">Kamera belum aktif</p><p className="mt-2 text-xs text-white/60">Tekan tombol untuk mulai memindai QR.</p></div>}{status==="starting"&&<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white"><LoaderCircle size={40} className="animate-spin"/><p className="mt-3 text-sm">Memproses QR...</p></div>}</div>
   <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F7F1E3] p-3">{status==="success"?<CheckCircle2 size={20} className="shrink-0 text-green-600"/>:status==="error"?<XCircle size={20} className="shrink-0 text-red-500"/>:<ScanQrCode size={20} className="shrink-0 text-[#79552F]"/>}<p role="status" className="text-sm leading-relaxed text-[#665441]">{message}</p></div>
   {status!=="scanning"&&status!=="success"?<button type="button" onClick={()=>void startCamera()} disabled={status==="starting"} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#79552F] px-5 py-3.5 font-semibold text-white disabled:opacity-60"><Camera size={19}/> {status==="starting"?"Memproses...":"Mulai Scan Kamera"}</button>:null}
   {status==="scanning"&&<button type="button" onClick={()=>void stopCamera()} className="mt-4 w-full rounded-xl border border-[#D8C7AB] px-5 py-3.5 font-semibold text-[#79552F]">Hentikan Kamera</button>}
   {status==="error"&&<button type="button" onClick={retry} className="mt-3 w-full rounded-xl border border-[#D8C7AB] px-5 py-3 font-semibold text-[#79552F]">Coba Lagi</button>}
  </div>
  <div className="mt-6 grid gap-4 sm:grid-cols-2">
   <label className="cursor-pointer rounded-2xl border border-[#E8DDCB] bg-white p-4"><span className="flex items-center gap-2 text-sm font-bold text-[#34291F]"><ImageUp size={18} className="text-[#93372A]"/> Upload gambar QR</span><span className="mt-1 block text-xs leading-5 text-[#8A7965]">Pilih screenshot atau foto QR dari galeri perangkat.</span><input type="file" accept="image/*" capture="environment" disabled={imageBusy} onChange={e=>{void scanImage(e.target.files?.[0]??null);e.currentTarget.value="";}} className="mt-3 block w-full text-xs file:mr-2 file:rounded-full file:border-0 file:bg-[#EDE0C7] file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-[#79552F]"/>{imageBusy&&<span className="mt-2 block text-[10px] text-[#79552F]">Sedang membaca gambar...</span>}</label>
   <div className="rounded-2xl border border-[#E8DDCB] bg-white p-4"><h2 className="text-sm font-bold text-[#34291F]">Masukkan tautan manual</h2><p className="mt-1 text-xs leading-5 text-[#8A7965]">Gunakan jika kamera atau gambar QR tidak terbaca.</p><input value={manualCode} onChange={e=>setManualCode(e.target.value)} placeholder="https://.../cerita/..." className="mt-3 w-full rounded-xl border border-[#E8DDCB] bg-[#FFFCF6] px-3 py-2.5 text-xs outline-none focus:border-[#79552F]"/><button type="button" onClick={submitManual} className="mt-2 w-full rounded-xl bg-[#EDE0C7] px-4 py-2.5 text-xs font-semibold text-[#79552F]">Buka tautan</button></div>
  </div>
  <p className="mt-5 text-center text-xs leading-relaxed text-[#A0917D]">Pemindaian kamera membutuhkan izin kamera dan koneksi HTTPS. QR harus berasal dari domain NusantaraGift.</p>
 </div></ShopLayout>;
}
