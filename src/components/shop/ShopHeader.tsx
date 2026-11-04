
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const headerActions = [
  { label: "Notifikasi", href: "/notifications", icon: "bell" },
  { label: "Pengaturan", href: "/settings", icon: "settings" },
] as const;

const iconMap = {
  bell: Bell,
  settings: Settings,
};

export default function Header() {
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    let currentChannel: ReturnType<typeof supabase.channel> | null = null;
    let currentUserId: string | null = null;
    let setupVersion = 0;

    const removeCurrentChannel = async () => {
      const channel = currentChannel;
      currentChannel = null;

      if (channel) {
        await supabase.removeChannel(channel);
      }
    };

    const fetchUnreadCount = async (userId: string) => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Gagal mengambil jumlah notifikasi:", error);
        return;
      }

      if (active && currentUserId === userId) {
        setUnreadCount(count ?? 0);
      }
    };

    const setupNotifications = async (userId: string | null) => {
      const version = ++setupVersion;

      if (!userId) {
        currentUserId = null;
        setUnreadCount(0);
        await removeCurrentChannel();
        return;
      }

      if (currentUserId !== userId) {
        await removeCurrentChannel();
        currentUserId = userId;
      }

      if (!active || version !== setupVersion) return;

      await fetchUnreadCount(userId);

      if (!active || version !== setupVersion) return;

      // Jangan membuat channel kedua untuk user yang sama.
      if (currentChannel) return;

      const channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void fetchUnreadCount(userId);
          }
        );

      currentChannel = channel;
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime notifikasi gagal terhubung.");
        }
      });
    };

    const initialize = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (error) {
        console.error("Gagal memeriksa sesi pengguna:", error);
        await setupNotifications(null);
        return;
      }

      await setupNotifications(user?.id ?? null);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      // Callback auth tidak melakukan query Supabase secara langsung.
      queueMicrotask(() => {
        if (active) {
          void setupNotifications(session?.user.id ?? null);
        }
      });
    });

    void initialize();

    return () => {
      active = false;
      setupVersion++;
      subscription.unsubscribe();

      if (currentChannel) {
        void supabase.removeChannel(currentChannel);
        currentChannel = null;
      }
    };
  }, [supabase]);

  return (
    <header className="flex w-full items-center justify-between bg-[#F7F1E3] px-6 py-5">
      {/* Logo */}
      <Link href="/" aria-label="NusantaraGift Home">
        <img
          src="/images/brand/LOGO.svg"
          alt="NusantaraGift"
          className="h-10 w-auto object-contain"
        />
      </Link>

      {/* Header Actions */}
      <nav className="flex items-center gap-5">
        {headerActions.map((action) => {
          const Icon = iconMap[action.icon];

          return (
            <Link
              key={action.label}
              href={action.href}
              aria-label={action.label}
              title={action.label}
              className="relative flex h-9 w-9 items-center justify-center text-[#93372A] transition-opacity hover:opacity-70"
            >
              <Icon
                size={27}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              {/* Unread Notification Badge */}
              {action.icon === "bell" && unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E53935] px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
