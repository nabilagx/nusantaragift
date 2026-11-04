"use client";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-[#E8DDCA] bg-white/80 px-4 shadow-[0_3px_12px_rgba(75,48,25,0.04)] transition focus-within:border-[#93372A]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-[#8A7865]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.2 4.2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cari Kado, Komunitas ...."
        className="w-full bg-transparent text-sm text-[#302820] outline-none placeholder:text-[#A99A88] sm:text-base"
      />
    </label>
  );
}
