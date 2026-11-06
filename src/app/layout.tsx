import type { Metadata } from "next";
import { DM_Serif_Display, Poppins, Quicksand } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });

export const metadata: Metadata = {
  title: "NusantaraGift",
  description: "Temukan hadiah dan pengalaman budaya khas Nusantara.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} ${quicksand.variable} ${dmSerif.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
