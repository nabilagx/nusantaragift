"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Megaphone, ShoppingBag } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";

type Product = { id: string; slug: string; name: string; description: string | null; price: number; stock: number; metadata: Record<string, unknown> | null; categories?: { name: string } | { name: string }[] | null };
type Campaign = { id: string; title: string; description: string; image_url: string; products: Product[] };

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void params.then(({id})=>fetch(`/api/promotions/${id}`,{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Iklan tidak ditemukan.");if(active)setCampaign(data.promotion);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Iklan gagal dimuat.");}).finally(()=>{if(active)setLoading(false);}));
    return ()=>{active=false;};
  },[params]);
  const money=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
  return <ShopLayout>
    <div className="pt-7">
      <Link href="/shop" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#93372A]"><ArrowLeft size={16}/> Kembali ke beranda</Link>
      {loading?<p className="py-20 text-center text-sm text-[#7A6C5E]">Memuat promosi...</p>:error?<div className="rounded-2xl bg-white p-8 text-center text-sm text-[#93372A]">{error}</div>:campaign&&<>
        <section className="overflow-hidden rounded-[24px] bg-[#431714] text-white shadow-lg">
          <div className="relative aspect-[16/5] w-full"><Image src={campaign.image_url} alt={campaign.title} fill unoptimized className="object-cover"/><div className="absolute inset-0 bg-gradient-to-r from-[#27100E]/90 via-[#27100E]/50 to-transparent"/><div className="absolute inset-y-0 left-0 flex max-w-2xl flex-col justify-center p-6 sm:p-10"><span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[9px] font-bold tracking-widest"><Megaphone size={12}/> PROMOSI UMKM</span><h1 className="mt-3 font-quicksand text-2xl font-bold sm:text-4xl">{campaign.title}</h1><p className="mt-2 max-w-lg text-xs leading-5 text-white/85 sm:text-sm">{campaign.description}</p></div></div>
        </section>
        <div className="mb-5 mt-8"><p className="text-[9px] font-bold tracking-[.18em] text-[#93372A]">PILIHAN TOKO</p><h2 className="mt-1 text-2xl font-bold text-[#34291F]">Produk dalam promosi ini</h2><p className="mt-1 text-xs text-[#7A6C5E]">{campaign.products.length} produk pilihan dari satu kampanye.</p></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{campaign.products.map(product=>{const meta=product.metadata??{};const image=typeof meta.image==="string"?meta.image:"";return <article key={product.id} className="overflow-hidden rounded-2xl border border-[#E9DFCE] bg-white shadow-sm"><Link href={`/shop/${product.slug}`} className="block"><div className="relative h-52 bg-[#E6DBBC]">{image?<img src={image} alt={typeof meta.imageAlt==="string"?meta.imageAlt:product.name} className="h-full w-full object-contain p-4"/>:<div className="flex h-full items-center justify-center"><ShoppingBag size={44} className="text-[#93372A]/50"/></div>}</div><div className="p-4"><h3 className="text-sm font-bold text-[#34291F]">{product.name}</h3><p className="mt-2 text-xs text-[#7A6C5E] line-clamp-2">{product.description}</p><p className="mt-3 font-bold text-[#93372A]">{money(product.price)}</p><p className="mt-1 text-[10px] font-semibold text-[#4F6E59]">Stok tersedia: {product.stock}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#93372A]">Lihat produk <ArrowRight size={14}/></span></div></Link></article>})}</div>
      </>}
    </div>
  </ShopLayout>;
}
