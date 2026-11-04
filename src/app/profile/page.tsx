"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { produk } from "@/data/produk";
import ShopLayout from "@/components/shop/ShopLayout";

type Tab = "Koleksi" | "Komunitas" | "Ulasan";

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("Koleksi");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  // Figma assets are referenced directly so the page can render without
  // requiring changes to other routes or layout components.
  const figma = "https://www.figma.com/api/mcp/asset/a27a0c32-baa5-435f-a779-4991c47e539b";
  const avatar = `${figma}/562e9.png`;
  const productImageA = `${figma}/2d714.png`;
  const productImageB = `${figma}/4c795.png`;
  const star = `${figma}/afa23.svg`;

  const [profile, setProfile] = useState({
    name: "Pengguna NusantaraGift",
    email: "",
    avatarUrl: "",
  });

  // Read the signed-in user's Supabase profile on mount.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const user = data.user;
      const metadata = user.user_metadata ?? {};
      setProfile({
        name: metadata.full_name || metadata.name || "Pengguna NusantaraGift",
        email: user.email || "",
        avatarUrl: metadata.avatar_url || metadata.picture || "",
      });
    });
    return () => { active = false; };
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const collection = produk.slice(0, 6);

  return (
     <ShopLayout>
    <div className="min-h-screen bg-[#F7F1E3] px-4 pb-32 pt-8 text-[#34291F] sm:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <h1 className="mb-7 text-[30px] font-semibold leading-tight text-black">Profil</h1>

        <section className="flex flex-col items-center text-center">
          <div className="relative h-[100px] w-[100px] overflow-hidden rounded-full bg-[#E9DFCE]">
            <Image
              src={profile.avatarUrl || avatar}
              alt="Foto profil"
              fill
              sizes="100px"
              className="object-cover"
              unoptimized
            />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-black">{profile.name}</h2>
          <p className="mt-1 max-w-full break-all text-sm text-black">{profile.email}</p>
          <button
  type="button"
  onClick={() => alert("Fitur Edit Profil segera hadir!")}
  className="mt-6 flex h-9 w-full max-w-[340px] items-center justify-center rounded-[10px] bg-[#93372A] text-sm font-bold text-white shadow-[0_4px_2px_rgba(0,0,0,0.25)] transition hover:bg-[#7d2e24]"
>
  Edit Profil
</button>
        </section>

        <Link
          href="/track-order"
          className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-5 py-4 shadow-sm transition hover:border-[#93372A]/50 hover:shadow-md"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0CDD5] text-[#93372A]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h11v11H3z" />
                <path d="M14 10h4l3 3v5h-7z" />
                <circle cx="7.5" cy="18" r="1.5" />
                <circle cx="17.5" cy="18" r="1.5" />
                <path d="M7 10h4M7 13h4" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-[#34291F]">Lacak Pesanan</span>
              <span className="mt-0.5 block text-xs text-[#77716A]">Cek pembayaran dan perjalanan pesananmu</span>
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-xl text-[#93372A]">›</span>
        </Link>

        <div className="mt-8 grid grid-cols-3 rounded-[10px] border border-black/50 p-1">
          {(["Koleksi", "Komunitas", "Ulasan"] as Tab[]).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`min-h-9 rounded-[9px] px-2 text-sm transition ${
                tab === item ? "bg-[#93372A] font-bold text-white" : "text-black/60 hover:text-black"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Koleksi" && (
          <section className="mt-7 grid grid-cols-1 gap-7 sm:grid-cols-2">
            {collection.map((item, index) => (
              <Link href={`/product/${item.id}`} key={item.id} className="group min-w-0">
                <div
                  className="relative h-[180px] overflow-hidden rounded-lg bg-[#E9DFCE]"
                  style={{ backgroundColor: item.cardColor || "#E9DFCE" }}
                >
                  <Image
                    src={item.image || (index % 2 === 0 ? productImageA : productImageB)}
                    alt={item.imageAlt || item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    unoptimized
                  />
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-[44px] text-base font-semibold leading-[22px] text-[#0B0B0B]">
                  {item.title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#7D7575] bg-white px-2 py-1 text-xs font-semibold text-[#0B0B0B]">
                    <Image src={star} alt="" width={16} height={16} unoptimized />
                    4.7 (689)
                  </span>
                  <span className="text-sm font-semibold text-[#0B0B0B]">
                    {Number(item.price).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}

        {tab === "Komunitas" && (
          <section className="mt-8 space-y-4">
            <div className="rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] p-6">
              <p className="text-lg font-semibold">Komunitas NusantaraGift</p>
              <p className="mt-2 text-sm leading-6 text-[#77716A]">
                Ruang berbagi cerita, rekomendasi hadiah, dan inspirasi budaya Nusantara.
              </p>
              <span className="mt-4 inline-flex rounded-full bg-[#F0CDD5] px-3 py-1 text-xs font-semibold text-[#93372A]">
                Segera Hadir
              </span>
            </div>
          </section>
        )}

        {tab === "Ulasan" && (
          <section className="mt-8 rounded-xl border border-[#E9DFCE] bg-[#FFFCF7] px-6 py-12 text-center">
            <p className="text-base font-semibold">Belum ada ulasan</p>
            <p className="mt-2 text-sm text-[#77716A]">
              Ulasan produk yang kamu berikan akan tampil di sini.
            </p>
          </section>
        )}

        <div className="mt-12 border-t border-[#E9DFCE] pt-6">
  <button
    onClick={handleSignOut}
    disabled={signingOut}
    className="mx-auto flex h-11 w-full max-w-[340px] items-center justify-center rounded-[10px] bg-[#93372A] text-sm font-bold text-white shadow-[0_4px_2px_rgba(0,0,0,0.25)] transition hover:bg-[#7d2e24] disabled:cursor-not-allowed disabled:opacity-50"  >
    {signingOut ? "Keluar..." : "Keluar dari akun"}
  </button>
</div>
      </div>
      
    </div>
    </ShopLayout>
  );
}
