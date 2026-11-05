"use client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Package, ClipboardList, PlusCircle, Store, ShieldCheck, LogOut, Menu, X, ChevronRight, Users } from "lucide-react";

export type DashboardNavItem = { label:string; href:string; icon:"overview"|"orders"|"products"|"add"|"moderation"|"sellers" };
const icons = { overview:LayoutDashboard, orders:ClipboardList, products:Package, add:PlusCircle, moderation:ShieldCheck, sellers:Users };

export default function DashboardShell({role,title,subtitle,navItems,children}:{role:"UMKM"|"ADMIN";title:string;subtitle:string;navItems:DashboardNavItem[];children:ReactNode}) {
 const pathname=usePathname();const router=useRouter();const [loggingOut,setLoggingOut]=useState(false);const [mobileMenu,setMobileMenu]=useState(false);const [currentHash,setCurrentHash]=useState("");
 useEffect(()=>{const sync=()=>setCurrentHash(window.location.hash);sync();window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync);},[]);
 async function logout(){if(loggingOut)return;setLoggingOut(true);try{const supabase=createClient();await supabase.auth.signOut();router.replace("/login");router.refresh();}finally{setLoggingOut(false);}}
 const active=(href:string)=>{const [path,hash]=href.split("#");return path===pathname&&(hash?currentHash===`#${hash}`:!currentHash);};
 const home=role==="ADMIN"?"/admin/dashboard":"/seller/dashboard";
 return <div className="min-h-dvh bg-[#F5F1E9] text-[#29251F]">
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-[#E9E1D4] bg-[#FFFCF7] xl:flex">
   <Link href={home} className="flex h-[88px] items-center gap-3 border-b border-[#EEE7DC] px-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8E3028] text-white"><Store size={22}/></span><span><strong className="block font-quicksand text-lg text-[#8E3028]">NusantaraGift</strong><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#9B8B78]">{role==="ADMIN"?"Marketplace Command":"Seller Center"}</span></span></Link>
   <div className="px-5 pt-7"><p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#A99B89]">MENU UTAMA</p><nav className="mt-3 space-y-1">{navItems.map(item=>{const Icon=icons[item.icon];const selected=active(item.href);return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${selected?"bg-[#F5E7E1] text-[#8E3028] shadow-sm":"text-[#74695D] hover:bg-[#F7F2EA] hover:text-[#8E3028]"}`}><Icon size={18}/>{item.label}{selected&&<ChevronRight className="ml-auto" size={15}/>}</Link>;})}</nav></div>
   <div className="mt-auto border-t border-[#EEE7DC] p-5"><div className="mb-3 rounded-xl bg-[#F7F2EA] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9B8B78]">AKSES AKTIF</p><p className="mt-1 text-sm font-bold">{role==="ADMIN"?"Administrator":"Mitra UMKM"}</p><p className="mt-0.5 text-xs text-[#8B7B6C]">NusantaraGift Marketplace</p></div><button onClick={logout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#9A443A] hover:bg-[#FCEDEA] disabled:opacity-50"><LogOut size={18}/>{loggingOut?"Keluar...":"Keluar akun"}</button></div>
  </aside>
  <div className="xl:pl-[268px]">
   <header className="sticky top-0 z-30 border-b border-[#E9E1D4] bg-[#FFFCF7]/95 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-4 sm:px-7 lg:px-10"><div className="flex items-center gap-3"><button onClick={()=>setMobileMenu(v=>!v)} aria-label="Buka menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E9E1D4] text-[#8E3028] xl:hidden">{mobileMenu?<X size={19}/>:<Menu size={19}/>}</button><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#A47B43]">NUSANTARAGIFT / {role==="ADMIN"?"ADMIN":"MITRA"}</p><h1 className="font-quicksand text-lg font-bold sm:text-xl">{title}</h1></div></div><div className="flex items-center gap-3"><span className="hidden rounded-full border border-[#E9E1D4] bg-white px-3 py-2 text-xs font-semibold text-[#74695D] sm:inline-flex">{role==="ADMIN"?"Administrator":"Mitra UMKM"}</span><button onClick={logout} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-full border border-[#E5CFC8] bg-white px-3 py-2 text-xs font-bold text-[#8E3028] transition hover:bg-[#FCEDEA] sm:px-4"><LogOut size={15}/><span className="hidden sm:inline">{loggingOut?"Keluar...":"Keluar akun"}</span></button></div></div>
   {mobileMenu&&<nav className="border-t border-[#EEE7DC] bg-white px-4 py-3 xl:hidden"><div className="grid grid-cols-2 gap-2">{navItems.map(item=>{const Icon=icons[item.icon];return <Link key={item.href} href={item.href} onClick={()=>setMobileMenu(false)} className={`flex items-center gap-2 rounded-xl px-3 py-3 text-xs font-bold ${active(item.href)?"bg-[#F5E7E1] text-[#8E3028]":"bg-[#F8F5EF] text-[#74695D]"}`}><Icon size={16}/>{item.label}</Link>;})}</div></nav>}
   </header>
   <main className="mx-auto max-w-[1500px] px-4 pb-32 pt-7 sm:px-7 sm:pt-9 lg:px-10"><div className="mb-7"><p className="text-sm text-[#827668]">{subtitle}</p></div>{children}</main>
  </div>
  <nav aria-label="Navigasi dashboard" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DFD2] bg-[#FFFCF7]/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 shadow-[0_-8px_30px_rgba(48,35,20,.08)] backdrop-blur-xl xl:hidden"><div className="mx-auto grid max-w-xl gap-1" style={{gridTemplateColumns:`repeat(${navItems.length},minmax(0,1fr))`}}>{navItems.map(item=>{const Icon=icons[item.icon];const selected=active(item.href);return <Link key={item.href} href={item.href} className={`relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition ${selected?"bg-[#F5E7E1] text-[#8E3028]":"text-[#938575] hover:bg-[#F8F5EF]"}`}>{selected&&<span className="absolute -top-2 h-1 w-7 rounded-full bg-[#8E3028]"/>}<Icon size={19}/><span className="max-w-full truncate">{item.label}</span></Link>;})}</div></nav>
 </div>;
}
