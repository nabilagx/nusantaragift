"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Megaphone } from "lucide-react";

type AdProduct = { id: string; slug: string; name: string; price: number; metadata: Record<string, unknown> | null };
type Promotion = { id: string; title: string; description: string; image_url: string; products: AdProduct[] };
const editorialSlides = [
  { eyebrow: "NUSANTARAGIFT", title: "Setiap hadiah punya cerita.", description: "Temukan keunikan Nusantara dalam setiap kado.", background: "#93372A", decoration: "✺" },
  { eyebrow: "RASA NUSANTARA", title: "Kenali rasa dari berbagai daerah.", description: "Bawa kelezatan khas Indonesia menjadi hadiah.", background: "#B18A4A", decoration: "❋" },
  { eyebrow: "BUDAYA NUSANTARA", title: "Warisan budaya untuk dibagikan.", description: "Rayakan keberagaman dalam satu bingkisan.", background: "#002140", decoration: "✺" },
];

export default function ShopBannerCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/promotions", { cache: "no-store" })
      .then(async (response) => { if (!response.ok) throw new Error("Promosi gagal dimuat."); return response.json(); })
      .then((data) => { if (active) setPromotions(data.promotions ?? []); })
      .catch((error) => console.error("Promotions:", error));
    return () => { active = false; };
  }, []);

  const slides = promotions.length ? promotions : editorialSlides;
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const index = activeSlide % slides.length;
  const slide = slides[index];
  const isPromotion = "image_url" in slide;
  const previousSlide = () => setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  const nextSlide = () => setActiveSlide((current) => (current + 1) % slides.length);

  return <section className="relative mt-2 overflow-hidden rounded-[22px] shadow-[0_10px_28px_rgba(58,30,18,.12)]">
    <div className="relative flex h-[180px] items-center overflow-hidden bg-[#431714] text-white sm:h-[250px]">
      {isPromotion ? <>
        <img src={(slide as Promotion).image_url} alt="" className="absolute inset-0 h-full w-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#24100E]/95 via-[#24100E]/75 to-[#24100E]/10"/>
        <div className="relative z-10 max-w-[78%] px-8 py-4 sm:max-w-[65%] sm:px-12 sm:py-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[9px] font-bold tracking-[.16em]"><Megaphone size={12}/> IKLAN PILIHAN UMKM</span>
          <h2 className="mt-2 line-clamp-2 break-words font-quicksand text-lg font-bold leading-[1.1] sm:mt-3 sm:text-3xl sm:leading-tight">{slide.title}</h2>
          <p className="mt-1.5 line-clamp-2 max-w-[380px] break-words text-[10px] leading-[1.25] text-white/85 sm:mt-2 sm:text-sm sm:leading-relaxed">{slide.description}</p>
          <Link href={`/campaign/${(slide as Promotion).id}`} className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#F3EBDD] px-3 py-1.5 text-[9px] font-bold text-[#7B2925] shadow-md transition hover:bg-white sm:mt-4 sm:px-4 sm:py-2.5 sm:text-xs">Lihat {(slide as Promotion).products.length} produk <ArrowRight size={14}/></Link>
        </div>
      </> : <>
        <div className="relative z-10 max-w-[75%] px-8 py-7 sm:px-12">
          <p className="text-[9px] font-semibold tracking-[0.22em] text-white/70 sm:text-[11px]">{(slide as typeof editorialSlides[number]).eyebrow}</p>
          <h2 className="mt-2 line-clamp-2 break-words font-quicksand text-xl font-bold leading-tight sm:text-3xl">{(slide as typeof editorialSlides[number]).title}</h2>
          <p className="mt-2 line-clamp-2 max-w-[340px] break-words text-[11px] leading-relaxed text-white/80 sm:text-sm">{(slide as typeof editorialSlides[number]).description}</p>
        </div>
        <span aria-hidden="true" className="absolute -right-4 -top-10 select-none text-[190px] leading-none text-white/[0.09] sm:-right-1 sm:text-[230px]">{(slide as typeof editorialSlides[number]).decoration}</span>
      </>}
      {slides.length > 1 && <>
        <button type="button" onClick={previousSlide} aria-label="Banner sebelumnya" className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/35"><ArrowLeft size={15}/></button>
        <button type="button" onClick={nextSlide} aria-label="Banner selanjutnya" className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm hover:bg-white/35"><ArrowRight size={15}/></button>
      </>}
    </div>
    {slides.length > 1 && <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">{slides.map((_, index) => <button key={"id" in _ ? _.id : index} type="button" aria-label={`Pilih banner ${index + 1}`} aria-current={activeSlide === index} onClick={() => setActiveSlide(index)} className={`h-1.5 rounded-full transition-all ${activeSlide === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}/>)}</div>}
    {promotions.length > 0 && <span className="absolute right-3 top-3 z-20 rounded-full bg-black/35 px-2.5 py-1 text-[8px] font-bold tracking-wider text-white">PROMOSI</span>}
  </section>;
}
