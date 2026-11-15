"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, Clock3, Headphones, LockKeyhole, LoaderCircle,
  Pause, Play, SkipBack, SkipForward, Volume2,
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
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return minutes + ":" + remainder;
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

  const story = gift?.stories[storyIndex];
  const page = story?.pages[pageIndex];

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !page?.audioUrl) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setError("Audio belum dapat diputar. Coba tekan tombol putar sekali lagi.");
      }
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

  if (loading) {
    return <ShopLayout><div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[#79552F]"><LoaderCircle className="animate-spin" />Memverifikasi QR Gift Card...</div></ShopLayout>;
  }

  if (error || !gift || !story || !page) {
    return <ShopLayout><div className="mx-auto max-w-lg px-5 py-24 text-center">
      <LockKeyhole size={42} className="mx-auto text-[#93372A]" />
      <h1 className="mt-4 font-display text-2xl text-[#431714]">Cerita belum dapat dibuka</h1>
      <p className="mt-3 text-sm leading-6 text-[#806A4E]">{error || "Konten cerita belum tersedia untuk Gift Card ini."}</p>
      <Link href="/shop" className="mt-6 inline-flex rounded-full border border-[#CDBB9F] px-6 py-3 text-sm font-bold text-[#79552F]">Kembali ke NusantaraGift</Link>
    </div></ShopLayout>;
  }

  const totalDuration = audioDuration || page.duration || 0;
  const progress = totalDuration > 0 ? Math.min(100, (currentTime / totalDuration) * 100) : 0;

  return <ShopLayout>
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/shop" className="inline-flex items-center gap-2 text-xs font-semibold text-[#79552F]"><ArrowLeft size={15} /> NusantaraGift</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F7F1E3] px-3 py-2 text-[10px] font-bold text-[#79552F]"><Clock3 size={13} /> Akses sampai {new Date(gift.expiresAt).toLocaleString("id-ID")}</span>
      </div>

      <header className="overflow-hidden rounded-[28px] bg-[#431714] text-[#F7F1E3] shadow-lg">
        <div className="px-6 py-7 text-center sm:px-10 sm:py-9">
          <p className="text-[9px] font-bold tracking-[.25em] text-[#D9B979]">NUSANTARA GIFT · CERITA DIGITAL</p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">Sebuah cerita untukmu, {gift.recipientName}</h1>
          <p className="mt-3 text-xs text-white/70">Pesanan {gift.orderNumber} · Cerita pribadi yang dikirim khusus untukmu</p>
        </div>
        {gift.stories.length > 1 && <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 px-4 pb-5">
          {gift.stories.map((item, index) => <button key={item.slug} onClick={() => { resetAudio(); setStoryIndex(index); setPageIndex(0); }} className={"rounded-full px-4 py-2 text-xs font-bold transition " + (index === storyIndex ? "bg-[#D9B979] text-[#431714]" : "bg-white/10 text-white hover:bg-white/20")}>{item.title}</button>)}
        </div>}
      </header>

      <section className="mt-6 grid overflow-hidden rounded-[28px] border border-[#DED3C1] bg-[#FDFAF3] shadow-sm lg:grid-cols-[1.02fr_.98fr]">
        <div className="relative min-h-[280px] bg-[#EDE0C7] sm:min-h-[420px]">
          {page.imageUrl ? <img src={page.imageUrl} alt={page.title || story.title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full min-h-[280px] items-center justify-center text-[#9B815B]"><BookOpen size={54} strokeWidth={1.2} /></div>}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#241613]/65 to-transparent p-5 pt-16 text-white">
            <p className="text-[9px] font-bold tracking-[.2em] text-[#F0D9A5]">BAGIAN {page.pageNumber}</p>
            <p className="mt-1 font-display text-2xl">{page.title || story.title}</p>
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-8 lg:p-9">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold tracking-[.18em] text-[#C79854]">DENGARKAN & BACA</p>
            <span className="rounded-full bg-[#F3EBDD] px-3 py-1.5 text-[10px] font-bold text-[#79552F]">{pageIndex + 1} / {story.pages.length}</span>
          </div>
          {page.title && <h2 className="mt-4 font-display text-2xl text-[#431714] sm:text-3xl">{page.title}</h2>}
          <article className="mt-4 whitespace-pre-line text-sm leading-8 text-[#574638] sm:text-[15px]">{page.body}</article>

          <div className="mt-auto pt-8">
            <div className="rounded-[22px] bg-[#F3EBDD] p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#93372A] text-white"><Headphones size={19} /></div>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#431714]">Audio cerita</p><p className="mt-0.5 truncate text-[10px] text-[#806A4E]">{story.title} · Bagian {page.pageNumber}</p></div>
                <Volume2 size={17} className="text-[#79552F]" />
              </div>
              <audio ref={audioRef} src={page.audioUrl || undefined} preload="metadata" className="hidden"
                onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={event => setAudioDuration(event.currentTarget.duration || 0)}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)} />
              <input aria-label="Posisi audio" type="range" min={0} max={totalDuration || 1} step={0.1} value={Math.min(currentTime, totalDuration || 0)} onChange={event => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrentTime(value); }} className="mt-5 h-1.5 w-full cursor-pointer accent-[#93372A]" style={{ background: "linear-gradient(to right, #93372A " + progress + "%, #D8C8AE " + progress + "%)" }} />
              <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[#806A4E]"><span>{timeLabel(currentTime)}</span><span>{timeLabel(totalDuration)}</span></div>
              <div className="mt-3 flex items-center justify-center gap-7">
                <button type="button" onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; setCurrentTime(0); }} aria-label="Ulangi audio" className="rounded-full p-2 text-[#79552F] hover:bg-white/70"><SkipBack size={19} /></button>
                <button type="button" onClick={togglePlayback} disabled={!page.audioUrl} aria-label={playing ? "Jeda audio" : "Putar audio"} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#93372A] text-white shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40">{playing ? <Pause size={23} fill="currentColor" /> : <Play size={23} fill="currentColor" className="ml-1" />}</button>
                <button type="button" onClick={() => changePage(pageIndex + 1)} disabled={pageIndex >= story.pages.length - 1} aria-label="Bagian berikutnya" className="rounded-full p-2 text-[#79552F] hover:bg-white/70 disabled:opacity-30"><SkipForward size={19} /></button>
              </div>
              {!page.audioUrl && <p className="mt-3 text-center text-[10px] text-[#93372A]">Audio untuk bagian ini belum tersedia.</p>}
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-[#E7DDCC] pt-5">
              <button type="button" disabled={pageIndex === 0} onClick={() => changePage(pageIndex - 1)} className="rounded-full border border-[#CDBB9F] px-4 py-2.5 text-xs font-bold text-[#79552F] disabled:opacity-30">Sebelumnya</button>
              <span className="text-[10px] text-[#8A7965]">Bagian {pageIndex + 1} dari {story.pages.length}</span>
              <button type="button" disabled={pageIndex === story.pages.length - 1} onClick={() => changePage(pageIndex + 1)} className="rounded-full bg-[#431714] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-30">Berikutnya</button>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-5 text-center text-[10px] leading-5 text-[#8A7965]"><BookOpen className="mr-1 inline" size={13} /> Cerita ini tersedia untuk email penerima yang terverifikasi selama masa akses Gift Card.</p>
    </main>
  </ShopLayout>;
}
