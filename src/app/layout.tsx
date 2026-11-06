import type { Metadata } from "next";
import { Poppins, Quicksand } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });

export const metadata: Metadata = {
  title: "NusantaraGift",
  description: "Temukan hadiah dan pengalaman budaya khas Nusantara.",
  icons: { icon: "/images/brand/LOGO.svg", shortcut: "/images/brand/LOGO.svg", apple: "/images/brand/LOGO.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} ${quicksand.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
