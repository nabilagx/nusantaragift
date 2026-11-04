
import Link from "next/link";
import { ScanQrCode, ChevronRight } from "lucide-react";

export default function QRScanBanner() {
  return (
    <Link
      href="/scan"
      className="mt-5 flex items-center gap-3 rounded-2xl border border-[#E6D7BB] bg-[#F3E9D5] p-4 transition hover:bg-[#EDE0C7]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#79552F] text-white">
        <ScanQrCode size={25} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-[#34291F]">
          Punya Gift Card?
        </h3>
        <p className="mt-0.5 text-xs text-[#79552F]">
          Scan QR Code untuk menikmati pengalaman digital hadiahmu.
        </p>
      </div>

      <ChevronRight size={20} className="shrink-0 text-[#79552F]" />
    </Link>
  );
}
