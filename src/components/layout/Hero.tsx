
import Link from "next/link";

export default function Hero() {
  return (
    <section className="overflow-hidden bg-[#F7F1E3]">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">

        {/* Hero text */}
        <div className="relative z-10">
          <span className="inline-flex rounded-full border border-[#E3AD3E]/60 bg-[#E3AD3E]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#93372A] sm:text-sm">
            ✨ Hadiah Penuh Makna
          </span>

          <h1 className="mt-6 max-w-2xl font-quicksand text-4xl font-bold leading-tight text-[#222222] sm:text-5xl lg:text-6xl">
            Hadirkan Cerita
            <span className="block text-[#93372A]">
              di Setiap Hadiah.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm leading-7 text-[#222222]/70 sm:text-base sm:leading-8">
            Temukan keindahan budaya Nusantara melalui
            pilihan hadiah, kerajinan lokal, dan cerita
            istimewa dari berbagai penjuru Indonesia.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#93372A] px-7 py-3 font-semibold text-white shadow-lg shadow-[#93372A]/20 transition-all hover:-translate-y-1 hover:bg-[#762B22] active:scale-95"
            >
              Jelajahi Produk →
            </Link>

            <Link
              href="/stories"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-[#93372A]/30 px-7 py-3 font-semibold text-[#93372A] transition-all hover:border-[#93372A] hover:bg-[#93372A]/5"
            >
              Cerita Nusantara
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[#222222]/60 sm:text-sm">
            <span>♡ Produk pilihan lokal</span>
            <span>✦ Cerita penuh makna</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-[#E3AD3E]/30 blur-2xl sm:h-40 sm:w-40" />
          <div className="absolute -bottom-5 -left-5 h-32 w-32 rounded-full bg-[#F0CDD5]/70 blur-2xl sm:h-44 sm:w-44" />

          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] border border-white/70 bg-[#F0CDD5] p-6 shadow-2xl shadow-[#93372A]/10 sm:rounded-[2.5rem] sm:p-10">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border-[24px] border-[#E3AD3E]/30" />
            <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full border-[28px] border-[#93372A]/10" />

            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] border border-white/60 bg-[#F7F1E3]/60 p-6 text-center backdrop-blur-sm sm:rounded-[2rem] sm:p-10">
              <span className="text-5xl sm:text-7xl">🎁</span>

              <p className="mt-5 font-quicksand text-2xl font-bold text-[#93372A] sm:text-3xl">
                Dari Nusantara
              </p>

              <p className="mt-2 max-w-xs text-sm leading-6 text-[#222222]/70">
                Untuk orang-orang istimewa,
                dengan cerita yang tak terlupakan.
              </p>

              <div className="mt-6 h-1 w-16 rounded-full bg-[#E3AD3E]" />
            </div>
          </div>

          <div className="absolute -bottom-4 right-2 rounded-2xl bg-white px-4 py-3 shadow-xl sm:-bottom-5 sm:right-6 sm:px-5">
            <p className="text-xs font-semibold text-[#93372A]">
              Made with culture
            </p>
            <p className="text-sm font-bold text-[#222222]">
              Made with love ♡
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
