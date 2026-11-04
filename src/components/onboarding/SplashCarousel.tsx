"use client";

import Image from "next/image";
import { useState } from "react";
import SplashIndicator from "./SplashIndicator";

const onboardingData = [
  {
    image: "/images/splash/welcome.png",
    imageAlt: "Ilustrasi perempuan membawa hadiah",
    title: "Selamat Datang",
    description:
      "Kami senang kamu di sini. Yuk, mulai jelajahi kekayaan budaya Nusantara dengan cara paling seru!",
    button: "Mulai",

    imagePosition: "bottom",
    imageHeight: "h-[60dvh]",
    imageScale: "scale-[1.75]",
    imageTranslate: "translate-y-[30%]",
    imageOrigin: "origin-bottom",
    imageObjectPosition: "object-bottom",

    contentAlignment: "items-end text-right",
    descriptionAlignment: "ml-auto",
    buttonWidth: "w-fit min-w-[150px]",
    titleSize: "text-[38px]",
    descriptionSize: "text-[18px]",
  },
  {
    image: "/images/splash/gift.png",
    imageAlt: "Ilustrasi hadiah budaya Nusantara",
    title: "Temukan Kado Budayamu",
    description:
      "Blind box budaya dari berbagai daerah Indonesia, berisi kisah, rasa, dan karya lokal pilihan.",
    button: "Lanjut",

    imagePosition: "top",
    imageHeight: "h-[43dvh]",
    imageScale: "scale-[1.50]",
    imageTranslate: "-translate-y-[22%]",
    imageOrigin: "origin-top",
    imageObjectPosition: "object-top",

    contentAlignment: "items-center text-center",
    descriptionAlignment: "mx-auto",
    buttonWidth: "w-full max-w-[340px]",
    titleSize: "text-[34px]",
    descriptionSize: "text-[17px]",
  },
  {
    image: "/images/splash/community.png",
    imageAlt: "Ilustrasi komunitas pecinta budaya",
    title: "Terhubung dengan Pecinta Budaya Lainnya",
    description:
      "Gabung komunitas pengguna NusantaraGift dan berbagi cerita dari balik kado.",
    button: "Buat Akun",

    imagePosition: "top",
    imageHeight: "h-[42dvh]",
    imageScale: "scale-[1.35]",
    imageTranslate: "-translate-y-[15%]",
    imageOrigin: "origin-top",
    imageObjectPosition: "object-top",

    contentAlignment: "items-center text-center",
    descriptionAlignment: "mx-auto",
    buttonWidth: "w-full max-w-[340px]",
    titleSize: "text-[36px]",
    descriptionSize: "text-[18px]",
  },
];

export default function SplashCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const currentSlide = onboardingData[activeIndex];
  const isLastSlide = activeIndex === onboardingData.length - 1;
  const imageFirst = currentSlide.imagePosition === "top";

  
function handleNext() {
  if (!isLastSlide) {
    setActiveIndex((current) => current + 1);
    return;
  }

  localStorage.setItem(
    "nusantaragift:onboarding-completed",
    "true"
  );

  window.location.href = "/login";
}


  return (
    <main className="h-dvh w-full overflow-hidden bg-cream">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden">

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-3 sm:px-8 md:grid md:grid-cols-2 md:items-center md:gap-12 md:px-12 md:py-8 lg:px-20">

          {/* ILUSTRASI */}
          <div
            className={`
              relative isolate mx-auto w-full max-w-[600px]
              min-h-0 shrink-0 overflow-hidden pointer-events-none
              ${imageFirst ? "order-1" : "order-2"}
              ${currentSlide.imageHeight}
              md:order-1 md:h-[min(75dvh,680px)]
            `}
          >
            <Image
              key={currentSlide.image}
              src={currentSlide.image}
              alt={currentSlide.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 48vw"
              className={`
                object-contain
                ${currentSlide.imageObjectPosition}
                ${currentSlide.imageScale}
                ${currentSlide.imageTranslate}
                ${currentSlide.imageOrigin}
                md:!scale-100 md:!translate-y-0 md:!object-center
              `}
            />
          </div>

          {/* KONTEN */}
          <div
            key={activeIndex}
            className={`
              relative z-20 mx-auto flex w-full max-w-[520px]
              min-h-0 flex-1 flex-col justify-center
              ${currentSlide.contentAlignment}
              ${imageFirst ? "order-2" : "order-1"}
              py-2
              md:order-2 md:items-start md:text-left md:py-0
            `}
          >
            <div className="w-full">

              {/* JUDUL */}
              <h1
                className={`
                  font-quicksand font-bold leading-[1.12] text-brand
                  ${currentSlide.titleSize}
                  sm:text-3xl md:text-4xl lg:text-5xl
                `}
              >
                {currentSlide.title}
              </h1>

              {/* DESKRIPSI */}
              <p
                className={`
                  mt-3 max-w-[440px] font-poppins
                  leading-[1.55] text-[#222222]/75
                  ${currentSlide.descriptionAlignment}
                  ${currentSlide.descriptionSize}
                  md:mx-0 md:mt-5 md:text-base md:leading-8
                `}
              >
                {currentSlide.description}
              </p>

              {/* TOMBOL */}
              <div
                className={`
                  mt-5 flex w-full flex-col gap-3
                  ${currentSlide.contentAlignment}
                  md:mt-9 md:items-start
                `}
              >
                <button
                  type="button"
                  onClick={handleNext}
                  className={`
                    relative z-30 flex h-[56px] items-center
                    justify-center rounded-[20px] bg-brand
                    px-9 font-poppins text-[17px] font-semibold
                    text-white shadow-sm transition duration-200
                    hover:bg-[#7c2d23] active:scale-[0.98]
                    ${currentSlide.buttonWidth}
                    md:h-[54px] md:w-full md:max-w-[320px] md:text-base
                  `}
                >
                  {currentSlide.button}
                </button>

                {/* LOGIN */}
                {isLastSlide && (
                  <p className="font-poppins text-sm text-[#222222]/70 sm:text-base">
                    Punya Akun?{" "}
                    <a
                      href="/login"
                      className="relative z-30 font-semibold text-brand underline-offset-4 hover:underline"
                    >
                      Masuk
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* INDIKATOR */}
        <footer className="relative z-20 flex shrink-0 justify-center pb-4 pt-1 md:pb-8">
          <SplashIndicator activeIndex={activeIndex} />
        </footer>

      </div>
    </main>
  );
}
