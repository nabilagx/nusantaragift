"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, LoaderCircle } from "lucide-react";

type Props={token:string;orderNumber:string;expiresAt:string;design:Record<string,unknown>|null};
function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number){const words=text.split(/\s+/);const lines:string[]=[];let line="";for(const word of words){const next=line?line+" "+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}
export default function DigitalGiftCardDownload({token,orderNumber,expiresAt,design}:Props){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const card=(design??{}) as Record<string,unknown>;
 const recipient=String(card.giftRecipient??"Penerima Spesial");const sender=String(card.giftSender??"Seseorang");const message=String(card.giftMessage??"Sebuah cerita kecil untukmu.");const background=String(card.background??"#F4EBD9");const fontColor=String(card.fontColor??"#34291F");const fontFamily=String(card.fontFamily??"Georgia, serif");
 async function download(){
  setBusy(true);setError("");
  try{
   const svg=document.querySelector("#digital-gift-qr svg") as SVGSVGElement|null;
   if(!svg)throw new Error("QR Gift Card belum siap.");
   const svgText=new XMLSerializer().serializeToString(svg);
   const blob=new Blob([svgText],{type:"image/svg+xml;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   try{
    const qrImage=new Image();qrImage.src=url;await new Promise<void>((resolve,reject)=>{qrImage.onload=()=>resolve();qrImage.onerror=()=>reject(new Error("QR tidak dapat dirender."));});
    const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=750;
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Browser tidak mendukung ekspor PNG.");
    ctx.fillStyle=background;ctx.fillRect(0,0,1200,750);
    ctx.fillStyle=fontColor;ctx.globalAlpha=.08;for(let x=30;x<1200;x+=70){ctx.beginPath();ctx.arc(x,35,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    ctx.strokeStyle=fontColor;ctx.globalAlpha=.28;ctx.lineWidth=3;ctx.strokeRect(34,34,1132,682);ctx.globalAlpha=1;
    ctx.font="bold 24px Arial";ctx.fillText("NUSANTARAGIFT",80,105);
    ctx.font="16px Arial";ctx.globalAlpha=.65;ctx.fillText("A STORY MADE ESPECIALLY FOR YOU",80,140);ctx.globalAlpha=1;
    ctx.font="46px "+fontFamily;ctx.fillText("Untuk "+recipient.slice(0,28),80,250);
    ctx.font="24px "+fontFamily;ctx.fillStyle=fontColor;
    const lines=wrapText(ctx,message,650).slice(0,5);lines.forEach((line,i)=>ctx.fillText(line,80,320+i*42));
    ctx.font="18px Arial";ctx.globalAlpha=.7;ctx.fillText("Dengan kasih,",80,590);ctx.globalAlpha=1;
    ctx.font="bold 26px "+fontFamily;ctx.fillText(sender.slice(0,40),80,630);
    ctx.fillStyle="#FFFFFF";ctx.fillRect(820,190,280,280);ctx.drawImage(qrImage,835,205,250,250);
    ctx.fillStyle=fontColor;ctx.font="bold 18px Arial";ctx.textAlign="center";ctx.fillText("SCAN UNTUK MEMBACA",960,515);
    ctx.font="15px Arial";ctx.fillText("Akses privat · 7 hari",960,545);
    ctx.textAlign="left";ctx.font="13px Arial";ctx.globalAlpha=.55;ctx.fillText("ORDER "+orderNumber+" · BERLAKU HINGGA "+new Date(expiresAt).toLocaleDateString("id-ID"),80,680);ctx.globalAlpha=1;
    const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("PNG gagal dibuat.")),"image/png"));
    const link=document.createElement("a");link.href=URL.createObjectURL(png);link.download="NusantaraGift-"+orderNumber+"-Gift-Card.png";link.click();URL.revokeObjectURL(link.href);
   }finally{URL.revokeObjectURL(url);}
  }catch(e){setError(e instanceof Error?e.message:"Gift Card gagal diunduh.");}finally{setBusy(false);}
 }
 return <div className="mt-5 rounded-2xl border border-[#E9DFCE] bg-[#FFFCF7] p-4 text-left"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-[#431714]">Gift Card Digital</h3><p className="mt-1 text-xs text-[#806A4E]">Kartu PNG dengan QR privat untuk {recipient}</p></div><button type="button" onClick={()=>void download()} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-[#93372A] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{busy?<LoaderCircle size={15} className="animate-spin"/>:<Download size={15}/>}Download PNG</button></div><div className="mt-4 flex items-center gap-4 rounded-xl p-4" style={{backgroundColor:background,color:fontColor}}><div className="min-w-0 flex-1"><p className="text-[9px] font-bold tracking-widest">NUSANTARAGIFT</p><p className="mt-3 font-serif text-lg">Untuk {recipient}</p><p className="mt-2 line-clamp-3 text-xs">{message}</p><p className="mt-3 text-[10px] opacity-70">Dengan kasih, {sender}</p></div><div className="shrink-0 rounded-lg bg-white p-2"><div id="digital-gift-qr"><QRCodeSVG value={typeof window!=="undefined"?window.location.origin+"/experience/"+token:"https://nusantaragift.vercel.app/experience/"+token} size={100} level="H" includeMargin/></div><p className="mt-1 text-center text-[8px] font-bold text-[#34291F]">SCAN ME</p></div></div>{error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}<p className="mt-3 text-[10px] text-[#8A7965]">QR hanya dapat dibuka oleh akun penerima yang dituju dan kedaluwarsa pada {new Date(expiresAt).toLocaleString("id-ID")}.</p></div>;
}
