import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F7F1E3] px-5 py-12 text-[#34291F]">
      <section className="w-full max-w-md rounded-3xl border border-[#E9DFCE] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#93372A]">NusantaraGift</p>
        <h1 className="mt-3 font-quicksand text-2xl font-bold">Butuh bantuan masuk?</h1>
        <p className="mt-3 text-sm leading-6 text-[#806A4E]">
          Akun MVP dikelola oleh administrator. Jika kamu lupa password, hubungi admin untuk bantuan pemulihan akun.
        </p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#76291F]">
          Kembali ke Login
        </Link>
      </section>
    </main>
  );
}
