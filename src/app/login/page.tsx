"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  
async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setLoading(true);
  setErrorMessage("");

  try {
    const supabase = createClient();

    // Remove any previous demo account session before switching to another account.
    const { error: previousSessionError } = await supabase.auth.signOut({ scope: "local" });
    if (previousSessionError) throw previousSessionError;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(
        error.message.includes("Email not confirmed")
          ? "Email kamu belum diverifikasi. Silakan cek kotak masuk email."
          : "Email atau password tidak sesuai."
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("Pengguna tidak ditemukan.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setErrorMessage(
        "Profil akun belum tersedia. Silakan hubungi administrator."
      );
      setLoading(false);
      return;
    }

    const dashboardRoutes: Record<string, string> = {
      customer: "/shop",
      umkm: "/seller/dashboard",
      admin: "/admin/dashboard",
    };

    const roleDestination = dashboardRoutes[profile.role_id];

    if (!roleDestination) {
      await supabase.auth.signOut();
      setErrorMessage("Role akun tidak dikenali.");
      setLoading(false);
      return;
    }

    // Ambil tujuan dari URL login.
    const params = new URLSearchParams(window.location.search);
    const requestedNext = params.get("next");

    // Allow only known internal customer destinations to avoid open redirects.
    const isValidCustomerPath =
      requestedNext === "/checkout" ||
      Boolean(requestedNext && /^\/experience\/[a-zA-Z0-9_-]+\/?$/.test(requestedNext));

    const destination =
      profile.role_id === "customer" && isValidCustomerPath
        ? requestedNext!
        : roleDestination;

    router.replace(destination);
    router.refresh();
  } catch {
    setErrorMessage("Terjadi kesalahan. Silakan coba kembali.");
    setLoading(false);
  }
}


  return (
    <main className="min-h-dvh bg-[#F7F1E3] text-[#222222]">
      <div className="grid min-h-dvh lg:grid-cols-2 xl:grid-cols-[1.1fr_1fr]">
        
        {/* LEFT: CULTURAL VISUAL & BRANDING */}
        <section className="relative flex min-h-[480px] flex-col justify-between overflow-hidden bg-[#F7F1E3] p-8 lg:h-dvh lg:p-12 xl:p-16">
          {/* LOGO */}
          <Link
            href="/"
            className="relative z-20 w-fit font-quicksand text-2xl font-bold text-[#93372A]"
          >
            NusantaraGift
            <span className="text-[#E3AD3E]">.</span>
          </Link>

          {/* BACKGROUND IMAGE & OVERLAY */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/auth/reog.png"
              alt="Ilustrasi Reog Ponorogo"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center opacity-85 scale-105"
            />
            {/* Gradient Overlay biar teks di atas gambar tetep terbaca */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#F7F1E3] via-[#F7F1E3]/60 to-transparent" />
          </div>

          {/* HERO CONTENT */}
          <div className="relative z-10 mt-auto max-w-lg pt-12">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#93372A]/20 bg-[#F7F1E3]/80 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-[#93372A] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E3AD3E]" />
              WARISAN BUDAYA NUSANTARA
            </span>

            <h2 className="font-quicksand text-3xl font-bold leading-tight text-[#70291F] sm:text-4xl xl:text-5xl">
              Cerita budaya,
              <br />
              hadir dalam setiap
              <br />
              <span className="text-[#93372A]">hadiah istimewa.</span>
            </h2>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#222222]/80">
              Temukan produk lokal, kerajinan autentik, dan keindahan budaya dari
              berbagai penjuru Indonesia.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-[2px] w-10 bg-[#93372A]" />
              <span className="text-xs font-semibold tracking-[0.2em] text-[#93372A]">
                EXPLORE THE BEAUTY OF INDONESIA
              </span>
            </div>
          </div>
        </section>

        {/* RIGHT: LOGIN FORM */}
        <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            
            {/* HEADER */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2 lg:hidden">
                <span className="h-6 w-1 rounded-full bg-[#93372A]" />
                <span className="font-quicksand text-xs font-bold tracking-[0.12em] text-[#93372A]">
                  NUSANTARAGIFT
                </span>
              </div>

              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#B28A45]">
                SELAMAT DATANG KEMBALI
              </p>

              <h1 className="font-quicksand text-3xl font-bold tracking-tight text-[#93372A] sm:text-4xl">
                Masuk ke akunmu.
              </h1>

              <p className="mt-2 text-sm leading-relaxed text-[#222222]/70">
                Lanjutkan perjalananmu menjelajahi kekayaan budaya dan produk
                lokal Indonesia.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#222222]"
                >
                  Alamat Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  className="h-[52px] w-full rounded-xl border border-[#D8CDBB] bg-white/70 px-4 text-sm outline-none transition placeholder:text-[#222222]/35 focus:border-[#93372A] focus:bg-white focus:ring-4 focus:ring-[#93372A]/10"
                />
              </div>

              {/* PASSWORD */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#222222]"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#93372A] transition hover:text-[#70291F] hover:underline"
                  >
                    Lupa password?
                  </Link>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    className="h-[52px] w-full rounded-xl border border-[#D8CDBB] bg-white/70 px-4 pr-24 text-sm outline-none transition placeholder:text-[#222222]/35 focus:border-[#93372A] focus:bg-white focus:ring-4 focus:ring-[#93372A]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#93372A] transition hover:text-[#70291F]"
                  >
                    {showPassword ? "Sembunyikan" : "Lihat"}
                  </button>
                </div>
              </div>

              {/* ERROR MESSAGE */}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-snug text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#93372A] text-sm font-semibold text-white shadow-lg shadow-[#93372A]/15 transition hover:-translate-y-0.5 hover:bg-[#7C2D23] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Memproses..." : "Masuk ke NusantaraGift"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-white/50 px-4 py-3 text-center text-xs leading-relaxed text-[#806A4E]">
              Akun demo pelanggan, UMKM, dan admin disediakan oleh administrator. Registrasi mandiri belum dibuka pada MVP.
            </div>

            <p className="mt-8 text-center text-[10px] tracking-[0.15em] text-[#222222]/40">
              NUSANTARAGIFT · CELEBRATING INDONESIAN HERITAGE
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}