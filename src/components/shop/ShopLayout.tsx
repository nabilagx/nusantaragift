import type { ReactNode } from "react";
import { Suspense } from "react";
import BottomNavigation from "@/components/shop/BottomNavigation";

type ShopLayoutProps = {
  children: ReactNode;
};

export default function ShopLayout({ children }: ShopLayoutProps) {
  return (
    <main className="min-h-screen w-full bg-[#F7F1E3] text-[#34291F]">
      <div className="mx-auto min-h-screen w-full max-w-[1200px] px-5 pb-36 sm:px-8 lg:px-8">
        {children}
      </div>
      <Suspense fallback={<div className="fixed inset-x-0 bottom-0 z-[100] h-[85px] bg-[#FFFAF8]" />}><BottomNavigation /></Suspense>
    </main>
  );
}