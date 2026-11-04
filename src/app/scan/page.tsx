"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  LoaderCircle,
  ScanQrCode,
  XCircle,
} from "lucide-react";

import ShopLayout from "@/components/shop/ShopLayout";

type ScanStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "success"
  | "error";

export default function ScanPage() {
  const router = useRouter();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const mountedRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState(
    "Arahkan kamera ke QR Code pada gift card."
  );

  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const scanner = scannerRef.current;

      if (scanner?.isScanning) {
        void scanner.stop().catch(() => {});
      }
    };
  }, []);

  const openExperience = async (decodedText: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    setStatus("success");
    setMessage("QR Code berhasil dibaca! Membuka pengalaman...");

    try {
      const scannedUrl = new URL(decodedText);

      // Hanya izinkan QR dari domain aplikasi sendiri.
      if (scannedUrl.origin !== window.location.origin) {
        throw new Error("QR Code bukan berasal dari NusantaraGift.");
      }

      // Format QR: https://domainmu.com/experience/TOKEN
      const match = scannedUrl.pathname.match(
        /^\/experience\/([a-zA-Z0-9_-]+)\/?$/
      );

      if (!match) {
        throw new Error("QR Code tidak memiliki format gift card yang valid.");
      }

      const token = match[1];

      if (mountedRef.current) {
        router.push(`/experience/${encodeURIComponent(token)}`);
      }
    } catch (error) {
      isProcessingRef.current = false;

      if (!mountedRef.current) return;

      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "QR Code tidak valid."
      );
    }
  };

  const startScanner = async () => {
    if (isStartingRef.current || scannerRef.current?.isScanning) {
      return;
    }

    isStartingRef.current = true;

    setStatus("starting");
    setMessage("Menyiapkan kamera...");

    try {
      const scanner = new Html5Qrcode("qr-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 240,
            height: 240,
          },
          aspectRatio: 1,
        },
        (decodedText) => {
          void scanner.stop().catch(() => {});
          void openExperience(decodedText);
        },
        () => {
          // QR belum terbaca, lanjutkan scanning.
        }
      );

      if (mountedRef.current) {
        setStatus("scanning");
        setMessage("Arahkan kamera ke QR Code gift card.");
      }
    } catch (error) {
      scannerRef.current = null;

      if (mountedRef.current) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Kamera tidak dapat diakses. Periksa izin kamera."
        );
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (scanner?.isScanning) {
      try {
        await scanner.stop();
      } catch {
        // Scanner mungkin sudah berhenti.
      }
    }

    scannerRef.current = null;

    if (mountedRef.current) {
      setStatus("idle");
      setMessage("Arahkan kamera ke QR Code pada gift card.");
    }
  };

  const handleManualSubmit = () => {
    const value = manualCode.trim();

    if (!value) {
      setStatus("error");
      setMessage("Masukkan link atau kode gift card terlebih dahulu.");
      return;
    }

    void openExperience(value);
  };

  return (
    <ShopLayout>
      <div className="mx-auto w-full max-w-[600px] py-6">
        {/* Header */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#79552F] transition hover:opacity-70"
        >
          <ArrowLeft size={18} />
          Kembali
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDE0C7] text-[#79552F]">
            <ScanQrCode size={34} />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-[#34291F]">
            Scan QR Code
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#8A7965]">
            Pindai QR Code pada gift card untuk menikmati
            pengalaman digital NusantaraGift.
          </p>
        </div>

        {/* Scanner */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-[#E8DDCB] bg-white p-4 shadow-sm">
          <div className="relative overflow-hidden rounded-2xl bg-[#201B17]">
            <div
              id="qr-reader"
              className="min-h-[300px] w-full overflow-hidden"
            />

            {status === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                <Camera size={48} className="mb-4 opacity-80" />
                <p className="font-semibold">
                  Kamera belum aktif
                </p>
                <p className="mt-2 text-xs text-white/60">
                  Tekan tombol di bawah untuk mulai memindai.
                </p>
              </div>
            )}

            {status === "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <LoaderCircle
                  size={40}
                  className="animate-spin"
                />
                <p className="mt-3 text-sm">
                  Menyiapkan kamera...
                </p>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F7F1E3] p-3">
            {status === "success" ? (
              <CheckCircle2
                size={20}
                className="shrink-0 text-green-600"
              />
            ) : status === "error" ? (
              <XCircle
                size={20}
                className="shrink-0 text-red-500"
              />
            ) : (
              <ScanQrCode
                size={20}
                className="shrink-0 text-[#79552F]"
              />
            )}

            <p className="text-sm leading-relaxed text-[#665441]">
              {message}
            </p>
          </div>

          {/* Controls */}
          {status !== "scanning" &&
            status !== "success" && (
              <button
                type="button"
                onClick={startScanner}
                disabled={status === "starting"}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#79552F] px-5 py-3.5 font-semibold text-white transition hover:bg-[#624326] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "starting" ? (
                  <LoaderCircle
                    size={19}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={19} />
                )}

                {status === "starting"
                  ? "Menyiapkan kamera..."
                  : "Mulai Scan"}
              </button>
            )}

          {status === "scanning" && (
            <button
              type="button"
              onClick={stopScanner}
              className="mt-4 w-full rounded-xl border border-[#D8C7AB] px-5 py-3.5 font-semibold text-[#79552F] transition hover:bg-[#F7F1E3]"
            >
              Hentikan Kamera
            </button>
          )}

          {status === "error" && (
            <button
              type="button"
              onClick={() => {
                isProcessingRef.current = false;
                setStatus("idle");
                setMessage(
                  "Arahkan kamera ke QR Code pada gift card."
                );
              }}
              className="mt-3 w-full rounded-xl border border-[#D8C7AB] px-5 py-3 font-semibold text-[#79552F]"
            >
              Coba Lagi
            </button>
          )}
        </div>

        {/* Manual input fallback */}
        <div className="mt-6 rounded-2xl border border-[#E8DDCB] bg-white p-4">
          <h2 className="font-semibold text-[#34291F]">
            Tidak bisa scan?
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-[#8A7965]">
            Kamu juga bisa memasukkan link gift card secara manual.
          </p>

          <input
            type="text"
            value={manualCode}
            onChange={(event) =>
              setManualCode(event.target.value)
            }
            placeholder="Masukkan link gift card..."
            className="mt-4 w-full rounded-xl border border-[#E8DDCB] bg-[#FFFCF6] px-4 py-3 text-sm text-[#34291F] outline-none transition placeholder:text-[#B6A995] focus:border-[#79552F]"
          />

          <button
            type="button"
            onClick={handleManualSubmit}
            className="mt-3 w-full rounded-xl bg-[#EDE0C7] px-4 py-3 text-sm font-semibold text-[#79552F] transition hover:bg-[#E4D3B3]"
          >
            Buka Gift Card
          </button>
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-[#A0917D]">
          Pastikan QR Code terlihat jelas dan kamera
          mendapatkan pencahayaan yang cukup.
        </p>
      </div>
    </ShopLayout>
  );
}
