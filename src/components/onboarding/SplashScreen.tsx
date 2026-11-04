
import Logo from "@/components/brand/Logo";

export default function SplashScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream">
      <div className="flex w-full flex-col items-center justify-center px-6">
        <Logo
          size={400}
          priority
          className="h-auto w-[300px] sm:w-[360px] md:w-[400px]"
        />

        <div className="mt-12 h-2 w-48 overflow-hidden rounded-full bg-brand/15">
          <div className="splash-loading h-full w-0 rounded-full bg-brand" />
        </div>
      </div>
    </main>
  );
}
