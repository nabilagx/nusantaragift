"use client";

import { useEffect, useState } from "react";
import SplashScreen from "@/components/onboarding/SplashScreen";
import SplashCarousel from "@/components/onboarding/SplashCarousel";

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOnboarding(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!showOnboarding) {
    return <SplashScreen />;
  }

  return <SplashCarousel />;
}