
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  PartyPopper,
  CircleX,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const toastConfig = {
  success: {
    title: "Woo Hoo!",
    subtitle: "Berhasil dilakukan!",
    icon: PartyPopper,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100",
    border: "border-emerald-200",
    accent: "bg-emerald-500",
    titleColor: "text-emerald-700",
  },
  error: {
    title: "Oops!",
    subtitle: "Ada yang tidak beres.",
    icon: CircleX,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-100",
    border: "border-rose-200",
    accent: "bg-rose-500",
    titleColor: "text-rose-700",
  },
  warning: {
    title: "Eits, tunggu dulu!",
    subtitle: "Periksa kembali, ya.",
    icon: ShieldAlert,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-100",
    border: "border-amber-200",
    accent: "bg-amber-500",
    titleColor: "text-amber-700",
  },
  info: {
    title: "Hai, ada info!",
    subtitle: "Sedikit informasi untukmu.",
    icon: Sparkles,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-100",
    border: "border-sky-200",
    accent: "bg-sky-500",
    titleColor: "text-sky-700",
  },
};

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextId.current;

      setToasts((current) => [
        ...current,
        { id, type, message },
      ]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, 3500);

      timers.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[99999] flex items-center justify-center px-5 py-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="flex w-full max-w-[540px] flex-col gap-4">
          {toasts.map((toast) => {
            const config = toastConfig[toast.type];
            const Icon = config.icon;

            return (
              <div
                key={toast.id}
                role={toast.type === "error" ? "alert" : "status"}
                className={`
                  toast-enter
                  pointer-events-auto
                  relative
                  flex
                  min-h-[160px]
                  w-full
                  items-center
                  gap-6
                  overflow-hidden
                  rounded-[30px]
                  border-2
                  ${config.border}
                  bg-white
                  px-7
                  py-7
                  shadow-[0_20px_70px_rgba(52,41,31,0.20)]
                `}
              >
                {/* Icon */}
                <div
                  className={`
                    flex
                    h-[92px]
                    w-[92px]
                    shrink-0
                    items-center
                    justify-center
                    rounded-[26px]
                    ${config.iconBg}
                  `}
                >
                  <Icon
                    size={52}
                    strokeWidth={1.9}
                    className={config.iconColor}
                    aria-hidden="true"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`
                      text-[26px]
                      font-extrabold
                      leading-tight
                      tracking-tight
                      ${config.titleColor}
                    `}
                  >
                    {config.title}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#82766A]">
                    {config.subtitle}
                  </p>

                  <p className="mt-1 break-words text-[15px] leading-relaxed text-[#5F5145]">
                    {toast.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Tutup notifikasi"
                  className="
                    absolute
                    right-4
                    top-4
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    text-[#B5A99B]
                    transition
                    hover:bg-[#F7F1E3]
                    hover:text-[#34291F]
                  "
                >
                  <X size={19} />
                </button>

                {/* Bottom Accent */}
                <div
                  className={`
                    absolute
                    bottom-0
                    left-0
                    h-[5px]
                    w-full
                    ${config.accent}
                  `}
                />
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast harus digunakan di dalam ToastProvider"
    );
  }

  return context;
}
