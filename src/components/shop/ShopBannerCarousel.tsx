"use client";

import { useState } from "react";

const slides = [
  {
    eyebrow: "NUSANTARAGIFT",
    title: "Setiap hadiah punya cerita.",
    description: "Temukan keunikan Nusantara dalam setiap kado.",
    background: "#93372A",
    decoration: "✺",
  },
  {
    eyebrow: "RASA NUSANTARA",
    title: "Kenali rasa dari berbagai daerah.",
    description: "Bawa kelezatan khas Indonesia menjadi hadiah.",
    background: "#B18A4A",
    decoration: "❋",
  },
  {
    eyebrow: "BUDAYA NUSANTARA",
    title: "Warisan budaya untuk dibagikan.",
    description: "Rayakan keberagaman dalam satu bingkisan.",
    background: "#002140",
    decoration: "✺",
  },
];

export default function ShopBannerCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  const slide = slides[activeSlide];

  function nextSlide() {
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  function previousSlide() {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length
    );
  }

  return (
    <section className="relative mt-2 overflow-hidden rounded-[22px]">
      <div
        className="relative flex min-h-[155px] items-center overflow-hidden px-6 py-6 text-white transition-colors duration-500 sm:min-h-[190px] sm:px-10"
        style={{ backgroundColor: slide.background }}
      >
        <div className="relative z-10 max-w-[75%]">
          <p className="text-[9px] font-semibold tracking-[0.22em] text-white/70 sm:text-[11px]">
            {slide.eyebrow}
          </p>

          <h2 className="mt-2 font-quicksand text-xl font-bold leading-tight sm:text-3xl">
            {slide.title}
          </h2>

          <p className="mt-2 max-w-[300px] text-[11px] leading-relaxed text-white/80 sm:text-sm">
            {slide.description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="absolute -right-4 -top-10 select-none text-[190px] leading-none text-white/[0.09] sm:-right-1 sm:text-[230px]"
        >
          {slide.decoration}
        </span>

        <button
          type="button"
          onClick={previousSlide}
          aria-label="Banner sebelumnya"
          className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-sm text-white backdrop-blur-sm hover:bg-white/30"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Banner selanjutnya"
          className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-sm text-white backdrop-blur-sm hover:bg-white/30"
        >
          ›
        </button>
      </div>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Pilih banner ${index + 1}`}
            aria-current={activeSlide === index}
            onClick={() => setActiveSlide(index)}
            className={`h-1.5 rounded-full transition-all ${
              activeSlide === index
                ? "w-5 bg-white"
                : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}