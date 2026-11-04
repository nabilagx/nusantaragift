interface SplashIndicatorProps {
  activeIndex: number;
  total?: number;
}

export default function SplashIndicator({
  activeIndex,
  total = 3,
}: SplashIndicatorProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={`Halaman ${activeIndex + 1} dari ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === activeIndex
              ? "w-7 bg-brand"
              : "w-2 bg-brand/25"
          }`}
        />
      ))}
    </div>
  );
}