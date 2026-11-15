"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Clock3, Headphones, LockKeyhole, LoaderCircle,
  Pause, Play, SkipBack, SkipForward, Volume2, X, ZoomIn,
} from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";

type StoryPage = {
  id: string;
  pageNumber: number;
  title: string | null;
  body: string;
  imageUrl: string;
  audioUrl: string;
  duration: number | null;
};
type Story = { slug: string; title: string; description: string; pages: StoryPage[] };
type Gift = { orderNumber: string; expiresAt: string; recipientName: string; stories: Story[] };

function timeLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return Math.floor(seconds / 60) + ":" + Math.floor(seconds % 60).toString().padStart(2, "0");
}

export default function DigitalGiftExperience({ token }: { token: string }) {
  const [gift, setGift] = useState<Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/experience/" + encodeURIComponent(token), { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (response.status === 401) {
          window.location.replace("/login?next=" + encodeURIComponent(window.location.pathname));
          return null;
        }
        if (!response.ok) throw new Error(data.error || "Gift Card tidak dapat dibuka.");
        return data as Gift;
      })
      .then(data => { if (active && data) setGift(data); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Akses cerita gagal."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!zoomOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setZoomOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [zoomOpen]);

  const story = gift?.stories[storyIndex];
  const page = story?.pages[pageIndex];

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !page?.audioUrl) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); }
      catch { setError("Audio belum dapat diputar. Coba tekan tombol putar sekali lagi."); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function resetAudio() {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
  }

  function changePage(next: number) {
    if (!story) return;
    resetAudio();
    setPageIndex(Math.max(0, Math.min(story.pages.length - 1, next)));
  }

  function changeStory(index: number) {
    resetAudio();
    setStoryIndex(index);
    setPageIndex(0);
  }

  if (loading) return <ShopLayout><div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[#79552F]"><LoaderCircle className="animate-spin" />Memverifikasi QR Gift Card...</div></ShopLayout>;

  if (error || !gift || !story || !page) return <ShopLayout><div className="mx-auto max-w-lg px-5 py-24 text-center">
    <LockKeyhole size={42} className="mx-auto text-[#93372A]" />
    <h1 className="mt-4 font-display text-2xl text-[#431714]">Cerita belum dapat dibuka</h1>
    <p className="mt-3 text-sm leading-6 text-[#806A4E]">{error || "Konten cerita belum tersedia untuk Gift Card ini."}</p>
    <Link href="/shop" className="mt-6 inline-flex rounded-full border border-[#CDBB9F] px-6 py-3 text-sm font-bold text-[#79552F]">Kembali ke NusantaraGift</Link>
  </div></ShopLayout>;

  const totalDuration = audioDuration || page.duration || 0;
  const progress = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return <ShopLayout>
    <main className="mx-auto max-w-4xl px-0 pb-8 pt-4 sm:px-4 sm:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <Link href="/shop" className="inline-flex items-center gap-2 text-xs font-semibold text-[#79552F]"><ArrowLeft size={15} /> NusantaraGift</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F1E7D6] px-3 py-2 text-[10px] font-semibold text-[#79552F]"><Clock3 size={13} /> Akses sampai {new Date(gift.expiresAt).toLocaleDateString("id-ID")}</span>
      </div>

      <header className="overflow-hidden rounded-[22px] bg-[#431714] text-[#F7F1E3] shadow-md sm:rounded-[28px]">
        <div className="px-5 py-7 text-center sm:px-10 sm:py-9">
          <p className="text-[9px] font-bold tracking-[.25em] text-[#D9B979]">NUSANTARA GIFT · CERITA DIGITAL</p>
          <h1 className="mt-3 font-display text-2xl leading-tight sm:text-4xl">Sebuah cerita untukmu, {gift.recipientName}</h1>
          <p className="mt-3 text-[11px] text-white/70 sm:text-xs">Pesanan {gift.orderNumber} · Cerita pribadi yang dikirim khusus untukmu</p>
        </div>
        {gift.stories.length > 1 && <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 px-4 pb-5">
          {gift.stories.map((item, index) => <button key={item.slug} onClick={() => changeStory(index)} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (index === storyIndex ? "bg-[#D9B979] text-[#431714]" : "bg-white/10 text-white hover:bg-white/20")}>{item.title}</button>)}
        </div>}
      </header>

      <section className="book-page-enter relative mx-auto mt-5 overflow-hidden rounded-[8px] border border-[#D8C7A9] bg-[#FFFCF5] shadow-[0_12px_36px_rgba(67,23,20,0.12)] sm:mt-7 sm:rounded-[12px]" key={story.slug + "-" + page.id}>
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-5 bg-gradient-to-r from-[#D7C5A5]/40 to-transparent sm:block" />
        <div className="px-4 pb-7 pt-6 sm:px-12 sm:pb-10 sm:pt-10">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#E9DDC9] pb-3">
            <span className="text-[9px] font-bold tracking-[.2em] text-[#B38A4D]">NUSANTARA GIFT · {story.title.toUpperCase()}</span>
            <span className="shrink-0 text-[10px] tabular-nums text-[#927B5D]">{pageIndex + 1} / {story.pages.length}</span>
          </div>

          {page.title && <h2 className="mb-5 text-center font-display text-2xl leading-snug text-[#431714] sm:mb-7 sm:text-3xl">{page.title}</h2>}

          {page.imageUrl ? <button type="button" onClick={() => setZoomOpen(true)} aria-label="Perbesar ilustrasi cerita" className="group relative mx-auto mb-6 block w-full max-w-2xl overflow-hidden rounded-md bg-[#F0E6D5] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93372A]">
            <img src={page.imageUrl} alt={page.title || story.title} className="mx-auto block max-h-[62vh] w-full object-contain sm:max-h-[680px]" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#431714]/85 px-3 py-2 text-[10px] font-semibold text-white opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100"><ZoomIn size={14} /> Perbesar gambar</span>
          </button> : <div className="mb-6 flex min-h-48 items-center justify-center rounded-md bg-[#F0E6D5] text-[#A58A64]"><BookOpen size={48} strokeWidth={1.2} /></div>}

          <article className="mx-auto max-w-[660px] whitespace-pre-line text-[14px] leading-[2] text-[#574638] sm:text-[16px] sm:leading-[2.05]">{page.body}</article>

          <div className="mt-8 flex items-center justify-between border-t border-[#E9DDC9] pt-4 text-[9px] font-medium tracking-[.12em] text-[#A18A6A]">
            <span>NUSANTARAGIFT</span><span>HALAMAN {page.pageNumber}</span>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[18px] border border-[#E3D6C2] bg-[#FFFCF7] p-4 shadow-sm sm:mt-6 sm:rounded-[22px] sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#93372A] text-white"><Headphones size={20} /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#431714]">Dengarkan cerita</p><p className="mt-0.5 truncate text-[11px] text-[#806A4E]">{story.title} · Halaman {page.pageNumber}</p></div>
          <Volume2 size={18} className="shrink-0 text-[#79552F]" />
        </div>
        <audio ref={audioRef} src={page.audioUrl || undefined} preload="metadata" className="hidden"
          onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={event => setAudioDuration(event.currentTarget.duration || 0)}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)} />
        <input aria-label="Posisi audio" type="range" min={0} max={totalDuration || 1} step={0.1} value={Math.min(currentTime, totalDuration || 0)} onChange={event => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="mt-5 h-2 w-full cursor-pointer accent-[#93372A]" style={{ background: "linear-gradient(to right, #93372A " + progress + "%, #D8C8AE " + progress + "%)" }} />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#806A4E]"><span>{timeLabel(currentTime)}</span><span>{timeLabel(totalDuration)}</span></div>
        <div className="mt-4 flex items-center justify-center gap-8">
          <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; setCurrentTime(0); }} aria-label="Ulangi audio" className="rounded-full p-2 text-[#79552F] hover:bg-[#F3EBDD]"><SkipBack size={20} /></button>
          <button type="button" onClick={togglePlayback} disabled={!page.audioUrl} aria-label={playing ? "Jeda audio" : "Putar audio"} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#93372A] text-white shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40">{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" className="ml-1" />}</button>
          <button type="button" onClick={() => changePage(pageIndex + 1)} disabled={pageIndex >= story.pages.length - 1} aria-label="Bagian berikutnya" className="rounded-full p-2 text-[#79552F] hover:bg-[#F3EBDD] disabled:opacity-30"><SkipForward size={20} /></button>
        </div>
        {!page.audioUrl && <p className="mt-3 text-center text-[10px] text-[#93372A]">Audio untuk halaman ini belum tersedia.</p>}
      </section>

      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6">
        <button type="button" disabled={pageIndex === 0} onClick={() => changePage(pageIndex - 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#CDBB9F] px-4 py-2.5 text-xs font-bold text-[#79552F] disabled:opacity-30"><ArrowLeft size={15} /> Sebelumnya</button>
        <span className="text-center text-[10px] text-[#8A7965]">Halaman {pageIndex + 1} dari {story.pages.length}</span>
        <button type="button" disabled={pageIndex === story.pages.length - 1} onClick={() => changePage(pageIndex + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#431714] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30">Berikutnya <SkipForward size={14} /></button>
      </div>

      <p className="mt-6 px-3 pb-2 text-center text-[10px] leading-5 text-[#8A7965]"><BookOpen className="mr-1 inline" size={13} /> Cerita pribadi ini hanya tersedia bagi penerima Gift Card selama masa akses.</p>

      {zoomOpen && page.imageUrl && <div role="dialog" aria-modal="true" aria-label="Ilustrasi cerita diperbesar" onClick={() => setZoomOpen(false)} className="fixed inset-0 z-[200] flex items-center justify-center bg-[#160D0B]/95 p-3 sm:p-8">
        <button type="button" onClick={() => setZoomOpen(false)} aria-label="Tutup gambar" className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><X size={22} /></button>
        <img src={page.imageUrl} alt={page.title || story.title} onClick={event => event.stopPropagation()} className="max-h-[92dvh] max-w-full touch-pinch-zoom select-none object-contain" />
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-[10px] text-white">Ketuk di luar gambar atau tombol × untuk menutup</span>
      </div>}
    </main>
  </ShopLayout>;
}
