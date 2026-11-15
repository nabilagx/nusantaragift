import Link from "next/link";
import { BookOpen, LockKeyhole } from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";

// This route reads the request-specific story slug and must render on demand.
export const instant = false;

export default async function StoryPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ShopLayout>
      <section className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE0C7] text-[#79552F]">
          <LockKeyhole size={32}/>
        </div>
        <p className="mt-5 text-[9px] font-bold tracking-[.2em] text-[#C79854]">NUSANTARAGIFT · KADO CERITA</p>
        <h1 className="mt-3 font-display text-3xl text-[#431714]">Cerita ini bersifat privat</h1>
        <p className="mt-3 text-sm leading-7 text-[#806A4E]">Isi cerita hanya dapat dibaca oleh akun email penerima melalui QR Gift Card yang aktif. Jika kamu sudah menerima kartu, pindai QR atau buka tautan pengalaman dari kartu tersebut.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={"/shop/" + encodeURIComponent(slug)} className="rounded-full bg-[#93372A] px-5 py-3 text-xs font-bold text-white">Lihat produk</Link>
          <Link href="/scan" className="inline-flex items-center gap-2 rounded-full border border-[#D8C7AB] px-5 py-3 text-xs font-bold text-[#79552F]"><BookOpen size={15}/> Scan Gift Card</Link>
        </div>
      </section>
    </ShopLayout>
  );
}
